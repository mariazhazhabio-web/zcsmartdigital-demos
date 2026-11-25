/*
 * Harbor & Home Realty — Portfolio Demo by ZC Smart Digital
 * Plain JavaScript, no framework, no network calls.
 * Views are routed on the URL hash: #listings, #property-<ID>, #inquire-<ID>, #tracker
 * Demo leads are saved only in this browser (localStorage key below).
 */
(function () {
  "use strict";

  var LISTINGS = window.HH_LISTINGS || [];
  var STORE_KEY = "hhr-demo-leads-v1";
  var STATUSES = ["New", "Contacted", "Viewing Scheduled", "Closed"];
  var SAMPLE = {
    name: "Andrea Villanueva (Sample)",
    email: "andrea.sample@example.com",
    mobile: "0917 555 0142",
    contact: "Viber",
    message: "Hi! I'd like to schedule a weekend viewing and ask about payment terms. (Sample inquiry for the portfolio demo.)"
  };

  /* ---------- storage (with in-memory fallback) ---------- */
  var memoryLeads = [];
  var storageOK = (function () {
    try { var k = "__hhr_test"; localStorage.setItem(k, "1"); localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  })();
  function loadLeads() {
    if (!storageOK) return memoryLeads.slice();
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function saveLeads(list) {
    memoryLeads = list.slice();
    if (!storageOK) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { storageOK = false; }
  }

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var peso = (function () {
    try {
      var f = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
      return function (n) { return f.format(n); };
    } catch (e) {
      return function (n) { return "₱" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); };
    }
  })();
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function byId(id) { for (var i = 0; i < LISTINGS.length; i++) if (LISTINGS[i].id === id) return LISTINGS[i]; return null; }
  function fmtTime(iso) {
    var d = new Date(iso);
    try {
      return d.toLocaleString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " PHT";
    } catch (e) { return d.toLocaleString(); }
  }
  function statusClass(s) { return "s-" + String(s).split(" ")[0]; }
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }
  function updateLeadBadge() { $("#leadCount").textContent = loadLeads().length; }

  /* ---------- views ---------- */
  var views = ["listings", "detail", "inquire", "tracker"];
  function show(view, focusSel) {
    views.forEach(function (v) { $("#view-" + v).hidden = v !== view; });
    $("#toast").hidden = true;
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      var navFor = view === "tracker" ? "tracker" : "listings"; // detail & inquiry belong to Listings
      if (a.getAttribute("data-nav") === navFor) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
    var f = focusSel && $(focusSel);
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  }

  /* ---------- listings grid + filters ---------- */
  var fLoc = $("#fLocation"), fType = $("#fType"), fPrice = $("#fPrice");

  function cardHTML(p) {
    return '<article class="card" data-id="' + esc(p.id) + '">' +
      '<div class="card__media"><img src="' + esc(p.image) + '" alt="Illustrative image of ' + esc(p.name) + '" loading="lazy" width="800" height="560">' +
      '<span class="tag">' + esc(p.type) + "</span></div>" +
      '<div class="card__body">' +
      '<span class="pid">' + esc(p.id) + "</span>" +
      '<h2><a href="#property-' + esc(p.id) + '">' + esc(p.name) + "</a></h2>" +
      '<p class="loc">' + esc(p.area) + ", " + esc(p.location) + "</p>" +
      '<p class="price">' + peso(p.price) + "</p>" +
      '<ul class="specs"><li>' + p.bedrooms + " BR</li><li>" + p.bathrooms + " BA</li><li>" + p.floorArea + " sqm floor area</li></ul>" +
      '<span class="card__cta" aria-hidden="true">View details →</span>' +
      "</div></article>";
  }

  function renderGrid() {
    var loc = fLoc.value, type = fType.value, max = fPrice.value ? Number(fPrice.value) : Infinity;
    var list = LISTINGS.filter(function (p) {
      return (!loc || p.location === loc) && (!type || p.type === type) && p.price <= max;
    });
    $("#grid").innerHTML = list.map(cardHTML).join("");
    var active = [loc, type, fPrice.value].filter(Boolean).length;
    $("#resultsCount").textContent = "Showing " + list.length + " of " + LISTINGS.length + " properties" + (active ? " · " + active + " filter" + (active > 1 ? "s" : "") + " applied" : "");
    $("#clearFilters").disabled = active === 0;

    var empty = $("#noResults");
    empty.hidden = list.length > 0;
    if (!list.length) {
      // Helpful no-results state: say why, and offer one-click ways out.
      var bits = [];
      if (type) bits.push(type.toLowerCase() + "s");
      else bits.push("properties");
      if (loc) bits.push("in " + loc);
      if (fPrice.value) bits.push("up to " + peso(max));
      $("#noResultsHint").textContent = "We don't have " + bits.join(" ") + " right now. Try relaxing one filter:";
      var acts = [];
      if (fPrice.value) acts.push('<button type="button" class="btn btn--outline" data-relax="maxPrice">Remove price limit</button>');
      if (type) acts.push('<button type="button" class="btn btn--outline" data-relax="type">Any property type</button>');
      if (loc) acts.push('<button type="button" class="btn btn--outline" data-relax="location">Any location</button>');
      acts.push('<button type="button" class="btn btn--teal" data-relax="all">Clear all filters</button>');
      $("#noResultsActions").innerHTML = acts.join("");
    }
  }

  function clearFilters() { fLoc.value = ""; fType.value = ""; fPrice.value = ""; renderGrid(); }

  [fLoc, fType, fPrice].forEach(function (el) { el.addEventListener("change", renderGrid); });
  $("#clearFilters").addEventListener("click", function () { clearFilters(); fLoc.focus(); });
  $("#noResultsActions").addEventListener("click", function (e) {
    var b = e.target.closest("[data-relax]"); if (!b) return;
    var r = b.getAttribute("data-relax");
    if (r === "all") clearFilters();
    else { ({ maxPrice: fPrice, type: fType, location: fLoc })[r].value = ""; renderGrid(); }
  });

  /* ---------- detail ---------- */
  function renderDetail(p) {
    $("#detailBody").innerHTML =
      '<a class="back" href="#listings">← Back to listings</a>' +
      '<div class="detail">' +
      '<figure class="detail__media" style="margin:0"><img src="' + esc(p.image) + '" alt="Illustrative image of ' + esc(p.name) + '" width="800" height="560">' +
      "<figcaption>Illustrative image created for this demo. It is not a photo of an actual property.</figcaption></figure>" +
      '<div class="panel">' +
      '<span class="pid">Property ID: ' + esc(p.id) + "</span>" +
      '<h1 id="detailTitle" tabindex="-1">' + esc(p.name) + "</h1>" +
      '<p class="loc">' + esc(p.area) + ", " + esc(p.location) + "</p>" +
      '<p class="price">' + peso(p.price) + "</p>" +
      '<ul class="facts">' +
      "<li><span>Type</span><strong>" + esc(p.type) + "</strong></li>" +
      "<li><span>Floor area</span><strong>" + p.floorArea + " sqm</strong></li>" +
      "<li><span>Bedrooms</span><strong>" + p.bedrooms + "</strong></li>" +
      "<li><span>Bathrooms</span><strong>" + p.bathrooms + "</strong></li>" +
      "</ul>" +
      '<a class="btn btn--primary btn--block" id="inquireBtn" href="#inquire-' + esc(p.id) + '">Inquire About This Property</a>' +
      '<p class="note">Sample listing for a portfolio demo. The price is not a market quote.</p>' +
      "</div></div>" +
      '<div class="panel detail__desc" style="margin-bottom:3rem"><h2>About this property</h2><p>' + esc(p.description) + "</p>" +
      '<h3 style="font-size:1.05rem">Highlights</h3><ul class="features">' + p.features.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul></div>";
    document.title = p.name + " · Harbor & Home Realty (Portfolio Demo)";
  }

  /* ---------- inquiry ---------- */
  function renderInquiry(p) {
    var options = function (sel) {
      return ["Email", "Phone call", "Viber"].map(function (o) {
        return '<label><input type="radio" name="contact" value="' + o + '"' + (o === sel ? " checked" : "") + "> " + o + "</label>";
      }).join("");
    };
    $("#inquireBody").innerHTML =
      '<a class="back" href="#property-' + esc(p.id) + '">← Back to property</a>' +
      '<div class="form-head"><h1 id="inquireTitle" tabindex="-1">Inquire about this property</h1>' +
      "<p>An agent usually replies within one business day. Fields marked <span class=\"req\">*</span> are required.</p></div>" +
      '<div class="prop-chip"><img src="' + esc(p.image) + '" alt=""><div><p class="pid">' + esc(p.id) + "</p><p><strong>" + esc(p.name) + "</strong></p><p class=\"loc\">" + esc(p.location) + " · " + peso(p.price) + "</p></div></div>" +
      '<form class="form panel" id="inquiryForm" novalidate>' +
      '<p class="sim-note"><strong>Demo form:</strong> nothing is sent. Your inquiry is saved only in this browser and shown in the demo Lead Tracker. Use <em>Use Sample Details</em> to try it without personal information.</p>' +
      '<div class="error-summary" id="errorSummary" tabindex="-1" hidden><h2>Please fix the following:</h2><ul></ul></div>' +
      '<div class="row">' +
      '<div class="field"><label for="propId">Property ID</label><input type="text" id="propId" name="propertyId" value="' + esc(p.id) + '" readonly></div>' +
      '<div class="field"><label for="propName">Property name</label><input type="text" id="propName" name="propertyName" value="' + esc(p.name) + '" readonly></div>' +
      "</div>" +
      '<div class="field"><label for="iName">Full name <span class="req">*</span></label><input type="text" id="iName" name="name" autocomplete="name" aria-describedby="iName-err"><span class="err-msg" id="iName-err"></span></div>' +
      '<div class="row">' +
      '<div class="field"><label for="iEmail">Email <span class="req">*</span></label><input type="email" id="iEmail" name="email" autocomplete="email" aria-describedby="iEmail-err"><span class="err-msg" id="iEmail-err"></span></div>' +
      '<div class="field"><label for="iMobile">Mobile number <span class="req">*</span></label><input type="tel" id="iMobile" name="mobile" autocomplete="tel" placeholder="09XX XXX XXXX" aria-describedby="iMobile-hint iMobile-err"><span class="hint" id="iMobile-hint">Philippine mobile, e.g. 0917 123 4567 or +63 917 123 4567</span><span class="err-msg" id="iMobile-err"></span></div>' +
      "</div>" +
      '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">Preferred contact method</legend><div class="radio-row">' + options("Email") + "</div></fieldset>" +
      '<div class="field"><label for="iMsg">Message <span class="hint">(optional)</span></label><textarea id="iMsg" name="message" rows="4" maxlength="600">I\'m interested in ' + esc(p.name) + " (" + esc(p.id) + "). Is it still available?</textarea></div>" +
      '<div class="field"><label class="check"><input type="checkbox" id="iConsent" name="consent" aria-describedby="iConsent-err"> <span>I understand this is a portfolio demo and that this inquiry is simulated. <span class="req">*</span></span></label><span class="err-msg" id="iConsent-err"></span></div>' +
      '<div class="form-actions"><button type="button" class="btn btn--sample" id="sampleBtn">Use Sample Details</button>' +
      '<button type="submit" class="btn btn--primary">Submit Inquiry</button></div>' +
      "</form>";

    var form = $("#inquiryForm");
    $("#sampleBtn").addEventListener("click", function () {
      form.name.value = SAMPLE.name;
      form.email.value = SAMPLE.email;
      form.mobile.value = SAMPLE.mobile;
      form.message.value = SAMPLE.message;
      var r = form.querySelector('input[name="contact"][value="' + SAMPLE.contact + '"]'); if (r) r.checked = true;
      form.consent.checked = true;
      clearErrors(form);
      toast("Sample details filled in. Press Submit Inquiry.");
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var errs = validate(form);
      if (errs.length) return showErrors(form, errs);
      submitLead(p, form);
    });
    // Clear a field's error as the visitor fixes it.
    form.addEventListener("input", function (e) {
      var el = e.target;
      if (el.getAttribute("aria-invalid") === "true") { el.removeAttribute("aria-invalid"); var m = $("#" + el.id + "-err"); if (m) m.textContent = ""; }
    });
    form.addEventListener("change", function (e) {
      if (e.target.id === "iConsent" && e.target.checked) { e.target.removeAttribute("aria-invalid"); $("#iConsent-err").textContent = ""; }
    });
  }

  function normMobile(v) { return String(v).replace(/[\s\-().]/g, ""); }
  function validate(form) {
    var errs = [];
    var name = form.name.value.trim(), email = form.email.value.trim(), mobile = normMobile(form.mobile.value);
    if (name.length < 2) errs.push(["iName", "Enter your full name."]);
    if (!email) errs.push(["iEmail", "Enter your email address."]);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errs.push(["iEmail", "Enter a valid email, like name@example.com."]);
    if (!mobile) errs.push(["iMobile", "Enter your mobile number."]);
    else if (!/^(\+639|09)\d{9}$/.test(mobile)) errs.push(["iMobile", "Enter a Philippine mobile number, e.g. 0917 123 4567."]);
    if (!form.consent.checked) errs.push(["iConsent", "Tick the box to confirm this is a demo inquiry."]);
    return errs;
  }
  function clearErrors(form) {
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    form.querySelectorAll(".err-msg").forEach(function (el) { el.textContent = ""; });
    $("#errorSummary").hidden = true;
  }
  function showErrors(form, errs) {
    clearErrors(form);
    var ul = $("#errorSummary ul");
    ul.innerHTML = errs.map(function (e) { return '<li><a href="#" data-focus="' + e[0] + '">' + esc(e[1]) + "</a></li>"; }).join("");
    errs.forEach(function (e) { $("#" + e[0]).setAttribute("aria-invalid", "true"); $("#" + e[0] + "-err").textContent = e[1]; });
    var s = $("#errorSummary"); s.hidden = false; s.focus();
    ul.onclick = function (ev) { var a = ev.target.closest("[data-focus]"); if (a) { ev.preventDefault(); $("#" + a.getAttribute("data-focus")).focus(); } };
  }

  function submitLead(p, form) {
    var now = new Date();
    var ref = "LEAD-" + now.getTime().toString(36).toUpperCase().slice(-6);
    var contact = form.querySelector('input[name="contact"]:checked');
    var lead = {
      ref: ref,
      propertyId: p.id,
      propertyName: p.name,
      prospect: form.name.value.trim(),
      email: form.email.value.trim(),
      mobile: form.mobile.value.trim(),
      contact: contact ? contact.value : "Email",
      message: form.message.value.trim(),
      submittedAt: now.toISOString(),
      status: "New",
      simulated: true,
      source: "Listing website"
    };
    var leads = loadLeads(); leads.unshift(lead); saveLeads(leads);
    updateLeadBadge();

    $("#inquireBody").innerHTML =
      '<div class="panel confirm" role="status">' +
      '<div class="confirm__icon" aria-hidden="true">✓</div>' +
      '<h1 id="inquireTitle" tabindex="-1">Thanks! Your inquiry was received.</h1>' +
      "<p>This is a <strong>simulated submission</strong>: no email or SMS was sent. It has been added to the demo Lead Tracker in this browser.</p>" +
      "<dl><dt>Reference</dt><dd>" + esc(ref) + "</dd><dt>Property ID</dt><dd>" + esc(p.id) + "</dd><dt>Property</dt><dd>" + esc(p.name) + "</dd><dt>Prospect</dt><dd>" + esc(lead.prospect) + "</dd><dt>Submitted</dt><dd>" + esc(fmtTime(lead.submittedAt)) + "</dd></dl>" +
      '<div class="confirm__actions"><a class="btn btn--teal" href="#tracker" id="toTracker">View Demo Lead Tracker</a><a class="btn btn--outline" href="../lead-to-crm/" id="toCrm">See it in the CRM Workflow &rarr;</a><a class="btn btn--ghost" href="#listings">Browse more listings</a></div>' +
      (storageOK ? "" : '<p class="note">Your browser blocked local storage, so this demo lead will disappear when the page is closed.</p>') +
      "</div>";
    show("inquire", "#inquireTitle");
  }

  /* ---------- tracker ---------- */
  var resetPending = false;
  function renderTracker() {
    var leads = loadLeads();
    var counts = { total: leads.length };
    STATUSES.forEach(function (s) { counts[s] = leads.filter(function (l) { return l.status === s; }).length; });

    var rows = leads.map(function (l) {
      var opts = STATUSES.map(function (s) { return "<option" + (s === l.status ? " selected" : "") + ">" + s + "</option>"; }).join("");
      return "<tr data-ref=\"" + esc(l.ref) + "\">" +
        '<td data-label="Property"><strong class="pid" style="font-size:.85rem;color:var(--teal)">' + esc(l.propertyId) + "</strong><span class=\"sub\">" + esc(l.propertyName) + "</span></td>" +
        '<td data-label="Prospect"><span><strong>' + esc(l.prospect) + '</strong><span class="sim-tag">Simulated</span><span class="sub">' + esc(l.email) + " · " + esc(l.mobile) + "</span><span class=\"sub\">Prefers " + esc(l.contact) + "</span></span></td>" +
        '<td data-label="Submitted"><span>' + esc(fmtTime(l.submittedAt)) + '<span class="sub">' + esc(l.ref) + "</span></span></td>" +
        '<td data-label="Lead status"><span><span class="status-dot ' + statusClass(l.status) + '" aria-hidden="true"></span><label class="sr-only" for="st-' + esc(l.ref) + '" style="position:absolute;left:-9999px">Status for ' + esc(l.prospect) + "</label>" +
        '<select id="st-' + esc(l.ref) + '" data-status="' + esc(l.ref) + '">' + opts + "</select></span></td>" +
        "</tr>";
    }).join("");

    $("#trackerBody").innerHTML =
      '<div class="tracker-head"><div><span class="sim-badge">Simulated data · saved in this browser only</span>' +
      '<h1 id="trackerTitle" tabindex="-1">Demo Lead Tracker</h1>' +
      '<p style="margin:0;color:var(--muted)">Every inquiry submitted on this site appears here. Change a lead\'s status to see how an agent would work the pipeline.</p></div>' +
      '<div class="tracker-actions"><a class="btn btn--outline" href="../lead-to-crm/">Open CRM Workflow &rarr;</a><button type="button" class="btn btn--danger" id="resetBtn"' + (leads.length ? "" : " disabled") + ">Reset demo leads</button></div></div>" +
      (resetPending && leads.length ? '<div class="confirm-bar" role="alertdialog" aria-labelledby="resetQ"><p id="resetQ">Delete all ' + leads.length + " simulated lead" + (leads.length > 1 ? "s" : "") + ' from this browser?</p><button type="button" class="btn btn--danger-solid" id="resetYes">Yes, reset</button><button type="button" class="btn btn--ghost" id="resetNo">Cancel</button></div>' : "") +
      '<div class="stats">' +
      '<div class="stat"><span>Total leads</span><strong>' + counts.total + "</strong></div>" +
      STATUSES.map(function (s) { return '<div class="stat"><span>' + s + "</span><strong>" + counts[s] + "</strong></div>"; }).join("") +
      "</div>" +
      (leads.length
        ? '<div class="table-wrap"><table><caption style="position:absolute;left:-9999px">Simulated inquiries</caption><thead><tr><th scope="col">Property</th><th scope="col">Prospect</th><th scope="col">Submitted</th><th scope="col">Lead status</th></tr></thead><tbody id="leadRows">' + rows + "</tbody></table></div>"
        : '<div class="empty"><img src="assets/img/empty-state.svg" alt="" width="120" height="120"><h2>No demo leads yet.</h2><p>Open any listing, choose <strong>Inquire About This Property</strong>, and use <strong>Use Sample Details</strong> to create one in seconds.</p><div class="empty__actions"><a class="btn btn--teal" href="#listings">Browse listings</a></div></div>') +
      '<p class="tracker-foot">Storage: ' + (storageOK ? "this browser's localStorage (key <code>" + STORE_KEY + "</code>). Records stay after a refresh until you press Reset." : "local storage is blocked in this browser, so records last only until the page is closed.") + "</p>";

    var rb = $("#resetBtn");
    rb.addEventListener("click", function () { resetPending = true; renderTracker(); var y = $("#resetYes"); if (y) y.focus(); });
    var yes = $("#resetYes"), no = $("#resetNo");
    if (yes) yes.addEventListener("click", function () { saveLeads([]); resetPending = false; updateLeadBadge(); renderTracker(); toast("All demo leads were cleared."); $("#trackerTitle").focus(); });
    if (no) no.addEventListener("click", function () { resetPending = false; renderTracker(); $("#resetBtn").focus(); });
    var tb = $("#leadRows");
    if (tb) tb.addEventListener("change", function (e) {
      var s = e.target.closest("[data-status]"); if (!s) return;
      var ref = s.getAttribute("data-status");
      var all = loadLeads();
      all.forEach(function (l) { if (l.ref === ref) l.status = s.value; });
      saveLeads(all);
      renderTracker();
      var again = document.getElementById("st-" + ref); if (again) again.focus();
      toast("Status updated to " + s.value + ".");
    });
  }

  /* ---------- router ---------- */
  function route() {
    var h = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    document.title = "Harbor & Home Realty · Portfolio Demo by ZC Smart Digital";
    if (h.indexOf("property-") === 0) {
      var p = byId(h.slice(9));
      if (p) { renderDetail(p); return show("detail", "#detailTitle"); }
      return notFound();
    }
    if (h.indexOf("inquire-") === 0) {
      var q = byId(h.slice(8));
      if (q) { renderInquiry(q); return show("inquire", "#inquireTitle"); }
      return notFound();
    }
    if (h === "tracker") { resetPending = false; renderTracker(); return show("tracker", "#trackerTitle"); }
    if (h === "main") return; // skip-link target: stay on the current view
    renderGrid(); show("listings");
  }
  function notFound() {
    $("#detailBody").innerHTML = '<div class="empty" style="margin-top:2rem"><img src="assets/img/empty-state.svg" alt="" width="120" height="120"><h1 id="detailTitle" tabindex="-1" style="font-size:1.6rem">That listing could not be found.</h1><p>It may have been removed from this demo.</p><div class="empty__actions"><a class="btn btn--teal" href="#listings">See all listings</a></div></div>';
    show("detail", "#detailTitle");
  }

  /* ---------- demo bar ---------- */
  var aboutBtn = $("#aboutToggle"), aboutPanel = $("#aboutPanel");
  function setAbout(open) { aboutPanel.hidden = !open; aboutBtn.setAttribute("aria-expanded", String(open)); }
  aboutBtn.addEventListener("click", function () { setAbout(aboutPanel.hidden); });
  $("#aboutClose").addEventListener("click", function () { setAbout(false); aboutBtn.focus(); });

  // Skip link: move focus without changing the hash route.
  $(".skip").addEventListener("click", function (e) { e.preventDefault(); $("#main").focus(); });

  // Keep in sync if another tab changes the demo leads.
  window.addEventListener("storage", function (e) { if (e.key === STORE_KEY) { updateLeadBadge(); if (!$("#view-tracker").hidden) renderTracker(); } });
  window.addEventListener("hashchange", route);
  updateLeadBadge();
  route();
})();
