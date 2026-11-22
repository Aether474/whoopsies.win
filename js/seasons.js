/* Seasonal events, the side tab + panel, and day/night lighting (all in person's time zone) */
(function () {
  "use strict";

  var TZ = "America/Chicago";
  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };

  var EVENTS = [
    { id: "newyear",    name: "new year",        icon: "🎆", start: [12, 30], end: [1, 2],   weather: "fireworks", desc: "fireworks light up the room" },
    { id: "valentines", name: "valentine's",     icon: "💝", start: [2, 7],   end: [2, 14],  weather: "hearts",    desc: "falling hearts and a red heart glow" },
    { id: "sakura",     name: "sakura season",   icon: "🌸", start: [3, 20],  end: [4, 20],  weather: "petals",    desc: "cherry blossom petals everywhere" },
    { id: "summer",     name: "summer nights",   icon: "🎐", start: [7, 1],   end: [8, 15],  weather: "fireflies", desc: "fireflies drifting through the room" },
    { id: "halloween",  name: "halloween",       icon: "🎃", start: [10, 20], end: [10, 31], weather: "leaves",    desc: "bats, a witch hat and a spooky glow" },
    { id: "autumn",     name: "cozy autumn",     icon: "🍂", start: [11, 1],  end: [11, 30], weather: "leaves",    desc: "falling leaves and a warm, cozy glow" },
    { id: "christmas",  name: "christmas",       icon: "🎄", start: [12, 1],  end: [12, 26], weather: "snow",      desc: "snow, a santa hat and twinkly lights" }
  ];

  // ── time in person's time zone ──
  function chicagoNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = parseInt(p.value, 10); });
      if (o.hour === 24) o.hour = 0;
      return o;
    } catch (e) {
      var d = new Date();
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
    }
  }

  function dayNum(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 86400000); }

  function isActive(ev, now) {
    var t = dayNum(now.year, now.month, now.day);
    var s = dayNum(now.year, ev.start[0], ev.start[1]);
    var e = dayNum(now.year, ev.end[0], ev.end[1]);
    if (e < s) return t >= s || t <= e; // wraps over new year
    return t >= s && t <= e;
  }

  function daysUntil(ev, now) {
    var t = dayNum(now.year, now.month, now.day);
    var s = dayNum(now.year, ev.start[0], ev.start[1]);
    if (s <= t) s = dayNum(now.year + 1, ev.start[0], ev.start[1]);
    return s - t;
  }

  var MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  function fmtRange(ev) {
    return MONTHS[ev.start[0] - 1] + " " + ev.start[1] + " – " + MONTHS[ev.end[0] - 1] + " " + ev.end[1];
  }

  // ── decorations ──
  var decoLayer = null;
  function clearDeco() {
    EVENTS.forEach(function (ev) { root.classList.remove("event-" + ev.id); });
    if (decoLayer) { decoLayer.remove(); decoLayer = null; }
    document.querySelectorAll(".deco-hat, .deco-lights").forEach(function (n) { n.remove(); });
  }

  var HATS = {
    christmas: '<svg viewBox="0 0 64 52"><path d="M8 40C14 18 30 4 46 6c6 1 10 6 9 12-6-4-12-3-15 3l-8 19Z" fill="#e23b4a" stroke="#2a0f1b" stroke-width="2.5" stroke-linejoin="round"/><rect x="4" y="36" width="44" height="12" rx="6" fill="#fff" stroke="#2a0f1b" stroke-width="2.5"/><circle cx="56" cy="20" r="6" fill="#fff" stroke="#2a0f1b" stroke-width="2.5"/></svg>',
    halloween: '<svg viewBox="0 0 64 52"><path d="M30 4c8 6 10 18 12 30H18C22 22 24 10 30 4Z" fill="#3a2350" stroke="#140a1c" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="30" cy="38" rx="27" ry="7" fill="#2a1840" stroke="#140a1c" stroke-width="2.5"/><path d="M19 32h22" stroke="#ff8a3d" stroke-width="4"/></svg>'
  };

  function addDeco(ev) {
    root.classList.add("event-" + ev.id);
    var wrap = document.querySelector(".card__avatar-wrap");
    var card = $("card");
    if (HATS[ev.id] && wrap) {
      var hat = document.createElement("div");
      hat.className = "deco-hat deco-hat--" + ev.id;
      hat.setAttribute("aria-hidden", "true");
      hat.innerHTML = HATS[ev.id];
      wrap.appendChild(hat);
    }
    if (ev.id === "christmas" && card) {
      // two strings of lights, one each side of the profile picture
      ["l", "r"].forEach(function (side) {
        var lights = document.createElement("div");
        lights.className = "deco-lights deco-lights--" + side;
        lights.setAttribute("aria-hidden", "true");
        for (var i = 0; i < 6; i++) lights.appendChild(document.createElement("span"));
        card.appendChild(lights);
      });
    }
    if (ev.id === "halloween") {
      decoLayer = document.createElement("div");
      decoLayer.className = "deco-bats";
      decoLayer.setAttribute("aria-hidden", "true");
      for (var b = 0; b < 6; b++) {
        var bat = document.createElement("span");
        bat.innerHTML = '<svg viewBox="0 0 40 20"><path d="M20 6c2-3 4-3 5 0 3-4 9-5 15-2-4 1-6 4-6 8-3-2-6-1-8 2-1-2-3-3-6-3s-5 1-6 3c-2-3-5-4-8-2 0-4-2-7-6-8 6-3 12-2 15 2 1-3 3-3 5 0Z" fill="#140a1c"/></svg>';
        bat.style.top = (8 + Math.random() * 40) + "%";
        bat.style.animationDelay = (b * 2.3 + Math.random() * 2) + "s";
        bat.style.animationDuration = (9 + Math.random() * 6) + "s";
        decoLayer.appendChild(bat);
      }
      document.body.appendChild(decoLayer);
    }
  }

  var activeEvent = null, preview = null;

  function apply(ev, isPreview) {
    clearDeco();
    var W = window.whoopsiesWeather;
    if (ev) addDeco(ev);
    if (W && W.setAuto) W.setAuto(ev ? ev.weather : null, isPreview);
  }

  // ── day / night ──
  function lighting() {
    var h = chicagoNow().hour;
    var phase = h >= 8 && h < 17 ? "day" : (h >= 6 && h < 8) || (h >= 17 && h < 20) ? "dusk" : "night";
    root.classList.remove("time-day", "time-dusk", "time-night");
    root.classList.add("time-" + phase);
    // late at night person is probably asleep
    var asleep = h >= 23 || h < 7;
    root.classList.toggle("is-asleep", asleep);
    var dot = $("status");
    if (dot) {
      dot.setAttribute("data-tip", asleep ? "probably sleeping" : "online");
      dot.setAttribute("title", asleep ? "probably sleeping" : "online");
    }
    var wrap = document.querySelector(".card__avatar-wrap");
    if (wrap && asleep && !wrap.querySelector(".zzz")) {
      var z = document.createElement("div");
      z.className = "zzz";
      z.setAttribute("aria-hidden", "true");
      z.innerHTML = "<span>z</span><span>z</span><span>z</span>";
      wrap.appendChild(z);
    } else if (wrap && !asleep) {
      var old = wrap.querySelector(".zzz");
      if (old) old.remove();
    }
    return phase;
  }

  function clockText() {
    var now = chicagoNow();
    var h = now.hour % 12 || 12, ampm = now.hour < 12 ? "am" : "pm";
    var mm = (now.minute < 10 ? "0" : "") + now.minute;
    var phase = lighting();
    var icon = phase === "day" ? "☀" : phase === "dusk" ? "◐" : "☾";
    return "it's " + h + ":" + mm + " " + ampm + " for person " + icon + " · the room is in " + phase + " mode";
  }

  // ── side tab + panel ──
  var tab = $("eventsTab"), panel = $("events"), list = $("eventsList"), closeBtn = $("eventsClose");
  var clock = $("eventsClock"), stopBtn = $("eventsStop");

  function toast(msg) {
    var t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("is-shown");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("is-shown"); }, 2600);
  }

  function renderList() {
    var now = chicagoNow();
    clock.textContent = clockText();
    list.textContent = "";
    var sorted = EVENTS.slice().sort(function (a, b) {
      var aa = isActive(a, now) ? -1 : daysUntil(a, now), bb = isActive(b, now) ? -1 : daysUntil(b, now);
      return aa - bb;
    });
    sorted.forEach(function (ev) {
      var li = document.createElement("li");
      li.className = "ev" + (isActive(ev, now) ? " is-now" : "") + (preview === ev ? " is-preview" : "");
      var ic = document.createElement("span"); ic.className = "ev__icon"; ic.textContent = ev.icon;
      var body = document.createElement("div"); body.className = "ev__body";
      var top = document.createElement("div"); top.className = "ev__top";
      var nm = document.createElement("span"); nm.className = "ev__name"; nm.textContent = ev.name;
      var when = document.createElement("span"); when.className = "ev__when";
      if (isActive(ev, now)) when.textContent = "happening now!";
      else { var d = daysUntil(ev, now); when.textContent = d === 1 ? "tomorrow" : "in " + d + " days"; }
      top.append(nm, when);
      var ds = document.createElement("p"); ds.className = "ev__desc"; ds.textContent = ev.desc + " · " + fmtRange(ev);
      body.append(top, ds);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ev__btn";
      btn.textContent = preview === ev ? "previewing" : isActive(ev, now) && !preview ? "on now" : "preview";
      btn.disabled = preview === ev || (isActive(ev, now) && !preview);
      btn.onclick = function () {
        preview = ev;
        apply(ev, true);
        stopBtn.hidden = false;
        toast("previewing " + ev.name + " " + ev.icon);
        renderList();
      };
      li.append(ic, body, btn);
      list.appendChild(li);
    });
  }

  function open() {
    renderList();
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add("is-open"); });
    closeBtn.focus({ preventScroll: true });
  }
  function close() {
    panel.classList.remove("is-open");
    setTimeout(function () { panel.hidden = true; }, 300);
  }

  if (tab) {
    tab.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    panel.addEventListener("click", function (e) { if (e.target === panel) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) close(); });
    stopBtn.addEventListener("click", function () {
      preview = null;
      stopBtn.hidden = true;
      apply(activeEvent, false);
      toast(activeEvent ? "back to " + activeEvent.name + " " + activeEvent.icon : "preview ended");
      renderList();
    });
  }

  // ── start ──
  function init() {
    var now = chicagoNow();
    activeEvent = EVENTS.filter(function (ev) { return isActive(ev, now); })[0] || null;
    lighting();
    apply(activeEvent, false);
    if (tab && activeEvent) {
      tab.classList.add("is-live");
      $("eventsTabText").textContent = activeEvent.name + " is here! " + activeEvent.icon;
    }
  }

  init();
  setInterval(lighting, 5 * 60 * 1000);
  window.whoopsiesSeasons = { events: EVENTS, preview: function (id) { var ev = EVENTS.filter(function (e) { return e.id === id; })[0]; if (ev) { preview = ev; apply(ev, true); } } };
})();
