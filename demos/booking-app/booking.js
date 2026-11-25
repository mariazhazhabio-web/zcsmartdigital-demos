/*
 * Lumi Beauty Studio — booking demo (Portfolio Demo by ZC Smart Digital)
 * All times are Philippine Time (PHT, UTC+8) whatever the visitor's own time zone.
 * Availability is simulated; demo bookings live in this browser's localStorage.
 */
(function () {
  "use strict";
  var KEY = "lumi-demo-bookings-v1";
  var SERVICES = [
    { id: "skin-consult", name: "Skin Consultation", dur: 15, desc: "A quick chat with a skin therapist about your concerns and goals, with product suggestions to try at home." },
    { id: "facial-assess", name: "Facial Assessment", dur: 30, desc: "A closer look at your skin under studio light, plus a personalised facial plan for your next visit." }
  ];
  var OPEN = 10 * 60, CLOSE = 18 * 60, STEP = 15, DAYS = 14, LEAD_MIN = 60;
  var SAMPLE = { name: "Bea Santos (Sample)", email: "bea.sample@example.com", mobile: "0917 555 0188", notes: "First visit, sensitive skin. (Sample booking)" };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var mem = [];
  function load() { try { var v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return mem.slice(); } }
  function save(v) { mem = v.slice(); try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function active() { return load().filter(function (b) { return b.status !== "cancelled"; }); }
  var tT; function toast(m) { var t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(tT); tT = setTimeout(function () { t.hidden = true; }, 3200); }

  /* ---------- Philippine time helpers ---------- */
  function phtNow() { var d = new Date(Date.now() + 8 * 3600e3); return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() }; }
  function addDays(ds, n) { var p = ds.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10); }
  function dow(ds) { var p = ds.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); }
  function dateLabel(ds, opts) { var p = ds.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString("en-PH", Object.assign({ timeZone: "UTC" }, opts)); }
  function longDate(ds) { return dateLabel(ds, { weekday: "short", day: "numeric", month: "short", year: "numeric" }); }
  function hm(min) { var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12; return h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap; }
  function hhmm(min) { return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0"); }

  /* ---------- simulated availability ---------- */
  function seed(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
  function simBusy(ds) { // 3 simulated 30-minute appointments booked by "other clients"
    var r = seed("lumi" + ds), out = [];
    for (var i = 0; i < 3; i++) out.push({ start: OPEN + Math.floor(r() * ((CLOSE - OPEN - 30) / STEP + 1)) * STEP, dur: 30, sim: true });
    return out;
  }
  function closed(ds) { return dow(ds) === 1; } // closed on Mondays
  function overlaps(a0, ad, b0, bd) { return a0 < b0 + bd && b0 < a0 + ad; }
  function isFree(ds, start, dur, ignoreRef) {
    if (closed(ds) || start < OPEN || start + dur > CLOSE) return false;
    var now = phtNow(); if (ds < now.date || (ds === now.date && start < now.min + LEAD_MIN)) return false;
    var busy = simBusy(ds).concat(active().filter(function (b) { return b.date === ds && b.ref !== ignoreRef; }));
    return !busy.some(function (b) { return overlaps(start, dur, b.start, b.dur); });
  }
  function upcomingDates() { var t = phtNow().date, out = []; for (var i = 0; i < DAYS; i++) out.push(addDays(t, i)); return out; }
  function anyFree(ds, dur) { for (var m = OPEN; m + dur <= CLOSE; m += STEP) if (isFree(ds, m, dur)) return true; return false; }

  /* ---------- state & rendering ---------- */
  var st = { step: 1, svc: null, date: null, start: null, d: { name: "", email: "", mobile: "", notes: "" }, last: null };
  function svc() { return SERVICES.filter(function (s) { return s.id === st.svc; })[0]; }
  function setStepper() {
    document.querySelectorAll("#stepper li").forEach(function (li) {
      var n = +li.dataset.s; li.className = st.step === 5 ? "done" : n < st.step ? "done" : n === st.step ? "on" : "";
      if (n === st.step) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
  }
  function go(step) { st.step = step; render(); var s = $("#screen"); s.scrollTop = 0; window.scrollTo(0, 0); var h = $("#screen h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }
  function actions(backTo, nextLabel, nextId, disabled) {
    return '<div class="actions">' + (backTo ? '<button type="button" class="btn btn--ghost" data-back="' + backTo + '">Back</button>' : "") +
      '<button type="button" class="btn btn--primary" id="' + nextId + '"' + (disabled ? " disabled" : "") + ">" + nextLabel + "</button></div>";
  }
  function render() {
    setStepper();
    var s = $("#screen"), x = svc();
    if (st.step === 1) {
      s.innerHTML = '<h2 id="stepTitle">Choose a service</h2><p class="note">Both sessions happen at the studio with a licensed skin therapist.</p>' +
        SERVICES.map(function (v) { return '<label class="svc"><input type="radio" name="svc" value="' + v.id + '"' + (st.svc === v.id ? " checked" : "") + '><h3>' + v.name + '</h3><span class="dur">' + v.dur + " minutes</span><p>" + v.desc + "</p></label>"; }).join("") +
        actions(null, "Continue", "next1", !st.svc);
      s.querySelectorAll("input[name=svc]").forEach(function (r) { r.addEventListener("change", function () { st.svc = r.value; $("#next1").disabled = false; }); });
      $("#next1").addEventListener("click", function () {
        if (st.start != null && !isFree(st.date, st.start, svc().dur)) { st.start = null; toast("Your earlier time doesn’t fit a " + svc().dur + "-minute session. Please pick a new time."); }
        go(2);
      });
    } else if (st.step === 2) {
      var dates = upcomingDates();
      if (!st.date || closed(st.date) || dates.indexOf(st.date) < 0) st.date = dates.filter(function (d) { return !closed(d) && anyFree(d, x.dur); })[0] || dates[0];
      var slots = []; for (var m = OPEN; m + x.dur <= CLOSE; m += STEP) slots.push(m);
      var freeCount = slots.filter(function (m) { return isFree(st.date, m, x.dur); }).length;
      s.innerHTML = '<h2 id="stepTitle">Pick a date &amp; time</h2><p class="note">' + esc(x.name) + " · " + x.dur + " min · times in Philippine Time (PHT)</p>" +
        '<div class="dates" role="group" aria-label="Dates">' + dates.map(function (d) {
          var c = closed(d); return '<button type="button" class="date" data-date="' + d + '" aria-pressed="' + (d === st.date) + '"' + (c ? " disabled" : "") + ' aria-label="' + esc(longDate(d)) + (c ? ", closed" : "") + '"><small>' + dateLabel(d, { weekday: "short" }) + "</small><b>" + dateLabel(d, { day: "numeric" }) + "</b><small>" + (c ? "Closed" : dateLabel(d, { month: "short" })) + "</small></button>";
        }).join("") + "</div>" +
        '<div class="slots-head"><h3>' + esc(longDate(st.date)) + '</h3><span class="legend"><i class="av"></i>Open<i></i>Unavailable</span></div>' +
        (freeCount ? '<div class="slots" role="group" aria-label="Start times">' + slots.map(function (m) {
          var f = isFree(st.date, m, x.dur); return '<button type="button" class="slot" data-min="' + m + '" data-time="' + hhmm(m) + '" aria-pressed="' + (st.start === m) + '"' + (f ? "" : ' disabled aria-label="' + hm(m) + ', unavailable"') + ">" + hm(m).replace(" ", " ") + "</button>";
        }).join("") + "</div>" : '<p class="empty">No open times left on this day. Try another date.</p>') +
        actions("1", "Continue", "next2", st.start == null);
      s.querySelectorAll(".date").forEach(function (b) { b.addEventListener("click", function () { if (st.date !== b.dataset.date) { st.date = b.dataset.date; st.start = null; } render(); }); });
      s.querySelectorAll(".slot").forEach(function (b) { b.addEventListener("click", function () { st.start = +b.dataset.min; render(); var nb = $("#next2"); if (nb) nb.focus(); }); });
      $("#next2").addEventListener("click", function () { go(3); });
    } else if (st.step === 3) {
      s.innerHTML = '<h2 id="stepTitle">Your details</h2><p class="note">Demo only: details stay in this browser and nothing is sent.</p>' +
        '<button type="button" class="btn btn--sample" id="sampleBtn">Use Sample Details</button><div class="err-summary" id="errs" tabindex="-1" hidden></div>' +
        '<label class="field">Full name <b class="req">*</b><input type="text" id="dName" autocomplete="name" value="' + esc(st.d.name) + '"><em class="err" id="dName-err"></em></label>' +
        '<label class="field">Email <b class="req">*</b><input type="email" id="dEmail" autocomplete="email" value="' + esc(st.d.email) + '"><em class="err" id="dEmail-err"></em></label>' +
        '<label class="field">Mobile <b class="req">*</b><input type="tel" id="dMobile" autocomplete="tel" placeholder="0917 123 4567" value="' + esc(st.d.mobile) + '"><em class="err" id="dMobile-err"></em></label>' +
        '<label class="field">Notes for your therapist<textarea id="dNotes" rows="3">' + esc(st.d.notes) + "</textarea></label>" +
        actions("2", "Review booking", "next3");
      $("#sampleBtn").addEventListener("click", function () { $("#dName").value = SAMPLE.name; $("#dEmail").value = SAMPLE.email; $("#dMobile").value = SAMPLE.mobile; $("#dNotes").value = SAMPLE.notes; toast("Sample details filled in."); });
      $("#next3").addEventListener("click", function () {
        var d = { name: $("#dName").value.trim(), email: $("#dEmail").value.trim(), mobile: $("#dMobile").value.trim(), notes: $("#dNotes").value.trim() }, e = [];
        st.d = d;
        ["dName", "dEmail", "dMobile"].forEach(function (id) { $("#" + id).removeAttribute("aria-invalid"); $("#" + id + "-err").textContent = ""; });
        if (d.name.length < 2) e.push(["dName", "Enter your full name."]);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) e.push(["dEmail", "Enter a valid email, like name@example.com."]);
        if (!/^(\+639|09)\d{9}$/.test(d.mobile.replace(/[\s\-().]/g, ""))) e.push(["dMobile", "Enter a Philippine mobile number, e.g. 0917 123 4567."]);
        if (e.length) { e.forEach(function (x) { $("#" + x[0]).setAttribute("aria-invalid", "true"); $("#" + x[0] + "-err").textContent = x[1]; }); var es = $("#errs"); es.textContent = "Please fix " + e.length + " field" + (e.length > 1 ? "s" : "") + "."; es.hidden = false; es.focus(); return; }
        go(4);
      });
    } else if (st.step === 4) {
      s.innerHTML = '<h2 id="stepTitle">Review &amp; confirm</h2><p class="note">Check everything, or tap Edit to change it.</p><ul class="review">' +
        '<li><span>Service</span><strong>' + esc(x.name) + " · " + x.dur + ' min</strong><button type="button" data-edit="1">Edit</button></li>' +
        '<li><span>Date &amp; time (PHT)</span><strong>' + esc(longDate(st.date)) + ", " + hm(st.start) + " – " + hm(st.start + x.dur) + '</strong><button type="button" data-edit="2">Edit</button></li>' +
        '<li><span>Contact</span><strong>' + esc(st.d.name) + "<br>" + esc(st.d.email) + " · " + esc(st.d.mobile) + '</strong><button type="button" data-edit="3">Edit</button></li>' +
        (st.d.notes ? "<li><span>Notes</span><strong>" + esc(st.d.notes) + "</strong></li>" : "") + "</ul>" +
        actions("3", "Confirm booking", "confirmBtn");
      s.querySelectorAll("[data-edit]").forEach(function (b) { b.addEventListener("click", function () { go(+b.dataset.edit); }); });
      $("#confirmBtn").addEventListener("click", function () {
        if (!isFree(st.date, st.start, x.dur)) { st.start = null; toast("That time was just taken. Please choose another."); return go(2); }
        var b = { ref: "LUMI-" + Date.now().toString(36).toUpperCase().slice(-6), svc: x.id, service: x.name, dur: x.dur, date: st.date, start: st.start, name: st.d.name, email: st.d.email, mobile: st.d.mobile, notes: st.d.notes, createdAt: new Date().toISOString(), status: "confirmed", simulated: true };
        var all = load(); all.unshift(b); save(all); st.last = b; updateCount(); go(5);
      });
    } else {
      var b = st.last;
      s.innerHTML = '<div class="done"><div class="tick" aria-hidden="true">✓</div><h2 id="stepTitle">You’re booked!</h2><p class="note">Demo booking saved in this browser.</p>' +
        '<dl class="ticket"><dt>Reference</dt><dd class="ref" id="bkRef">' + esc(b.ref) + "</dd><dt>Service</dt><dd>" + esc(b.service) + "</dd><dt>Duration</dt><dd>" + b.dur + " minutes</dd><dt>Date</dt><dd>" + esc(longDate(b.date)) + "</dd><dt>Time</dt><dd>" + hm(b.start) + " – " + hm(b.start + b.dur) + " PHT</dd></dl>" +
        '<details class="mail"><summary>View sample confirmation email</summary><span class="sim">Sample email · not sent</span><div class="mailbox"><p><b>To:</b> ' + esc(b.name) + " &lt;" + esc(b.email) + "&gt;</p><p><b>Subject:</b> Your Lumi booking " + esc(b.ref) + " is confirmed</p><p>Hi " + esc(b.name.split(" ")[0]) + ", we’re looking forward to your " + esc(b.service) + " (" + b.dur + " min) on " + esc(longDate(b.date)) + " at " + hm(b.start) + " PHT. Need to change it? Reply to this email or cancel from My bookings.</p><p>— Lumi Beauty Studio</p></div></details>" +
        '<div class="actions" style="position:static"><button type="button" class="btn btn--ghost" id="toMy">My bookings</button><button type="button" class="btn btn--primary" id="again">Book another</button></div></div>';
      $("#toMy").addEventListener("click", function () { showMy(true); });
      $("#again").addEventListener("click", function () { st = { step: 1, svc: null, date: null, start: null, d: st.d, last: null }; go(1); });
    }
    s.querySelectorAll("[data-back]").forEach(function (b) { b.addEventListener("click", function () { go(+b.dataset.back); }); });
  }

  /* ---------- my bookings ---------- */
  var cancelAsk = null;
  function updateCount() { $("#myCount").textContent = active().length; }
  function renderMy() {
    var all = load();
    $("#myList").innerHTML = all.length ? all.map(function (b) {
      var c = b.status === "cancelled";
      return '<article class="bk" data-ref="' + esc(b.ref) + '"><h3>' + esc(b.service) + " · " + b.dur + " min" + (c ? ' <span class="sim">Cancelled</span>' : "") + "</h3><p>" + esc(longDate(b.date)) + ", " + hm(b.start) + " – " + hm(b.start + b.dur) + " PHT</p><p>" + esc(b.name) + ' · <span class="ref">' + esc(b.ref) + "</span></p>" +
        (c ? "" : cancelAsk === b.ref ? '<div class="confirm-inline"><p>Cancel this booking and release the time?</p><button type="button" class="btn btn--danger" data-yes="' + esc(b.ref) + '">Yes, cancel</button><button type="button" class="btn btn--ghost" data-no>Keep it</button></div>' : '<div class="row"><button type="button" class="btn btn--ghost" data-cancel="' + esc(b.ref) + '">Cancel booking</button></div>') + "</article>";
    }).join("") : '<p class="empty">No demo bookings yet.</p>';
    $("#resetBtn").disabled = !all.length;
  }
  $("#myList").addEventListener("click", function (e) {
    var t = e.target;
    if (t.dataset.cancel) { cancelAsk = t.dataset.cancel; renderMy(); var y = $("[data-yes]"); if (y) y.focus(); }
    else if (t.hasAttribute("data-no")) { cancelAsk = null; renderMy(); }
    else if (t.dataset.yes) {
      var all = load(); all.forEach(function (b) { if (b.ref === t.dataset.yes) { b.status = "cancelled"; b.cancelledAt = new Date().toISOString(); } }); save(all);
      cancelAsk = null; updateCount(); renderMy(); toast("Booking cancelled. That time is open again.");
    }
  });
  function showMy(on) {
    $("#view-book").hidden = on; $("#view-my").hidden = !on;
    if (on) { cancelAsk = null; renderMy(); $("#myTitle").focus(); } else { if (st.step === 5) st.step = 1; render(); }
    window.scrollTo(0, 0);
  }
  $("#myBtn").addEventListener("click", function () { showMy(true); });
  $("#myBack").addEventListener("click", function () { showMy(false); });
  $("#resetBtn").addEventListener("click", function () { $("#resetAsk").hidden = false; $("#resetYes").focus(); });
  $("#resetNo").addEventListener("click", function () { $("#resetAsk").hidden = true; });
  $("#resetYes").addEventListener("click", function () { save([]); $("#resetAsk").hidden = true; updateCount(); renderMy(); toast("All demo bookings cleared."); });
  window.addEventListener("storage", function (e) { if (e.key === KEY) { updateCount(); if (!$("#view-my").hidden) renderMy(); } });

  updateCount();
  render();
})();
