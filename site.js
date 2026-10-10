// Comportamiento común de todas las páginas de tajochungo.com
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TJ = window.TJ = {};

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // ---- El agua solo trabaja cuando se ve (ahorra batería y va más fluido)
  TJ.pauseOffscreen = function ($el, box) {
    if (!("IntersectionObserver" in window) || !box) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { try { $el.ripples(e.isIntersecting ? "play" : "pause"); } catch (x) {} });
    }).observe(box);
  };

  // ---- Agua en la cabecera de las secciones
  var pw = document.querySelector(".page-water");
  if (pw && window.jQuery && jQuery.fn.ripples && !reduce) {
    var $pw = jQuery(pw), ph = pw.parentElement, last = 0;
    try {
      $pw.ripples({ resolution: 256, dropRadius: 20, perturbance: 0.025, interactive: false });
      TJ.pauseOffscreen($pw, ph);
      var drop = function (x, yy, r, s) { var b = pw.getBoundingClientRect(); $pw.ripples("drop", x - b.left, yy - b.top, r, s); };
      ph.addEventListener("pointermove", function (e) { var n = performance.now(); if (n - last < 30) return; last = n; drop(e.clientX, e.clientY, 16, 0.025); }, { passive: true });
      ph.addEventListener("pointerdown", function (e) { drop(e.clientX, e.clientY, 36, 0.14); }, { passive: true });
      setTimeout(function () { var b = pw.getBoundingClientRect(); drop(b.left + b.width * 0.3, b.top + b.height * 0.55, 50, 0.12); }, 250);
    } catch (e) {}
  }

  // ---- Datos en vivo
  function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms); }); }
  function get(url, json) {
    return Promise.race([fetch(url).then(function (r) { if (!r.ok) throw 0; return json ? r.json() : r.text(); }), timeout(6000)]);
  }
  // Seguidores de Twitch al momento
  var fol = document.getElementById("followers");
  if (fol) get("https://decapi.me/twitch/followcount/tajochungo").then(function (t) {
    var n = parseInt(String(t).replace(/\D/g, ""), 10);
    if (n > 0) fol.textContent = n.toLocaleString("es-ES");
  }).catch(function () {});

  // Aviso de directo en todas las páginas (la portada ya tiene su pantalla)
  if (!document.getElementById("screen")) {
    var pill = document.createElement("a");
    pill.className = "live-pill"; pill.hidden = true; pill.target = "_blank"; pill.rel = "noopener";
    document.body.appendChild(pill);
    var check = function () {
      var tw = get("https://decapi.me/twitch/uptime/tajochungo").then(function (t) { return !/offline|error|not found|could not/i.test(t); }).catch(function () { return false; });
      var kk = get("https://kick.com/api/v2/channels/elmuelle", true).then(function (j) { return !!(j && j.livestream && j.livestream.is_live !== false); }).catch(function () { return false; });
      Promise.all([tw, kk]).then(function (r) {
        if (r[0]) { pill.href = "https://www.twitch.tv/tajochungo"; pill.textContent = "En directo en Twitch"; }
        else if (r[1]) { pill.href = "https://kick.com/elmuelle"; pill.textContent = "En directo en Kick"; }
        pill.hidden = !(r[0] || r[1]);
      });
    };
    check(); setInterval(check, 60000);
  }

  // ---- Aparición suave de los bloques al llegar a ellos
  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  function showAll() { items.forEach(function (el) { el.classList.add("seen"); }); }
  if (!("IntersectionObserver" in window)) { showAll(); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  items.forEach(function (el, i) { el.style.transitionDelay = Math.min(i % 6, 5) * 70 + "ms"; io.observe(el); });
  setTimeout(showAll, 2500);
})();
