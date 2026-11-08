/* Portada: entras por la pantalla del camarote y caes al mar al bajar con la rueda */
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };
  var story = $("st-story"), stage = $("st-stage"), room = $("st-room"), rctx = room.getContext("2d");
  // el camarote se pinta en un lienzo: así sale nítido a cualquier zum y nunca se queda a medio dibujar
  var photo = new Image(), photoOk = false, portrait = false, lastKey = "";
  photo.onload = function () { photoOk = true; lastKey = ""; }; photo.src = "hero.jpg";
  var IW = 2000, IH = 1116;
  // Punto de la pantalla por el que entramos (zona limpia a la derecha de la cabeza)
  var FX = 1212, FY = 318;
  var L = 0, T = 0, S = 1, vw = 0, vh = 0, dpr = 1;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function ss(t) { return t * t * (3 - 2 * t); }
  function easeIn(t) { return t * t * t; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function mixc(c1, c2, t) { return "rgb(" + Math.round(mix(c1[0], c2[0], t)) + "," + Math.round(mix(c1[1], c2[1], t)) + "," + Math.round(mix(c1[2], c2[2], t)) + ")"; }

  function layout() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    portrait = vw / vh < 1.1;
    // en vertical se ve la escena entera (un poco más ancha que la pantalla) y se funde con el negro arriba y abajo
    S = portrait ? Math.max(vw * 1.55 / IW, vh * .42 / IH) : Math.max(vw / IW, vh / IH);
    var w = IW * S, h = IH * S;
    L = portrait ? vw / 2 - 1040 * S : (vw - w) / 2;
    T = portrait ? vh * .44 - h / 2 : (vh - h) / 2;
    stage.classList.toggle("st-portrait", portrait);
    room.width = Math.round(vw * dpr); room.height = Math.round(vh * dpr); lastKey = "";
    canvas.width = vw * dpr; canvas.height = vh * dpr; resetSnow();
  }

  /* Burbujas, nieve marina y motas */
  var canvas = $("st-fx"), ctx = canvas.getContext("2d");
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // Una burbuja de verdad: casi transparente por dentro, borde fino que brilla,
  // reflejo de la luz de arriba y la luz concentrada abajo (como una lente)
  function makeBubble(blur) {
    var R = 48, pad = 4 + blur * 3, size = (R + pad) * 2, c = document.createElement("canvas");
    c.width = c.height = size; var g = c.getContext("2d"), o = size / 2;
    if (blur) g.filter = "blur(" + blur + "px)";
    var body = g.createRadialGradient(o, o, 0, o, o, R);
    body.addColorStop(0, "rgba(60,190,170,0.03)"); body.addColorStop(.72, "rgba(70,205,182,0.06)");
    body.addColorStop(.9, "rgba(95,228,200,0.30)"); body.addColorStop(.975, "rgba(140,246,222,0.62)"); body.addColorStop(1, "rgba(140,246,222,0)");
    g.fillStyle = body; g.beginPath(); g.arc(o, o, R, 0, 6.2832); g.fill();
    var low = g.createRadialGradient(o, o + R * .55, 0, o, o + R * .55, R * .5);
    low.addColorStop(0, "rgba(120,240,214,0.22)"); low.addColorStop(1, "rgba(120,240,214,0)");
    g.fillStyle = low; g.beginPath(); g.arc(o, o, R * .96, 0, 6.2832); g.fill();
    g.save(); g.translate(o - R * .38, o - R * .4); g.rotate(-0.7); g.scale(1, .55);
    var hi = g.createRadialGradient(0, 0, 0, 0, 0, R * .26);
    hi.addColorStop(0, "rgba(200,255,240,0.75)"); hi.addColorStop(.5, "rgba(160,250,228,0.38)"); hi.addColorStop(1, "rgba(160,250,228,0)");
    g.fillStyle = hi; g.beginPath(); g.arc(0, 0, R * .26, 0, 6.2832); g.fill(); g.restore();
    g.fillStyle = "rgba(170,250,230,0.25)"; g.beginPath(); g.arc(o + R * .36, o + R * .38, R * .07, 0, 6.2832); g.fill();
    return { img: c, k: size / (R * 2) };
  }
  function makeDot(blur) {
    var size = 32, c = document.createElement("canvas"); c.width = c.height = size; var g = c.getContext("2d");
    var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16 * (blur ? 1 : .5));
    gr.addColorStop(0, "rgba(150,236,214,1)"); gr.addColorStop(blur ? .25 : .5, "rgba(130,226,204,.5)"); gr.addColorStop(1, "rgba(130,226,204,0)");
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
  }
  var SPR = [makeBubble(0), makeBubble(3), makeBubble(9)], DOT = [makeDot(0), makeDot(1)];
  window.__stBubble = SPR[0]; // la explosión de los barriles usa las mismas burbujas

  var bubbles = [], snow = [], motes = [], streams = [];
  // capa: 0 lejos (pequeña, borrosa, apagada) · 1 enfocada · 2 muy cerca (grande y desenfocada)
  function spawn(x, y, burst, tiny) {
    var layer = tiny ? 1 : (Math.random() < .3 ? 0 : Math.random() < .88 ? 1 : 2);
    var r = tiny ? rnd(.8, 2.2) : .8 + Math.pow(Math.random(), 2.6) * 7;
    if (layer === 0) r *= .55; if (layer === 2) r = rnd(7, 16);
    bubbles.push({ x: x, y: y, r: r, l: layer, ph: rnd(0, 6.28), f: rnd(3, 6.5), amp: r > 2.5 ? r * rnd(.4, .8) : rnd(.6, 2),
      vy: (34 + r * 13) * (layer === 0 ? .6 : layer === 2 ? 1.5 : 1) * (burst ? rnd(1.6, 2.6) : rnd(.85, 1.15)), a: layer === 0 ? .4 : layer === 2 ? .45 : rnd(.7, .95) });
  }
  function resetSnow() {
    snow = [];
    var n = Math.round(Math.min(170, vw * vh / 6500));
    for (var i = 0; i < n; i++) snow.push({ x: Math.random() * vw, y: Math.random() * vh, z: Math.random(), ph: rnd(0, 6.28), s: rnd(.5, 1.6) });
    streams = [{ x: vw * rnd(.12, .3), t: 0 }, { x: vw * rnd(.68, .88), t: 0 }];
  }
  for (var i = 0; i < 40; i++) motes.push({ x: Math.random(), y: Math.random(), r: rnd(.6, 1.8), v: rnd(.004, .012), w: rnd(0, 6.28) });
  var burstDone = false, spawnT = 0;

  /* Estado */
  var target = 0, cur = 0, lastCur = 0, t0 = performance.now();
  function readScroll() {
    var max = story.offsetHeight - vh;
    target = max > 0 ? clamp(-story.getBoundingClientRect().top / max, 0, 1) : 0;
  }

  var C_TOP = [[160, 246, 228], [12, 38, 42]], C_MID = [[42, 150, 140], [9, 24, 27]], C_BOT = [[12, 52, 54], [8, 17, 19]];
  var D_TOP = [6, 20, 23], D_MID = [4, 12, 14], D_BOT = [3, 7, 8]; // lo más hondo
  var K = .62;
  function mix3(c1, c2, c3, t, u) { var a = [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)]; return mixc(a, c3, u); }

  var visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(stage);
  function render(now) { if (visible || target < 1) frame(now); else t0 = now; requestAnimationFrame(render); }
  function frame(now) {
    var dt = Math.min(50, now - t0) / 1000; t0 = now;
    cur += (target - cur) * (1 - Math.pow(0.0015, dt)); // suavizado
    var P = cur, vSigned = (P - lastCur) / Math.max(dt, .001); lastCur = P;
    var p = Math.min(1, P / K); // tiempo de la primera parte (camarote → mi canal)
    var deep = ss(seg(P, K, 1)); // cuánto hemos bajado ya en la Bitácora

    /* 1. Entrada por la pantalla */
    var z = seg(p, .04, .38), ez = easeIn(z);
    var scale = 1 + 22 * ez;
    var fx = L + FX * S, fy = T + FY * S;
    var mv = ss(seg(p, .04, .31));
    var dx = (vw / 2 - fx) * mv, dy = (vh / 2 - fy) * mv;
    var roll = Math.sin(p * Math.PI * 2) * 0.6 * (1 - z);
    var glow = ss(seg(p, .22, .34));
    if (p <= .41) drawRoom(dx, dy, roll, scale, glow);
    $("st-vig").style.opacity = (1 - seg(p, .26, .38)).toFixed(3);
    var tt = seg(p, .012, .09);
    $("st-title").style.opacity = (1 - tt).toFixed(3); $("st-title").style.visibility = tt > .98 ? "hidden" : "visible";
    $("st-title").style.transform = "translateY(" + (-40 * tt) + "px) scale(" + (1 + .06 * tt) + ")";
    $("st-hint").style.opacity = (0.85 * (1 - seg(p, .004, .04))).toFixed(3);

    /* 2. Fogonazo y caída al agua */
    var fl = p < .385 ? ss(seg(p, .33, .385)) : 1 - ss(seg(p, .385, .46));
    $("st-flash").style.opacity = fl.toFixed(3);
    var seaOn = p >= .38;
        if (p < .34) { burstDone = false; bubbles.length = 0; }

    /* 3. Hundirse */
    var d = ss(seg(p, .40, .97));
    var sea = $("st-sea");
    sea.style.opacity = seaOn ? 1 : 0;
    sea.style.setProperty("--top", mix3(C_TOP[0], C_TOP[1], D_TOP, d, deep));
    sea.style.setProperty("--mid", mix3(C_MID[0], C_MID[1], D_MID, d, deep));
    sea.style.setProperty("--bot", mix3(C_BOT[0], C_BOT[1], D_BOT, d, deep));
    $("st-surf").style.opacity = seaOn ? (1 - d).toFixed(3) : 0;
    $("st-rays").style.opacity = seaOn ? (0.9 * (1 - d)).toFixed(3) : 0;
    $("st-caus").style.opacity = seaOn ? (0.8 * (1 - ss(seg(p, .40, .6)))).toFixed(3) : 0;
    room.style.visibility = p > .41 ? "hidden" : "visible";
    $("st-floor").style.opacity = ss(seg(P, .985, 1)).toFixed(3); // al final se funde con el pie de página

    // barriles que suben mientras bajamos
    drift($("st-d1"), seg(p, .40, .72), .24, -6, .55);
    drift($("st-d2"), seg(p, .44, .7), .84, 9, .8);
    drift($("st-d3"), seg(p, .55, .8), .1, -12, 1);

    // capítulos
    chapter($("st-ch1"), p, .47, .53, .61, .66);
    var tvOn = chapter($("st-ch2"), p, .70, .76, .88, .94) > .02;
    bitacora(P);
    // el vídeo del camarote solo se reproduce cuando se ve la ventana
    var ov = $("offline-video");
    if (ov) { if (tvOn && !ov.hidden) { if (ov.paused) { var pr = ov.play(); if (pr && pr.catch) pr.catch(function () {}); } } else if (!ov.paused) ov.pause(); }

    /* Partículas */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    if (!seaOn) {
      var mo = (1 - z) * .9;
      for (i = 0; i < motes.length; i++) {
        var m = motes[i]; m.y -= m.v * dt * 3; m.w += dt * .6; if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); }
        ctx.globalAlpha = mo * (.25 + .25 * Math.sin(m.w * 2));
        ctx.fillStyle = "#dffcf4"; ctx.beginPath(); ctx.arc(m.x * vw + Math.sin(m.w) * 8, m.y * vh, m.r, 0, 6.283); ctx.fill();
      }
    } else {
      // al bajar, el agua (y lo que flota en ella) sube respecto a la cámara
      var sink = clamp(vSigned * (story.offsetHeight - vh) * .35, -900, 1600);
      var light = (.55 + .45 * (1 - d)) * (1 - .45 * deep);

      ctx.globalCompositeOperation = "screen";
      // nieve marina: motitas que flotan casi quietas
      for (i = 0; i < snow.length; i++) {
        var q = snow[i], par = .35 + q.z * .9;
        q.ph += dt * .5; q.y += (5 + q.z * 4) * dt - sink * par * dt; q.x += Math.sin(q.ph) * 4 * dt;
        if (q.y < -10) { q.y = vh + 10; q.x = Math.random() * vw; } else if (q.y > vh + 10) { q.y = -10; q.x = Math.random() * vw; }
        var near = q.z > .88, sz = q.s * (.6 + q.z * 1.6) * (near ? 4 : 1);
        ctx.globalAlpha = (near ? .12 : .18 + .32 * q.z) * light;
        ctx.drawImage(DOT[near ? 1 : 0], q.x - sz * 2, q.y - sz * 2, sz * 4, sz * 4);
      }

      // nacen burbujas sueltas y dos hilos de burbujas pequeñas
      if (!burstDone && target > .38) { for (i = 0; i < 230; i++) spawn(rnd(.18, .82) * vw, rnd(.45, 1.25) * vh, true); burstDone = true; }
      spawnT += dt;
      while (spawnT > .16) { spawnT -= .16; if (bubbles.length < 240) spawn(Math.random() * vw, vh + 20, false); }
      for (i = 0; i < streams.length; i++) {
        var st = streams[i]; st.t -= dt; st.x += Math.sin(now / 3000 + i) * 6 * dt;
        if (st.t <= 0) { st.t = rnd(.07, .22); if (bubbles.length < 260) spawn(st.x + rnd(-3, 3), vh + 8, false, true); }
      }

      for (i = bubbles.length - 1; i >= 0; i--) {
        var b = bubbles[i];
        b.ph += b.f * dt;
        b.y -= (b.vy + sink * (b.l === 0 ? .5 : b.l === 2 ? 1.4 : 1)) * dt;
        if (b.y < -b.r * 3 || b.y > vh + 260) { bubbles.splice(i, 1); continue; }
        var spr = SPR[b.l === 0 ? 1 : b.l === 2 ? 2 : 0];
        var sq = b.r > 3 ? .09 * Math.sin(b.ph * 2) : 0, w = b.r * 2 * spr.k;
        var x = b.x + Math.sin(b.ph) * b.amp;
        ctx.globalAlpha = b.a * light;
        ctx.drawImage(spr.img, x - w * (1 + sq) / 2, b.y - w * (1 - sq) / 2, w * (1 + sq), w * (1 - sq));
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  function drawRoom(dx, dy, roll, scale, glow) {
    if (!photoOk) return;
    var key = [dx, dy, roll, scale, glow, vw, vh].map(function (v) { return v.toFixed(2); }).join();
    if (key === lastKey) return; lastKey = key;
    var g = rctx, w = IW * S, h = IH * S, fx = FX * S, fy = FY * S;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#050b0c"; g.fillRect(0, 0, room.width, room.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate(L + dx + fx, T + dy + fy); g.rotate(roll * Math.PI / 180); g.scale(scale, scale); g.translate(-fx, -fy);
    g.imageSmoothingQuality = "high";
    g.drawImage(photo, 0, 0, w, h);
    if (portrait) { // en vertical la foto se funde con el negro arriba y abajo
      var band = h * .14, gt = g.createLinearGradient(0, 0, 0, band), gb = g.createLinearGradient(0, h - band, 0, h);
      gt.addColorStop(0, "rgba(5,11,12,1)"); gt.addColorStop(1, "rgba(5,11,12,0)");
      gb.addColorStop(0, "rgba(5,11,12,0)"); gb.addColorStop(1, "rgba(5,11,12,1)");
      g.fillStyle = gt; g.fillRect(-2, -2, w + 4, band + 2); g.fillStyle = gb; g.fillRect(-2, h - band, w + 4, band + 2);
    }
    if (glow > 0) { // la pantalla brilla más al acercarnos
      var r = 150 * S, rg = g.createRadialGradient(fx, fy, 0, fx, fy, r);
      rg.addColorStop(0, "rgba(205,255,244,1)"); rg.addColorStop(.38, "rgba(140,250,226,.9)"); rg.addColorStop(.66, "rgba(111,245,216,.45)"); rg.addColorStop(1, "rgba(111,245,216,0)");
      g.globalCompositeOperation = "screen"; g.globalAlpha = glow; g.fillStyle = rg;
      g.beginPath(); g.arc(fx, fy, r, 0, 6.2832); g.fill();
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    }
  }

  /* Bitácora en lo más hondo: una columna que vamos bajando. Arriba el título y debajo,
     uno bajo otro (en zigzag en el ordenador), los cuatro barriles. Cada gesto baja hasta el siguiente. */
  var BIT_STOPS = [.71, .775, .85, .925, 1];
  window.__stBitStops = BIT_STOPS;
  var bitEl = $("st-ch3"), bitHead = bitEl.querySelector(".st-bit-head");
  var bitDoors = Array.prototype.slice.call(bitEl.querySelectorAll(".door"));
  var bitItems = [bitHead].concat(bitDoors);
  function bitCam(P) { // en qué punto de la columna está la cámara (0 = título, 1..4 = barriles)
    if (P <= BIT_STOPS[0]) return -1.15 + 1.15 * ss(seg(P, K, BIT_STOPS[0]));
    for (var i = 1; i < BIT_STOPS.length; i++) if (P <= BIT_STOPS[i]) return i - 1 + (P - BIT_STOPS[i - 1]) / (BIT_STOPS[i] - BIT_STOPS[i - 1]);
    return BIT_STOPS.length - 1;
  }
  function bitacora(P) {
    var on = P > K - .01;
    if (on && window.__stPrepareBubbles) window.__stPrepareBubbles();
    bitEl.style.opacity = on ? 1 : 0; bitEl.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    var c = bitCam(P), narrow = vw < 700, gap = vh * (narrow ? .54 : .52), side = narrow ? 0 : Math.min(vw * .2, 250);
    for (var k = 0; k < bitItems.length; k++) {
      var el = bitItems[k], dist = Math.abs(k - c);
      var y = (k - c) * gap + (k === 0 ? -vh * .04 : vh * .03);
      var x = k === 0 ? 0 : (k % 2 ? -side : side);
      var op = clamp(1 - (dist - .3) / .95, 0, 1) * (dist > 1.6 ? 0 : 1); // el de al lado se intuye, apagado
      el.style.translate = "calc(-50% + " + x.toFixed(1) + "px) calc(-50% + " + y.toFixed(1) + "px)";
      el.style.opacity = op.toFixed(3);
      el.style.visibility = op < .01 ? "hidden" : "visible";
      if (k) { el.style.pointerEvents = op > .6 ? "auto" : "none"; el.style.rotate = ((k - c) * (k % 2 ? 6 : -6)).toFixed(2) + "deg"; }
    }
  }

  function drift(el, t, xr, rot, size) {
    if (t <= 0 || t >= 1) { el.style.opacity = 0; return; }
    var w = el.offsetWidth * (vw < 600 ? .6 : 1);
    var y = mix(vh + 40, -w * 1.2, t);
    if (vw < 600) xr = xr < .5 ? .03 : .97; // en el móvil, pegados a los bordes para no tapar los textos
    var x = xr * vw - w / 2 + Math.sin(t * 6) * 18;
    el.style.opacity = (Math.min(1, t * 6, (1 - t) * 6) * size).toFixed(3);
    el.style.transform = "translate(" + x + "px," + y + "px) rotate(" + (rot * Math.sin(t * 4)) + "deg) scale(" + (vw < 600 ? .6 : 1) + ")";
  }
  function chapter(el, p, a, b, c, d) {
    var inn = ss(seg(p, a, b)), out = ss(seg(p, c, d));
    var op = inn * (1 - out); el.style.opacity = op.toFixed(3); el.style.visibility = op < .02 ? "hidden" : "visible";
    el.style.transform = "translateY(" + ((1 - inn) * 60 - out * 60) + "px)";
    var days = el.querySelectorAll(".sched-days span");
    for (var k = 0; k < days.length; k++) {
      var e = ss(seg(p, a + k * .008, b + k * .008));
      days[k].style.opacity = e; days[k].style.transform = "translateY(" + ((1 - e) * 14) + "px)";
    }
    var time = el.querySelector(".sched-time");
    if (time) { var g = ss(seg(p, b - .01, b + .03)); time.style.textShadow = "0 0 " + (6 + 30 * g) + "px rgba(111,245,216," + (.2 + .5 * g) + ")"; }
    return op;
  }

  layout(); readScroll();
  stage.classList.add("st-on");
  var bh = /^#bitacora(?:-(\d))?$/.exec(location.hash);
  if (bh && window.__stBitStops) {
    var bn = Math.min(4, Math.max(0, +(bh[1] || 1))), run = story.offsetHeight - vh;
    document.documentElement.style.scrollBehavior = "auto";
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    var toY = story.offsetTop + run * window.__stBitStops[bn];
    window.scrollTo(0, toY); readScroll(); cur = lastCur = target;
    requestAnimationFrame(function () { window.scrollTo(0, toY); readScroll(); cur = lastCur = target; document.documentElement.style.scrollBehavior = ""; });
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
  }
  addEventListener("resize", function () { layout(); readScroll(); });
  addEventListener("scroll", readScroll, { passive: true });
  if (reduce) { target = cur = 0; }
  requestAnimationFrame(render);
})();

