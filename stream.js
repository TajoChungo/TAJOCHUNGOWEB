// Gráfica, tabla y cifras de la página Mi stream. Los datos están en datos/stream.js.
var STREAM_MESES = STREAM_DATOS.meses;

// Cifras fijas de arriba (las que no da la API al momento), sacadas de los datos
(function () {
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var fmt = function (n) { return Math.round(n).toLocaleString("es-ES", { useGrouping: "always" }); };
  var fecha = function (iso) { var p = iso.split("-"); return +p[2] + " de " + MESES[p[1] - 1] + " de " + p[0]; };
  var rec = STREAM_MESES.reduce(function (a, r) { return r[3] > a[3] ? r : a; });
  var recMes = MESES[rec[0].slice(5) - 1];
  var v = {
    seguidores: fmt(STREAM_DATOS.seguidores),
    horas: fmt(Math.floor(STREAM_MESES.reduce(function (s, r) { return s + r[1]; }, 0))),
    dias: fmt(STREAM_DATOS.dias),
    record: fmt(rec[3]),
    record_mes: recMes.charAt(0).toUpperCase() + recMes.slice(1) + " de " + rec[0].slice(0, 4),
    fecha_a: "a " + fecha(STREAM_DATOS.actualizado),
    fuente: "Datos de TwitchTracker y Twitch a " + fecha(STREAM_DATOS.actualizado) + "."
  };
  document.querySelectorAll("[data-dato]").forEach(function (el) {
    var k = el.getAttribute("data-dato");
    if (v[k] != null) el.textContent = v[k];
  });
})();

// Cifras al momento: cada vez que alguien entra, se piden a la API pública de TwitchTracker.
// Si no responde, se quedan los números de arriba del archivo (los del último repaso a mano).
(function () {
  var fmt = function (n) { return Math.round(n).toLocaleString("es-ES", { useGrouping: "always" }); };
  var ctrl = window.AbortController ? new AbortController() : null;
  if (ctrl) setTimeout(function () { ctrl.abort(); }, 6000);
  fetch("https://twitchtracker.com/api/channels/summary/tajochungo", ctrl ? { signal: ctrl.signal } : {})
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      if (typeof d.followers_total !== "number") return;
      var v = {
        followers_total: fmt(d.followers_total),
        hours: fmt(d.minutes_streamed / 60),
        avg_viewers: fmt(d.avg_viewers),
        max_viewers: fmt(d.max_viewers),
        followers: (d.followers > 0 ? "+" : d.followers < 0 ? "−" : "") + fmt(Math.abs(d.followers))
      };
      document.querySelectorAll("[data-live]").forEach(function (b) {
        var k = b.getAttribute("data-live");
        if (v[k] != null) b.textContent = v[k];
      });
      var nota = document.getElementById("live-note");
      if (nota) { nota.textContent = "al momento"; nota.classList.add("on"); }
    })
    .catch(function () {});
})();

