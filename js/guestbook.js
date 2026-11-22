/* Guestbook panel on the main page */
import { getBackend, timeAgo } from "./guestbook-backend.js?v=11";

const openBtn = document.getElementById("gbOpen");
const panel = document.getElementById("gb");
const closeBtn = document.getElementById("gbClose");
const list = document.getElementById("gbList");
const form = document.getElementById("gbForm");
const nameIn = document.getElementById("gbName");
const msgIn = document.getElementById("gbMsg");
const trap = document.getElementById("gbWebsite");
const counter = document.getElementById("gbCount");
const status = document.getElementById("gbStatus");
const sendBtn = document.getElementById("gbSend");

const ticker = document.getElementById("ticker");
const tickerBody = document.getElementById("tickerBody");
const tickerMsg = document.getElementById("tickerMsg");
const tickerName = document.getElementById("tickerName");

const COOLDOWN = 60 * 1000;
const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|gg|io|xyz|ru|cn|top|link|ly|me|co)\b)/i;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

let backend = null;
let loaded = false;

function setStatus(text, kind) {
  status.textContent = text;
  status.className = "gb__status" + (kind ? " gb__status--" + kind : "");
}

function render(items) {
  list.textContent = "";
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "gb__empty";
    empty.textContent = "no messages yet… be the first ♡";
    list.appendChild(empty);
    return;
  }
  for (const it of items) {
    const li = document.createElement("li");
    li.className = "gb__item";
    const top = document.createElement("div");
    top.className = "gb__meta";
    const n = document.createElement("span");
    n.className = "gb__name";
    n.textContent = it.name;
    const t = document.createElement("span");
    t.className = "gb__time";
    t.textContent = timeAgo(it.createdAt);
    top.append(n, t);
    const m = document.createElement("p");
    m.className = "gb__msg";
    m.textContent = it.message;
    li.append(top, m);
    if (it.reply) {
      const r = document.createElement("div");
      r.className = "gb__reply";
      const who = document.createElement("span");
      who.className = "gb__reply-who";
      who.textContent = "person replied";
      const txt = document.createElement("p");
      txt.textContent = it.reply;
      r.append(who, txt);
      li.appendChild(r);
    }
    list.appendChild(li);
  }
}

let tickerTimer = null;
function startTicker(items) {
  clearInterval(tickerTimer);
  if (!items.length) { ticker.hidden = true; return; }
  const pool = items.slice(0, 30);
  let i = Math.floor(Math.random() * pool.length);
  const show = () => {
    const it = pool[i % pool.length];
    tickerMsg.textContent = "\u201c" + it.message + "\u201d";
    tickerName.textContent = "\u2014 " + it.name;
    i++;
  };
  show();
  ticker.hidden = false;
  if (pool.length > 1) {
    tickerTimer = setInterval(() => {
      if (document.hidden) return;
      tickerBody.classList.add("is-out");
      setTimeout(() => { show(); tickerBody.classList.remove("is-out"); }, 400);
    }, 6500);
  }
}

async function load() {
  list.innerHTML = '<li class="gb__empty">loading…</li>';
  try {
    const items = await backend.listApproved();
    render(items);
    startTicker(items);
    loaded = true;
  } catch (e) {
    list.innerHTML = '<li class="gb__empty">couldn’t load messages right now</li>';
  }
}

function open() {
  panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add("is-open"));
  document.body.classList.add("is-gb-open");
  if (!loaded) load();
  setTimeout(() => nameIn.focus({ preventScroll: true }), 250);
}

function close() {
  panel.classList.remove("is-open");
  document.body.classList.remove("is-gb-open");
  setTimeout(() => { panel.hidden = true; }, 300);
  openBtn.focus({ preventScroll: true });
}

msgIn.addEventListener("input", () => { counter.textContent = msgIn.value.length + "/280"; });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameIn.value.trim().replace(/\s+/g, " ");
  const message = msgIn.value.trim();

  if (trap.value) { setStatus("sent! ♡", "ok"); form.reset(); return; } // bots fill the hidden field
  if (!name || !message) { setStatus("add a name and a message ♡", "err"); return; }
  if (LINK_RE.test(name) || LINK_RE.test(message)) { setStatus("no links please ♡", "err"); return; }

  const last = parseInt(store.get("whoopsies-gb-last"), 10) || 0;
  const wait = COOLDOWN - (Date.now() - last);
  if (wait > 0) { setStatus("slow down a little — try again in " + Math.ceil(wait / 1000) + "s", "err"); return; }

  sendBtn.disabled = true;
  setStatus("sending…");
  try {
    await backend.submit(name.slice(0, 24), message.slice(0, 280));
    store.set("whoopsies-gb-last", String(Date.now()));
    form.reset();
    counter.textContent = "0/280";
    setStatus("sent! it’ll show up once it’s approved ♡", "ok");
  } catch (err) {
    if (err && err.code === "permission-denied") setStatus("someone just signed a moment ago \u2014 try again in a few seconds \u2661", "err");
    else setStatus("whoopsies, that didn’t send. try again in a bit", "err");
  } finally {
    sendBtn.disabled = false;
  }
});

openBtn.addEventListener("click", open);
ticker.addEventListener("click", open);
closeBtn.addEventListener("click", close);
panel.addEventListener("click", (e) => { if (e.target === panel) close(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });

(async () => {
  try { backend = await getBackend(); } catch (e) { backend = null; }
  // Only show the guestbook once an owner is set (so messages can actually be approved)
  if (backend && (backend.ownerId || window.__whoopsiesFakeBackend)) {
    openBtn.hidden = false;
    // fill the ticker with approved messages (quietly; it just stays hidden if this fails)
    try { const items = await backend.listApproved(); render(items); startTicker(items); loaded = true; } catch (e) {}
  }
})();
