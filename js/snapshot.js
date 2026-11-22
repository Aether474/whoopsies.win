/* Snapshot: draws a shareable picture of the card */
(function () {
  "use strict";

  var btn = document.getElementById("snapBtn");
  var modal = document.getElementById("snap");
  var img = document.getElementById("snapImg");
  var saveBtn = document.getElementById("snapSave");
  var shareBtn = document.getElementById("snapShare");
  var closeBtn = document.getElementById("snapClose");
  if (!btn) return;

  var W = 1080, H = 1350;
  var currentBlob = null, currentUrl = null;

  function mono() { return document.documentElement.classList.contains("theme-mono"); }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCover(ctx, src, sw, sh) {
    var s = Math.max(W / sw, H / sh);
    var dw = sw * s, dh = sh * s;
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  function sparkle(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  function loadImg(src) {
    return new Promise(function (res, rej) {
      var i = new Image();
      i.onload = function () { res(i); };
      i.onerror = rej;
      i.src = src;
    });
  }

  async function render() {
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var ctx = c.getContext("2d");
    var isMono = mono();
    var accent = isMono ? ["#ffffff", "#d8d5df", "#b5b0c2"] : ["#ffccd5", "#ff9ab5", "#ff6699"];

    try { await document.fonts.load("800 96px Satoshi"); await document.fonts.load("500 40px Satoshi"); } catch (e) {}

    // background: current video frame (or poster)
    var video = document.getElementById("bgVideo");
    try {
      if (isMono) ctx.filter = "grayscale(1) brightness(1.2)";
      if (video && video.readyState >= 2) drawCover(ctx, video, video.videoWidth, video.videoHeight);
      else { var poster = await loadImg("images/bg-poster.jpg"); drawCover(ctx, poster, poster.width, poster.height); }
    } catch (e) {
      ctx.fillStyle = "#14080d"; ctx.fillRect(0, 0, W, H);
    }
    ctx.filter = "none";
    var shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "rgba(10,4,8,0.25)");
    shade.addColorStop(1, "rgba(10,4,8,0.55)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);

    // card
    var cx = 140, cy = 430, cw = W - 280, ch = 600;
    ctx.save();
    roundRect(ctx, cx, cy, cw, ch, 48);
    ctx.fillStyle = isMono ? "rgba(36,36,42,0.72)" : "rgba(24,10,18,0.72)";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 60;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, cx, cy, cw, ch, 48);
    ctx.strokeStyle = isMono ? "rgba(255,255,255,0.22)" : "rgba(255,204,213,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // profile picture with silver ring
    var px = W / 2, py = cy, pr = 150;
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.4)";
    ctx.shadowBlur = 40;
    var ring = ctx.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
    ring.addColorStop(0, "#ffffff"); ring.addColorStop(0.5, "#b9b4c2"); ring.addColorStop(1, "#ffffff");
    ctx.fillStyle = ring;
    ctx.beginPath(); ctx.arc(px, py, pr + 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    try {
      var pfp = await loadImg(document.querySelector("#avatar img").getAttribute("src"));
      ctx.save();
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(pfp, px - pr, py - pr, pr * 2, pr * 2);
      ctx.restore();
    } catch (e) {}
    // online dot
    ctx.fillStyle = "#1d0c14";
    ctx.beginPath(); ctx.arc(px + 108, py + 108, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#23a55a";
    ctx.beginPath(); ctx.arc(px + 108, py + 108, 20, 0, Math.PI * 2); ctx.fill();

    // name
    var name = (document.querySelector(".card__name-text") || {}).textContent || "person";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "800 104px Satoshi, system-ui, sans-serif";
    var tw = ctx.measureText(name).width;
    var g = ctx.createLinearGradient(px - tw / 2, 0, px + tw / 2, 0);
    g.addColorStop(0, accent[0]); g.addColorStop(0.5, accent[1]); g.addColorStop(1, accent[2]);
    ctx.save();
    ctx.shadowColor = isMono ? "rgba(255,255,255,0.35)" : "rgba(255,102,153,0.5)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = g;
    ctx.fillText(name, px, cy + 290);
    ctx.restore();
    sparkle(ctx, px - tw / 2 - 34, cy + 220, 14, accent[0]);
    sparkle(ctx, px + tw / 2 + 36, cy + 270, 18, accent[1]);

    // badges
    var badgeEls = Array.prototype.filter.call(document.querySelectorAll(".badge"), function (b) { return !b.hidden; });
    var GLYPH = { "whoopsies certified": "♥", "sleepy": "☾", "sparkly": "✦", "secret finder": "♛" };
    var bs = 64, gap = 18, total = badgeEls.length * bs + (badgeEls.length - 1) * gap;
    badgeEls.forEach(function (b, i) {
      var bx = px - total / 2 + i * (bs + gap), by = cy + 330;
      var tip = b.getAttribute("data-tip");
      var gold = tip === "secret finder";
      roundRect(ctx, bx, by, bs, bs, 18);
      ctx.fillStyle = gold ? "rgba(255,215,106,0.18)" : isMono ? "rgba(255,255,255,0.1)" : "rgba(255,154,181,0.14)";
      ctx.fill();
      ctx.strokeStyle = gold ? "rgba(255,215,106,0.45)" : isMono ? "rgba(255,255,255,0.25)" : "rgba(255,154,181,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = gold ? "#ffd76a" : accent[1];
      ctx.font = "600 34px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(GLYPH[tip] || "✦", bx + bs / 2, by + bs / 2 + 2);
    });
    ctx.textBaseline = "alphabetic";

    // bio
    ctx.font = "500 44px Satoshi, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,236,242,0.85)";
    var bio = (document.querySelector('meta[name="description"]') || {}).content || "";
    ctx.fillText(bio, px, cy + 490);

    // footer
    ctx.font = "700 36px Satoshi, system-ui, sans-serif";
    ctx.fillStyle = accent[1];
    ctx.fillText("whoopsies.win ♡", px, H - 120);
    ctx.font = "500 26px Satoshi, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }), px, H - 76);

    // a few sparkles
    for (var s = 0; s < 18; s++) {
      sparkle(ctx, Math.random() * W, Math.random() * (cy - 180) + 40, 4 + Math.random() * 8, "rgba(255,255,255," + (0.4 + Math.random() * 0.5) + ")");
    }

    return new Promise(function (res) { c.toBlob(res, "image/png"); });
  }

  function open() {
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add("is-open"); });
  }
  function close() {
    modal.classList.remove("is-open");
    setTimeout(function () { modal.hidden = true; }, 300);
  }

  btn.addEventListener("click", async function () {
    btn.disabled = true;
    try {
      currentBlob = await render();
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = URL.createObjectURL(currentBlob);
      img.src = currentUrl;
      var file = new File([currentBlob], "person-whoopsies.png", { type: "image/png" });
      shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      open();
    } catch (e) {
      console.warn("snapshot failed", e);
    } finally {
      btn.disabled = false;
    }
  });

  saveBtn.addEventListener("click", function () {
    if (!currentUrl) return;
    var a = document.createElement("a");
    a.href = currentUrl;
    a.download = "person-whoopsies.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  shareBtn.addEventListener("click", async function () {
    if (!currentBlob) return;
    try {
      await navigator.share({ files: [new File([currentBlob], "person-whoopsies.png", { type: "image/png" })], title: "person · whoopsies.win" });
    } catch (e) {}
  });

  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });
})();
