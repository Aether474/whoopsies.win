/* Apply the saved theme before the page paints (avoids a flash of the wrong colors) */
(function () {
  try {
    if (localStorage.getItem("whoopsies-theme") === "mono") document.documentElement.classList.add("theme-mono");
  } catch (e) {}
})();
