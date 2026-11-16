/* Применяет настройки до отрисовки, чтобы страница не мигала. */
(function () {
  var d = document.documentElement, g = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var theme = g("c1.theme") || "auto";
  if (theme === "auto") theme = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  d.setAttribute("data-theme", theme);
  d.setAttribute("data-width", g("c1.width") || "full");
  d.setAttribute("data-size", g("c1.size") || "m");
  d.className += " no-anim"; // анимации включаются после первой отрисовки
  if (g("c1.toc") === "closed") d.className += " pre-toc-closed";
})();
