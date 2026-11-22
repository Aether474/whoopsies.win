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

  var walking = false, timer = null;
  var TRICKS = ["jump", "spin", "sit"];
  var trickIdx = 0;

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

  function walk() {
    if (walking || document.hidden || !document.body.classList.contains("is-entered")) return schedule();
    walking = true;
    var fromLeft = Math.random() < 0.5;
    var dur = 13000 + Math.random() * 6000;
    pet.hidden = false;
    pet.classList.toggle("is-left", !fromLeft);
    pet.style.transition = "none";
    pet.style.left = fromLeft ? "-70px" : "calc(100vw + 20px)";
    void pet.offsetWidth;
    pet.style.transition = "left " + dur + "ms linear";
    pet.style.left = fromLeft ? "calc(100vw + 20px)" : "-70px";
    setTimeout(function () {
      pet.hidden = true;
      walking = false;
      schedule();
    }, dur + 100);
  }

  function schedule(first) {
    clearTimeout(timer);
    timer = setTimeout(walk, first ? 15000 + Math.random() * 10000 : 40000 + Math.random() * 50000);
  }

  pet.addEventListener("click", function () {
    var trick = TRICKS[trickIdx++ % TRICKS.length];
    pet.classList.remove("do-jump", "do-spin", "do-sit");
    void pet.offsetWidth;
    pet.classList.add("do-" + trick);
    var n = (parseInt(store("whoopsies-pets"), 10) || 0) + 1;
    store("whoopsies-pets", String(n));
    var r = pet.getBoundingClientRect();
    var h = document.createElement("span");
    h.className = "pet__heart";
    h.textContent = "♥";
    h.style.left = (r.left + r.width / 2) + "px";
    h.style.top = (r.top - 4) + "px";
    document.body.appendChild(h);
    setTimeout(function () { h.remove(); }, 1000);
    toast(n === 1 ? "you found the puppy! ♡" : "good puppy ♡ (pets: " + n + ")");
  });
  pet.addEventListener("animationend", function () { pet.classList.remove("do-jump", "do-spin", "do-sit"); });

  if (!reduce) schedule(true);
  window.whoopsiesPet = { walk: walk };
})();
