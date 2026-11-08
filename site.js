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
      tw.then(function (on) {
        pill.href = "https://www.twitch.tv/tajochungo"; pill.textContent = "En directo en Twitch";
        pill.hidden = !on;
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

/* Horario: marca el día de hoy (hora de España) */
(function () {
  var week = document.getElementById("week");
  if (!week) return;
  try {
    var nombre = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Madrid" }).format(new Date());
    var n = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[nombre];
    var li = week.querySelector('[data-dia="' + n + '"]');
    if (li) li.classList.add("today");
  } catch (e) {}
})();

/* Sonido de la explosión bajo el agua. Se genera aquí (sin archivos) y lo comparten todas las páginas:
   la portada hace el golpe y la página nueva continúa el retumbar y las burbujas, para que no se corte.
   Capas: subgrave (el golpe en el pecho) · «bum» de agua (ruido grave filtrado) · chasquido muy apagado ·
   retumbar con turbulencia · burbujas de verdad (cada una sube de tono al soltarse) · siseo de espuma ·
   todo dentro de un eco corto y oscuro, como bajo el agua, y un compresor para que suene compacto. */
(function () {
  var A = null, bus = null, wet = null, brown = null, white = null;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function setup() {
    if (A) return A;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    A = new AC();
    var comp = A.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = .004; comp.release.value = .3;
    var master = A.createGain(); master.gain.value = .9;
    var tone = A.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 3200; tone.Q.value = .5; // el agua se come los agudos
    bus = A.createGain(); bus.connect(tone); tone.connect(comp); comp.connect(master); master.connect(A.destination);
    // eco bajo el agua: corto, oscuro y envolvente
    var len = Math.floor(A.sampleRate * 1.7), ir = A.createBuffer(2, len, A.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch), lp = 0;
      for (var i = 0; i < len; i++) { var tt = i / A.sampleRate; lp += (Math.random() * 2 - 1 - lp) * .08; d[i] = lp * Math.exp(-tt / .42) * (tt < .012 ? tt / .012 : 1); }
    }
    var conv = A.createConvolver(); conv.buffer = ir; wet = A.createGain(); wet.gain.value = .55;
    wet.connect(conv); conv.connect(tone);
    // ruidos de base
    var n = Math.floor(A.sampleRate * 3);
    brown = A.createBuffer(1, n, A.sampleRate); white = A.createBuffer(1, n, A.sampleRate);
    var b = brown.getChannelData(0), w = white.getChannelData(0), last = 0;
    for (i = 0; i < n; i++) { var r = Math.random() * 2 - 1; w[i] = r; last = (last + .02 * r) / 1.02; b[i] = last * 3.5; }
    return A;
  }
  function src(buf, t, dur) { var s = A.createBufferSource(); s.buffer = buf; s.start(t, rnd(0, .5)); s.stop(t + dur); return s; }
  function out(node, dry, send) { var g = A.createGain(); g.gain.value = dry; node.connect(g); g.connect(bus); if (send) { var s = A.createGain(); s.gain.value = send; node.connect(s); s.connect(wet); } }
  // una burbuja: tono que sube al soltarse y se apaga enseguida
  function bubble(t, level) {
    var f = Math.exp(rnd(Math.log(220), Math.log(1300))), dur = rnd(.012, .03) * Math.sqrt(900 / f) + .01;
    var o = A.createOscillator(), g = A.createGain(), p = A.createStereoPanner ? A.createStereoPanner() : null;
    o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * rnd(1.15, 1.5), t + dur * 2.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + .002); g.gain.exponentialRampToValueAtTime(.0004, t + dur * 3);
    o.connect(g);
    if (p) { p.pan.value = rnd(-.7, .7); g.connect(p); out(p, .8, .45); } else out(g, .8, .45);
    o.start(t); o.stop(t + dur * 3 + .02);
  }
  // nube de burbujas: muchas, cada vez menos, con su siseo de espuma
  function gurgle(t, dur, density, level) {
    var n = Math.round(dur * density);
    for (var i = 0; i < n; i++) { var k = Math.pow(Math.random(), 1.7), bt = t + k * dur; bubble(bt, level * rnd(.35, 1) * (1 - k * .75)); }
    var fz = src(white, t, dur + .1), bp = A.createBiquadFilter(), g = A.createGain();
    bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = .9; fz.connect(bp); bp.connect(g);
    g.gain.setValueAtTime(0, t);
    for (var s = 0; s < dur; s += .018) g.gain.setValueAtTime(level * .9 * Math.random() * Math.pow(1 - s / dur, 1.5), t + s); // gorgoteo irregular
    g.gain.linearRampToValueAtTime(0, t + dur);
    out(g, .55, .5);
  }
  // retumbar grave con turbulencia
  function rumble(t, from, to, dur) {
    var r = src(brown, t, dur + .1), lp = A.createBiquadFilter(), g = A.createGain(), am = A.createGain(), lfo = A.createOscillator(), lg = A.createGain();
    lp.type = "lowpass"; lp.frequency.setValueAtTime(220, t); lp.frequency.exponentialRampToValueAtTime(110, t + dur);
    lfo.frequency.value = rnd(5, 8); lg.gain.value = .25; lfo.connect(lg); lg.connect(am.gain); am.gain.value = .75;
    r.connect(lp); lp.connect(am); am.connect(g);
    g.gain.setValueAtTime(from, t); g.gain.exponentialRampToValueAtTime(Math.max(.0005, to), t + dur);
    out(g, 1, .35); lfo.start(t); lfo.stop(t + dur + .1);
    return g;
  }
  window.TJSound = {
    warm: function () { try { setup(); } catch (e) {} }, // prepara el eco y los ruidos antes de que hagan falta
    // el golpe (portada). Devuelve cuándo termina para que la página nueva lo continúe
    boom: function (fileBubbles) {
      if (!setup()) return; if (A.state === "suspended") A.resume();
      var t = A.currentTime + .015;
      // subgrave
      var o = A.createOscillator(), og = A.createGain(); o.type = "sine";
      o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(30, t + .5);
      og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(1, t + .006); og.gain.exponentialRampToValueAtTime(.001, t + 1.1);
      o.connect(og); out(og, .9, .15); o.start(t); o.stop(t + 1.2);
      // «bum» de agua
      var w = src(brown, t, 1.4), wl = A.createBiquadFilter(), wg = A.createGain();
      wl.type = "lowpass"; wl.Q.value = .8; wl.frequency.setValueAtTime(1100, t); wl.frequency.exponentialRampToValueAtTime(160, t + .45);
      wg.gain.setValueAtTime(0, t); wg.gain.linearRampToValueAtTime(1.3, t + .004); wg.gain.exponentialRampToValueAtTime(.002, t + 1.3);
      w.connect(wl); wl.connect(wg); out(wg, 1, .5);
      // chasquido muy apagado (le da definición al golpe)
      var c = src(white, t, .05), cb = A.createBiquadFilter(), cg = A.createGain();
      cb.type = "bandpass"; cb.frequency.value = 900; cb.Q.value = .7;
      cg.gain.setValueAtTime(.35, t); cg.gain.exponentialRampToValueAtTime(.001, t + .04);
      c.connect(cb); cb.connect(cg); out(cg, .6, .6);
      // retumbar y burbujas (bajan solas hacia el cambio de página)
      var rg = rumble(t + .03, .55, .2, .95);
      if (!fileBubbles) gurgle(t + .1, .82, 70, .06); // si suena el burbujeo grabado, no hace falta el generado
      // salida suave: justo antes de cambiar de página
      bus.gain.setValueAtTime(1, t + .72); bus.gain.linearRampToValueAtTime(.55, t + .92);
    },
    // la continuación (página nueva): mismo timbre, más flojo, y se apaga del todo
    tail: function (fileBubbles) {
      if (!setup()) return; if (A.state === "suspended") A.resume().catch(function () {});
      var t = A.currentTime + .02;
      bus.gain.setValueAtTime(0, t); bus.gain.linearRampToValueAtTime(.55, t + .09); bus.gain.setValueAtTime(.55, t + .3); bus.gain.exponentialRampToValueAtTime(.001, t + 2.2);
      rumble(t, .2, .002, 2.1);
      if (!fileBubbles) gurgle(t, 1.6, 42, .05);
    }
  };
})();

