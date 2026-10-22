// Comportamiento común de todas las páginas de tajochungo.com
(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TJ = window.TJ = {};

  // ---- El agua siempre ocupa toda su sección: si la sección cambia de tamaño (letras, directo...), el lienzo crece con ella y no deja bordes rectos
  if (window.jQuery && jQuery.fn.ripples && jQuery.fn.ripples.Constructor) {
    var RP = jQuery.fn.ripples.Constructor.prototype, step = RP.step;
    RP.step = function () { if (this.visible) this.updateSize(); return step.call(this); };
  }

  // ---- En móvil el menú se desliza: si la sección actual queda fuera, se mueve para que se vea
  var nav = document.querySelector(".nav"), cur = nav && nav.querySelector('[aria-current="page"]');
  // (lo justo para que asome entera, sin esconder "Inicio" si no hace falta; 28px = zona difuminada del borde)
  if (cur && nav.scrollWidth > nav.clientWidth) {
    var over = cur.offsetLeft + cur.offsetWidth - (nav.clientWidth - 28);
    if (over > 0) nav.scrollLeft = over;
  }

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

  // ---- Emotes y cartel en grande: clic para abrir, flechas (o deslizar en móvil) para pasar, Esc o clic fuera para cerrar
  var emotes = document.querySelectorAll("[data-big]");
  if (emotes.length) {
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Imagen en grande");
    lb.innerHTML = '<img alt=""><button type="button" class="lb-btn lb-close" aria-label="Cerrar">✕</button>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Anterior">‹</button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Siguiente">›</button><p class="lb-count"></p>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector("img"), lbCount = lb.querySelector(".lb-count"), group = [], idx = 0, opener = null;
    var show = function (i) {
      idx = (i + group.length) % group.length;
      var b = group[idx];
      lbImg.src = b.getAttribute("data-big");
      lbImg.alt = b.querySelector("img").alt;
      lbCount.textContent = (idx + 1) + " / " + group.length;
    };
    // Al cerrar: la página vuelve a poder moverse y el foco vuelve al emote (sin saltar de sitio)
    var close = function () {
      lb.classList.remove("open"); root.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      if (opener) opener.focus({ preventScroll: true });
    };
    var onKey = function (e) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "Tab") { // el tabulador se queda dentro del visor
        var bs = Array.prototype.filter.call(lb.querySelectorAll(".lb-btn"), function (x) { return !x.hidden; });
        var at = bs.indexOf(document.activeElement);
        e.preventDefault();
        bs[(at + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus();
      }
    };
    Array.prototype.forEach.call(emotes, function (b) {
      b.addEventListener("click", function () {
        group = Array.prototype.slice.call(b.parentElement.querySelectorAll("[data-big]"));
        opener = b;
        show(group.indexOf(b));
        var many = group.length > 1;
        lb.querySelector(".lb-prev").hidden = lb.querySelector(".lb-next").hidden = lbCount.hidden = !many;
        lb.classList.toggle("wide", b.hasAttribute("data-wide"));
        lb.classList.add("open"); root.style.overflow = "hidden"; // la página de detrás no se mueve mientras está abierto
        document.addEventListener("keydown", onKey);
        lb.querySelector(".lb-close").focus();
      });
    });
    lb.addEventListener("click", function (e) {
      if (e.target === lb) close();
      else if (e.target.closest(".lb-close")) close();
      else if (e.target.closest(".lb-prev")) show(idx - 1);
      else if (e.target.closest(".lb-next")) show(idx + 1);
    });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    });
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
