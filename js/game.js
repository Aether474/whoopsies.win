/* Bone catch: move the puppy, catch falling bones for 30 seconds */
(function () {
  "use strict";

  var openBtn = document.getElementById("gameTab");
  var wrap = document.getElementById("game");
  var canvas = document.getElementById("gameCanvas");
  var startBtn = document.getElementById("gameStart");
  var closeBtn = document.getElementById("gameClose");
  var overlayEl = document.getElementById("gameOverlay");
  var titleEl = document.getElementById("gameTitle");
  var textEl = document.getElementById("gameText");
  if (!openBtn || !canvas) return;
  var ctx = canvas.getContext("2d");

  var W = 360, H = 480, DPR = 1;
  var ROUND = 30;

  // same puppy as the one that walks around the site
  var BODY = [
    "..........kk....", ".........kwkk...", "........kkkkkk..", "k......kkkekkkk.",
    "kk.....kkkkkkkkp", ".kkkkkkkppkkk...", ".kkkkkkkkkkk....", ".kkkkkkkkkkk....",
    ".kk.kk...kk.kk..", ".kk.kk...kk.kk.."
  ];
  var COLORS = { k: "#17141c", w: "#ffffff", p: "#ff7aa5", e: "#ffffff" };

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function mono() { return document.documentElement.classList.contains("theme-mono"); }

  var state = "idle", px = W / 2, targetX = W / 2, facing = 1;
  var items = [], pops = [], score = 0, timeLeft = ROUND, spawnT = 0, last = 0, raf = 0, startedAt = 0;
  var keys = {};

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function drawPup(x, y, s, flip) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    for (var r = 0; r < BODY.length; r++) {
      for (var c = 0; c < 16; c++) {
        var ch = BODY[r].charAt(c);
        if (ch === ".") continue;
        ctx.fillStyle = COLORS[ch];
        ctx.fillRect((c - 8) * s, (r - 10) * s, s + 0.5, s + 0.5);
      }
    }
    ctx.restore();
  }

  function drawBone(x, y, rot, gold, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    var w = size, h = size * 0.5, r = h * 0.34;
    ctx.fillStyle = gold ? "#ffd76a" : "#ffffff";
    ctx.strokeStyle = "#2a0f1b";
    ctx.lineWidth = 2;
    if (gold) { ctx.shadowColor = "rgba(255,215,106,0.95)"; ctx.shadowBlur = 16; }
    ctx.beginPath();
    // four round knobs + the shaft
    [[-w / 2 + r, -h / 2 + r], [-w / 2 + r, h / 2 - r], [w / 2 - r, -h / 2 + r], [w / 2 - r, h / 2 - r]].forEach(function (c) {
      ctx.moveTo(c[0] + r, c[1]);
      ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
    });
    ctx.rect(-w / 2 + r, -h * 0.2, w - r * 2, h * 0.4);
    ctx.stroke();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function background() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    if (mono()) { g.addColorStop(0, "#2a2a31"); g.addColorStop(1, "#141418"); }
    else { g.addColorStop(0, "#2b1430"); g.addColorStop(1, "#120810"); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // floor
    ctx.fillStyle = mono() ? "#3a3a42" : "#3a1f36";
    ctx.fillRect(0, H - 34, W, 34);
    // a few stars
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (var i = 0; i < 18; i++) {
      var sx = (i * 97) % W, sy = (i * 53) % (H - 120);
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  function hud() {
    ctx.fillStyle = "#fff";
    ctx.font = "800 22px Satoshi, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(String(score), 14, 32);
    ctx.font = "600 12px Satoshi, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("bones", 14, 48);
    ctx.textAlign = "center";
    ctx.font = "800 22px Satoshi, system-ui, sans-serif";
    ctx.fillStyle = timeLeft <= 5 ? "#ff8fb1" : "#fff";
    ctx.fillText(Math.ceil(timeLeft) + "s", W / 2, 32);
    // time bar
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = mono() ? "#ffffff" : "#ff6699";
    ctx.fillRect(0, 0, W * (timeLeft / ROUND), 4);
  }

  function spawn() {
    var gold = Math.random() < 0.1;
    items.push({
      x: 24 + Math.random() * (W - 48), y: -20,
      vy: 120 + Math.random() * 70 + (ROUND - timeLeft) * 4,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 4,
      gold: gold, size: gold ? 34 : 30
    });
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (state === "play") {
      if (keys.left) targetX -= 420 * dt;
      if (keys.right) targetX += 420 * dt;
      targetX = Math.max(26, Math.min(W - 26, targetX));
      var dx = targetX - px;
      if (Math.abs(dx) > 1) facing = dx > 0 ? 1 : -1;
      px += dx * Math.min(1, dt * 14);

      timeLeft = ROUND - (now - startedAt) / 1000;
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = Math.max(0.28, 0.75 - (ROUND - timeLeft) * 0.014); }

      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        it.y += it.vy * dt;
        it.rot += it.vr * dt;
        // catch zone: puppy's head/back
        if (it.y > H - 70 && it.y < H - 34 && Math.abs(it.x - px) < 34) {
          var pts = it.gold ? 5 : 1;
          score += pts;
          pops.push({ x: it.x, y: it.y, t: 0, txt: "+" + pts, gold: it.gold });
          items.splice(i, 1);
          continue;
        }
        if (it.y > H + 30) items.splice(i, 1);
      }
      if (timeLeft <= 0) { timeLeft = 0; end(); }
    }

    background();
    for (var j = 0; j < items.length; j++) drawBone(items[j].x, items[j].y, items[j].rot, items[j].gold, items[j].size);
    // soft light so the black puppy stands out
    var halo = ctx.createRadialGradient(px, H - 50, 4, px, H - 50, 60);
    halo.addColorStop(0, mono() ? "rgba(255,255,255,0.28)" : "rgba(255,170,200,0.3)");
    halo.addColorStop(1, "rgba(255,170,200,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(px - 60, H - 110, 120, 80);
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.7)";
    ctx.shadowBlur = 6;
    drawPup(px, H - 34, 3.4, facing < 0);
    ctx.restore();
    for (var k = pops.length - 1; k >= 0; k--) {
      var p = pops[k];
      p.t += dt;
      if (p.t > 0.8) { pops.splice(k, 1); continue; }
      ctx.globalAlpha = 1 - p.t / 0.8;
      ctx.fillStyle = p.gold ? "#ffd76a" : (mono() ? "#fff" : "#ff9ab5");
      ctx.font = "800 18px Satoshi, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.txt, p.x, p.y - p.t * 50);
      ctx.globalAlpha = 1;
    }
    if (state !== "idle") hud();

    if (!wrap.hidden) raf = requestAnimationFrame(frame);
  }

  function showOverlay(title, text, btn) {
    titleEl.textContent = title;
    textEl.textContent = text;
    startBtn.textContent = btn;
    overlayEl.hidden = false;
  }

  function start() {
    items = []; pops = []; score = 0; timeLeft = ROUND; spawnT = 0.4;
    startedAt = performance.now();
    px = targetX = W / 2;
    state = "play";
    overlayEl.hidden = true;
    canvas.focus({ preventScroll: true });
  }

  function end() {
    state = "over";
    items = [];
    var best = parseInt(store("whoopsies-game-best"), 10) || 0;
    var newBest = score > best;
    if (newBest) store("whoopsies-game-best", String(score));
    showOverlay(newBest ? "new best! ♡" : "time's up!",
      "you caught " + score + " bone" + (score === 1 ? "" : "s") + ". best: " + Math.max(score, best),
      "play again");
    document.dispatchEvent(new CustomEvent("whoopsies:game", { detail: score }));
  }

  function open() {
    wrap.hidden = false;
    requestAnimationFrame(function () { wrap.classList.add("is-open"); });
    resize();
    state = "idle";
    var best = parseInt(store("whoopsies-game-best"), 10) || 0;
    showOverlay("bone catch", "move the puppy to catch falling bones! golden bones are worth 5." + (best ? " your best: " + best : ""), "start");
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function close() {
    wrap.classList.remove("is-open");
    state = "idle";
    setTimeout(function () { wrap.hidden = true; cancelAnimationFrame(raf); }, 300);
  }

  function pointerTo(clientX) {
    var r = canvas.getBoundingClientRect();
    targetX = ((clientX - r.left) / r.width) * W;
  }

  canvas.addEventListener("pointermove", function (e) { if (state === "play") pointerTo(e.clientX); });
  canvas.addEventListener("pointerdown", function (e) { if (state === "play") pointerTo(e.clientX); });
  canvas.addEventListener("touchmove", function (e) { if (state === "play" && e.touches[0]) { pointerTo(e.touches[0].clientX); e.preventDefault(); } }, { passive: false });

  document.addEventListener("keydown", function (e) {
    if (wrap.hidden) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { keys.left = true; e.preventDefault(); e.stopPropagation(); }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { keys.right = true; e.preventDefault(); e.stopPropagation(); }
    if (e.key === "Escape") close();
  }, true);
  document.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  });

  openBtn.addEventListener("click", open);
  startBtn.addEventListener("click", start);
  closeBtn.addEventListener("click", close);
  wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });

  window.whoopsiesGame = { open: open };
})();
