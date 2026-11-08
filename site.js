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
  var A = null, bus = null, wet = null, brown = null, white = null, toneNode = null, masterNode = null;
  function isMuted() { try { return localStorage.getItem("tj-mute") === "1"; } catch (e) { return false; } }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function setup() {
    if (A) return A;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    A = new AC();
    var comp = A.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = .004; comp.release.value = .3;
    var master = A.createGain(); master.gain.value = isMuted() ? 0 : .9; masterNode = master;
    var tone = A.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 3200; tone.Q.value = .5; // el agua se come los agudos
    toneNode = tone; bus = A.createGain(); bus.connect(tone); tone.connect(comp); comp.connect(master); master.connect(A.destination);
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
    muted: isMuted,
    setMuted: function (m) {
      try { localStorage.setItem("tj-mute", m ? "1" : "0"); } catch (e) {}
      if (masterNode) masterNode.gain.setTargetAtTime(m ? 0 : .9, A.currentTime, .08);
      if (A) { if (m) setTimeout(function () { if (isMuted()) A.suspend(); }, 400); else A.resume(); }
      document.querySelectorAll("audio").forEach(function (a) { a.muted = m; });
    },
    /* ---------- Ambiente de la portada: madera del barco que cruje y, al caer, el mar ----------
       Todo pasa por un filtro que se cierra según la profundidad: en el camarote se oye claro,
       bajo el agua apagado y cada vez más sordo. */
    ambient: (function () {
      var on = false, inWater = false, depth = 0, nodes = null, timers = [];
      function build() {
        var t = A.currentTime;
        var lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; lp.Q.value = .6;
        var vol = A.createGain(); vol.gain.value = 0;
        lp.connect(vol); vol.connect(toneNode);
        var send = A.createGain(); send.gain.value = .35; vol.connect(send); send.connect(wet);
        // el mar por dentro: solo graves, muy filtrados (sin siseo: el siseo es lo que sonaba a aire)
        var r = A.createBufferSource(); r.buffer = brown; r.loop = true;
        var l1 = A.createBiquadFilter(); l1.type = "lowpass"; l1.frequency.value = 95; l1.Q.value = .5;
        var l2 = A.createBiquadFilter(); l2.type = "lowpass"; l2.frequency.value = 95; l2.Q.value = .5;
        var sea = A.createGain(); sea.gain.value = 0;
        var swayG = A.createGain(); swayG.gain.value = 1; // respira despacio
        var lfo = A.createOscillator(), lg = A.createGain(); lfo.frequency.value = .08; lg.gain.value = .35; lfo.connect(lg); lg.connect(swayG.gain);
        r.connect(l1); l1.connect(l2); l2.connect(swayG); swayG.connect(sea); sea.connect(lp); r.start(t); lfo.start(t);
        // presión del agua: dos tonos muy graves casi iguales que «laten» (como un zumbido en los oídos al bucear)
        var drone = A.createGain(); drone.gain.value = 0;
        [[47, .5], [48.4, .5], [71, .18]].forEach(function (f) { var o = A.createOscillator(), g = A.createGain(); o.type = "sine"; o.frequency.value = f[0]; g.gain.value = f[1]; o.connect(g); g.connect(drone); o.start(t); });
        drone.connect(lp);
        // el barco: el sonido grabado de Tajo (madera del casco crujiendo), en bucle sin cortes
        var ship = A.createGain(); ship.gain.value = 0; ship.connect(lp);
        try {
          fetch("media/barco-ambiente.wav").then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
            return new Promise(function (ok, ko) { A.decodeAudioData(ab, ok, ko); });
          }).then(function (buf) { var s = A.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(ship); s.start(); }).catch(function () {});
        } catch (e) {}
        nodes = { lp: lp, vol: vol, sea: sea, drone: drone, ship: ship };
      }
      // un crujido de madera: roce a tirones (como una tabla o una cuerda tensa) con resonancias de madera
      function creak(level) {
        var t = A.currentTime + .02, dur = rnd(.5, 1.5), f0 = rnd(28, 55), f1 = f0 * rnd(1.4, 2.4);
        var o = A.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur * rnd(.4, .7)); o.frequency.linearRampToValueAtTime(f0 * rnd(.9, 1.3), t + dur);
        var jit = A.createOscillator(), jg = A.createGain(); jit.type = "triangle"; jit.frequency.value = rnd(6, 13); jg.gain.value = f0 * .35; jit.connect(jg); jg.connect(o.frequency); // los tirones
        var env = A.createGain(); env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(level, t + dur * .15); env.gain.setValueAtTime(level * rnd(.6, 1), t + dur * .7); env.gain.linearRampToValueAtTime(0, t + dur);
        var sum = A.createGain(); sum.gain.value = 1;
        [[rnd(380, 480), 9], [rnd(700, 900), 12], [rnd(1150, 1400), 14]].forEach(function (fq) { // cuerpo de la madera
          var b = A.createBiquadFilter(); b.type = "bandpass"; b.frequency.value = fq[0]; b.Q.value = fq[1]; o.connect(b); b.connect(sum);
        });
        var p = A.createStereoPanner ? A.createStereoPanner() : null;
        sum.connect(env); if (p) { p.pan.value = rnd(-.8, .8); env.connect(p); p.connect(nodes.lp); } else env.connect(nodes.lp);
        o.start(t); jit.start(t); o.stop(t + dur + .05); jit.stop(t + dur + .05);
      }
      function loop(kind, min, max, fn) {
        var id = setTimeout(function () { if (on) fn(); loop(kind, min, max, fn); }, rnd(min, max) * (kind === "bub" ? (1 + depth * 1.5) : 1));
        timers.push(id);
      }
      function apply() {
        if (!nodes) return;
        var t = A.currentTime, d = depth;
        nodes.lp.frequency.setTargetAtTime(inWater ? 1400 - d * 1000 : 2400, t, .4); // cuanto más hondo, más sordo
        nodes.vol.gain.setTargetAtTime(on ? 1 : 0, t, .8);
        nodes.sea.gain.setTargetAtTime(inWater ? .1 + d * .05 : 0, t, .9);
        nodes.drone.gain.setTargetAtTime(inWater ? .012 + d * .008 : 0, t, 1.2);
        nodes.ship.gain.setTargetAtTime(inWater ? .22 * (1 - d * .5) : .4, t, .8); // en el camarote, claro; bajo el agua, el casco a lo lejos
      }
      return {
        start: function () {
          if (on || !setup()) return; on = true;
          if (A.state === "suspended") A.resume();
          if (!nodes) {
            build();
            loop("bub", 1600, 4200, function () {
              if (!inWater) return; var t0 = A.currentTime + .02, n = Math.random() < .35 ? Math.floor(rnd(3, 8)) : 1;
              for (var k = 0; k < n; k++) bubble(t0 + k * rnd(.05, .14), rnd(.01, .026) * (1 - k / (n + 2)));
            });
          }
          apply();
        },
        stop: function () { on = false; apply(); },
        set: function (water, d) { if (water === inWater && Math.abs(d - depth) < .02) return; inWater = water; depth = d; apply(); }
      };
    })(),
    warm: function () { try { setup(); } catch (e) {} }, // prepara el eco y los ruidos antes de que hagan falta
    // el golpe (portada). Devuelve cuándo termina para que la página nueva lo continúe
    boom: function (fileBubbles) {
      if (isMuted() || !setup()) return; if (A.state === "suspended") A.resume();
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
      if (isMuted() || !setup()) return; if (A.state === "suspended") A.resume().catch(function () {});
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

/* Al llegar desde la explosión de un barril: la página aparece con un fundido suave desde el negro.
   (Toda la animación de burbujas ocurre en la portada, antes de cambiar: así no hay empalmes ni cortes.)
   El sonido sí continúa: el retumbar y el burbujeo se apagan aquí. */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains("from-sea")) return;
  var quiet = false; try { quiet = sessionStorage.getItem("tj-sea") === "quiet"; sessionStorage.removeItem("tj-sea"); sessionStorage.removeItem("tj-sea-wall"); } catch (e) {}
  if (!quiet && !(window.TJSound && window.TJSound.muted())) {
    var snd = null;
    try { snd = new Audio("media/burbujas-destapa.mp3"); snd.volume = .8; var sp = snd.play(); if (sp && sp.catch) sp.catch(function () {}); } catch (e) { snd = null; }
    if (window.TJSound) window.TJSound.tail(!!snd);
  }
  requestAnimationFrame(function () { requestAnimationFrame(function () {
    root.classList.add("sea-in"); // el negro se desvanece
    setTimeout(function () { root.classList.remove("from-sea", "sea-in"); }, 700);
  }); });
})();