/* Bitácora: al hacer clic en un barril, explota bajo el agua y entra en la sección.
   Como una explosión submarina de verdad: destello corto, una masa de espuma blanca que se abre,
   el barril roto en trozos irregulares que giran y el agua frena, astillas, y burbujas que suben. */
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var doors = Array.prototype.slice.call(document.querySelectorAll("#st-ch3 .door"));
  if (!doors.length) return;
  var fx = null, g = null, busy = false;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function seg(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }

  // --- romper el barril en trozos irregulares (cortes al azar, como madera que revienta) ---
  function clipHalf(poly, px, py, nx, ny, keep) {
    var out = [], n = poly.length;
    for (var i = 0; i < n; i++) {
      var A = poly[i], B = poly[(i + 1) % n];
      var da = ((A[0] - px) * nx + (A[1] - py) * ny) * keep, db = ((B[0] - px) * nx + (B[1] - py) * ny) * keep;
      if (da >= 0) out.push(A);
      if ((da >= 0) !== (db >= 0)) { var t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
    }
    return out;
  }
  function area(p) { var s = 0; for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); }
  function centroid(p) { var x = 0, y = 0; p.forEach(function (q) { x += q[0]; y += q[1]; }); return [x / p.length, y / p.length]; }
  function split(poly, depth, minA, out) {
    if (depth <= 0 || area(poly) < minA) { out.push(poly); return; }
    var c = centroid(poly), a = rnd(0, Math.PI), nx = Math.cos(a), ny = Math.sin(a);
    var px = c[0] + rnd(-.15, .15) * Math.sqrt(area(poly)), py = c[1] + rnd(-.15, .15) * Math.sqrt(area(poly));
    var A = clipHalf(poly, px, py, nx, ny, 1), B = clipHalf(poly, px, py, nx, ny, -1);
    if (A.length > 2) split(A, depth - 1 - (Math.random() < .3 ? 1 : 0), minA, out);
    if (B.length > 2) split(B, depth - 1 - (Math.random() < .3 ? 1 : 0), minA, out);
  }
  function shatter(img, w, h) {
    var polys = []; split([[0, 0], [w, 0], [w, h], [0, h]], 4, w * h / 60, polys);
    return polys.map(function (poly) {
      var c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h);
      var x = c.getContext("2d"); x.beginPath(); poly.forEach(function (q, i) { i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.closePath();
      x.save(); x.clip(); x.drawImage(img, 0, 0, w, h); x.restore();
      x.strokeStyle = "rgba(20,12,6,.55)"; x.lineWidth = 1.2; x.stroke(); // canto astillado
      return { c: c, cen: centroid(poly), a: area(poly) };
    });
  }

  // burbujas grabadas (las de Tajo): se preparan cuando ya se ven los barriles, para que estén listas al explotar
  var cover = null, coverSnd = null, okVideo = false;
  // el vídeo se veía pixelado en pantallas grandes: siempre se usan las burbujas sueltas de Tajo, nítidas a cualquier tamaño
  var prepared = false;
  function prepare() {
    if (prepared) return; prepared = true;
    coverSnd = new Audio("media/burbujas-tapa.mp3"); coverSnd.preload = "auto"; coverSnd.volume = .8;
    try { fetch("media/burbujas-destapa.mp3"); } catch (e) {}
    if (window.TJBubbles) window.TJBubbles.load();
    if (!okVideo || innerWidth / innerHeight < 1.3) return; // el vídeo es apaisado: solo en pantallas anchas
    cover = document.createElement("video"); cover.className = "sea-video"; cover.muted = true; cover.playsInline = true; cover.preload = "auto";
    cover.setAttribute("aria-hidden", "true"); cover.src = "media/burbujas-tapa.webm"; cover.style.visibility = "hidden"; document.body.appendChild(cover);
    try { fetch("media/burbujas-destapa.webm"); } catch (e) {} // la segunda mitad, a la caché
  }
  window.__stPrepareBubbles = prepare;
  function useFile() { return !!(cover && cover.readyState >= 2 && innerWidth / innerHeight >= 1.3); }
  function sndReady() { return !!(coverSnd && coverSnd.readyState >= 2); }
  function boomSound() { if (window.TJSound) window.TJSound.boom(sndReady()); } // el sonido vive en site.js

  function explode(door, href) {
    if (busy) return; busy = true; boomSound();
    var withVideo = useFile();
    var withSnd = sndReady(), TB = !withVideo && window.TJBubbles && window.TJBubbles.ready() ? window.TJBubbles : null;
    setTimeout(function () { // termina de tapar justo al cambiar de página
      if (withVideo) { cover.currentTime = 0; cover.style.visibility = "visible"; var cp = cover.play(); if (cp && cp.catch) cp.catch(function () {}); }
      if (withSnd) try { coverSnd.currentTime = 0; var ap = coverSnd.play(); if (ap && ap.catch) ap.catch(function () {}); } catch (e) {}
    }, 130);
    if (!fx) { fx = document.createElement("canvas"); fx.className = "boom-fx"; fx.setAttribute("aria-hidden", "true"); document.body.appendChild(fx); g = fx.getContext("2d"); }
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
    fx.width = W * dpr; fx.height = H * dpr;
    var img = door.querySelector(".barrel-img"), r = img.getBoundingClientRect();
    var size = r.width, ex = r.left + r.width * rnd(.45, .55), ey = r.top + r.height * rnd(.5, .6); // la pólvora está dentro, un poco abajo
    var pieces = shatter(img, r.width, r.height).map(function (p) {
      var px = r.left + p.cen[0], py = r.top + p.cen[1], ang = Math.atan2(py - ey, px - ex) + rnd(-.5, .5);
      var sp = rnd(190, 520) * Math.min(1.6, Math.max(.55, 900 / Math.sqrt(p.a + 1) / 18));
      return { c: p.c, ox: p.cen[0], oy: p.cen[1], x: px, y: py, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30, rot: 0, vr: rnd(-7, 7), tum: rnd(0, 6.3), vt: rnd(-9, 9), z: Math.random() < .3 ? rnd(.5, 1) : rnd(-1, .3) };
    });
    var splinters = [], foam = [], bubbles = [], i;
    for (i = 0; i < 26; i++) { var a = rnd(0, 6.283), v = rnd(260, 700); splinters.push({ x: ex, y: ey, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: a, vr: rnd(-14, 14), l: rnd(5, 16), c: Math.random() < .5 ? "#6e4a2c" : "#4a3220" }); }
    for (i = 0; i < 38; i++) { var a2 = rnd(0, 6.283), v2 = rnd(60, 300); foam.push({ x: ex + rnd(-6, 6), y: ey + rnd(-6, 6), vx: Math.cos(a2) * v2, vy: Math.sin(a2) * v2 * .85, r: rnd(10, 26), g: rnd(30, 70) }); }
    door.classList.add("boom");
    var spr = window.__stBubble, start = performance.now(), last = start, emitT = 0, wall = [], near = null;
    var stage = document.getElementById("st-stage"), shakeEnd = start + 380;
    (function frame(now) {
      var real = (now - start) / 1000, dt = Math.min(40, now - last) / 1000 * 1.25; last = now; var T = real * 1.25;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      if (now < shakeEnd) { var m = (shakeEnd - now) / 380 * 4; stage.style.translate = rnd(-m, m).toFixed(1) + "px " + rnd(-m, m).toFixed(1) + "px"; } else stage.style.translate = "";

      // trozos del barril: salen despedidos girando, el agua los frena y luego se hunden despacio
      for (i = 0; i < pieces.length; i++) {
        var pc = pieces[i], dr = Math.exp(-2.8 * dt);
        pc.vx *= dr; pc.vy = pc.vy * dr + 55 * dt; pc.x += pc.vx * dt; pc.y += pc.vy * dt;
        pc.rot += pc.vr * dt; pc.vr *= Math.exp(-1.1 * dt); pc.tum += pc.vt * dt;
        var pa = Math.max(0, 1 - Math.max(0, T - .8) / .5); if (pa <= 0) continue;
        var zs = Math.max(.45, 1 + pc.z * T * 1.1); // hacia la cámara crece, hacia el fondo encoge
        g.save(); g.globalAlpha = pa; g.translate(pc.x, pc.y); g.rotate(pc.rot); g.scale((.55 + .45 * Math.abs(Math.cos(pc.tum))) * zs, zs); // da vueltas sobre sí mismo
        var dark = Math.min(.45, T * .5) + (pc.z < 0 ? -pc.z * .25 : 0), blur = pc.z > .4 ? (pc.z * T * 7).toFixed(1) : 0;
        g.filter = "brightness(" + (1 - dark).toFixed(2) + ")" + (blur ? " blur(" + blur + "px)" : "");
        g.drawImage(pc.c, -pc.ox, -pc.oy); g.restore();
      }
      g.filter = "none";
      // astillas finas
      for (i = 0; i < splinters.length; i++) {
        var s = splinters[i], sd = Math.exp(-4 * dt); s.vx *= sd; s.vy = s.vy * sd + 40 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
        var sa = Math.max(0, 1 - Math.max(0, T - .5) / .5); if (sa <= 0) continue;
        g.globalAlpha = sa; g.strokeStyle = s.c; g.lineWidth = 2; g.beginPath();
        g.moveTo(s.x - Math.cos(s.rot) * s.l / 2, s.y - Math.sin(s.rot) * s.l / 2); g.lineTo(s.x + Math.cos(s.rot) * s.l / 2, s.y + Math.sin(s.rot) * s.l / 2); g.stroke();
      }
      g.globalAlpha = 1;

      g.globalCompositeOperation = "screen";
      // el fogonazo ilumina el agua de alrededor un instante
      if (T < .32) {
        var lf = T < .03 ? T / .03 : Math.pow(1 - (T - .03) / .29, 2), LR = Math.max(W, H) * .9, lg = g.createRadialGradient(ex, ey, 0, ex, ey, LR);
        lg.addColorStop(0, "rgba(255,190,120," + lf * .26 + ")"); lg.addColorStop(.4, "rgba(255,170,100," + lf * .1 + ")"); lg.addColorStop(1, "rgba(111,245,216,0)");
        g.fillStyle = lg; g.fillRect(0, 0, W, H);
      }
      // destello: muy corto, el agua lo apaga enseguida
      if (T < .14) {
        var f = T < .025 ? T / .025 : 1 - (T - .025) / .115, R0 = size * (.3 + T * 2.5), fg = g.createRadialGradient(ex, ey, 0, ex, ey, R0);
        fg.addColorStop(0, "rgba(255,248,226," + f + ")"); fg.addColorStop(.3, "rgba(255,200,130," + f * .6 + ")"); fg.addColorStop(1, "rgba(255,170,90,0)");
        g.fillStyle = fg; g.beginPath(); g.arc(ex, ey, R0, 0, 6.283); g.fill();
      }
      // espuma: una masa blanca y revuelta que se abre y se deshace
      for (i = 0; i < foam.length; i++) {
        var q = foam[i], fd = Math.exp(-3.6 * dt); q.vx *= fd; q.vy = q.vy * fd - 70 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.g * dt;
        var fa = Math.min(1, T / .05) * Math.max(0, 1 - T / .8) * .28; if (fa <= 0) continue;
        var gg = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
        gg.addColorStop(0, "rgba(200,248,238," + fa + ")"); gg.addColorStop(.55, "rgba(140,225,210," + fa * .5 + ")"); gg.addColorStop(1, "rgba(150,225,212,0)");
        g.fillStyle = gg; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.283); g.fill();
      }
      // onda de choque, apenas un brillo que pasa
      if (T < .25) { var sr = size * .35 + T * 1700; g.strokeStyle = "rgba(210,255,246," + (1 - T / .25) * .16 + ")"; g.lineWidth = 3; g.beginPath(); g.arc(ex, ey, sr, 0, 6.283); g.stroke(); }
      // burbujas: primero salen disparadas; después la espuma se convierte en burbujas que suben
      emitT += dt;
      if (T < .7) while (emitT > .012) { emitT -= .012; var ba = rnd(0, 6.283), rr = Math.sqrt(Math.random()) * size * (.15 + T * .6); bubbles.push({ x: ex + Math.cos(ba) * rr, y: ey + Math.sin(ba) * rr, vx: Math.cos(ba) * rnd(20, T < .1 ? 500 : 120), vy: Math.sin(ba) * rnd(20, 160) - rnd(30, 120), r: .7 + Math.pow(Math.random(), 2.4) * 7, ph: rnd(0, 6.3), born: T }); }
      if (spr) for (i = 0; i < bubbles.length; i++) {
        var b = bubbles[i], bd = Math.exp(-3.4 * dt); b.vx *= bd; b.vy = b.vy * bd - (55 + b.r * 30) * dt; b.ph += dt * 5; b.x += b.vx * dt; b.y += b.vy * dt;
        var al = Math.min(1, (T - b.born) / .06) * Math.max(0, 1 - Math.max(0, T - 1.15) / .45) * .9, w = b.r * 2 * spr.k;
        if (al > 0) { g.globalAlpha = al; g.drawImage(spr.img, b.x + Math.sin(b.ph) * b.r * .6 - w / 2, b.y - w / 2, w, w); }
      }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      var cov = seg(real, .36, .88);
      if (cov > 0) {
        g.fillStyle = "rgba(8,17,19," + Math.pow(cov, 1.5).toFixed(3) + ")"; g.fillRect(0, 0, W, H);
        if (TB) { var nt = TB.density(W, H) * 2.3 * dt * (.5 + cov); while (nt > 0) { if (Math.random() < nt) wall.push(TB.make(W, H, rnd(-20, W + 20), H + rnd(20, 120))); nt -= 1; } }
        else { var nw = Math.round(W / 22 * dt / .016 * (.4 + cov));
        for (i = 0; i < nw; i++) wall.push({ x: rnd(-20, W + 20), y: H + rnd(10, 80), v: rnd(900, 1700), r: 1 + Math.pow(Math.random(), 2) * 13, ph: rnd(0, 6.3) }); }
      }
      if (withVideo) { // con el vídeo, la pared la ponen las grabadas; delante, unas pocas muy cerca y desenfocadas
        wall.length = 0;
        if (window.TJBubbles && window.TJBubbles.ready()) {
          if (!near) { near = []; for (i = 0; i < 9; i++) { var nb = window.TJBubbles.make(W, H, rnd(0, W), H + rnd(40, 700)); nb.z = 2; nb.d = Math.min(W, H) * rnd(.17, .27); nb.a = .32; nb.v = H * rnd(1.6, 2.3); near.push(nb); } }
          if (real > .25) for (i = 0; i < near.length; i++) { window.TJBubbles.step(near[i], dt / 1.25); window.TJBubbles.draw(g, near[i]); }
        }
      }
      if (TB && wall.length) {
        wall.sort(function (p, q) { return p.z - q.z; }); // las lejanas detrás, las cercanas delante
        for (i = 0; i < wall.length; i++) { TB.step(wall[i], dt * 1.45 / 1.25); TB.draw(g, wall[i]); }
        g.globalAlpha = 1;
      } else if (spr && wall.length) {
        g.globalCompositeOperation = "screen";
        for (i = 0; i < wall.length; i++) {
          var wb = wall[i]; wb.y -= wb.v * dt / 1.25; wb.ph += dt * 6; var ww = wb.r * 2 * spr.k;
          g.globalAlpha = .85; g.drawImage(spr.img, wb.x + Math.sin(wb.ph) * wb.r - ww / 2, wb.y - ww / 2, ww, ww);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      }
      if (real < .95) requestAnimationFrame(frame);
    })(start);
    setTimeout(function () { try { sessionStorage.setItem("tj-sea", "1"); } catch (e) {} location.href = href; }, 930);
    // si se vuelve con «atrás», el barril está entero otra vez
    addEventListener("pageshow", function () { busy = false; door.classList.remove("boom"); if (cover) { cover.pause(); cover.style.visibility = "hidden"; } if (g) g.clearRect(0, 0, fx.width, fx.height); }, { once: true });
  }
  addEventListener("pageswap", function (e) { if (busy && e.viewTransition) e.viewTransition.skipTransition(); });
  doors.forEach(function (d) {
    d.addEventListener("click", function (e) {
      if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return; // abrir en otra pestaña: normal
      var touch = window.matchMedia && matchMedia("(hover: none)").matches;
      if (touch && !d.classList.contains("open")) return; // en el móvil, el primer toque solo lo destapa
      e.preventDefault(); e.stopImmediatePropagation();
      explode(d, d.getAttribute("href"));
    });
  });
})();

