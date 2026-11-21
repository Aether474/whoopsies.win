(function () {
  "use strict";

  var body = document.body;
  var intro = document.getElementById("intro");
  var audio = document.getElementById("audio");
  var musicBtn = document.getElementById("musicBtn");
  var video = document.getElementById("bgVideo");

  var TARGET_VOLUME = 0.45;
  var entered = false;
  var fadeTimer = null;

  // ── music ─────────────────────────────────────
  function fadeVolume(to, ms) {
    clearInterval(fadeTimer);
    var from = audio.volume;
    var steps = Math.max(1, Math.round(ms / 40));
    var i = 0;
    fadeTimer = setInterval(function () {
      i++;
      audio.volume = Math.min(1, Math.max(0, from + (to - from) * (i / steps)));
      if (i >= steps) clearInterval(fadeTimer);
    }, 40);
  }

  function setMuted(muted) {
    musicBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    musicBtn.setAttribute("aria-label", muted ? "Unmute music" : "Mute music");
    if (muted) {
      fadeVolume(0, 300);
      setTimeout(function () { if (musicBtn.getAttribute("aria-pressed") === "true") audio.pause(); }, 320);
    } else {
      audio.volume = 0;
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
      fadeVolume(TARGET_VOLUME, 600);
    }
  }

  musicBtn.addEventListener("click", function () {
    setMuted(musicBtn.getAttribute("aria-pressed") !== "true");
  });

  // ── click to enter ────────────────────────────
  function enter() {
    if (entered) return;
    entered = true;

    // Start audio inside the click so browsers allow it
    audio.volume = 0;
    var p = audio.play();
    if (p && p.then) {
      p.then(function () { fadeVolume(TARGET_VOLUME, 1800); })
       .catch(function () { setMuted(true); });
    } else {
      fadeVolume(TARGET_VOLUME, 1800);
    }

    // Some phones pause muted autoplay video until a tap
    if (video && video.paused) {
      var v = video.play();
      if (v && v.catch) v.catch(function () {});
    }

    intro.classList.add("is-gone");
    intro.setAttribute("aria-hidden", "true");
    intro.removeAttribute("tabindex");
    body.classList.remove("is-locked");
    body.classList.add("is-entered");
  }

  intro.addEventListener("click", enter);
  intro.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); }
  });
  document.addEventListener("keydown", function (e) {
    if (!entered && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); enter(); }
  });

  // Pause music when the tab is hidden, resume when back
  document.addEventListener("visibilitychange", function () {
    if (!entered || musicBtn.getAttribute("aria-pressed") === "true") return;
    if (document.hidden) {
      audio.pause();
    } else {
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    }
  });

  // ── fairy dust cursor (desktop only) ──────────
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && window.cursoreffects && window.cursoreffects.fairyDustCursor) {
    new window.cursoreffects.fairyDustCursor({
      colors: ["#ffccd5", "#ff9ab5", "#ff6699", "#e066a3", "#f0f0ff"]
    });
  }
})();
