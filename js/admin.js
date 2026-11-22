/* Guestbook admin page */
import { getBackend, timeAgo } from "./guestbook-backend.js?v=13";

const app = document.getElementById("app");
const userBox = document.getElementById("userBox");

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

function message(html) { app.innerHTML = '<div class="card center">' + html + "</div>"; }

const backend = await getBackend().catch(() => null);
if (!backend) {
    message("<p>The guestbook isn&rsquo;t connected yet. Fill in <code>js/guestbook-config.js</code> first.</p>");
} else {
    backend.onUser((user) => {
        userBox.textContent = "";
        if (!user) return showSignIn();
        const who = el("span", "who", "signed in  ");
        const out = el("button", "", "sign out");
        out.onclick = () => backend.signOut();
        userBox.append(who, out);
        if (!backend.ownerId || user.uid !== backend.ownerId) {
            message('<p class="err">This account isn&rsquo;t set as the guestbook owner yet.</p>' +
                '<p>If this is you, your account ID is below. Paste it into <code>js/guestbook-config.js</code> (OWNER_ID) and into your Firestore rules.</p>');
            const code = el("code", "", user.uid);
            code.style.cssText = "display:block;margin:0 auto 14px;padding:10px;border-radius:10px;background:rgba(255,255,255,.07);user-select:all;word-break:break-all";
            const copy = el("button", "primary", "copy account ID");
            copy.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(user.uid); copy.textContent = "copied \u2661"; };
            app.querySelector(".card").append(code, copy);
            return;
        }
        startIdleTimer();
        loadAll();
    });
}

// sign out automatically after 20 minutes of doing nothing
let idleTimer = null;
function startIdleTimer() {
    const reset = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { backend.signOut(); }, 20 * 60 * 1000);
    };
    ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();
}

function showSignIn() {
    message("<p>Sign in to approve or delete guestbook messages.</p>");
    const form = el("form", "login");
    const email = el("input"); email.type = "email"; email.placeholder = "email"; email.autocomplete = "username"; email.required = true;
    const pass = el("input"); pass.type = "password"; pass.placeholder = "password"; pass.autocomplete = "current-password"; pass.required = true;
    const btn = el("button", "primary", "sign in"); btn.type = "submit";
    const err = el("p", "err"); err.style.minHeight = "1.2em";
    form.append(email, pass, btn, err);
    form.onsubmit = async (e) => {
        e.preventDefault();
        btn.disabled = true; err.textContent = "";
        try { await backend.signIn(email.value.trim(), pass.value); }
        catch (x) { err.textContent = "That email or password didn\u2019t work."; btn.disabled = false; }
    };
    app.querySelector(".card").appendChild(form);
    email.focus();
}

function row(item, pending) {
    const li = el("li", item.pinned ? "pinned" : "");
    const meta = el("div", "meta");
    meta.append(el("span", "name", item.name), el("span", "", timeAgo(item.createdAt)));
    li.append(meta, el("p", "msg", item.message));

    // existing reply
    const replyBox = el("div", "reply");
    if (item.reply) {
        replyBox.append(el("span", "reply-who", "your reply"), el("p", "", item.reply));
        li.append(replyBox);
    }

    const actions = el("div", "actions");
    if (pending) {
        const ok = el("button", "primary", "approve \u2661");
        ok.onclick = async () => {
            ok.disabled = true;
            try { await backend.approve(item.id); loadAll(); } catch (e) { ok.disabled = false; alertErr(); }
        };
        actions.append(ok);
    }

    if (!pending) {
        const pin = el("button", item.pinned ? "primary" : "", item.pinned ? "\u2605 pinned" : "pin");
        pin.title = item.pinned ? "unpin" : "pin to the top of the guestbook";
        pin.onclick = async () => { pin.disabled = true; try { await backend.pin(item.id, !item.pinned); loadAll(); } catch (e) { alertErr(); } };
        const hide = el("button", "", "hide");
        hide.title = "take it off the site without deleting (it goes back to waiting)";
        hide.onclick = async () => { hide.disabled = true; try { await backend.hide(item.id); loadAll(); } catch (e) { alertErr(); } };
        actions.append(pin, hide);
    }

    const rep = el("button", "", item.reply ? "edit reply" : "reply");
    rep.onclick = () => {
        if (li.querySelector(".reply-form")) return;
        const form = el("form", "reply-form");
        const ta = el("textarea");
        ta.maxLength = 500; ta.rows = 3; ta.placeholder = "write a reply\u2026"; ta.value = item.reply || "";
        const row2 = el("div", "actions");
        const save = el("button", "primary", "save reply"); save.type = "submit";
        const cancel = el("button", "", "cancel"); cancel.type = "button";
        cancel.onclick = () => form.remove();
        row2.append(save, cancel);
        if (item.reply) {
            const rm = el("button", "danger", "remove reply"); rm.type = "button";
            rm.onclick = async () => { rm.disabled = true; try { await backend.reply(item.id, ""); loadAll(); } catch (e) { alertErr(); } };
            row2.append(rm);
        }
        form.append(ta, row2);
        form.onsubmit = async (e) => {
            e.preventDefault();
            const text = ta.value.trim();
            save.disabled = true;
            try { await backend.reply(item.id, text); loadAll(); } catch (x) { save.disabled = false; alertErr(); }
        };
        li.insertBefore(form, actions);
        ta.focus();
    };
    actions.append(rep);

    const del = el("button", "danger", "delete");
    del.onclick = async () => {
        if (!confirm("Delete this message for good?")) return;
        del.disabled = true;
        try { await backend.remove(item.id); loadAll(); } catch (e) { del.disabled = false; alertErr(); }
    };
    actions.append(del);
    li.append(actions);
    return li;
}

