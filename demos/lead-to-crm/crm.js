/*
 * Harbor & Home CRM — Lead-to-CRM Workflow (Portfolio Demo by ZC Smart Digital)
 * Shares browser storage with /demos/real-estate-listing/ (same origin, same key), so an
 * inquiry sent from a listing page shows up here. Nothing is sent anywhere.
 *
 * Rules (applied by derive()):
 *   - emails are normalized (trim + lowercase) before matching
 *   - one contact per normalized email
 *   - one deal per contact + property; repeat inquiries are appended to that deal
 *   - the same person asking about a different property gets a new deal
 */
(function () {
  "use strict";
  var STORE = "hhr-demo-leads-v1";        // written by both demo routes
  var PROC = "hhr-crm-processed-v1";      // which inquiries already ran through the workflow animation
  var LISTINGS = window.HH_LISTINGS || [];
  var SAMPLE = [ // static sample records (never stored; toggle with "Show sample records")
    { ref: "SAMPLE-01", sample: true, prospect: "Paolo Reyes (Sample)", email: "paolo.reyes@example.com", mobile: "0917 555 0101", contact: "Email", propertyId: "HHR-QC-101", submittedAt: "2026-11-14T02:10:00Z", source: "Listing website", message: "Is the unit available for viewing this week?" },
    { ref: "SAMPLE-02", sample: true, prospect: "Carmela Tan (Sample)", email: "carmela.tan@example.com", mobile: "0918 555 0177", contact: "Phone call", propertyId: "HHR-TAG-301", submittedAt: "2026-11-16T06:40:00Z", source: "Listing website", message: "Interested in the BGC unit." },
    { ref: "SAMPLE-03", sample: true, prospect: "Carmela Tan (Sample)", email: " Carmela.Tan@Example.com", mobile: "0918 555 0177", contact: "Phone call", propertyId: "HHR-TAG-301", submittedAt: "2026-11-17T01:15:00Z", source: "CRM inquiry form", message: "Following up, can parking be included?" },
    { ref: "SAMPLE-04", sample: true, prospect: "Jun Bautista (Sample)", email: "jun.bautista@example.com", mobile: "0927 555 0190", contact: "Viber", propertyId: "HHR-PSG-202", submittedAt: "2026-11-18T09:05:00Z", source: "Listing website", message: "Do you accept bank financing?" }
  ];
  var SAMPLE_FORM = { name: "Andrea Villanueva (Sample)", email: "  Andrea.Sample@Example.COM ", mobile: "0917 555 0142", message: "Hi! Following up on my inquiry. Could I view this property on Saturday? (Sample inquiry)" };

  /* ---------- helpers ---------- */
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(e) { return String(e || "").trim().toLowerCase(); }
  function prop(id) { for (var i = 0; i < LISTINGS.length; i++) if (LISTINGS[i].id === id) return LISTINGS[i]; return null; }
  var pesoF; try { pesoF = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }); } catch (e) {}
  function peso(n) { return pesoF ? pesoF.format(n) : "₱" + n; }
  function fmt(iso) { try { return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " PHT"; } catch (e) { return iso; } }
  function load(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? fallback : v; } catch (e) { return fallback; } }
  var mem = {};
  function save(key, val) { mem[key] = val; try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function leads() { var l = load(STORE, mem[STORE] || []); return Array.isArray(l) ? l : []; }
  function processed() { return load(PROC, mem[PROC] || []); }
  var toastT; function toast(m) { var t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3000); }

  /* ---------- the CRM model, rebuilt from the inquiry events ---------- */
  function events() {
    var list = leads().map(function (l) { return Object.assign({}, l, { sample: false }); });
    if ($("#showSample").checked) list = list.concat(SAMPLE);
    return list.sort(function (a, b) { return a.submittedAt < b.submittedAt ? -1 : a.submittedAt > b.submittedAt ? 1 : 0; });
  }
  function derive(evs) {
    var contacts = {}, deals = {}, cOrder = [], dOrder = [], activity = [], result = {}, cN = 0, dN = 0;
    evs.forEach(function (ev) {
      var key = norm(ev.email), p = prop(ev.propertyId) || { id: ev.propertyId, name: ev.propertyName || ev.propertyId, price: 0, location: "", area: "" };
      var r = { rawEmail: ev.email, email: key };
      var c = contacts[key];
      if (!c) {
        c = contacts[key] = { id: "C-" + String(++cN).padStart(3, "0"), name: ev.prospect, email: key, mobile: ev.mobile, sample: ev.sample, created: ev.submittedAt, last: ev.submittedAt, inquiries: 0, deals: [] };
        cOrder.push(c); r.contact = "created";
      } else { r.contact = "matched"; c.name = ev.prospect || c.name; c.mobile = ev.mobile || c.mobile; }
      c.inquiries++; c.last = ev.submittedAt;
      var dk = key + "|" + p.id, d = deals[dk];
      if (!d) {
        d = deals[dk] = { id: "D-" + String(++dN).padStart(3, "0"), key: dk, contactId: c.id, contactName: c.name, email: key, prop: p, stage: "New Inquiry", sample: ev.sample, events: [] };
        dOrder.push(d); c.deals.push(d.id); r.deal = "created";
      } else r.deal = "updated";
      d.contactName = c.name;
      d.events.push(ev);
      r.contactId = c.id; r.dealId = d.id; r.n = d.events.length; r.ev = ev; r.prop = p;
      result[ev.ref] = r;
      var who = esc(ev.prospect), pid = esc(p.id);
      activity.push({ t: ev.submittedAt, sample: ev.sample, what: "Inquiry received", detail: who + " · " + pid + " · via " + esc(ev.source || "Listing website") + " · " + esc(ev.ref) });
      activity.push({ t: ev.submittedAt, sample: ev.sample, what: r.contact === "created" ? "Contact created" : "Contact matched by email", detail: esc(c.id) + " · " + esc(key) });
      activity.push({ t: ev.submittedAt, sample: ev.sample, what: r.deal === "created" ? "Deal created · New Inquiry" : "Repeat inquiry added to deal", detail: esc(d.id) + " · " + pid + (r.deal === "updated" ? " · inquiry #" + r.n : "") });
      activity.push({ t: ev.submittedAt, sample: ev.sample, what: "Acknowledgment email preview generated", detail: "Simulated, not sent · to " + esc(key) });
      activity.push({ t: ev.submittedAt, sample: ev.sample, what: "Internal alert preview generated", detail: "Simulated, not sent · #sales-alerts" });
    });
    return { contacts: cOrder, deals: dOrder, activity: activity, result: result, events: evs };
  }

  /* ---------- message previews ---------- */
  function emailHTML(d) {
    var ev = d.events[d.events.length - 1], p = d.prop, first = String(ev.prospect || "there").split(" ")[0];
    var repeat = d.events.length > 1;
    return '<div class="hdr"><div><b>To:</b> ' + esc(ev.prospect) + " &lt;" + esc(d.email) + "&gt;</div><div><b>From:</b> Harbor &amp; Home Realty &lt;hello@harborhome.example&gt;</div>" +
      '<div class="subj">We received your inquiry about ' + esc(p.name) + " (" + esc(p.id) + ")</div></div>" +
      '<div class="body"><p>Hi ' + esc(first) + ",</p><p>Thanks for your interest in <b>" + esc(p.name) + "</b>. " +
      (repeat ? "We’ve added this message to your earlier inquiry, so the same agent keeps your history (" + d.events.length + " inquiries on this property)." : "An agent will reach out within one business day.") + "</p>" +
      '<div class="prop"><img src="../real-estate-listing/' + esc(p.image) + '" alt=""><div><b>' + esc(p.id) + "</b> · " + esc(p.type) + "<br>" + esc(p.area) + ", " + esc(p.location) + "<br><b>" + peso(p.price) + "</b> · " + p.bedrooms + " BR · " + p.floorArea + " sqm</div></div>" +
      "<p>Your reference: <b>" + esc(ev.ref) + "</b>. Preferred contact: " + esc(ev.contact || "Email") + ".</p><p>Warm regards,<br>Harbor &amp; Home Realty</p></div>";
  }
  function alertHTML(d) {
    var ev = d.events[d.events.length - 1], p = d.prop;
    return '<p class="chan"># sales-alerts · Harbor &amp; Home</p><div class="msg"><p><b>' + (d.events.length > 1 ? "Repeat inquiry (#" + d.events.length + ")" : "New inquiry") + "</b> · " + esc(fmt(ev.submittedAt)) + "</p>" +
      "<p><b>Prospect:</b> " + esc(ev.prospect) + " · " + esc(d.email) + " · " + esc(ev.mobile) + "</p>" +
      "<p><b>Property:</b> " + esc(p.id) + " · " + esc(p.name) + "</p><p><b>Price / area:</b> " + peso(p.price) + " · " + esc(p.area) + ", " + esc(p.location) + "</p>" +
      "<p><b>CRM:</b> " + esc(d.contactId) + " · " + esc(d.id) + " · stage New Inquiry</p><p><b>Message:</b> " + esc(ev.message || "—") + "</p></div>";
  }

  /* ---------- rendering ---------- */
  var model;
  function render(selectDealId) {
    model = derive(events());
    var real = model.contacts.filter(function (c) { return !c.sample; });
    $("#kpis").innerHTML =
      '<div class="kpi"><span>Contacts</span><strong id="kContacts">' + model.contacts.length + "</strong></div>" +
      '<div class="kpi"><span>Deals · New Inquiry</span><strong id="kDeals">' + model.deals.length + "</strong></div>" +
      '<div class="kpi"><span>Inquiry events</span><strong id="kEvents">' + model.events.length + "</strong></div>";
    $("#contactRows").innerHTML = model.contacts.length ? model.contacts.slice().reverse().map(function (c) {
      return '<tr data-email="' + esc(c.email) + '"><td><b>' + esc(c.name) + "</b>" + (c.sample ? '<span class="tag tag--sample">Sample</span>' : '<span class="tag tag--new">This browser</span>') + '<span class="sub">' + esc(c.id) + " · " + esc(c.mobile) + "</span></td><td>" + esc(c.email) +
        '</td><td class="c-deals">' + c.deals.length + '</td><td class="c-inq">' + c.inquiries + "</td><td>" + esc(fmt(c.last)) + "</td></tr>";
    }).join("") : '<tr><td colspan="5" class="empty">No contacts yet. Submit an inquiry to create one.</td></tr>';
    $("#deals").innerHTML = model.deals.length ? model.deals.slice().reverse().map(function (d) {
      return '<article class="deal" data-deal="' + esc(d.id) + '" data-pid="' + esc(d.prop.id) + '" data-email="' + esc(d.email) + '"><p class="pid">' + esc(d.id) + " · " + esc(d.prop.id) + (d.sample ? ' <span class="tag tag--sample">Sample</span>' : "") + "</p><h3>" + esc(d.prop.name) + "</h3>" +
        "<p style=\"margin:.2rem 0\">" + esc(d.contactName) + ' · <span class="amt">' + peso(d.prop.price) + '</span></p><span class="stagechip">New Inquiry</span> <span class="sub">' + d.events.length + " inquir" + (d.events.length > 1 ? "ies" : "y") + "</span>" +
        "<ul>" + d.events.map(function (e, i) { return "<li>#" + (i + 1) + " · " + esc(fmt(e.submittedAt)) + " · " + esc(e.ref) + "</li>"; }).join("") + "</ul></article>";
    }).join("") : '<p class="empty">No deals yet.</p>';
    $("#activity").innerHTML = model.activity.length ? model.activity.slice().reverse().map(function (a) {
      return '<li><time>' + esc(fmt(a.t)) + '</time><div><span class="what">' + esc(a.what) + "</span>" + (a.sample ? ' <span class="tag tag--sample">Sample</span>' : "") + '<span class="sub" style="display:block;color:var(--muted)">' + a.detail + "</span></div></li>";
    }).join("") : '<li class="empty">No activity yet.</li>';
    // preview selector
    var sel = $("#prevDeal"), cur = selectDealId || sel.value;
    sel.innerHTML = model.deals.slice().reverse().map(function (d) { return '<option value="' + esc(d.id) + '">' + esc(d.id + " · " + d.contactName + " · " + d.prop.id) + "</option>"; }).join("");
    if (cur && model.deals.some(function (d) { return d.id === cur; })) sel.value = cur;
    renderPreview();
  }
  function renderPreview() {
    var d = model.deals.filter(function (x) { return x.id === $("#prevDeal").value; })[0];
    $("#emailPrev").innerHTML = d ? emailHTML(d) : '<p class="empty-prev">Submit an inquiry to generate a preview.</p>';
    $("#alertPrev").innerHTML = d ? alertHTML(d) : '<p class="empty-prev">No alert yet.</p>';
  }

  /* ---------- workflow run animation ---------- */
  var STEP_NAMES = ["Inquiry received", "Normalize email", "Match or create contact", "Create or update deal", "Generate acknowledgment preview", "Generate internal alert preview"];
  function stepDetails(r) {
    var ev = r.ev, p = r.prop;
    return [
      esc(ev.ref) + " via " + esc(ev.source || "Listing website") + " · " + esc(p.id) + " · " + esc(fmt(ev.submittedAt)),
      "“" + esc(r.rawEmail) + "” → " + esc(r.email),
      (r.contact === "created" ? "Created contact " : "Matched existing contact ") + esc(r.contactId) + " · " + esc(ev.prospect),
      (r.deal === "created" ? "Created deal " + esc(r.dealId) + " in New Inquiry · " : "Appended inquiry #" + r.n + " to deal " + esc(r.dealId) + " · ") + esc(p.id) + " " + esc(p.name),
      "“We received your inquiry about " + esc(p.name) + " (" + esc(p.id) + ")” · simulated, not sent",
      "#sales-alerts · " + peso(p.price) + " · " + esc(p.location) + " · simulated, not sent"
    ];
  }
  function drawSteps(details, upto, running) {
    $("#steps").innerHTML = STEP_NAMES.map(function (n, i) {
      var cls = i < upto ? "done" : i === upto && running ? "run" : "";
      return '<li class="' + cls + '" data-step="' + i + '"><span class="n">' + (i < upto ? "✓" : i + 1) + "</span><div><b>" + n + "</b><small>" + (i <= upto ? details[i] : "") + "</small></div></li>";
    }).join("");
  }
  var queue = [], running = false, lastRef = null, STEP_MS = 420;
  function runNext() {
    if (running || !queue.length) return;
    running = true;
    var ref = queue.shift(), r = model.result[ref];
    if (!r) { running = false; return runNext(); }
    lastRef = ref; $("#replayBtn").disabled = true;
    var det = stepDetails(r), i = 0;
    $("#runFor").textContent = "Running for " + r.ev.prospect + " · " + r.prop.id + (queue.length ? " (" + queue.length + " more queued)" : "");
    (function tick() {
      drawSteps(det, i, true);
      if (i === 4 || i === 5) { $("#prevDeal").value = r.dealId; renderPreview(); }
      if (i++ < STEP_NAMES.length) return setTimeout(tick, STEP_MS);
      var p = processed(); if (p.indexOf(ref) < 0) { p.push(ref); save(PROC, p); }
      $("#runFor").textContent = "Completed for " + r.ev.prospect + " · " + r.prop.id + " · " + (r.deal === "created" ? "new deal " : "deal updated ") + r.dealId;
      $("#replayBtn").disabled = false; running = false; runNext();
    })();
  }
  function enqueuePending() {
    var done = processed();
    leads().forEach(function (l) { if (done.indexOf(l.ref) < 0 && queue.indexOf(l.ref) < 0) queue.push(l.ref); });
    if (queue.length) { if (!running) toast(queue.length + " new inquir" + (queue.length > 1 ? "ies" : "y") + " from this browser — running the workflow"); runNext(); }
    else if (!running) {
      var real = model.events.filter(function (e) { return !e.sample; }), last = real[real.length - 1] || model.events[model.events.length - 1];
      if (last) { lastRef = last.ref; var r = model.result[last.ref]; drawSteps(stepDetails(r), STEP_NAMES.length, false); $("#runFor").textContent = "Last run: " + r.ev.prospect + " · " + r.prop.id + (last.sample ? " (sample record)" : ""); $("#replayBtn").disabled = false; $("#prevDeal").value = r.dealId; renderPreview(); }
      else drawSteps(STEP_NAMES.map(function () { return ""; }), -1, false);
    }
  }

  /* ---------- form ---------- */
  var form = $("#inqForm");
  $("#fProp").innerHTML = LISTINGS.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.id + " · " + p.name + " · " + p.location) + "</option>"; }).join("");
  $("#fProp").value = "HHR-PSG-201";
  $("#sampleBtn").addEventListener("click", function () {
    $("#fName").value = SAMPLE_FORM.name; $("#fEmail").value = SAMPLE_FORM.email; $("#fMobile").value = SAMPLE_FORM.mobile; $("#fMsg").value = SAMPLE_FORM.message;
    clearErr(); toast("Sample details filled in. Pick a property, then Submit Inquiry.");
  });
  function clearErr() { form.querySelectorAll("[aria-invalid]").forEach(function (e) { e.removeAttribute("aria-invalid"); }); form.querySelectorAll(".err").forEach(function (e) { e.textContent = ""; }); $("#errSummary").hidden = true; }
  form.addEventListener("submit", function (e) {
    e.preventDefault(); clearErr();
    var errs = [], name = $("#fName").value.trim(), email = $("#fEmail").value, mobile = $("#fMobile").value.replace(/[\s\-().]/g, "");
    if (name.length < 2) errs.push(["fName", "Enter the prospect's full name."]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(norm(email))) errs.push(["fEmail", "Enter a valid email, like name@example.com."]);
    if (!/^(\+639|09)\d{9}$/.test(mobile)) errs.push(["fMobile", "Enter a Philippine mobile number, e.g. 0917 123 4567."]);
    if (errs.length) {
      errs.forEach(function (x) { $("#" + x[0]).setAttribute("aria-invalid", "true"); $("#" + x[0] + "-err").textContent = x[1]; });
      var s = $("#errSummary"); s.textContent = "Please fix " + errs.length + " field" + (errs.length > 1 ? "s" : "") + " below."; s.hidden = false; s.focus(); return;
    }
    var p = prop($("#fProp").value), now = new Date();
    var lead = { ref: "LEAD-" + now.getTime().toString(36).toUpperCase().slice(-6), propertyId: p.id, propertyName: p.name, prospect: name, email: email, mobile: $("#fMobile").value.trim(), contact: "Email", message: $("#fMsg").value.trim(), submittedAt: now.toISOString(), status: "New", simulated: true, source: "CRM inquiry form" };
    var all = leads(); all.unshift(lead); save(STORE, all);
    render(); queue.push(lead.ref); runNext();
    $("#runTitle").scrollIntoView({ behavior: "smooth", block: "start" });
    toast("Inquiry saved in this browser — running the workflow");
  });

  /* ---------- controls ---------- */
  $("#prevDeal").addEventListener("change", renderPreview);
  $("#showSample").addEventListener("change", function () { render(); });
  $("#replayBtn").addEventListener("click", function () { if (lastRef) { queue.push(lastRef); runNext(); } });
  $("#resetBtn").addEventListener("click", function () { $("#resetConfirm").hidden = false; $("#resetYes").focus(); });
  $("#resetNo").addEventListener("click", function () { $("#resetConfirm").hidden = true; $("#resetBtn").focus(); });
  $("#resetYes").addEventListener("click", function () {
    save(STORE, []); save(PROC, []); queue = []; $("#resetConfirm").hidden = true; render(); enqueuePending(); toast("Demo data cleared. Sample records remain for reference.");
  });
  window.addEventListener("storage", function (e) { if (e.key === STORE) { render(); enqueuePending(); } });

  render();
  enqueuePending();
})();
