/* Reactions on the card: ♥ ✦ 🐾 with live counts (one of each per visitor per day) */
(function () {
  "use strict";

  var BASE = "https://abacus.jasoncameron.dev/";
  var NS = "whoopsies.win";
  var box = document.getElementById("reactions");
  if (!box) return;
  var buttons = Array.prototype.slice.call(box.querySelectorAll(".react"));

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function fmt(n) { return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + "k" : String(n); }

  function setCount(btn, n) {
    btn.querySelector(".react__n").textContent = fmt(n);
    btn.setAttribute("data-n", n);
  }

  function markUsed(btn) {
    var key = btn.getAttribute("data-key");
    var used = store("whoopsies-react-" + key) === today();
    btn.classList.toggle("is-used", used);
    btn.setAttribute("aria-pressed", used ? "true" : "false");
    return used;
  }

  // load counts
  buttons.forEach(function (btn) {
    markUsed(btn);
    var key = btn.getAttribute("data-key");
    fetch(BASE + "get/" + NS + "/react-" + key)
      .then(function (r) { return r.status === 404 ? { value: 0 } : r.json(); })
      .then(function (d) { setCount(btn, typeof d.value === "number" ? d.value : 0); })
      .catch(function () { setCount(btn, 0); });
  });

  function pop(btn) {
    var r = btn.getBoundingClientRect();
    var p = document.createElement("span");
    p.className = "react__pop";
    p.textContent = btn.querySelector(".react__icon").textContent;
    p.style.left = (r.left + r.width / 2) + "px";
    p.style.top = r.top + "px";
    document.body.appendChild(p);
    setTimeout(function () { p.remove(); }, 900);
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      pop(btn);
      btn.classList.remove("is-bump");
      void btn.offsetWidth;
      btn.classList.add("is-bump");
      if (markUsed(btn)) return; // already reacted today: just the little animation
      var key = btn.getAttribute("data-key");
      store("whoopsies-react-" + key, today());
      markUsed(btn);
      setCount(btn, (parseInt(btn.getAttribute("data-n"), 10) || 0) + 1);
      fetch(BASE + "hit/" + NS + "/react-" + key)
        .then(function (r) { return r.json(); })
        .then(function (d) { if (typeof d.value === "number") setCount(btn, d.value); })
        .catch(function () {});
      document.dispatchEvent(new CustomEvent("whoopsies:react", { detail: key }));
    });
  });
})();
