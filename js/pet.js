/* Hidden pet: a tiny pixel puppy that wanders across the bottom of the screen now and then */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 16 x 10 pixel art, facing right. k = black fur, w = white, p = pink, e = eye
  var BODY = [
    "..........kk....",
    ".........kwkk...",
    "........kkkkkk..",
    "k......kkkekkkk.",
    "kk.....kkkkkkkkp",
    ".kkkkkkkppkkk...",
    ".kkkkkkkkkkk....",
    ".kkkkkkkkkkk...."
  ];
  var LEGS_A = [".kk.kk...kk.kk..", ".kk.kk...kk.kk.."];
  var LEGS_B = ["..kk.kk.kk.kk...", "..kk.kk.kk.kk..."];
  var COLORS = { k: "#17141c", w: "#ffffff", p: "#ff7aa5", e: "#ffffff" };

  function rects(rows, y0) {
    var out = "";
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var c = row.charAt(x);
        if (c !== ".") out += '<rect x="' + x + '" y="' + (y + y0) + '" width="1.02" height="1.02" fill="' + COLORS[c] + '"/>';
      }
    });
    return out;
  }

  var svg =
    '<svg viewBox="0 0 16 10" shape-rendering="crispEdges">' +
      rects(BODY, 0) +
      '<g class="pet__legs pet__legs--a">' + rects(LEGS_A, 8) + '</g>' +
      '<g class="pet__legs pet__legs--b">' + rects(LEGS_B, 8) + '</g>' +
    '</svg>';

  var pet = document.createElement("button");
  pet.type = "button";
  pet.className = "pet";
  pet.setAttribute("aria-label", "a tiny puppy");
  pet.innerHTML = '<span class="pet__sprite">' + svg + '</span><span class="pet__shadow"></span>';
  pet.hidden = true;
  document.body.appendChild(pet);

  // a little bone on the floor: click it to call the puppy back
  var bone = document.createElement("button");
  bone.type = "button";
  bone.className = "bone";
  bone.setAttribute("aria-label", "call the puppy");
  bone.title = "call the puppy";
  bone.innerHTML = '<svg viewBox="0 0 40 18"><path d="M9 3a4 4 0 0 0-3.4 6A4 4 0 1 0 9 15h22a4 4 0 1 0 3.4-6A4 4 0 1 0 31 3Z" fill="#fff" stroke="#2a0f1b" stroke-width="2"/></svg>';
  bone.hidden = true;
  document.body.appendChild(bone);

  var TRICKS = ["jump", "spin", "sit"];
  var trickIdx = 0;

  // movement state
  var x = -80, dir = 1, mode = "gone", speed = 62, until = 0, stops = [], target = null;
  var timer = null, raf = 0, last = 0, seenOnce = false;

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("is-shown");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("is-shown"); }, 2600);
  }

  function vw() { return window.innerWidth; }
  function boneX() { return vw() / 2; }

  function setMode(m, ms) {
    mode = m;
    until = ms ? performance.now() + ms : 0;
    pet.classList.toggle("is-walking", m === "walk" || m === "run");
    pet.classList.toggle("is-sitting", m === "sit" || m === "wait" || m === "stay");
  }

  function place() {
    pet.style.transform = "translateX(" + Math.round(x) + "px)";
    pet.classList.toggle("is-left", dir < 0);
  }

  function enter(fetching) {
    clearTimeout(timer);
    if (!document.body.classList.contains("is-entered")) return schedule();
    seenOnce = true;
    var fromLeft = Math.random() < 0.5;
    dir = fromLeft ? 1 : -1;
    x = fromLeft ? -70 : vw() + 14;
    target = fetching ? boneX() - 28 : null;
    // one or two places to stop and sit on the way across
    stops = fetching ? [] : [0.25 + Math.random() * 0.2, 0.6 + Math.random() * 0.2].map(function (f) { return f * vw(); });
    if (!fetching && Math.random() < 0.4) stops.pop();
    pet.hidden = false;
    bone.hidden = true;
    setMode(fetching ? "run" : "walk");
    place();
    loop();
  }

  function leave() {
    pet.hidden = true;
    setMode("gone");
    cancelAnimationFrame(raf);
    raf = 0;
    if (seenOnce) bone.hidden = false;
    schedule();
  }

  function loop() {
    if (raf) return;
    last = performance.now();
    var step = function (now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) { raf = requestAnimationFrame(step); return; }

      if (mode === "walk" || mode === "run") {
        var sp = mode === "run" ? speed * 2.4 : speed;
        x += dir * sp * dt;
        if (target !== null && ((dir > 0 && x >= target) || (dir < 0 && x <= target))) {
          x = target; target = null;
          setMode("stay", 6000);
          toast("she found the bone! \u2661");
        } else if (stops.length && ((dir > 0 && x >= stops[0]) || (dir < 0 && x <= stops[0] - 56))) {
          stops.shift();
          setMode("sit", 2500 + Math.random() * 2500);
        }
        if (x > vw() + 20 || x < -80) { leave(); return; }
      } else if (until && now >= until) {
        setMode("walk");
      }
      place();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function schedule(first) {
    clearTimeout(timer);
    timer = setTimeout(function () { enter(false); }, first ? 10000 + Math.random() * 10000 : 20000 + Math.random() * 15000);
  }

  pet.addEventListener("click", function () {
    var trick = TRICKS[trickIdx++ % TRICKS.length];
    pet.classList.remove("do-jump", "do-spin", "do-sit");
    void pet.offsetWidth;
    pet.classList.add("do-" + trick);
    // she waits around a bit when you pet her
    setMode("wait", 4000);
    var n = (parseInt(store("whoopsies-pets"), 10) || 0) + 1;
    store("whoopsies-pets", String(n));
    var r = pet.getBoundingClientRect();
    var h = document.createElement("span");
    h.className = "pet__heart";
    h.textContent = "\u2665";
    h.style.left = (r.left + r.width / 2) + "px";
    h.style.top = (r.top - 4) + "px";
    document.body.appendChild(h);
    setTimeout(function () { h.remove(); }, 1000);
    toast(n === 1 ? "you found the puppy! \u2661" : "good puppy \u2661 (pets: " + n + ")");
    document.dispatchEvent(new CustomEvent("whoopsies:pet", { detail: n }));
  });
  pet.addEventListener("animationend", function () { pet.classList.remove("do-jump", "do-spin", "do-sit"); });

  bone.addEventListener("click", function () {
    if (mode !== "gone") return;
    toast("here, puppy puppy\u2026");
    enter(true);
  });

  window.addEventListener("resize", function () { if (mode === "gone") return; place(); });

  if (!reduce) schedule(true);
  window.whoopsiesPet = { walk: function () { enter(false); }, call: function () { enter(true); } };
})();
