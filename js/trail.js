/* Glowing ribbon cursor trail with sparkles (desktop only) */
(function () {
  "use strict";

  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || reduce) return;

  var canvas = document.createElement("canvas");
  canvas.className = "trail-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  var dpr = 1, W = 0, H = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  var PINK = ["#ffccd5", "#ff9ab5", "#ff6699", "#e066a3", "#f0f0ff"];
  var MONO = ["#ffffff", "#e6e4ec", "#c9c5d3", "#a9a4b6", "#ffffff"];
  var COLORS = PINK;
  function syncTheme() {
    mono = document.documentElement.classList.contains("theme-mono");
    COLORS = mono ? MONO : PINK;
  }
  var mono = false;
  syncTheme();
  document.addEventListener("whoopsies:theme", syncTheme);
  var points = [];        // ribbon points {x, y, t}
  var sparks = [];        // sparkles
  var LIFE = 380;         // ms a ribbon point lives
  var last = null;
  var running = false;

  function addSpark(x, y, vx, vy, big) {
    sparks.push({
      x: x, y: y,
      vx: vx + (Math.random() - 0.5) * 0.8,
      vy: vy + (Math.random() - 0.5) * 0.8 - 0.3,
      life: 1,
      decay: 0.012 + Math.random() * 0.02,
      size: (big ? 5 : 2.5) + Math.random() * 3,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.15,
      heart: big && Math.random() < 0.6
    });
  }

  window.addEventListener("mousemove", function (e) {
    var now = performance.now();
    var x = e.clientX, y = e.clientY;
    points.push({ x: x, y: y, t: now });
    if (last) {
      var dx = x - last.x, dy = y - last.y;
      var speed = Math.sqrt(dx * dx + dy * dy);
      var n = Math.min(3, Math.floor(speed / 14));
      for (var i = 0; i < n; i++) addSpark(x, y, -dx * 0.03, -dy * 0.03, false);
      if (Math.random() < 0.08) addSpark(x, y, 0, 0, false);
    }
    last = { x: x, y: y };
    start();
  }, { passive: true });

  window.addEventListener("mousedown", function (e) {
    for (var i = 0; i < 10; i++) {
      var a = (Math.PI * 2 * i) / 10;
      addSpark(e.clientX, e.clientY, Math.cos(a) * 2.4, Math.sin(a) * 2.4, true);
    }
    start();
  });

  function drawStar(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 8;
    var r = s.size * (0.6 + 0.4 * s.life);
    ctx.beginPath();
    if (s.heart) {
      var k = r / 6;
      ctx.moveTo(0, 3 * k);
      ctx.bezierCurveTo(-7 * k, -2 * k, -3 * k, -7 * k, 0, -3.5 * k);
      ctx.bezierCurveTo(3 * k, -7 * k, 7 * k, -2 * k, 0, 3 * k);
    } else {
      // 4-point sparkle
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
    }
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    var now = performance.now();
    ctx.clearRect(0, 0, W, H);

    while (points.length && now - points[0].t > LIFE) points.shift();

    // ribbon
    if (points.length > 2) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (var i = 1; i < points.length; i++) {
        var p0 = points[i - 1], p1 = points[i];
        var age = (now - p1.t) / LIFE;            // 0 new → 1 old
        var k = 1 - age;
        ctx.strokeStyle = mono
          ? "rgba(255,255,255," + (0.5 * k) + ")"
          : "rgba(255," + Math.round(120 + 80 * k) + "," + Math.round(170 + 40 * k) + "," + (0.55 * k) + ")";
        ctx.shadowColor = mono ? "rgba(255,255,255,0.8)" : "rgba(255,102,153,0.9)";
        ctx.shadowBlur = 12 * k;
        ctx.lineWidth = 1 + 5 * k;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // sparkles
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j];
      s.x += s.vx; s.y += s.vy;
      s.vx *= 0.96; s.vy = s.vy * 0.96 + 0.05;
      s.rot += s.spin;
      s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(j, 1); continue; }
      drawStar(s);
    }
    if (sparks.length > 220) sparks.splice(0, sparks.length - 220);

    if (points.length || sparks.length) {
      requestAnimationFrame(frame);
    } else {
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }
})();
