/*
 * Ellen's Halo-Halo campaign report — Sample Data (Portfolio Demo by ZC Smart Digital)
 * One source of truth: window.HALO_CSV (identical to data/ellens-halo-halo-sample-data.csv).
 * filtered() is the only place records are selected; KPIs, chart, table and the filtered CSV all read it.
 */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var DASH = "—";

  /* ---------- parse the CSV (simple: no quoted commas in this file) ---------- */
  var lines = (window.HALO_CSV || "").trim().split("\n"), header = lines.shift().split(",");
  var RECS = lines.map(function (l) {
    var v = l.split(","), r = {}; header.forEach(function (h, i) { r[h] = v[i]; });
    return { date: r.date, platform: r.platform, campaign: r.campaign, spend: +r.spend_php, impressions: +r.impressions, clicks: +r.clicks, leads: +r.leads, raw: l };
  });
  var DATES = RECS.map(function (r) { return r.date; }).sort(), MIN = DATES[0], MAX = DATES[DATES.length - 1];
  var CAMPS = RECS.map(function (r) { return r.campaign; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
  var PLATS = ["Facebook", "Instagram"], COLORS = { Facebook: "var(--s-fb)", Instagram: "var(--s-ig)" };
  function addDays(ds, n) { var p = ds.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10); }
  function dayIdx(ds) { var a = ds.split("-").map(Number), b = MIN.split("-").map(Number); return Math.round((Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(b[0], b[1] - 1, b[2])) / 864e5); }
  function short(ds) { var p = ds.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric" }); }
  var WEEKS = [0, 1, 2, 3].map(function (w) { var a = addDays(MIN, w * 7), b = addDays(MIN, w * 7 + 6); return { i: w, from: a, to: b, label: "Wk " + (w + 1), range: short(a) + "–" + short(b) }; });

  /* ---------- formatting & maths ---------- */
  var pf; try { pf = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch (e) {}
  var nf = new Intl.NumberFormat("en-PH");
  function peso(n) { return pf ? pf.format(n) : "₱" + n.toFixed(2); }
  function pesoShort(n) { return n >= 1000 ? "₱" + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "₱" + Math.round(n); }
  function num(n) { return nf.format(n); }
  function sum(rs) { var t = { spend: 0, impressions: 0, clicks: 0, leads: 0 }; rs.forEach(function (r) { t.spend += r.spend; t.impressions += r.impressions; t.clicks += r.clicks; t.leads += r.leads; }); t.spend = Math.round(t.spend * 100) / 100; t.ctr = t.impressions ? t.clicks / t.impressions : null; t.cpl = t.leads ? t.spend / t.leads : null; return t; }
  function ctrTxt(v) { return v == null ? DASH : (v * 100).toFixed(2) + "%"; }
  function cplTxt(v) { return v == null ? DASH : peso(v); }

  /* ---------- filters ---------- */
  var fPreset = $("#fPreset"), fFrom = $("#fFrom"), fTo = $("#fTo"), fPlat = $("#fPlat"), fCamp = $("#fCamp"), fMetric = $("#fMetric");
  fPreset.innerHTML = '<option value="all">All 4 weeks</option>' + WEEKS.map(function (w) { return '<option value="w' + w.i + '">' + w.label + " · " + w.range + "</option>"; }).join("") + '<option value="custom">Custom</option>';
  fCamp.innerHTML = '<option value="">All campaigns</option>' + CAMPS.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
  [fFrom, fTo].forEach(function (i) { i.min = MIN; i.max = MAX; });
  function setRange(a, b) { fFrom.value = a; fTo.value = b; }
  function reset() { fPreset.value = "all"; setRange(MIN, MAX); fPlat.value = ""; fCamp.value = ""; update(); }
  fPreset.addEventListener("change", function () {
    var v = fPreset.value; if (v === "all") setRange(MIN, MAX); else if (v[0] === "w") { var w = WEEKS[+v.slice(1)]; setRange(w.from, w.to); } update();
  });
  [fFrom, fTo].forEach(function (i) { i.addEventListener("change", function () { fPreset.value = "custom"; update(); }); });
  [fPlat, fCamp].forEach(function (i) { i.addEventListener("change", update); });
  fMetric.addEventListener("change", function () { drawChart(current); });
  $("#resetBtn").addEventListener("click", reset); $("#emptyReset").addEventListener("click", reset);

  function filtered() {
    var a = fFrom.value || MIN, b = fTo.value || MAX;
    return RECS.filter(function (r) { return r.date >= a && r.date <= b && (!fPlat.value || r.platform === fPlat.value) && (!fCamp.value || r.campaign === fCamp.value); });
  }

  /* ---------- KPIs ---------- */
  function drawKpis(rs) {
    var t = sum(rs);
    $("#kpis").innerHTML =
      kpi("Spend", peso(t.spend), "kSpend", "", true) + kpi("Impressions", num(t.impressions), "kImpr") + kpi("Clicks", num(t.clicks), "kClicks") +
      kpi("Leads", num(t.leads), "kLeads", "message conversations") + kpi("Click-through rate", ctrTxt(t.ctr), "kCtr", "clicks ÷ impressions") + kpi("Cost per lead", cplTxt(t.cpl), "kCpl", "spend ÷ leads", true);
  }
  function kpi(label, val, id, small, hero) { return '<div class="kpi' + (hero ? " kpi--hero" : "") + '"><span>' + label + '</span><strong id="' + id + '">' + val + "</strong>" + (small ? "<small>" + small + "</small>" : "") + "</div>"; }

  /* ---------- weekly chart (grouped bars, one y-axis) ---------- */
  var current = [];
  function weekly(rs) {
    var weeks = WEEKS.filter(function (w) { return rs.some(function (r) { return r.date >= w.from && r.date <= w.to; }); });
    var plats = PLATS.filter(function (p) { return rs.some(function (r) { return r.platform === p; }); });
    return { weeks: weeks, plats: plats, val: function (w, p) { return sum(rs.filter(function (r) { return r.platform === p && r.date >= w.from && r.date <= w.to; })); } };
  }
  function drawChart(rs) {
    var m = fMetric.value, names = { spend: "spend", leads: "leads", clicks: "clicks", impressions: "impressions" };
    $("#metricName").textContent = names[m];
    var W = weekly(rs), fmt = m === "spend" ? pesoShort : function (v) { return v >= 10000 ? (v / 1000).toFixed(0) + "k" : num(v); };
    $("#legend").innerHTML = W.plats.map(function (p) { return '<span><i style="background:' + COLORS[p] + '"></i>' + p + "</span>"; }).join("");
    var w = Math.max(320, $("#chart").clientWidth || 800), h = 280, ml = 56, mr = 12, mt = 22, mb = 44, iw = w - ml - mr, ih = h - mt - mb;
    var vals = []; W.weeks.forEach(function (wk) { W.plats.forEach(function (p) { vals.push(W.val(wk, p)[m]); }); });
    var max = Math.max.apply(null, vals.concat([1])), step = niceStep(max / 4), top = Math.ceil(max / step) * step || 1;
    var y = function (v) { return mt + ih - (v / top) * ih; };
    var s = '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Weekly ' + names[m] + ' by platform, bar chart"><g class="grid axis">';
    for (var t = 0; t <= top + 1e-9; t += step) s += '<line x1="' + ml + '" x2="' + (w - mr) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (ml - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + fmt(t) + "</text>";
    s += "</g>";
    var gw = iw / Math.max(W.weeks.length, 1), bw = Math.min(46, (gw - 28) / Math.max(W.plats.length, 1)), gap = 2;
    W.weeks.forEach(function (wk, gi) {
      var gx = ml + gi * gw + (gw - (bw * W.plats.length + gap * (W.plats.length - 1))) / 2;
      W.plats.forEach(function (p, pi) {
        var t = W.val(wk, p), v = t[m], x = gx + pi * (bw + gap), yy = y(v), bh = Math.max(0, mt + ih - yy);
        var tip = "<b>" + wk.label + " · " + wk.range + "</b><br>" + p + ": " + (m === "spend" ? peso(v) : num(v)) + "<br>Leads " + num(t.leads) + " · CPL " + cplTxt(t.cpl);
        // bar with 4px rounded top, square at baseline
        var r = Math.min(4, bw / 2, bh), d = bh > 0 ? "M" + x + " " + (mt + ih) + "V" + (yy + r) + "Q" + x + " " + yy + " " + (x + r) + " " + yy + "H" + (x + bw - r) + "Q" + (x + bw) + " " + yy + " " + (x + bw) + " " + (yy + r) + "V" + (mt + ih) + "Z" : "";
        s += '<g class="bar" tabindex="0" data-tip="' + esc(tip) + '" aria-label="' + esc(wk.label + ", " + p + ", " + (m === "spend" ? peso(v) : num(v))) + '"><rect x="' + x + '" y="' + (mt) + '" width="' + bw + '" height="' + ih + '" fill="transparent"/>' + (d ? '<path d="' + d + '" fill="' + COLORS[p] + '"/>' : "") + "</g>";
      });
      s += '<g class="axis"><text x="' + (ml + gi * gw + gw / 2) + '" y="' + (h - 24) + '" text-anchor="middle" font-weight="700">' + wk.label + '</text><text x="' + (ml + gi * gw + gw / 2) + '" y="' + (h - 8) + '" text-anchor="middle">' + wk.range + "</text></g>";
    });
    s += '<line x1="' + ml + '" x2="' + (w - mr) + '" y1="' + (mt + ih) + '" y2="' + (mt + ih) + '" stroke="#bfb2a0"/></svg>';
    $("#chart").innerHTML = s;
    // table view of the same numbers
    $("#chartTable").innerHTML = '<div class="table-wrap"><table><thead><tr><th>Week</th>' + W.plats.map(function (p) { return "<th>" + p + "</th>"; }).join("") + "</tr></thead><tbody>" +
      W.weeks.map(function (wk) { return "<tr><td>" + wk.label + " · " + wk.range + "</td>" + W.plats.map(function (p) { var v = W.val(wk, p)[m]; return "<td>" + (m === "spend" ? peso(v) : num(v)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
  }
  function niceStep(x) { var p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1e-9)))), n = x / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  var tip = $("#tip");
  function showTip(g, ev) {
    tip.innerHTML = g.getAttribute("data-tip"); tip.hidden = false;
    var card = g.closest(".card").getBoundingClientRect(), b = g.getBoundingClientRect();
    var x = (ev && ev.clientX ? ev.clientX : b.left + b.width / 2) - card.left, yv = b.top - card.top;
    tip.style.left = Math.max(8, Math.min(x - tip.offsetWidth / 2, card.width - tip.offsetWidth - 8)) + "px"; tip.style.top = Math.max(8, yv + 30) + "px";
  }
  $("#chart").addEventListener("mousemove", function (e) { var g = e.target.closest(".bar"); if (g) showTip(g, e); else tip.hidden = true; });
  $("#chart").addEventListener("mouseleave", function () { tip.hidden = true; });
  $("#chart").addEventListener("focusin", function (e) { var g = e.target.closest(".bar"); if (g) showTip(g); });
  $("#chart").addEventListener("focusout", function () { tip.hidden = true; });
  $("#tableToggle").addEventListener("click", function () { var t = $("#chartTable"), open = t.hidden; t.hidden = !open; this.setAttribute("aria-expanded", String(open)); this.textContent = open ? "Hide table" : "Show as table"; });

  /* ---------- campaign table (sortable) ---------- */
  var sortK = "spend", sortDir = "descending";
  function drawTable(rs) {
    var rows = CAMPS.map(function (c) { var sub = rs.filter(function (r) { return r.campaign === c; }); if (!sub.length) return null; var t = sum(sub); t.campaign = c; t.plats = PLATS.filter(function (p) { return sub.some(function (r) { return r.platform === p; }); }); return t; }).filter(Boolean);
    var withCpl = rows.filter(function (r) { return r.cpl != null; }), best = withCpl.length ? withCpl.reduce(function (a, b) { return b.cpl < a.cpl ? b : a; }) : null;
    rows.sort(function (a, b) {
      var x = a[sortK], y = b[sortK];
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; // em-dash rows always last
      var c = typeof x === "string" ? x.localeCompare(y) : x - y; return sortDir === "ascending" ? c : -c;
    });
    $("#campRows").innerHTML = rows.map(function (r) {
      return '<tr data-campaign="' + esc(r.campaign) + '"><td><b>' + esc(r.campaign) + "</b>" + (best && r.campaign === best.campaign && withCpl.length > 1 ? '<span class="best">Lowest CPL</span>' : "") + '<span class="plats">' + r.plats.join(" + ") + "</span></td><td>" + peso(r.spend) + "</td><td>" + num(r.impressions) + "</td><td>" + num(r.clicks) + "</td><td>" + num(r.leads) + '</td><td>' + ctrTxt(r.ctr) + '</td><td class="cpl">' + cplTxt(r.cpl) + "</td></tr>";
    }).join("");
    document.querySelectorAll("#campTable th").forEach(function (th) { th.setAttribute("aria-sort", th.dataset.k === sortK ? sortDir : "none"); });
  }
  document.querySelectorAll("#campTable th button").forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.parentNode.dataset.k;
      if (sortK === k) sortDir = sortDir === "ascending" ? "descending" : "ascending";
      else { sortK = k; sortDir = k === "cpl" || k === "campaign" ? "ascending" : "descending"; }
      drawTable(current);
    });
  });

  /* ---------- filtered CSV (same records) ---------- */
  $("#dlFiltered").addEventListener("click", function () {
    var csv = header.join(",") + "\n" + current.map(function (r) { return r.raw; }).join("\n") + (current.length ? "\n" : "");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "ellens-halo-halo-sample-data-filtered.csv"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  /* ---------- update everything from one filtered set ---------- */
  function update() {
    current = filtered();
    var empty = !current.length;
    ["#kpis", ".card"].forEach(function (sel) { document.querySelectorAll(sel).forEach(function (el) { el.hidden = empty; }); });
    $("#empty").hidden = !empty; $("#dlFiltered").disabled = empty;
    var bits = [fFrom.value === MIN && fTo.value === MAX ? "all 4 weeks" : short(fFrom.value) + "–" + short(fTo.value), fPlat.value || "all platforms", fCamp.value || "all campaigns"];
    $("#status").textContent = (empty ? "0 records" : current.length + " daily records") + " · " + bits.join(" · ");
    if (empty) {
      $("#emptyWhy").textContent = fFrom.value > fTo.value ? "The start date is after the end date." : (fCamp.value === "Story Teaser" && fPlat.value === "Facebook") ? "Story Teaser ran on Instagram only, so it has no Facebook results." : "Nothing matches this combination of dates, platform and campaign.";
      return;
    }
    drawKpis(current); drawChart(current); drawTable(current);
  }
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (current.length) drawChart(current); }, 150); });
  window.HALO_DASH = { filtered: function () { return current.slice(); } }; // used by the acceptance test
  reset();
})();
