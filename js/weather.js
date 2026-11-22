/* Weather in the room: petals, snow, rain, leaves, fireflies (+ shooting stars for a secret) */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = document.getElementById("weather");
  var btn = document.getElementById("weatherBtn");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var MODES = ["auto", "petals", "snow", "rain", "leaves", "fireflies", "off"];
  var ICONS = { petals: "❀", snow: "❄", rain: "☂", leaves: "❦", fireflies: "✧", hearts: "♥", fireworks: "✺", off: "⊘" };

  function seasonMode() {
    var m = new Date().getMonth(); // 0 = Jan
    if (m === 11 || m <= 1) return "snow";
    if (m <= 4) return "petals";
    if (m <= 7) return "fireflies";
    return "leaves";
  }

  var choice = "auto";
  try { choice = localStorage.getItem("whoopsies-weather") || "auto"; } catch (e) {}
  // hearts mode is the reward for finding all 5 secrets
  try { if (localStorage.getItem("whoopsies-reward") === "1") MODES.splice(MODES.length - 1, 0, "hearts"); } catch (e) {}
  if (MODES.indexOf(choice) < 0) choice = "auto";
  if (reduce && choice === "auto") choice = "off";

  var mode = "off";
  var autoOverride = null, forced = null; // set by seasonal events
  var sparks = [];
  var parts = [];
  var stars = [];
  var W = 0, H = 0, dpr = 1;
  var running = false;
  var lastT = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", function () { resize(); fill(); });

  function count() {
    var area = (W * H) / (1440 * 900);
    var base = { petals: 38, snow: 90, rain: 130, leaves: 26, fireflies: 34, hearts: 30, fireworks: 4 }[mode] || 0;
    if (mode === "fireworks") return base;
    return Math.round(base * Math.max(0.45, Math.min(area, 1.6)));
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function isMono() { return document.documentElement.classList.contains("theme-mono"); }
  document.addEventListener("whoopsies:theme", function () { if (mode !== "off") fill(); });

  function make(initial) {
    var p = { x: rand(0, W), y: initial ? rand(0, H) : rand(-60, -10), t: rand(0, Math.PI * 2) };
    switch (mode) {
      case "petals":
        p.r = rand(5, 10); p.vy = rand(0.5, 1.2); p.vx = rand(0.2, 0.9);
        p.rot = rand(0, Math.PI * 2); p.vr = rand(-0.03, 0.03); p.flip = rand(0.02, 0.05);
        p.c = (isMono() ? ["#ffffff", "#ecebf1", "#d9d6e0", "#f6f5f9"] : ["#ffc6d6", "#ffb3c7", "#ffd9e4", "#ff9ab5"])[(Math.random() * 4) | 0];
        p.a = rand(0.65, 0.95);
        break;
      case "snow":
        p.r = rand(1, 3.4); p.vy = rand(0.35, 1.1); p.vx = rand(-0.2, 0.2); p.a = rand(0.45, 0.95);
        break;
      case "rain":
        p.len = rand(10, 22); p.vy = rand(9, 15); p.vx = -1.6; p.a = rand(0.18, 0.4);
        if (!initial) p.y = rand(-H * 0.3, -10);
        break;
      case "leaves":
        p.r = rand(7, 12); p.vy = rand(0.6, 1.3); p.vx = rand(-0.4, 0.6);
        p.rot = rand(0, Math.PI * 2); p.vr = rand(-0.04, 0.04); p.flip = rand(0.02, 0.045);
        p.c = (isMono() ? ["#d9d6e0", "#b5b0c2", "#8d889b", "#efeef3", "#a39fb0"] : ["#e8835a", "#d9534f", "#f0a35e", "#e066a3", "#c96a3b"])[(Math.random() * 5) | 0];
        p.a = rand(0.7, 0.95);
        break;
      case "fireworks":
        p.y = H + 10; p.x = rand(W * 0.1, W * 0.9);
        p.vy = -rand(7, 10); p.top = rand(H * 0.1, H * 0.45);
        p.wait = initial ? rand(0, 160) : rand(30, 140);
        p.c = (isMono() ? ["#ffffff", "#dcdce4", "#bfbfcc"] : ["#ff6699", "#ffd76a", "#9fd8ff", "#c9a0ff", "#ffb3c7"])[(Math.random() * (isMono() ? 3 : 5)) | 0];
        break;
      case "hearts":
        p.r = rand(6, 12); p.vy = rand(0.5, 1.1); p.vx = rand(-0.3, 0.3);
        p.rot = rand(-0.4, 0.4); p.a = rand(0.6, 0.95);
        p.c = (isMono() ? ["#ffffff", "#e6e4ec", "#cfccd8", "#ffffff"] : ["#ff6699", "#ff9ab5", "#ffc6d6", "#e066a3"])[(Math.random() * 4) | 0];
        break;
      case "fireflies":
        p.y = rand(H * 0.25, H); p.r = rand(1.2, 2.6); p.vx = rand(-0.25, 0.25); p.vy = rand(-0.25, 0.1);
        p.pulse = rand(0.01, 0.03);
        break;
    }
    return p;
  }

  function fill() {
    parts = [];
    var n = count();
    for (var i = 0; i < n; i++) parts.push(make(true));
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(Math.abs(Math.cos(p.t)) * 0.8 + 0.2, 1);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    // sakura petal with a little notch
    var r = p.r;
    ctx.moveTo(0, r);
    ctx.bezierCurveTo(r * 0.9, r * 0.5, r * 0.8, -r * 0.7, r * 0.25, -r);
    ctx.lineTo(0, -r * 0.7);
    ctx.lineTo(-r * 0.25, -r);
    ctx.bezierCurveTo(-r * 0.8, -r * 0.7, -r * 0.9, r * 0.5, 0, r);
    ctx.fill();
    ctx.restore();
  }

  function drawLeaf(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(Math.abs(Math.cos(p.t)) * 0.8 + 0.2, 1);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = p.c;
    var r = p.r;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.9, -r * 0.2, 0, r);
    ctx.quadraticCurveTo(-r * 0.9, -r * 0.2, 0, -r);
    ctx.fill();
    ctx.strokeStyle = "rgba(60,20,10,0.35)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.8); ctx.lineTo(0, r * 1.25);
    ctx.stroke();
    ctx.restore();
  }

  function step(dt) {
    var wind = Math.sin(performance.now() / 4000) * 0.4;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.t += dt * 0.02;
      switch (mode) {
        case "petals":
        case "leaves":
          p.x += (p.vx + wind + Math.sin(p.t) * 0.6) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          p.t += p.flip * dt;
          break;
        case "fireworks":
          if (p.wait > 0) { p.wait -= dt; break; }
          p.y += p.vy * dt;
          if (p.y <= p.top) {
            var n = 46;
            for (var q = 0; q < n; q++) {
              var a = (Math.PI * 2 * q) / n + rand(-0.05, 0.05), sp = rand(1.5, 4.2);
              sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: p.c });
            }
            parts[i] = make(false);
            continue;
          }
          break;
        case "hearts":
          p.x += (p.vx + wind * 0.4 + Math.sin(p.t) * 0.5) * dt;
          p.y += p.vy * dt;
          break;
        case "snow":
          p.x += (p.vx + wind * 0.5 + Math.sin(p.t) * 0.3) * dt;
          p.y += p.vy * dt;
          break;
        case "rain":
          p.x += p.vx * dt; p.y += p.vy * dt;
          break;
        case "fireflies":
          p.vx += rand(-0.03, 0.03); p.vy += rand(-0.03, 0.03);
          p.vx = Math.max(-0.4, Math.min(0.4, p.vx)); p.vy = Math.max(-0.4, Math.min(0.4, p.vy));
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.t += p.pulse * dt;
          if (p.y < H * 0.1) p.vy += 0.05;
          break;
      }
      if (mode === "fireworks") continue;
      var off = mode === "fireflies"
        ? (p.x < -20 || p.x > W + 20 || p.y > H + 20)
        : (p.y > H + 30 || p.x < -40 || p.x > W + 40);
      if (off) parts[i] = make(false);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      switch (mode) {
        case "petals": drawPetal(p); break;
        case "leaves": drawLeaf(p); break;
        case "fireworks":
          if (p.wait > 0) break;
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.35;
          ctx.fillRect(p.x - 0.75, p.y, 1.5, 14);
          break;
        case "hearts":
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot + Math.sin(p.t) * 0.2);
          ctx.globalAlpha = p.a;
          ctx.fillStyle = p.c;
          var k = p.r / 6;
          ctx.beginPath();
          ctx.moveTo(0, 4 * k);
          ctx.bezierCurveTo(-7 * k, -1 * k, -3.5 * k, -7 * k, 0, -3 * k);
          ctx.bezierCurveTo(3.5 * k, -7 * k, 7 * k, -1 * k, 0, 4 * k);
          ctx.fill();
          ctx.restore();
          break;
        case "snow":
          ctx.globalAlpha = p.a;
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          break;
        case "rain":
          ctx.globalAlpha = p.a;
          ctx.strokeStyle = "#cfd8ff";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 1.4, p.y + p.len); ctx.stroke();
          break;
        case "fireflies":
          var glow = 0.35 + 0.65 * Math.abs(Math.sin(p.t));
          ctx.globalAlpha = glow;
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
          g.addColorStop(0, "rgba(255,240,170,1)");
          g.addColorStop(0.25, "rgba(255,214,120,0.55)");
          g.addColorStop(1, "rgba(255,200,100,0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2); ctx.fill();
          break;
      }
    }
    ctx.globalAlpha = 1;

    // firework sparks
    for (var f = sparks.length - 1; f >= 0; f--) {
      var k2 = sparks[f];
      k2.x += k2.vx; k2.y += k2.vy; k2.vy += 0.05; k2.vx *= 0.985; k2.life -= 0.014;
      if (k2.life <= 0) { sparks.splice(f, 1); continue; }
      ctx.globalAlpha = k2.life;
      ctx.fillStyle = k2.c;
      ctx.beginPath(); ctx.arc(k2.x, k2.y, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // shooting stars
    for (var j = stars.length - 1; j >= 0; j--) {
      var s = stars[j];
      s.x += s.vx; s.y += s.vy; s.life -= 0.012;
      if (s.life <= 0) { stars.splice(j, 1); continue; }
      var tx = s.x - s.vx * 9, ty = s.y - s.vy * 9;
      var grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, "rgba(255,255,255," + s.life + ")");
      grad.addColorStop(0.3, "rgba(255,170,200," + (s.life * 0.6) + ")");
      grad.addColorStop(1, "rgba(255,120,170,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255," + s.life + ")";
      ctx.beginPath(); ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  function loop(t) {
    if (!running) return;
    var dt = lastT ? Math.min(3, (t - lastT) / 16.67) : 1;
    lastT = t;
    step(dt);
    draw();
    if (mode === "off" && !stars.length && !sparks.length) { running = false; ctx.clearRect(0, 0, W, H); return; }
    requestAnimationFrame(loop);
  }

  function run() {
    if (running || document.hidden) return;
    running = true; lastT = 0;
    requestAnimationFrame(loop);
  }

  function applyChoice() {
    mode = forced || (choice === "auto" ? (autoOverride || seasonMode()) : choice);
    canvas.classList.toggle("is-rain", mode === "rain");
    fill();
    if (btn) {
      var label = forced ? "event · " + mode : choice === "auto" ? "auto · " + mode : mode;
      btn.querySelector(".weather-btn__icon").textContent = ICONS[mode] || ICONS.off;
      btn.querySelector(".weather-btn__label").textContent = label;
      btn.setAttribute("aria-label", "Weather: " + label + ". Click to change.");
    }
    if (mode !== "off") run();
    else if (!stars.length) ctx.clearRect(0, 0, W, H);
  }

  if (btn) {
    btn.addEventListener("click", function () {
      forced = null;
      choice = MODES[(MODES.indexOf(choice) + 1) % MODES.length];
      try { localStorage.setItem("whoopsies-weather", choice); } catch (e) {}
      applyChoice();
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) running = false;
    else if (mode !== "off" || stars.length) run();
  });

  applyChoice();

  window.whoopsiesWeather = {
    setAuto: function (m, isPreview) {
      if (isPreview) forced = m;
      else { forced = null; autoOverride = m; }
      applyChoice();
    },
    unlockHearts: function () {
      if (MODES.indexOf("hearts") < 0) MODES.splice(MODES.length - 1, 0, "hearts");
    },
    shootingStars: function (n) {
      n = n || 14;
      for (var i = 0; i < n; i++) {
        (function (i) {
          setTimeout(function () {
            var speed = rand(9, 14);
            var ang = rand(0.45, 0.75); // down-left
            stars.push({ x: rand(W * 0.3, W * 1.1), y: rand(-40, H * 0.35), vx: -Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 1 });
            run();
          }, i * rand(120, 260));
        })(i);
      }
    }
  };
})();
