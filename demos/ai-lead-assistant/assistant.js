/*
 * Harbor & Home — AI Lead Assistant chat (Portfolio Demo by ZC Smart Digital)
 * Flow per message: classify intent (ml.js) → extract details → reply → re-score the lead.
 * A booked viewing / agent request is saved to the same browser storage key the
 * Lead-to-CRM demo reads ("hhr-demo-leads-v1"), so it appears there with its AI score.
 */
(function () {
  "use strict";
  var STORE = "hhr-demo-leads-v1";
  var LISTINGS = window.HH_LISTINGS || [];
  var AI = window.HH_AI;
  var MIN_CONF = 0.35;
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var INTENT_NAMES = { greet: "Greeting", search: "Search", price: "Price", financing: "Financing", viewing: "Viewing", availability: "Availability", agent: "Talk to agent", thanks: "Thanks" };
  var START_CHIPS = ["Show 2-bedroom condos in Pasig", "What can ₱10M get me in Taguig?", "Do you accept bank financing?", "I'd like to book a viewing"];

  /* ---------- helpers ---------- */
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var pesoF; try { pesoF = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }); } catch (e) {}
  function peso(n) { return pesoF ? pesoF.format(n) : "₱" + n; }
  function short(n) { return "₱" + String(+(n / 1e6).toFixed(2)) + "M"; }
  function prop(id) { for (var i = 0; i < LISTINGS.length; i++) if (LISTINGS[i].id === id) return LISTINGS[i]; return null; }
  function loadLeads() { try { var v = JSON.parse(localStorage.getItem(STORE) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveLeads(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); return true; } catch (e) { return false; } }
  var toastT; function toast(m) { var t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3200); }

  /* ---------- detail (slot) extraction ---------- */
  var LOCS = [
    { re: /\b(quezon city|qc|eastwood|maginhawa|libis|diliman)\b/i, v: "Quezon City" },
    { re: /\b(pasig|ortigas|kapitolyo)\b/i, v: "Pasig" },
    { re: /\b(taguig|bgc|bonifacio|mckinley)\b/i, v: "Taguig" }
  ];
  var NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  function extract(text) {
    var t = String(text), s = {}, m;
    LOCS.forEach(function (l) { if (!s.loc && l.re.test(t)) s.loc = l.v; });
    if ((m = t.match(/\b(\d|one|two|three|four|five)\s*-?\s*(br|bed(room)?s?)\b/i))) s.beds = NUMW[m[1].toLowerCase()] || +m[1];
    if ((m = t.match(/(\d+(?:\.\d+)?)\s*(m|mil|million)\b/i))) s.budget = Math.round(parseFloat(m[1]) * 1e6);
    else if ((m = t.match(/₱?\s?(\d{1,3}(?:,\d{3}){2,})/))) s.budget = +m[1].replace(/,/g, "");
    if (/\btownhouse\b/i.test(t)) s.type = "Townhouse"; else if (/\bcondo(minium)?s?\b|\bunit\b/i.test(t) && !/\bthe unit\b|\bthis unit\b/i.test(t)) s.type = "Condo"; else if (/\bhouse\b|\bhome\b/i.test(t)) s.type = "House";
    if ((m = t.match(/\bHHR-[A-Z]{2,3}-\d{3}\b/i))) { var p = prop(m[0].toUpperCase()); if (p) s.property = p.id; }
    return s;
  }
  // Trust the top intent if it clears the cutoff, or if it is a clear winner (2× the runner-up),
  // which matters for one-word messages like "hello".
  function confident(pred) { var r = pred.ranked; return pred.known > 0 && (r[0].p >= MIN_CONF || r[0].p >= 2 * r[1].p); }
  function hasSearchSlots(s) { return !!(s.loc || s.beds || s.budget || s.type); }

  /* ---------- conversation state ---------- */
  var ctx, lastPrediction, lastText;
  function freshCtx() { return { loc: null, beds: null, budget: null, type: null, property: null, askedViewing: false, askedFinancing: false, userMsgs: 0, capture: null, lead: {}, sentRef: null }; }

  function matches() {
    var list = LISTINGS.filter(function (p) {
      return (!ctx.loc || p.location === ctx.loc) && (!ctx.beds || p.bedrooms === ctx.beds) && (!ctx.type || p.type === ctx.type) && (!ctx.budget || p.price <= ctx.budget * 1.1);
    });
    return list.sort(function (a, b) { return a.price - b.price; });
  }
  function closest() {
    return LISTINGS.slice().sort(function (a, b) {
      function d(p) { return (ctx.loc && p.location !== ctx.loc ? 2 : 0) + (ctx.beds ? Math.abs(p.bedrooms - ctx.beds) : 0) + (ctx.budget ? Math.max(0, p.price - ctx.budget) / ctx.budget : 0); }
      return d(a) - d(b);
    });
  }

  function features() {
    var chosen = ctx.property ? prop(ctx.property) : null;
    var fit = ctx.budget ? (chosen ? chosen.price <= ctx.budget * 1.1 : matches().length > 0) : false;
    return {
      budget_stated: ctx.budget ? 1 : 0, budget_fit: fit ? 1 : 0, asked_viewing: ctx.askedViewing ? 1 : 0, asked_financing: ctx.askedFinancing ? 1 : 0,
      specific_property: ctx.property ? 1 : 0, gave_phone: ctx.lead.mobile ? 1 : 0, engagement: Math.min(1, ctx.userMsgs / 8), location_stated: ctx.loc ? 1 : 0
    };
  }

  /* ---------- chat rendering ---------- */
  var log = $("#chatLog");
  function addMsg(who, html, extraNode) {
    var row = document.createElement("div"); row.className = "msg-row " + who;
    var b = document.createElement("div"); b.className = "bubble"; b.innerHTML = html;
    if (extraNode) b.appendChild(extraNode);
    row.appendChild(b); log.appendChild(row); log.scrollTop = log.scrollHeight;
    return row;
  }
  function setChips(list) {
    var c = $("#chips"); c.innerHTML = "";
    (list || []).forEach(function (x) {
      var label = typeof x === "string" ? x : x.label, sample = typeof x === "object" && x.sample;
      var b = document.createElement("button"); b.type = "button"; b.className = "chip" + (sample ? " chip--sample" : ""); b.textContent = label;
      b.addEventListener("click", function () { send(typeof x === "string" ? x : x.value || x.label); });
      c.appendChild(b);
    });
  }
  function listingCards(list) {
    var wrap = document.createElement("div"); wrap.className = "listings";
    list.forEach(function (p) {
      var card = document.createElement("div"); card.className = "lcard";
      card.innerHTML = '<img src="../real-estate-listing/' + esc(p.image) + '" alt="">' +
        "<div><b>" + esc(p.name) + '</b><span class="sub">' + esc(p.id) + " · " + esc(p.type) + " · " + esc(p.area) + ", " + esc(p.location) + '</span><br><span class="amt">' + peso(p.price) + '</span> <span class="sub">· ' + p.bedrooms + " BR · " + p.floorArea + " sqm</span><br></div>";
      var btn = document.createElement("button"); btn.type = "button"; btn.className = "btn btn--ghost btn--sm"; btn.textContent = "Ask about this";
      btn.setAttribute("aria-label", "Ask about " + p.name);
      btn.addEventListener("click", function () { send("Tell me about " + p.id); });
      card.lastChild.appendChild(btn); wrap.appendChild(card);
    });
    return wrap;
  }
  var busy = false;
  function botSay(html, opts) {
    opts = opts || {};
    var typing = addMsg("bot typing", "Hana is typing…");
    busy = true;
    setTimeout(function () {
      typing.remove();
      addMsg("bot", html, opts.cards ? listingCards(opts.cards) : null);
      setChips(opts.chips);
      busy = false;
      if (opts.after) opts.after();
    }, REDUCED ? 0 : 450);
  }

  /* ---------- replies ---------- */
  function describeFilters() {
    var parts = [];
    if (ctx.beds) parts.push(ctx.beds + "-bedroom");
    parts.push(ctx.type ? ctx.type.toLowerCase() + "s" : "homes");
    if (ctx.loc) parts.push("in " + ctx.loc);
    if (ctx.budget) parts.push("up to about " + short(ctx.budget));
    return parts.join(" ");
  }
  function replySearch() {
    var m = matches();
    if (m.length) botSay("<p>Here’s what I found for <b>" + esc(describeFilters()) + "</b>:</p>", { cards: m.slice(0, 3), chips: ["Do you accept bank financing?", "I'd like to book a viewing"] });
    else botSay("<p>I don’t have an exact match for <b>" + esc(describeFilters()) + "</b>, but these are the closest:</p>", { cards: closest().slice(0, 3), chips: ["Show all listings in Taguig", "Talk to an agent"] });
  }
  function replyProperty(p) {
    botSay("<p>Great choice: <b>" + esc(p.name) + "</b> (" + esc(p.id) + "). " + esc(p.description) + "</p>", { cards: [p], chips: ["How much is it?", "Is it available?", "Book a viewing"] });
  }
  function replyPrice() {
    var p = ctx.property && prop(ctx.property);
    if (p) return botSay("<p><b>" + esc(p.name) + "</b> is listed at <b>" + peso(p.price) + "</b>. That’s " + p.bedrooms + " BR and " + p.floorArea + " sqm in " + esc(p.area) + ". Price is negotiable with the seller (sample answer).</p>", { chips: ["Do you accept bank financing?", "Book a viewing"] });
    var prices = LISTINGS.map(function (x) { return x.price; });
    var hint = hasSearchSlots(ctx) ? "" : " Tell me a location, bedroom count or budget and I’ll narrow it down.";
    botSay("<p>Our listings range from <b>" + short(Math.min.apply(null, prices)) + "</b> to <b>" + short(Math.max.apply(null, prices)) + "</b>." + hint + "</p>", hasSearchSlots(ctx) ? { cards: (matches().length ? matches() : closest()).slice(0, 3) } : { chips: START_CHIPS.slice(0, 2) });
  }
  function replyFinancing() {
    botSay("<p>Yes. You can buy through <b>bank financing</b>, <b>Pag-IBIG</b> or in-house payment terms, and our agents can connect you with partner banks for pre-approval. Most banks ask for 10–20% down. (Sample answer for this demo.)</p>", { chips: ["I'd like to book a viewing", "Talk to an agent"] });
  }
  function replyAvailability() {
    var p = ctx.property && prop(ctx.property);
    if (p) botSay("<p>Yes, <b>" + esc(p.id) + "</b> is still available and open for viewings (sample status)." + (ctx.capture ? "" : " Want me to book one?") + "</p>", { chips: ctx.capture ? [] : ["Book a viewing", "How much is it?"] });
    else botSay("<p>All six listings are currently available (sample status). Which one are you interested in?</p>", { cards: (hasSearchSlots(ctx) && matches().length ? matches() : LISTINGS).slice(0, 3) });
  }
  function fallback() {
    botSay("<p>Sorry, I didn’t quite catch that. I can help you <b>find a listing</b>, check a <b>price</b>, explain <b>financing</b> or <b>book a viewing</b>.</p>", { chips: START_CHIPS });
  }

  /* ---------- lead capture (viewing / agent) ---------- */
  var STEPS = {
    property: { ask: "<p>Which property would you like to view?</p>" },
    name: { ask: "<p>Happy to set that up. What’s your full name?</p>", chips: [{ label: "Andrea Villanueva (Sample)", sample: true }] },
    email: { ask: "<p>Thanks! What email should the agent use?</p>", chips: [{ label: "andrea.sample@example.com", sample: true }] },
    mobile: { ask: "<p>And your Philippine mobile number?</p>", chips: [{ label: "0917 555 0142", sample: true }] },
    day: { ask: "<p>Last one: when would you like to visit?</p>", chips: ["Saturday morning", "Sunday afternoon", "Weekday evening"] }
  };
  function nextStep() {
    if (!ctx.property) return "property";
    if (!ctx.lead.name) return "name";
    if (!ctx.lead.email) return "email";
    if (!ctx.lead.mobile) return "mobile";
    if (!ctx.lead.day && ctx.capture.kind === "viewing") return "day";
    return null;
  }
  function startCapture(kind) {
    if (ctx.sentRef) return botSay("<p>You’re all set. Your request <b>" + esc(ctx.sentRef) + "</b> is already with our team. Is there anything else I can help with?</p>", { chips: ["Do you accept bank financing?", "Restart chat"] });
    ctx.capture = { kind: kind };
    if (kind === "agent") botSay("<p>Sure, I’ll pass you to one of our agents. First, a few quick details.</p>", { after: askStep });
    else askStep();
  }
  function askStep() {
    var s = nextStep();
    if (!s) return finishCapture();
    ctx.capture.step = s;
    if (s === "property") {
      var list = hasSearchSlots(ctx) && matches().length ? matches() : LISTINGS;
      return botSay(STEPS.property.ask, { cards: list.slice(0, 3) });
    }
    botSay(STEPS[s].ask, { chips: STEPS[s].chips });
  }
  function answerStep(text) {
    var s = ctx.capture.step, v = text.trim();
    if (s === "property") { var p = extract(v).property; if (!p) return botSay("<p>Please tap <b>Ask about this</b> on one of the listings, or type its ID (for example HHR-PSG-201).</p>", { cards: LISTINGS.slice(0, 3) }); ctx.property = p; }
    if (s === "name") { if (v.replace(/[^a-zA-Z]/g, "").length < 2 || /\d|\?|@/.test(v)) return botSay("<p>Please enter your full name.</p>", { chips: STEPS.name.chips }); ctx.lead.name = v; }
    if (s === "email") { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.toLowerCase())) return botSay("<p>That doesn’t look like an email. Try something like name@example.com.</p>", { chips: STEPS.email.chips }); ctx.lead.email = v; }
    if (s === "mobile") { if (!/^(\+639|09)\d{9}$/.test(v.replace(/[\s\-().]/g, ""))) return botSay("<p>Please enter a Philippine mobile number, for example 0917 123 4567.</p>", { chips: STEPS.mobile.chips }); ctx.lead.mobile = v; }
    if (s === "day") { if (v.length < 2) return botSay("<p>When would you like to visit?</p>", { chips: STEPS.day.chips }); ctx.lead.day = v; }
    askStep();
  }
  function finishCapture() {
    var p = prop(ctx.property), sc = AI.LeadScorer.score(features()), now = new Date();
    var bits = [];
    if (hasSearchSlots(ctx)) bits.push("Looking for " + describeFilters() + ".");
    if (ctx.askedFinancing) bits.push("Asked about financing.");
    bits.push(ctx.capture.kind === "viewing" ? "Wants a viewing: " + ctx.lead.day + "." : "Asked to talk to an agent.");
    var lead = {
      ref: "CHAT-" + now.getTime().toString(36).toUpperCase().slice(-6), propertyId: p.id, propertyName: p.name, prospect: ctx.lead.name, email: ctx.lead.email, mobile: ctx.lead.mobile,
      contact: "Email", message: "Chat summary: " + bits.join(" ") + " AI lead score " + sc.score + "/100 (" + sc.tier + ").", submittedAt: now.toISOString(), status: "New", simulated: true,
      source: "AI chat assistant", aiScore: sc.score, aiTier: sc.tier
    };
    var all = loadLeads(); all.unshift(lead);
    var stored = saveLeads(all);
    ctx.sentRef = lead.ref; ctx.capture = null;
    renderBrain();
    $("#handoff").innerHTML = '<div class="ok"><p><b>Lead sent to the CRM workflow</b></p><p>' + esc(lead.ref) + " · " + esc(lead.prospect) + " · " + esc(p.id) + '</p><p>Score <b>' + sc.score + "/100 · " + sc.tier + "</b> · source: AI chat assistant</p>" +
      (stored ? '<p><a class="btn btn--primary btn--sm" href="../lead-to-crm/">Open it in the CRM &rarr;</a></p>' : '<p class="err">This browser blocked storage, so the CRM page can’t see the lead.</p>') + "</div>";
    var first = String(ctx.lead.name).split(" ")[0];
    botSay("<p>Thanks, " + esc(first) + "! " + (lead.aiTier === "Hot" ? "An agent will call you today" : "An agent will reach out within one business day") + " about <b>" + esc(p.name) + "</b>. Your reference is <b>" + esc(lead.ref) + "</b>.</p><p>(Demo: nothing was sent. The lead is saved in this browser and is now in the <a href=\"../lead-to-crm/\">CRM</a>.)</p>", { chips: ["Do you accept bank financing?", "Restart chat"] });
    toast("Lead " + lead.ref + " saved · score " + sc.score + " (" + sc.tier + ")");
  }

  /* ---------- main message handler ---------- */
  function send(raw) {
    var text = String(raw || "").trim();
    if (!text || busy) return;
    if (/^restart chat$/i.test(text)) return restart();
    addMsg("user", esc(text));
    setChips([]);
    ctx.userMsgs++;
    lastText = text;
    var slots = extract(text), pred = AI.IntentModel.predict(text);
    lastPrediction = pred;
    if (slots.loc) ctx.loc = slots.loc; if (slots.beds) ctx.beds = slots.beds; if (slots.budget) ctx.budget = slots.budget; if (slots.type) ctx.type = slots.type;
    if (slots.property) ctx.property = slots.property;
    var intent = confident(pred) ? pred.ranked[0].label : null;

    if (ctx.capture) {
      if (/^(cancel|stop|never ?mind)\b/i.test(text)) { ctx.capture = null; renderBrain(); return botSay("<p>No problem, I’ve cancelled that. What else can I help with?</p>", { chips: START_CHIPS }); }
      // A real question in the middle of the form is answered first; otherwise the message is the answer.
      // Picking a different listing mid-form switches the property and repeats the current question.
      if (slots.property && ctx.capture.step !== "property") { renderBrain(); botSay("<p>Got it, I’ve switched your request to <b>" + esc(prop(slots.property).name) + "</b>.</p>", { after: askStep }); return; }
      var isQuestion = /\?\s*$/.test(text) && intent && ["price", "financing", "availability"].indexOf(intent) >= 0;
      if (!isQuestion) { if (intent === "viewing") ctx.askedViewing = true; answerStep(text); renderBrain(); return; }
      if (intent === "financing") ctx.askedFinancing = true;
      renderBrain();
      if (intent === "price") replyPrice(); else if (intent === "financing") replyFinancing(); else replyAvailability();
      setTimeout(function () { if (ctx.capture) askStep(); }, REDUCED ? 10 : 500); // then pick the form back up
      return;
    }

    if (intent === "financing") ctx.askedFinancing = true;
    if (intent === "viewing") ctx.askedViewing = true;
    renderBrain();

    if (slots.property && !ctx.capture && (!intent || intent === "search" || intent === "greet")) return replyProperty(prop(slots.property));
    if ((!intent || intent === "greet") && hasSearchSlots(slots)) return replySearch();
    switch (intent) {
      case "greet": return botSay("<p>Hello! What kind of property are you looking for? You can tell me a location, number of bedrooms or budget.</p>", { chips: START_CHIPS });
      case "search": return replySearch();
      case "price": return replyPrice();
      case "financing": return replyFinancing();
      case "availability": return replyAvailability();
      case "viewing": return ctx.capture ? askStep() : startCapture("viewing");
      case "agent": return startCapture("agent");
      case "thanks": return botSay("<p>You’re welcome! Anything else I can help with?</p>", { chips: ctx.sentRef ? ["Restart chat"] : ["I'd like to book a viewing", "Talk to an agent"] });
      default: return ctx.capture ? askStep() : fallback();
    }
  }

  /* ---------- under-the-hood panel ---------- */
  function renderBrain() {
    if (lastPrediction) {
      var low = !confident(lastPrediction);
      $("#lastMsg").innerHTML = "“" + esc(lastText) + "”" + (low ? ' · <b>low confidence</b>, so the bot uses details or asks again' : "");
      $("#intentBars").innerHTML = lastPrediction.ranked.slice(0, 4).map(function (r, i) {
        var pct = Math.round(r.p * 100);
        return '<li class="' + (i === 0 && !low ? "top" : "") + '"><span>' + esc(INTENT_NAMES[r.label]) + '</span><span class="track" role="img" aria-label="' + pct + ' percent"><span class="fill" style="width:' + pct + '%"></span></span><span class="val">' + pct + "%</span></li>";
      }).join("");
    } else { $("#lastMsg").textContent = "Send a message to see how it is classified."; $("#intentBars").innerHTML = ""; }

    var p = ctx.property && prop(ctx.property);
    var rows = [["Location", ctx.loc], ["Bedrooms", ctx.beds], ["Type", ctx.type], ["Budget", ctx.budget && peso(ctx.budget)], ["Property", p && p.id + " · " + p.name],
      ["Name", ctx.lead.name], ["Email", ctx.lead.email], ["Mobile", ctx.lead.mobile], ["Viewing", ctx.lead.day]];
    $("#slots").innerHTML = rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd" + (r[1] ? "" : ' class="none"') + ">" + (r[1] ? esc(r[1]) : "—") + "</dd>"; }).join("");

    var sc = AI.LeadScorer.score(features());
    $("#score").innerHTML = '<span class="num">' + sc.score + '</span><span class="tier tier--' + sc.tier + '">' + sc.tier + ' lead</span><span class="meter" role="img" aria-label="Lead score ' + sc.score + ' out of 100"><span style="width:' + sc.score + '%"></span></span>';
    $("#factors").innerHTML = sc.parts.slice().sort(function (a, b) { return b.contribution - a.contribution; }).map(function (f) {
      var on = f.value > 0;
      return '<li class="' + (on ? "" : "off") + '"><span>' + (on ? "✓ " : "· ") + esc(f.label) + (f.key === "engagement" ? " (" + ctx.userMsgs + ")" : "") + '</span><span class="pts">' + (on ? (f.contribution >= 0 ? "+" : "−") + Math.abs(f.contribution).toFixed(2) : "0") + "</span></li>";
    }).join("");
  }
  function renderModelCard() {
    var I = AI.IntentModel, L = AI.LeadScorer;
    $("#intentCard").innerHTML = "<dt>Training phrases</dt><dd>" + I.examples + " across 8 intents</dd><dt>Vocabulary</dt><dd>" + I.vocabSize + " words and word pairs</dd><dt>Held-out accuracy</dt><dd>" + Math.round(I.looAccuracy * 100) + "% (leave-one-out)</dd><dt>Confidence rule</dt><dd>≥ " + Math.round(MIN_CONF * 100) + "%, or 2× the runner-up</dd>";
    $("#scoreCard").innerHTML = "<dt>Training leads</dt><dd>" + L.trainSize + " synthetic</dd><dt>Test leads</dt><dd>" + L.testSize + " (not used in training)</dd><dt>Test accuracy</dt><dd>" + Math.round(L.testAccuracy * 100) + "%</dd><dt>Always-guess baseline</dt><dd>" + Math.round(L.baseline * 100) + "%</dd>";
    var max = Math.max.apply(null, L.weights.map(Math.abs));
    $("#weights").innerHTML = L.features.map(function (f, k) { return { f: f, w: L.weights[k] }; }).sort(function (a, b) { return b.w - a.w; }).map(function (x) {
      var pct = Math.max(2, Math.round(Math.abs(x.w) / max * 100));
      return "<li><span>" + esc(x.f.label) + '</span><span class="track" role="img" aria-label="weight ' + x.w.toFixed(2) + '"><span class="fill" style="width:' + pct + '%"></span></span><span class="val">' + (x.w >= 0 ? "+" : "") + x.w.toFixed(2) + "</span></li>";
    }).join("");
  }

  function restart() {
    ctx = freshCtx(); lastPrediction = null; lastText = ""; log.innerHTML = ""; busy = false;
    $("#handoff").innerHTML = '<p class="empty-prev">Not sent yet. Book a viewing or ask for an agent to create the lead.</p>';
    renderBrain();
    botSay("<p>Hi! I’m <b>Hana</b>, Harbor &amp; Home’s virtual assistant. I can find listings, answer questions about price and financing, and book a viewing for you.</p><p>What are you looking for?</p>", { chips: START_CHIPS });
  }

  $("#chatForm").addEventListener("submit", function (e) { e.preventDefault(); var i = $("#chatInput"); if (busy) return; send(i.value); i.value = ""; i.focus(); });
  $("#restartBtn").addEventListener("click", restart);
  renderModelCard();
  restart();
})();
