/* Firebase data layer shared by the guestbook and the admin page. */
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

let cached = null;

export async function getBackend() {
  if (window.__whoopsiesFakeBackend) return window.__whoopsiesFakeBackend; // used for local testing
  if (cached) return cached;

  const cfg = window.WHOOPSIES_GUESTBOOK || {};
  if (!cfg.FIREBASE) return null;

  const [{ initializeApp }, fs, auth] = await Promise.all([
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-firestore.js"),
    import(SDK + "firebase-auth.js")
  ]);

  const app = initializeApp(cfg.FIREBASE);

  // App Check: Firebase only accepts requests that prove they come from this website
  if (cfg.APP_CHECK_SITE_KEY) {
    try {
      const ac = await import(SDK + "firebase-app-check.js");
      ac.initializeAppCheck(app, {
        provider: new ac.ReCaptchaV3Provider(cfg.APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      document.documentElement.classList.add("has-recaptcha");
    } catch (e) {}
  }
  const db = fs.getFirestore(app);
  const au = auth.getAuth(app);
  // admin logins only last for this browser tab
  try { await auth.setPersistence(au, auth.browserSessionPersistence); } catch (e) {}
  const col = fs.collection(db, "guestbook");

  const toList = (snap) =>
    snap.docs
      .map((d) => {
        const v = d.data();
        return {
          id: d.id,
          name: v.name,
          message: v.message,
          approved: v.approved,
          reply: typeof v.reply === "string" ? v.reply : "",
          pinned: v.pinned === true,
          createdAt: v.createdAt && v.createdAt.toMillis ? v.createdAt.toMillis() : Date.now()
        };
      })
      .sort((a, b) => (b.pinned - a.pinned) || (b.createdAt - a.createdAt));

  cached = {

    async listApproved() {
      const snap = await fs.getDocs(fs.query(col, fs.where("approved", "==", true), fs.limit(200)));
      return toList(snap);
    },

    async listPending() {
      const snap = await fs.getDocs(fs.query(col, fs.where("approved", "==", false), fs.limit(200)));
      return toList(snap);
    },

    async submit(name, message) {
      // Written together with a site-wide "last message" timestamp; the rules only
      // accept it if the previous message was more than 10 seconds ago.
      const batch = fs.writeBatch(db);
      batch.set(fs.doc(col), { name, message, approved: false, createdAt: fs.serverTimestamp() });
      batch.set(fs.doc(db, "meta", "rate"), { last: fs.serverTimestamp() });
      await batch.commit();
    },

    async reply(id, text) {
      const ref = fs.doc(db, "guestbook", id);
      if (text) await fs.updateDoc(ref, { reply: text, repliedAt: fs.serverTimestamp() });
      else await fs.updateDoc(ref, { reply: fs.deleteField(), repliedAt: fs.deleteField() });
    },

    async approve(id) { await fs.updateDoc(fs.doc(db, "guestbook", id), { approved: true }); },
    async hide(id) { await fs.updateDoc(fs.doc(db, "guestbook", id), { approved: false, pinned: false }); },
    async pin(id, on) { await fs.updateDoc(fs.doc(db, "guestbook", id), { pinned: !!on }); },

    async getNote() {
      const snap = await fs.getDoc(fs.doc(db, "meta", "site"));
      return snap.exists() && typeof snap.data().note === "string" ? snap.data().note : "";
    },
    async setNote(text) {
      await fs.setDoc(fs.doc(db, "meta", "site"), { note: text, updatedAt: fs.serverTimestamp() });
    },
    async remove(id) { await fs.deleteDoc(fs.doc(db, "guestbook", id)); },

    onUser(cb) { return auth.onAuthStateChanged(au, cb); },
    async signIn(email, password) { await auth.signInWithEmailAndPassword(au, email, password); },
    async signOut() { await auth.signOut(au); }
  };
  return cached;
}

export function timeAgo(ms) {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.round(h / 24);
  if (d < 30) return d + "d ago";
  return new Date(ms).toLocaleDateString();
}
