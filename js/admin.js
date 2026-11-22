/* Guestbook admin page */
import { getBackend, timeAgo } from "./guestbook-backend.js?v=11";

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
        loadAll();
    });
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
    const li = el("li");
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

async function loadAll() {
    try {
        const [pending, approved] = await Promise.all([backend.listPending(), backend.listApproved()]);
        app.textContent = "";
        app.append(section("waiting for approval", pending, true), section("on the site", approved, false));
    } catch (e) {
        alertErr();
    }
}