(function () {
  var NOMBRES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var NS = "http://www.w3.org/2000/svg";
  var num = function (n, dec) { return n.toLocaleString("es-ES", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0, useGrouping: "always" }); };
  var horas = function (h) { return (h < 10 && h % 1 ? num(h, 1) : num(Math.round(h))) + " h"; };

  // Todos los meses seguidos, también los que no hubo directo (se ven como hueco: los parones)
  var porMes = {};
  STREAM_MESES.forEach(function (r) { porMes[r[0]] = r; });
  var meses = [], ultimo = 0;
  var y = 2021, m = 3, fin = STREAM_MESES[STREAM_MESES.length - 1][0];
  while (true) {
    var k = y + "-" + String(m + 1).padStart(2, "0"), r = porMes[k];
    if (r) ultimo = r[4];
    meses.push({ k: k, y: y, m: m, h: r ? r[1] : 0, avg: r ? r[2] : 0, peak: r ? r[3] : 0, fol: ultimo, gain: r ? r[5] : 0, live: !!r });
    if (k === fin) break;
    if (++m === 12) { m = 0; y++; }
  }

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ----- Gráficas: misma escala de meses, cada una con su propio eje -----
  // Se dibujan al ancho real de la pantalla (sin estirar) y se redibujan al cambiar de tamaño
  var n = meses.length, W, PADL = 40, PADR = 4, step, sh, sf, bars, pts, dot, guides, nota, HH = 220, HF = 140, maxH = 250, maxF = 2500;
  var x = function (i) { return PADL + i * step; };
  var tip = document.getElementById("tchart-tip"), fig = document.getElementById("tchart"), activo = -1;
  var boxH = document.getElementById("plot-hours"), boxF = document.getElementById("plot-followers");
  var maxI = 0;
  meses.forEach(function (d, i) { if (d.h > meses[maxI].h) maxI = i; });

  function plot(box, H, max, ticks, fmt) {
    box.textContent = "";
    var svg = el("svg", { width: W, height: H + 26, viewBox: "0 0 " + W + " " + (H + 26), "aria-hidden": "true" });
    ticks.forEach(function (t) {
      var ty = Math.round(H - (t / max) * (H - 8)) + 0.5;
      el("line", { x1: PADL, x2: W - PADR, y1: ty, y2: ty, class: t ? "tc-grid" : "tc-base" }, svg);
      el("text", { x: PADL - 8, y: ty + 4, class: "tc-ylab", "text-anchor": "end" }, svg).textContent = fmt(t);
    });
    var cada = W < 520 ? 2 : 1; // en el móvil, un año sí y otro no, para que no se pisen
    meses.forEach(function (d, i) {
      if (i === 0) { if (W >= 520) el("text", { x: PADL, y: H + 20, class: "tc-xlab", "text-anchor": "start" }, svg).textContent = "abr 2021"; }
      else if (d.m === 0 && (d.y - 2022) % cada === 0) el("text", { x: x(i), y: H + 20, class: "tc-xlab", "text-anchor": "middle" }, svg).textContent = d.y;
    });
    box.appendChild(svg);
    return svg;
  }

  function dibujar() {
    W = Math.round(boxH.clientWidth); step = (W - PADL - PADR) / n;
    sh = plot(boxH, HH, maxH, [0, 50, 100, 150, 200, 250], function (t) { return t; });
    var gap = step > 6 ? 2 : 1;
    bars = meses.map(function (d, i) {
      var bh = d.h ? Math.max(2, (d.h / maxH) * (HH - 8)) : 0;
      return el("rect", { x: x(i) + gap / 2, y: HH - bh, width: Math.max(1, step - gap), height: bh, rx: Math.min(2, (step - gap) / 2), class: "tc-bar" + (i === maxI ? " best" : "") }, sh);
    });
    var bx = x(maxI) + step / 2, by = HH - (meses[maxI].h / maxH) * (HH - 8);
    nota = el("text", { x: bx - 8, y: by + 4, class: "tc-note", "text-anchor": "end" }, sh);
    nota.textContent =
      "Récord: " + horas(meses[maxI].h) + (W < 520 ? "" : " en " + NOMBRES[meses[maxI].m] + " de " + meses[maxI].y);

    sf = plot(boxF, HF, maxF, [0, 1000, 2000], function (t) { return num(t); });
    pts = meses.map(function (d, i) { return [x(i) + step / 2, HF - (d.fol / maxF) * (HF - 8)]; });
    el("path", { d: "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L"), class: "tc-line" }, sf);
    dot = el("circle", { r: 5, class: "tc-dot", visibility: "hidden" }, sf);
    guides = [[sh, HH], [sf, HF]].map(function (g) { return el("line", { y1: 0, y2: g[1], class: "tc-guide", visibility: "hidden" }, g[0]); });
    var a = activo; activo = -1;
    if (a >= 0) mostrar(a);
  }

  function mostrar(i) {
    if (i === activo) return;
    activo = i;
    var d = meses[i], cx = x(i) + step / 2;
    bars.forEach(function (b, j) { b.classList.toggle("dim", j !== i); });
    guides.forEach(function (g) { g.setAttribute("x1", cx); g.setAttribute("x2", cx); g.setAttribute("visibility", "visible"); });
    nota.setAttribute("visibility", "hidden");
    dot.setAttribute("cx", pts[i][0]); dot.setAttribute("cy", pts[i][1]); dot.setAttribute("visibility", "visible");
    tip.innerHTML = "<b>" + NOMBRES[d.m] + " de " + d.y + "</b>" +
      (d.live
        ? "<span><i class='k-h'></i>" + horas(d.h) + " en directo</span>" + (d.avg ? "<span class='sub'>" + num(d.avg) + " espectadores de media · pico de " + num(d.peak) + "</span>" : "<span class='sub'>Media y pico: se apuntan al acabar el mes</span>")
        : "<span><i class='k-h'></i>Sin directos</span>") +
      "<span><i class='k-f'></i>" + num(d.fol) + " seguidores" + (d.gain ? " (" + (d.gain > 0 ? "+" : "−") + num(Math.abs(d.gain)) + ")" : "") + "</span>";
    tip.hidden = false;
    var fr = fig.getBoundingClientRect(), br = boxH.getBoundingClientRect(), tw = tip.offsetWidth;
    // La ficha va al lado de la línea, nunca encima de la barra que estás mirando
    var px = br.left - fr.left + cx, izq = px - 14 - tw, der = px + 14;
    tip.style.left = Math.round(px > fr.width / 2 ? Math.max(0, izq) : Math.min(fr.width - tw, der)) + "px";
    tip.style.top = Math.round(br.top - fr.top) + "px";
  }
  function ocultar() {
    activo = -1; tip.hidden = true;
    bars.forEach(function (b) { b.classList.remove("dim"); });
    guides.forEach(function (g) { g.setAttribute("visibility", "hidden"); });
    dot.setAttribute("visibility", "hidden");
    nota.setAttribute("visibility", "visible");
  }
  function donde(ev) {
    var vx = ev.clientX - boxH.getBoundingClientRect().left;
    return Math.max(0, Math.min(n - 1, Math.floor((vx - PADL) / step)));
  }
  fig.addEventListener("pointermove", function (ev) { mostrar(donde(ev)); });
  fig.addEventListener("pointerdown", function (ev) { mostrar(donde(ev)); });
  fig.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "mouse") ocultar(); });
  document.addEventListener("pointerdown", function (ev) { if (!fig.contains(ev.target)) ocultar(); });
  var anchoPrevio = 0;
  window.addEventListener("resize", function () { if (boxH.clientWidth !== anchoPrevio) { anchoPrevio = boxH.clientWidth; dibujar(); } });
  anchoPrevio = boxH.clientWidth;
  dibujar();

  // ----- Tabla por años (el año actual, abierto) -----
  var cont = document.getElementById("years"), anios = {};
  meses.forEach(function (d) { (anios[d.y] = anios[d.y] || []).push(d); });
  var maxMes = Math.max.apply(null, meses.map(function (d) { return d.h; }));
  Object.keys(anios).sort().reverse().forEach(function (a, idx) {
    var lista = anios[a], tot = lista.reduce(function (s, d) { return s + d.h; }, 0);
    var activos = lista.filter(function (d) { return d.live; }).length;
    var det = document.createElement("details");
    det.className = "year";
    if (idx === 0) det.open = true;
    var filas = lista.slice().reverse().map(function (d) {
      if (!d.live) return "<tr class='off'><td>" + NOMBRES[d.m] + "</td><td colspan='4'>Sin directos</td></tr>";
      return "<tr" + (d.h === maxMes ? " class='best'" : "") + "><td>" + NOMBRES[d.m] + "</td>" +
        "<td class='h'><span class='bar' style='width:" + Math.max(2, Math.round((d.h / maxMes) * 120)) + "px'></span>" + horas(d.h) + "</td>" +
        "<td>" + (d.avg ? num(d.avg) : "—") + "</td><td>" + (d.peak ? num(d.peak) : "—") + "</td>" +
        "<td>" + (d.gain > 0 ? "+" : d.gain < 0 ? "−" : "") + num(Math.abs(d.gain)) + "</td></tr>";
    }).join("");
    det.innerHTML = "<summary><span class='y'>" + a + "</span><span class='yt'>" + horas(tot) + "</span><span class='ym'>" +
      activos + (activos === 1 ? " mes" : " meses") + " con directo</span></summary>" +
      "<div class='table-wrap'><table class='streams'><thead><tr><th>Mes</th><th>Horas</th><th>Media</th><th>Pico</th><th>Seguidores</th></tr></thead><tbody>" + filas + "</tbody></table></div>";
    cont.appendChild(det);
  });
})();