/* «Volver a la Bitácora»: vuelve a la portada, justo al barril del que saliste, con un fundido */
(function () {
  var a = document.querySelector("a[data-sea-back]"); if (!a) return;
  a.addEventListener("click", function () { try { sessionStorage.setItem("tj-sea", "quiet"); } catch (e) {} });
})();

/* Botón de sonido: quita o pone todos los sonidos de la web (se recuerda para la próxima visita).
   En la portada, además, el ambiente (madera que cruje y el mar) empieza con el primer clic o toque,
   porque los navegadores no dejan sonar nada antes. */
(function () {
  if (!window.TJSound) return;
  var b = document.createElement("button"); b.type = "button"; b.className = "snd-btn";
  var ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="m16 9 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  function paint() { var m = window.TJSound.muted(); b.innerHTML = m ? OFF : ON; b.setAttribute("aria-pressed", m ? "true" : "false"); b.setAttribute("aria-label", m ? "Activar el sonido" : "Quitar el sonido"); b.title = m ? "Activar el sonido" : "Quitar el sonido"; b.classList.toggle("off", m); }
  var portada = !!document.getElementById("st-story"), started = false;
  function startAmbient() { if (!portada || started || window.TJSound.muted()) return; started = true; b.classList.remove("hint"); window.TJSound.ambient.start(); }
  b.addEventListener("click", function (e) {
    e.stopPropagation();
    var m = !window.TJSound.muted(); window.TJSound.setMuted(m); paint();
    if (portada) { if (m) window.TJSound.ambient.stop(); else { started = false; startAmbient(); } }
  });
  paint(); document.body.appendChild(b);
  if (portada && !window.TJSound.muted()) {
    b.classList.add("hint"); // un brillo suave avisa de que hay sonido
    ["pointerdown", "keydown", "touchend"].forEach(function (ev) { addEventListener(ev, startAmbient, { once: true, passive: true }); });
  }
})();
