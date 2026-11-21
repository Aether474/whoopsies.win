(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var body = document.body;
  var intro = $("intro");
  var audio = $("audio");
  var video = $("bgVideo");
  var card = $("card");
  var player = $("player");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var entered = false;

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ═════════════ music player ═════════════ */
  var playBtn = $("playBtn"), muteBtn = $("muteBtn"), volInput = $("vol");
  var seek = $("seek"), seekFill = $("seekFill"), tCur = $("tCur"), tDur = $("tDur");
  var savedVol = parseFloat(store("whoopsies-vol"));
  var volume = isNaN(savedVol) ? 0.45 : Math.min(1, Math.max(0, savedVol));
  var muted = store("whoopsies-muted") === "1";
  var fadeTimer = null;
  volInput.value = volume;

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function targetVol() { return muted ? 0 : volume; }

  function fadeTo(to, ms, done) {
    clearInterval(fadeTimer);
    var from = audio.volume, steps = Math.max(1, Math.round(ms / 40)), i = 0;
    fadeTimer = setInterval(function () {
      i++;
      audio.volume = Math.min(1, Math.max(0, from + (to - from) * (i / steps)));
      if (i >= steps) { clearInterval(fadeTimer); if (done) done(); }
    }, 40);
  }

  function tryPlay() {
    var p = audio.play();
    if (p && p.catch) p.catch(function () { syncPlayer(); });
  }

  function syncPlayer() {
    var paused = audio.paused;
    player.classList.toggle("is-paused", paused);
    playBtn.setAttribute("aria-label", paused ? "Play music" : "Pause music");
    player.classList.toggle("is-muted", muted || volume === 0);
    muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
  }

  playBtn.addEventListener("click", function () {
    if (audio.paused) {
      audio.volume = 0;
      tryPlay();
      fadeTo(targetVol(), 500);
    } else {
      fadeTo(0, 250, function () { audio.pause(); });
    }
  });

  muteBtn.addEventListener("click", function () {
    muted = !muted;
    if (!muted && volume === 0) { volume = 0.45; volInput.value = volume; }
    store("whoopsies-muted", muted ? "1" : "0");
    fadeTo(targetVol(), 250);
    syncPlayer();
  });

  volInput.addEventListener("input", function () {
    volume = parseFloat(volInput.value);
    muted = false;
    clearInterval(fadeTimer);
    audio.volume = volume;
    store("whoopsies-vol", String(volume));
    store("whoopsies-muted", "0");
    syncPlayer();
  });

  audio.addEventListener("play", syncPlayer);
  audio.addEventListener("pause", syncPlayer);
  function showDur() { if (audio.duration) tDur.textContent = fmt(audio.duration); }
  audio.addEventListener("loadedmetadata", showDur);
  audio.addEventListener("durationchange", showDur);
  showDur();
  audio.addEventListener("timeupdate", function () {
    var pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    seekFill.style.width = pct + "%";
    seek.setAttribute("aria-valuenow", Math.round(pct));
    tCur.textContent = fmt(audio.currentTime);
  });

  function seekTo(clientX) {
    var r = seek.getBoundingClientRect();
    var pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  }

  var dragging = false;
  seek.addEventListener("pointerdown", function (e) {
    dragging = true;
    seek.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
  });
  seek.addEventListener("pointermove", function (e) { if (dragging) seekTo(e.clientX); });
  seek.addEventListener("pointerup", function () { dragging = false; });
  seek.addEventListener("keydown", function (e) {
    if (!audio.duration) return;
    if (e.key === "ArrowRight") { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); e.preventDefault(); }
    if (e.key === "ArrowLeft") { audio.currentTime = Math.max(0, audio.currentTime - 5); e.preventDefault(); }
  });

  // Pause when the tab is hidden, pick up again when back
  var pausedByHide = false;
  document.addEventListener("visibilitychange", function () {
    if (!entered) return;
    if (document.hidden && !audio.paused) { pausedByHide = true; audio.pause(); }
    else if (!document.hidden && pausedByHide) { pausedByHide = false; tryPlay(); }
  });

  /* ═════════════ click to enter ═════════════ */
  function enter() {
    if (entered) return;
    entered = true;

    audio.volume = 0;
    var p = audio.play();
    if (p && p.then) p.then(function () { fadeTo(targetVol(), 1800); }).catch(syncPlayer);
    else fadeTo(targetVol(), 1800);

    if (video && video.paused) {
      var v = video.play();
      if (v && v.catch) v.catch(function () {});
    }

    intro.classList.add("is-gone");
    intro.setAttribute("aria-hidden", "true");
    intro.removeAttribute("tabindex");
    body.classList.remove("is-locked");
    body.classList.add("is-entered");
    setTimeout(function () { body.classList.add("is-ready"); }, 1400);
    setTimeout(startTyping, 900);
    syncPlayer();
  }

  intro.addEventListener("click", enter);
  document.addEventListener("keydown", function (e) {
    if (!entered && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); enter(); }
  });

  /* ═════════════ typing bio ═════════════ */
  var phrases = [
    "envy is just envy,",
    "KITTYYYYYY",
    "what the flip flop man",
    "tired",
    "whoopsies ♡"
  ];
  var typedEl = $("typed");
  var caret = document.querySelector(".caret");

  function startTyping() {
    if (reduceMotion) { typedEl.textContent = phrases[0]; return; }
    var i = 0, c = 0;
    function type() {
      var word = phrases[i];
      caret.classList.add("is-typing");
      if (c < word.length) {
        typedEl.textContent = word.slice(0, ++c);
        setTimeout(type, 75 + Math.random() * 60);
      } else {
        caret.classList.remove("is-typing");
        setTimeout(erase, 2200);
      }
    }
    function erase() {
      caret.classList.add("is-typing");
      if (c > 0) {
        typedEl.textContent = phrases[i].slice(0, --c);
        setTimeout(erase, 38);
      } else {
        caret.classList.remove("is-typing");
        i = (i + 1) % phrases.length;
        setTimeout(type, 500);
      }
    }
    type();
  }

  /* ═════════════ view counter ═════════════ */
  (function () {
    var el = $("views");
    var base = "https://abacus.jasoncameron.dev/";
    var ns = "whoopsies.win", key = "views";
    var last = parseInt(store("whoopsies-lastview"), 10) || 0;
    var isNew = Date.now() - last > 12 * 60 * 60 * 1000; // count each browser once per 12h
    var url = base + (isNew ? "hit/" : "get/") + ns + "/" + key;

    function show(n) {
      el.textContent = Number(n).toLocaleString();
      el.parentNode.setAttribute("title", Number(n).toLocaleString() + " views");
    }

    fetch(url)
      .then(function (r) {
        if (r.status === 404 && !isNew) return fetch(base + "hit/" + ns + "/" + key);
        return r;
      })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (typeof d.value !== "number") throw new Error("bad");
        if (isNew) store("whoopsies-lastview", String(Date.now()));
        show(d.value);
      })
      .catch(function () { el.textContent = "who needs that????"; });
  })();

  /* ═════════════ card tilt ═════════════ */
  if (finePointer && !reduceMotion) {
    var raf = 0;
    window.addEventListener("mousemove", function (e) {
      if (!body.classList.contains("is-ready")) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var x = e.clientX / window.innerWidth - 0.5;
        var y = e.clientY / window.innerHeight - 0.5;
        card.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
        card.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
      });
    });
    document.addEventListener("mouseleave", function () {
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--rx", "0deg");
    });
  }

  /* ═════════════ toast + hearts ═════════════ */
  var toastEl = $("toast"), fx = $("fx"), toastTimer = null;
  var HEARTS = ["♥", "♡", "✦", "♥"];

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-shown"); }, 2600);
  }

  function heartRain(count) {
    if (reduceMotion) return;
    for (var i = 0; i < count; i++) {
      (function (i) {
        setTimeout(function () {
          var h = document.createElement("span");
          h.className = "fx__heart fx__heart--rain";
          h.textContent = HEARTS[i % HEARTS.length];
          h.style.left = Math.random() * 100 + "vw";
          h.style.fontSize = 14 + Math.random() * 22 + "px";
          h.style.setProperty("--drift", (Math.random() * 120 - 60) + "px");
          h.style.setProperty("--spin", (Math.random() * 360 - 180) + "deg");
          h.style.animationDuration = 2.6 + Math.random() * 2.2 + "s";
          h.addEventListener("animationend", function () { h.remove(); });
          fx.appendChild(h);
        }, i * 70);
      })(i);
    }
  }

  function heartBurst(x, y, count) {
    if (reduceMotion) return;
    for (var i = 0; i < count; i++) {
      var h = document.createElement("span");
      var a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      var d = 60 + Math.random() * 70;
      h.className = "fx__heart fx__heart--burst";
      h.textContent = HEARTS[i % HEARTS.length];
      h.style.left = x + "px";
      h.style.top = y + "px";
      h.style.fontSize = 12 + Math.random() * 14 + "px";
      h.style.setProperty("--dx", Math.cos(a) * d + "px");
      h.style.setProperty("--dy", Math.sin(a) * d + "px");
      h.addEventListener("animationend", function () { this.remove(); });
      fx.appendChild(h);
    }
  }

  /* ═════════════ easter eggs ═════════════ */

  // 1) click the profile picture 5 times quickly
  var avatar = $("avatar"), clicks = 0, clickTimer = null;
  avatar.addEventListener("click", function () {
    clicks++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(function () { clicks = 0; }, 1200);
    var r = avatar.getBoundingClientRect();
    if (clicks >= 5) {
      clicks = 0;
      avatar.classList.remove("is-spinning");
      void avatar.offsetWidth;
      avatar.classList.add("is-spinning");
      heartBurst(r.left + r.width / 2, r.top + r.height / 2, 18);
      toast("whoopsies! ♡ you found one");
    } else {
      heartBurst(r.left + r.width / 2, r.top + r.height / 2, 3);
    }
  });
  avatar.addEventListener("animationend", function () { avatar.classList.remove("is-spinning"); });

  // 2) type "whoopsies" anywhere
  // 3) konami code toggles sleepy mode
  var typedBuf = "";
  var konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  var kIdx = 0;

  document.addEventListener("keydown", function (e) {
    if (!entered) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (k.length === 1) {
      typedBuf = (typedBuf + k).slice(-12);
      if (typedBuf.slice(-9) === "whoopsies") {
        typedBuf = "";
        heartRain(45);
        toast("you said the magic word ♡");
      }
    }

    kIdx = (k === konami[kIdx]) ? kIdx + 1 : (k === konami[0] ? 1 : 0);
    if (kIdx === konami.length) {
      kIdx = 0;
      var sleepy = body.classList.toggle("is-sleepy");
      audio.playbackRate = sleepy ? 0.85 : 1;
      if ("preservesPitch" in audio) audio.preservesPitch = false;
      toast(sleepy ? "sleepy mode... zzz ☾" : "good morning ☀");
    }
  });

  /* ═════════════ fairy dust cursor (desktop) ═════════════ */
  if (finePointer && window.cursoreffects && window.cursoreffects.fairyDustCursor) {
    new window.cursoreffects.fairyDustCursor({
      colors: ["#ffccd5", "#ff9ab5", "#ff6699", "#e066a3", "#f0f0ff"]
    });
  }

  syncPlayer();
})();
