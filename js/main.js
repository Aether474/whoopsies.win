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

  // Put your Discord user ID here (and join discord.gg/lanyard) to show live status
  var DISCORD_ID = "";

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

  /* ═════════════ loading screen ═════════════ */
  (function () {
    var fillEl = $("loadFill"), txt = $("loadTxt");
    var done = false, start = Date.now();

    function frac(m) {
      try {
        if (m.readyState >= 4) return 1;
        if (!m.duration || !m.buffered.length) return m.readyState >= 2 ? 0.5 : 0;
        return Math.min(1, m.buffered.end(m.buffered.length - 1) / m.duration);
      } catch (e) { return 0; }
    }

    function ready() {
      if (done) return;
      done = true;
      fillEl.style.width = "100%";
      setTimeout(function () { intro.classList.remove("is-loading"); }, 250);
    }

    function tick() {
      if (done) return;
      var v = video ? frac(video) : 1, a = frac(audio);
      var pct = Math.max(8, Math.round(((v + a) / 2) * 100));
      fillEl.style.width = pct + "%";
      var vOk = !video || video.readyState >= 3, aOk = audio.readyState >= 3;
      if (vOk && aOk) return ready();
      if (Date.now() - start > 8000) { txt.textContent = "almost there\u2026"; }
      if (Date.now() - start > 12000) return ready(); // don't keep anyone waiting forever
      setTimeout(tick, 150);
    }
    tick();
  })();

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
    setTimeout(startHints, 4000);
    syncPlayer();
  }

  intro.addEventListener("click", enter);
  document.addEventListener("keydown", function (e) {
    if (!entered && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); enter(); }
  });

  /* ═════════════ typing bio ═════════════ */
  var phrases = [
    "just a person, probably",
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

  /* ═════════════ secrets ═════════════ */
  var SECRETS = {
    boop:   "my picture likes boops\u2026 lots of them",
    word:   "there's a magic word. it's on the intro screen",
    konami: "gamers know a code \u2191\u2191\u2193\u2193\u2026",
    stars:  "the moon gets sleepy if you hold it"
  };
  var secretIds = Object.keys(SECRETS);
  var found = {};
  try { found = JSON.parse(store("whoopsies-secrets") || "{}") || {}; } catch (e) { found = {}; }
  var countEl = $("secretCount"), hintText = $("hintText");

  function foundCount() {
    return secretIds.filter(function (k) { return found[k]; }).length;
  }

  function renderCount() {
    var n = foundCount();
    countEl.textContent = n + "/" + secretIds.length;
    countEl.classList.toggle("is-done", n === secretIds.length);
  }
  renderCount();

  function markFound(id, msg) {
    var isNew = !found[id];
    found[id] = true;
    store("whoopsies-secrets", JSON.stringify(found));
    renderCount();
    var n = foundCount();
    if (isNew) {
      toast(msg + "  \u00b7  " + n + "/" + secretIds.length + " secrets");
      if (n === secretIds.length) setTimeout(function () { toast("you found every secret \u2661 ily"); heartRain(70); }, 2900);
    } else {
      toast(msg);
    }
  }

  function startHints() {
    var i = 0;
    function next() {
      var left = secretIds.filter(function (k) { return !found[k]; });
      var text = left.length ? SECRETS[left[i % left.length]] : "you found every secret \u2661";
      i++;
      if (hintText.textContent === text) return;
      hintText.classList.add("is-swapping");
      setTimeout(function () {
        hintText.textContent = text;
        hintText.parentNode.setAttribute("title", text);
        hintText.classList.remove("is-swapping");
      }, 350);
    }
    next();
    setInterval(next, 7000);
  }

  if (window.console && console.log) {
    console.log("%cwhoopsies \u2661", "color:#ff6699;font-size:20px;font-weight:900");
    console.log("%cpeeking at the code? try \u2191 \u2191 \u2193 \u2193 \u2190 \u2192 \u2190 \u2192 B A", "color:#ff9ab5");
  }


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
      markFound("boop", "boop! \u2661");
    } else {
      heartBurst(r.left + r.width / 2, r.top + r.height / 2, 3);
    }
  });
  avatar.addEventListener("animationend", function () { avatar.classList.remove("is-spinning"); });

  // 4) hold the moon badge
  var moon = $("moonBadge"), holdTimer = null;
  function holdStart(e) {
    if (e.button && e.button !== 0) return;
    moon.classList.add("is-holding");
    holdTimer = setTimeout(function () {
      moon.classList.remove("is-holding");
      if (window.whoopsiesWeather) window.whoopsiesWeather.shootingStars(16);
      markFound("stars", "make a wish \u2727");
    }, 1000);
  }
  function holdEnd() { clearTimeout(holdTimer); moon.classList.remove("is-holding"); }
  moon.addEventListener("pointerdown", holdStart);
  moon.addEventListener("pointerup", holdEnd);
  moon.addEventListener("pointerleave", holdEnd);
  moon.addEventListener("pointercancel", holdEnd);
  moon.addEventListener("contextmenu", function (e) { e.preventDefault(); });

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
        markFound("word", "you said the magic word \u2661");
      }
    }

    kIdx = (k === konami[kIdx]) ? kIdx + 1 : (k === konami[0] ? 1 : 0);
    if (kIdx === konami.length) {
      kIdx = 0;
      var sleepy = body.classList.toggle("is-sleepy");
      audio.playbackRate = sleepy ? 0.85 : 1;
      if ("preservesPitch" in audio) audio.preservesPitch = false;
      if (sleepy) markFound("konami", "sleepy mode\u2026 zzz \u263E");
      else toast("good morning \u2600");
    }
  });

  /* ═════════════ discord live status (Lanyard) ═════════════ */
  (function () {
    if (!DISCORD_ID) return;
    var dot = $("status"), box = $("activity"), art = $("activityArt");
    var kindEl = $("activityKind"), nameEl = $("activityName");
    var LABELS = { online: "online", idle: "idle", dnd: "do not disturb", offline: "offline" };
    var hb = null, retry = 1000;

    function setArt(url) {
      if (url) { art.src = url; art.hidden = false; } else { art.removeAttribute("src"); art.hidden = true; }
    }

    function render(d) {
      var st = d.discord_status || "offline";
      dot.hidden = false;
      dot.className = "status status--" + st;
      dot.setAttribute("data-tip", LABELS[st] || st);
      dot.setAttribute("title", LABELS[st] || st);

      var acts = d.activities || [];
      var game = acts.filter(function (a) { return a.type === 0; })[0];
      var custom = acts.filter(function (a) { return a.type === 4 && a.state; })[0];

      if (d.listening_to_spotify && d.spotify) {
        kindEl.textContent = "listening to spotify";
        nameEl.textContent = d.spotify.song + " — " + d.spotify.artist;
        setArt(d.spotify.album_art_url);
        box.hidden = false;
      } else if (game) {
        kindEl.textContent = "playing";
        nameEl.textContent = game.name + (game.details ? " · " + game.details : "");
        var img = game.assets && game.assets.large_image;
        if (img && img.indexOf("mp:external/") === 0) setArt("https://media.discordapp.net/external/" + img.slice(12));
        else if (img && game.application_id && img.indexOf("mp:") !== 0) setArt("https://cdn.discordapp.com/app-assets/" + game.application_id + "/" + img + ".png");
        else setArt(null);
        box.hidden = false;
      } else if (custom) {
        kindEl.textContent = "status";
        nameEl.textContent = (custom.emoji && custom.emoji.name && !custom.emoji.id ? custom.emoji.name + " " : "") + custom.state;
        setArt(null);
        box.hidden = false;
      } else {
        box.hidden = true;
      }
    }

    function connect() {
      var ws;
      try { ws = new WebSocket("wss://api.lanyard.rest/socket"); } catch (e) { return; }
      ws.onmessage = function (e) {
        var msg; try { msg = JSON.parse(e.data); } catch (x) { return; }
        if (msg.op === 1) {
          clearInterval(hb);
          hb = setInterval(function () { if (ws.readyState === 1) ws.send(JSON.stringify({ op: 3 })); }, msg.d.heartbeat_interval);
          ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
        } else if (msg.op === 0 && msg.d) {
          retry = 1000;
          render(msg.d);
        }
      };
      ws.onclose = function () {
        clearInterval(hb);
        setTimeout(connect, retry);
        retry = Math.min(retry * 2, 30000);
      };
    }
    connect();
  })();

  syncPlayer();
})();