/* Las burbujas de Tajo, sueltas (sacadas de su vídeo): sirven para la transición en cualquier pantalla,
   a su tamaño justo. Con profundidad (lejos: pequeñas y desenfocadas · medio: nítidas · cerca: grandes y desenfocadas)
   y vivas: se balancean y se estiran un poco al subir, como las del vídeo. */
(function () {
  var sheet = new Image(), ok = false, rects = [[4, 22, 240, 204], [252, 20, 240, 208], [532, 42, 176, 164], [788, 56, 160, 136], [1060, 76, 112, 96], [1324, 90, 80, 68]];
  var PAD = 18, sprites = [[], [], []], BLUR = [0, 1.6, 6];
  sheet.onload = function () {
    for (var v = 0; v < 3; v++) for (var i = 0; i < rects.length; i++) {
      var r = rects[i], c = document.createElement("canvas"); c.width = r[2] + PAD * 2; c.height = r[3] + PAD * 2;
      var x = c.getContext("2d"); if (BLUR[v] && "filter" in x) x.filter = "blur(" + BLUR[v] + "px)";
      x.drawImage(sheet, r[0], r[1], r[2], r[3], PAD, PAD, r[2], r[3]);
      sprites[v].push({ c: c, w: r[2], h: r[3] });
    }
    ok = true;
  };
  function pick(d) { // la pieza más pequeña que no haya que agrandar (así siempre salen nítidas)
    var ok2 = []; for (var i = 0; i < rects.length; i++) if (rects[i][2] >= d * .95) ok2.push(i);
    return ok2.length ? ok2[Math.floor(Math.random() * Math.min(ok2.length, 3)) + Math.max(0, ok2.length - 3)] : Math.floor(Math.random() * 2);
  }
  window.TJBubbles = {
    load: function () { if (!sheet.src) sheet.src = "media/burbujas-piezas.webp"; },
    ready: function () { return ok; },
    make: function (W, H, x, y) {
      var base = Math.min(W, H), u = Math.random(), z = u < .3 ? 0 : u < .94 ? 1 : 2; // lejos · medio · cerca
      var d = base * (z === 0 ? .025 + Math.random() * .04 : z === 1 ? .035 + Math.pow(Math.random(), 1.7) * .11 : .16 + Math.random() * .1);
      var sp = z === 0 ? .7 : z === 2 ? 1.5 : 1;
      return { x: x, y: y, d: d, z: z, si: pick(d),
        v: H * (1.1 + Math.random() * .8) * sp * (.8 + d / base), ph: Math.random() * 6.3, f: 4 + Math.random() * 4,
        rot: (Math.random() - .5) * .5, a: z === 0 ? .4 : z === 2 ? .38 : .62 };
    },
    density: function (W, H) { var a = Math.min(W, H) * .085; return W * H / (a * a); },
    step: function (b, dt) { b.y -= b.v * dt; b.ph += b.f * dt; },
    draw: function (g, b, mult) {
      var s = sprites[b.z === 1 ? 0 : b.z === 0 ? 1 : 2][b.si], k = b.d / s.w, sq = .07 * Math.sin(b.ph * 1.3); // se estira y se aplasta
      g.save(); g.globalAlpha = b.a * (mult == null ? 1 : mult);
      g.translate(b.x + Math.sin(b.ph) * b.d * .08, b.y); g.rotate(b.rot + Math.sin(b.ph * .7) * .12);
      g.scale(k * (1 + sq), k * (1 - sq));
      g.drawImage(s.c, -s.c.width / 2, -s.c.height / 2); g.restore();
    }
  };
})();

