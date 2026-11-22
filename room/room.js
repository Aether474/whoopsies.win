/* The secret room: night sky, a moon, and lanterns you can let go */
(function () {
  "use strict";

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  var $ = function (id) { return document.getElementById(id); };

  var unlocked = store("whoopsies-reward") === "1";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── sky ──
  var canvas = $("sky"), ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = 1, stars = [], lanterns = [], shooting = [];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    var n = Math.round((W * H) / 3500);
    for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.85, r: Math.random() * 1.4 + 0.3, t: Math.random() * 6, s: 0.5 + Math.random() * 1.5 });
  }
  resize();
  window.addEventListener("resize", resize);

  function addLantern(x, y, mine) {
    lanterns.push({
      x: x, y: y, vy: -(18 + Math.random() * 16), sway: Math.random() * 6,
      size: mine ? 22 : 10 + Math.random() * 10, life: 1, mine: !!mine
    });
  }
  // a few lanterns already drifting up
  if (unlocked) for (var i = 0; i < 10; i++) addLantern(Math.random() * W, H * (0.4 + Math.random() * 0.8), false);

  function drawLantern(l, t) {
    var x = l.x + Math.sin(t * 0.6 + l.sway) * 8, y = l.y, s = l.size;
    var a = Math.min(1, l.life);
    var g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.6);
    g.addColorStop(0, "rgba(255,200,110," + 0.55 * a + ")");
    g.addColorStop(1, "rgba(255,160,80,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, s * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = a;
    ctx.fillStyle = l.mine ? "#ffd27a" : "#ffb866";
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - s * 0.7);
    ctx.lineTo(x + s * 0.5, y - s * 0.7);
    ctx.lineTo(x + s * 0.62, y + s * 0.55);
    ctx.lineTo(x - s * 0.62, y + s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,245,220,0.9)";
    ctx.fillRect(x - s * 0.18, y + s * 0.2, s * 0.36, s * 0.25);
    ctx.globalAlpha = 1;
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000), t = now / 1000;
    last = now;
    ctx.clearRect(0, 0, W, H);

    // stars
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * s.s + s.t));
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // moon
    var mx = W * 0.8, my = H * 0.18, mr = Math.min(W, H) * 0.07;
    var mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
    mg.addColorStop(0, "rgba(255,240,200,0.35)");
    mg.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, mr * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff4d6";
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(220,205,170,0.35)";
    ctx.beginPath(); ctx.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.12, 0, Math.PI * 2); ctx.fill();

    // occasional shooting star
    if (!reduce && Math.random() < 0.004) shooting.push({ x: Math.random() * W, y: Math.random() * H * 0.3, life: 1 });
    for (var k = shooting.length - 1; k >= 0; k--) {
      var st = shooting[k];
      st.x -= 9; st.y += 4; st.life -= 0.02;
      if (st.life <= 0) { shooting.splice(k, 1); continue; }
      ctx.strokeStyle = "rgba(255,255,255," + st.life + ")";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.lineTo(st.x + 60, st.y - 27); ctx.stroke();
    }

    // lanterns
    for (var j = lanterns.length - 1; j >= 0; j--) {
      var l = lanterns[j];
      if (!reduce) l.y += l.vy * dt;
      if (l.y < H * 0.25) l.life -= dt * 0.25;
      if (l.life <= 0 || l.y < -60) {
        lanterns.splice(j, 1);
        if (!l.mine && unlocked) addLantern(Math.random() * W, H + 40, false);
        continue;
      }
      drawLantern(l, t);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (!unlocked) { $("locked").hidden = false; return; }

  // ── music: the song, slowed down ──
  var music = $("music"), mute = $("mute");
  var muted = store("whoopsies-muted") === "1";
  function syncMute() {
    mute.classList.toggle("is-muted", muted);
    mute.setAttribute("aria-label", muted ? "Unmute music" : "Mute music");
  }

  function startMusic() {
    music.playbackRate = 0.82;
    if ("preservesPitch" in music) music.preservesPitch = false;
    if ("webkitPreservesPitch" in music) music.webkitPreservesPitch = false;
    music.volume = muted ? 0 : 0.4;
    var p = music.play();
    if (p && p.catch) p.catch(function () {});
  }

  mute.addEventListener("click", function (e) {
    e.stopPropagation();
    muted = !muted;
    store("whoopsies-muted", muted ? "1" : "0");
    music.volume = muted ? 0 : 0.4;
    if (!muted && music.paused) startMusic();
    syncMute();
  });

  // ── enter ──
  var gate = $("gate"), room = $("room"), entered = false;
  gate.hidden = false;

  function countText() {
    var n = parseInt(store("whoopsies-lanterns"), 10) || 0;
    $("count").textContent = n ? "lanterns you've let go: " + n + " ✧" : "";
  }

  function enter() {
    if (entered) return;
    entered = true;
    gate.hidden = true;
    room.hidden = false;
    mute.hidden = false;
    syncMute();
    startMusic();
    countText();
  }

  document.addEventListener("click", function (e) {
    if (!entered) { enter(); return; }
    if (e.target.closest(".letter") || e.target.closest(".mute")) return;
    addLantern(e.clientX, e.clientY, true);
    var n = (parseInt(store("whoopsies-lanterns"), 10) || 0) + 1;
    store("whoopsies-lanterns", String(n));
    countText();
  });
  document.addEventListener("keydown", function (e) { if (!entered && (e.key === "Enter" || e.key === " ")) enter(); });
})();