function alertErr() { message('<p class="err">Something went wrong. Make sure you published the latest Firestore rules, then reload.</p>'); }

function section(title, items, pending) {
    const frag = document.createDocumentFragment();
    const h = el("h2", "", title + " ");
    h.append(el("span", "n", "(" + items.length + ")"));
    const ul = el("ul");
    if (pending && items.length > 1) {
        const all = el("button", "danger", "delete all " + items.length + " waiting");
        all.style.marginLeft = "10px";
        all.onclick = async () => {
            if (!confirm("Delete all " + items.length + " waiting messages? Use this if you get spammed.")) return;
            all.disabled = true;
            try { for (const it of items) await backend.remove(it.id); loadAll(); } catch (e) { alertErr(); }
        };
        h.append(all);
    }
    if (!items.length) ul.append(el("li", "empty", pending ? "nothing waiting — all caught up ♡" : "nothing here yet"));
    items.forEach((it) => ul.append(row(it, pending)));
    frag.append(h, ul);
    return frag;
}

function statsBar(pending, approved) {
    const box = el("div", "stats");
    const stat = (num, label) => { const s = el("div", "stat"); s.append(el("b", "", String(num)), el("span", "", label)); return s; };
    const views = stat("\u2026", "views");
    box.append(views, stat(approved.length, "on the site"), stat(pending.length, "waiting"), stat(approved.filter((a) => a.reply).length, "replied"));
    fetch("https://abacus.jasoncameron.dev/get/whoopsies.win/views")
        .then((r) => r.json()).then((d) => { if (typeof d.value === "number") views.querySelector("b").textContent = d.value.toLocaleString(); })
        .catch(() => { views.querySelector("b").textContent = "?"; });
    return box;
}

async function noteEditor() {
    const box = el("div", "card notebox");
    box.append(el("h3", "", "note on your card"));
    box.append(el("p", "hint", "a short line that shows under your bio, like \u201cback from vacation!\u201d. leave empty to hide it."));
    const row1 = el("div", "noterow");
    const input = el("input"); input.maxLength = 140; input.placeholder = "write a little note\u2026";
    try { input.value = await backend.getNote(); } catch (e) {}
    const save = el("button", "primary", "save");
    const status = el("span", "hint");
    save.onclick = async () => {
        save.disabled = true; status.textContent = "";
        try { await backend.setNote(input.value.trim()); status.textContent = "saved \u2661"; }
        catch (e) { status.textContent = "couldn\u2019t save \u2014 publish the latest rules"; }
        save.disabled = false;
    };
    row1.append(input, save);
    box.append(row1, status);
    return box;
}

function exportButton(all) {
    const b = el("button", "", "export all messages");
    b.onclick = () => {
        const data = JSON.stringify(all.map((m) => ({
            name: m.name, message: m.message, approved: m.approved, pinned: m.pinned,
            reply: m.reply || "", date: new Date(m.createdAt).toISOString()
        })), null, 2);
        const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url; a.download = "guestbook-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return b;
}

async function loadAll() {
    try {
        const [pending, approved] = await Promise.all([backend.listPending(), backend.listApproved()]);
        app.textContent = "";
        const tools = el("div", "tools");
        tools.append(exportButton(pending.concat(approved)));
        app.append(statsBar(pending, approved), await noteEditor(), section("waiting for approval", pending, true), section("on the site", approved, false), tools);
    } catch (e) {
        alertErr();
    }
}