/* Al llegar desde la explosión de un barril: las burbujas que taparon la pantalla siguen subiendo y descubren la página */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains("from-sea")) return;
  var quiet = false; try { quiet = sessionStorage.getItem("tj-sea") === "quiet"; sessionStorage.removeItem("tj-sea"); } catch (e) {}
  // el sonido de la explosión sigue aquí, con el mismo timbre, y se apaga
  // burbujas grabadas (las de Tajo): segunda mitad del vídeo y del sonido
  var vid = null, snd = null, okVideo = false, wide = innerWidth / innerHeight >= 1.3; // el vídeo es apaisado: solo en pantallas anchas
  // el vídeo se veía pixelado en pantallas grandes: ahora siempre se usan las burbujas sueltas, nítidas a cualquier tamaño
  if (okVideo && wide) {
    vid = document.createElement("video"); vid.className = "sea-video"; vid.muted = true; vid.playsInline = true; vid.setAttribute("aria-hidden", "true");
    vid.src = "media/burbujas-destapa.webm"; document.body.appendChild(vid);
  } else if (window.TJBubbles) window.TJBubbles.load();
  if (!quiet) try { snd = new Audio("media/burbujas-destapa.mp3"); snd.volume = .8; var sp = snd.play(); if (sp && sp.catch) sp.catch(function () {}); } catch (e) { snd = null; }
  if (window.TJSound && !quiet) window.TJSound.tail(!!snd);
  var c = document.createElement("canvas"); c.className = "sea-reveal"; c.setAttribute("aria-hidden", "true");
  document.body.appendChild(c);
  var dpr = Math.min(window.devicePixelRatio || 1, 1.25), W = innerWidth, H = innerHeight, g = c.getContext("2d");
  c.width = W * dpr; c.height = H * dpr;
  // burbuja turquesa, igual que las de la portada
  var R = 48, size = 104, s = document.createElement("canvas"); s.width = s.height = size; var x = s.getContext("2d"), o = size / 2;
  var body = x.createRadialGradient(o, o, 0, o, o, R);
  body.addColorStop(0, "rgba(60,190,170,0.03)"); body.addColorStop(.72, "rgba(70,205,182,0.06)"); body.addColorStop(.9, "rgba(95,228,200,0.30)"); body.addColorStop(.975, "rgba(140,246,222,0.62)"); body.addColorStop(1, "rgba(140,246,222,0)");
  x.fillStyle = body; x.beginPath(); x.arc(o, o, R, 0, 6.2832); x.fill();
  x.save(); x.translate(o - R * .38, o - R * .4); x.rotate(-.7); x.scale(1, .55);
  var hi = x.createRadialGradient(0, 0, 0, 0, 0, R * .26); hi.addColorStop(0, "rgba(200,255,240,0.75)"); hi.addColorStop(1, "rgba(160,250,228,0)");
  x.fillStyle = hi; x.beginPath(); x.arc(0, 0, R * .26, 0, 6.2832); x.fill(); x.restore();
  var k = size / (R * 2), bubbles = [], i;
  for (i = 0; i < Math.round(W * H / 2600); i++) bubbles.push({ x: Math.random() * W, y: Math.random() * H * 1.1, v: 700 + Math.random() * 1100, r: 1 + Math.pow(Math.random(), 2) * 13, ph: Math.random() * 6.3 });
  root.classList.remove("from-sea");
  var TB = !vid && window.TJBubbles, mine = [];
  if (TB) {
    // las burbujas vienen de la página anterior, en el mismo sitio: siguen subiendo, no empiezan otra vez
    var saved = null; try { saved = JSON.parse(sessionStorage.getItem("tj-sea-wall") || "null"); sessionStorage.removeItem("tj-sea-wall"); } catch (e) {}
    if (saved && saved.b && saved.b.length && Math.abs(saved.W - W) < 40 && Math.abs(saved.H - H) < 120) {
      saved.b.forEach(function (q) { mine.push({ x: q[0], y: q[1], d: q[2], z: q[3], si: q[4], v: q[5], ph: q[6], f: q[7], rot: q[8], a: q[9] }); });
    } else for (i = 0; i < Math.min(180, Math.round(TB.density(W, H) * 1.15)); i++) mine.push(TB.make(W, H, Math.random() * W, Math.random() * H * 1.35));
    mine.sort(function (p, q) { return p.z - q.z; });
  }
  var start = performance.now(), last = start, waiting = !!vid || !!TB;
  if (TB) { var tw0 = performance.now(); (function wait() { if (TB.ready() || performance.now() - tw0 > 600) { waiting = false; start = performance.now(); if (!TB.ready()) TB = null; } else setTimeout(wait, 30); })(); }
  if (TB) bubbles.length = 0; // con las burbujas de Tajo no hacen falta las mías
  if (vid) {
    var go = function () { if (!waiting) return; waiting = false; start = performance.now(); };
    vid.addEventListener("playing", go); setTimeout(go, 700); // si el vídeo tarda, no se espera más
    vid.addEventListener("ended", function () { vid.remove(); });
    var vp = vid.play(); if (vp && vp.catch) vp.catch(function () { go(); vid.remove(); });
    bubbles.length = Math.round(bubbles.length * .25); // las burbujas grabadas hacen el trabajo; quedan unas pocas mías
  }
  (function frame(now) {
    if (waiting) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#081113"; g.fillRect(0, 0, W, H); last = now; requestAnimationFrame(frame); return; }
    var t = (now - start) / 1000, dt = Math.min(40, now - last) / 1000; last = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var fade = Math.max(0, 1 - t / .55);
    g.fillStyle = "rgba(8,17,19," + Math.pow(fade, 1.4).toFixed(3) + ")"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "screen";
    for (i = 0; i < bubbles.length; i++) {
      var b = bubbles[i]; b.y -= b.v * dt; b.ph += dt * 6; var w = b.r * 2 * k;
      g.globalAlpha = .85 * Math.max(0, 1 - t / .8); g.drawImage(s, b.x + Math.sin(b.ph) * b.r - w / 2, b.y - w / 2, w, w);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    var fadeB = Math.max(0, Math.min(1, 1 - (t - .4) / .7)); fadeB = fadeB * fadeB * (3 - 2 * fadeB); // se desvanecen suave hasta desaparecer
    if (TB) { for (i = 0; i < mine.length; i++) { TB.step(mine[i], dt); TB.draw(g, mine[i], fadeB); } }
    g.globalAlpha = 1;
    if (t < 1.12) requestAnimationFrame(frame); else c.remove(); // termina cuando ya no queda nada a la vista
  })(start);
})();

/* «Volver a la Bitácora»: vuelve a la portada, justo al barril del que saliste, entrando entre burbujas */
(function () {
  var a = document.querySelector("a[data-sea-back]"); if (!a) return;
  a.addEventListener("click", function () { try { sessionStorage.setItem("tj-sea", "quiet"); } catch (e) {} });
})();
