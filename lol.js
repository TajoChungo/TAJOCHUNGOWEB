// Rellena las cuentas de la página League of Legends con datos/lol.js (los actualiza la tarea diaria de GitHub)
(function () {
  if (typeof LOL_DATOS === "undefined") return;
  var LIGAS = { IRON: "Hierro", BRONZE: "Bronce", SILVER: "Plata", GOLD: "Oro", PLATINUM: "Platino", EMERALD: "Esmeralda", DIAMOND: "Diamante", MASTER: "Maestro", GRANDMASTER: "Gran Maestro", CHALLENGER: "Aspirante" };
  var SIN_DIVISION = { MASTER: 1, GRANDMASTER: 1, CHALLENGER: 1 };
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var num = function (n) { return n.toLocaleString("es-ES", { useGrouping: "always" }); };
  var pct = function (n) { return n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %"; };

  LOL_DATOS.cuentas.forEach(function (c, i) {
    var card = document.querySelector('[data-cuenta="' + i + '"]');
    if (!card) return;
    var q = function (k) { return card.querySelector('[data-c="' + k + '"]'); };
    q("icono").src = "media/lol/icono-" + c.icono + "." + (c.iconoExt || "webp");
    q("nivel").textContent = "EUW · Nivel " + num(c.nivel);
    var liga = c.liga ? c.liga.toUpperCase() : null;
    var rank = q("rank");
    if (!liga) {
      rank.className = "rank";
      q("emblema").hidden = true;
      q("liga").textContent = "Sin clasificar";
      q("lp").textContent = "";
    } else {
      rank.className = "rank " + liga.toLowerCase();
      q("emblema").hidden = false;
      q("emblema").src = "media/lol/emblema-" + liga.toLowerCase() + ".webp";
      q("liga").textContent = (LIGAS[liga] || liga) + (SIN_DIVISION[liga] ? "" : " " + c.division);
      q("lp").textContent = num(c.lp) + " LP";
    }
    var total = c.victorias + c.derrotas, wr = total ? (c.victorias / total) * 100 : 0;
    q("wr").firstElementChild.style.width = wr.toFixed(1) + "%";
    q("wr").setAttribute("aria-label", pct(wr) + " de victorias");
    q("vd").textContent = num(c.victorias) + (c.victorias === 1 ? " victoria" : " victorias") + " · " + num(c.derrotas) + (c.derrotas === 1 ? " derrota" : " derrotas");
    q("pct").textContent = pct(wr);
  });
  var p = LOL_DATOS.actualizado.split("-");
  document.getElementById("lol-fecha").textContent = "Clasificatoria Solo/Dúo a " + (+p[2]) + " de " + MESES[p[1] - 1] + " de " + p[0] + ".";
})();