/* Portada por secciones: cada gesto hacia abajo (rueda, flecha, dedo) lleva sola a la siguiente parada,
   y hacia arriba a la anterior. Paradas: camarote · horario · mi canal · bitácora */
(function () {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var story = document.getElementById("st-story");
  if (!story) return;
  var root = document.documentElement;
  var animating = false, lastWheel = 0, armed = true;

  function stops() {
    var vh = window.innerHeight, top = story.offsetTop, run = story.offsetHeight - vh;
    var max = root.scrollHeight - vh;
    var K = .62, B = window.__stBitStops || [];
    return [top, top + run * .575 * K, top + run * .82 * K].concat(B.map(function (b) { return top + run * b; }));
  }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function go(dir) {
    var y = window.scrollY, s = stops(), to = null, i;
    if (y > s[s.length - 1] + 2 || y < s[0] - 2) return false; // fuera de la portada: scroll normal
    if (dir > 0) { for (i = 0; i < s.length; i++) if (s[i] > y + 8) { to = s[i]; break; } }
    else { for (i = s.length - 1; i >= 0; i--) if (s[i] < y - 8) { to = s[i]; break; } }
    if (to === null) return false;
    var from = y, dist = Math.abs(to - from);
    var dur = Math.max(900, Math.min(2800, 500 + dist * .45)), t0 = performance.now();
    animating = true; root.style.scrollBehavior = "auto";
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step); else { animating = false; root.style.scrollBehavior = ""; }
    })(t0);
    return true;
  }

  // Rueda / panel táctil: un gesto = una sección. Se espera a que pare la inercia antes de aceptar otro.
  addEventListener("wheel", function (e) {
    if (e.ctrlKey) return; // zoom
    var now = performance.now(), gap = now - lastWheel; lastWheel = now;
    if (animating) { e.preventDefault(); return; }
    if (gap > 220) armed = true;
    if (!armed) { if (inStory()) e.preventDefault(); return; }
    if (Math.abs(e.deltaY) < 3) return;
    if (go(e.deltaY > 0 ? 1 : -1)) { e.preventDefault(); armed = false; }
  }, { passive: false });

  function inStory() { var y = window.scrollY, s = stops(); return y >= s[0] - 2 && y <= s[s.length - 1] + 2; }

  // Teclado
  addEventListener("keydown", function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    var down = e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey);
    var up = e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey);
    if (!down && !up) return;
    if (animating) { e.preventDefault(); return; }
    if (go(down ? 1 : -1)) e.preventDefault();
  });

  // Dedo en el móvil
  var ty = null;
  addEventListener("touchstart", function (e) { ty = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  addEventListener("touchmove", function (e) { if (ty !== null && (animating || inStory())) e.preventDefault(); }, { passive: false });
  addEventListener("touchend", function (e) {
    if (ty === null || animating) return;
    var dy = ty - e.changedTouches[0].clientY; ty = null;
    if (Math.abs(dy) > 36) go(dy > 0 ? 1 : -1);
  }, { passive: true });

  // Si se queda a medias (al cambiar el tamaño de la ventana), se coloca en la parada más cercana
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () {
    if (animating || !inStory()) return; var y = window.scrollY, s = stops(), best = s[0];
    for (var i = 1; i < s.length; i++) if (Math.abs(s[i] - y) < Math.abs(best - y)) best = s[i];
    root.style.scrollBehavior = "auto"; window.scrollTo(0, best); root.style.scrollBehavior = "";
  }, 250); });
})();
