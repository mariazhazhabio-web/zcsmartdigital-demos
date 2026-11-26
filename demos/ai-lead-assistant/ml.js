/*
 * Harbor & Home — AI Lead Assistant: the two small models (Portfolio Demo by ZC Smart Digital)
 * Both are trained in the browser when the page loads. No external AI service is called.
 *
 *   1. IntentModel: multinomial Naive Bayes over word unigrams + bigrams, trained on the
 *      labelled example phrases in INTENT_DATA. Classifies each chat message.
 *   2. LeadScorer: logistic regression trained with gradient descent on 300 SYNTHETIC
 *      historical leads (seeded, so the result is the same on every load). Scores how
 *      likely the current chat is to turn into a viewing / sale.
 */
(function () {
  "use strict";

  /* ---------- text helpers ---------- */
  var STOP = {};
  "a an the is are am i me my to of for in on it this that and be with at please pa po".split(" ").forEach(function (w) { STOP[w] = 1; });
  function stem(w) {
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + "y";
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function tokens(text) {
    var words = String(text || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter(function (w) { return w && !STOP[w]; }).map(stem);
    var out = words.slice();
    for (var i = 0; i < words.length - 1; i++) out.push(words[i] + "_" + words[i + 1]);
    return out;
  }

  /* ---------- 1. intent classifier (multinomial Naive Bayes) ---------- */
  var INTENT_DATA = {
    greet: ["hi", "hello", "hey there", "good morning", "good afternoon", "hi hana", "hello is anyone there", "good evening", "hey", "hi there"],
    search: ["show me condos in pasig", "looking for a house", "i want a 2 bedroom unit", "what properties do you have", "any listings in taguig", "do you have a 3 bedroom house", "find me a condo under 10 million", "show 2 bedroom condos in pasig", "what can i buy with my budget", "properties near bgc", "i need a family home", "looking for a place in quezon city", "what can my budget get me in taguig", "recommend a property"],
    price: ["how much is it", "what is the price", "how much does this cost", "price of the unit", "is the price negotiable", "how much", "whats the selling price", "cost of the house", "how much per sqm", "total contract price", "what is the cost"],
    financing: ["do you accept bank financing", "can i pay through pag-ibig", "installment options", "is there a payment plan", "can i get a housing loan", "what are the payment terms", "how much is the downpayment", "monthly amortization", "do you accept bank loans", "financing options", "can i pay in cash"],
    viewing: ["i would like to book a viewing", "can i visit the property", "schedule a tripping", "can i see the unit on saturday", "book a viewing", "i want to view the house", "when can i visit", "arrange a site visit", "open house schedule", "can we see it this weekend", "set an appointment"],
    availability: ["is it still available", "is the unit available", "is this sold already", "is it still for sale", "available pa", "is it taken", "has it been reserved", "is this listing still open", "still available", "is it available"],
    agent: ["talk to an agent", "can i speak to a person", "call me", "i want to talk to a human", "contact me", "please have someone call me", "connect me to a sales agent", "can an agent message me", "i want to speak to someone", "get in touch"],
    thanks: ["thank you", "thanks", "thanks a lot", "salamat", "great thanks", "ok thank you", "appreciate it", "that helps", "perfect thanks", "awesome"]
  };

  function NaiveBayes() { this.labels = []; this.docCount = {}; this.wordCount = {}; this.totalWords = {}; this.vocab = {}; this.vocabSize = 0; this.nDocs = 0; }
  NaiveBayes.prototype.train = function (examples) {
    var self = this;
    examples.forEach(function (ex) {
      if (!self.docCount[ex.label]) { self.labels.push(ex.label); self.docCount[ex.label] = 0; self.wordCount[ex.label] = {}; self.totalWords[ex.label] = 0; }
      self.docCount[ex.label]++; self.nDocs++;
      tokens(ex.text).forEach(function (t) {
        self.wordCount[ex.label][t] = (self.wordCount[ex.label][t] || 0) + 1;
        self.totalWords[ex.label]++;
        if (!self.vocab[t]) { self.vocab[t] = 1; self.vocabSize++; }
      });
    });
    return this;
  };
  // Returns { ranked: [{label, p}], known: number of message tokens the model has seen before }
  NaiveBayes.prototype.predict = function (text) {
    var self = this, toks = tokens(text), known = toks.filter(function (t) { return self.vocab[t]; });
    var logs = this.labels.map(function (l) {
      var lp = Math.log(self.docCount[l] / self.nDocs), denom = self.totalWords[l] + self.vocabSize;
      known.forEach(function (t) { lp += Math.log(((self.wordCount[l][t] || 0) + 1) / denom); });
      return lp;
    });
    var max = Math.max.apply(null, logs), exps = logs.map(function (v) { return Math.exp(v - max); }), sum = exps.reduce(function (a, b) { return a + b; }, 0);
    var ranked = this.labels.map(function (l, i) { return { label: l, p: exps[i] / sum }; }).sort(function (a, b) { return b.p - a.p; });
    return { ranked: ranked, known: known.length };
  };

  function examplesFrom(data) {
    var ex = [];
    Object.keys(data).forEach(function (label) { data[label].forEach(function (text) { ex.push({ text: text, label: label }); }); });
    return ex;
  }
  // Leave-one-out accuracy: train on every phrase but one, test on the one left out.
  function leaveOneOut(examples) {
    var hit = 0;
    examples.forEach(function (ex, i) {
      var m = new NaiveBayes().train(examples.filter(function (_, j) { return j !== i; }));
      if (m.predict(ex.text).ranked[0].label === ex.label) hit++;
    });
    return hit / examples.length;
  }

  var intentExamples = examplesFrom(INTENT_DATA);
  var IntentModel = new NaiveBayes().train(intentExamples);
  IntentModel.examples = intentExamples.length;
  IntentModel.looAccuracy = leaveOneOut(intentExamples);

  /* ---------- 2. lead scorer (logistic regression) ---------- */
  var FEATURES = [
    { key: "budget_stated", label: "Shared a budget" },
    { key: "budget_fit", label: "A listing fits that budget" },
    { key: "asked_viewing", label: "Asked for a viewing" },
    { key: "asked_financing", label: "Asked about financing" },
    { key: "specific_property", label: "Picked a specific property" },
    { key: "gave_phone", label: "Left a mobile number" },
    { key: "engagement", label: "Chat engagement (messages)" },
    { key: "location_stated", label: "Named a location" }
  ];
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  function mulberry32(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Synthetic "past leads": the outcome (became a viewing/sale or not) is drawn from a hidden
  // rule plus noise, so the model has a real, imperfect pattern to learn.
  function syntheticLeads(n, seed) {
    var rnd = mulberry32(seed), X = [], y = [];
    var hidden = [0.6, 1.4, 2.0, 0.9, 1.1, 1.6, 1.2, 0.5], bias = -3.9;
    for (var i = 0; i < n; i++) {
      var budget = rnd() < 0.55 ? 1 : 0;
      var x = [budget, budget && rnd() < 0.6 ? 1 : 0, rnd() < 0.35 ? 1 : 0, rnd() < 0.4 ? 1 : 0, rnd() < 0.45 ? 1 : 0, rnd() < 0.4 ? 1 : 0, Math.round(rnd() * 8) / 8, rnd() < 0.6 ? 1 : 0];
      var z = bias + (rnd() - 0.5) * 1.6;
      for (var k = 0; k < x.length; k++) z += hidden[k] * x[k];
      X.push(x); y.push(rnd() < sigmoid(z) ? 1 : 0);
    }
    return { X: X, y: y };
  }
  function trainLogReg(X, y, opts) {
    var d = X[0].length, w = new Array(d).fill(0), b = 0, lr = opts.lr, l2 = opts.l2;
    for (var ep = 0; ep < opts.epochs; ep++) {
      var gw = new Array(d).fill(0), gb = 0;
      for (var i = 0; i < X.length; i++) {
        var z = b; for (var k = 0; k < d; k++) z += w[k] * X[i][k];
        var err = sigmoid(z) - y[i];
        for (k = 0; k < d; k++) gw[k] += err * X[i][k];
        gb += err;
      }
      for (k = 0; k < d; k++) w[k] -= lr * (gw[k] / X.length + l2 * w[k]);
      b -= lr * gb / X.length;
    }
    return { w: w, b: b };
  }
  function accuracy(m, X, y) {
    var hit = 0;
    for (var i = 0; i < X.length; i++) { var z = m.b; for (var k = 0; k < m.w.length; k++) z += m.w[k] * X[i][k]; if ((sigmoid(z) >= 0.5 ? 1 : 0) === y[i]) hit++; }
    return hit / X.length;
  }

  var data = syntheticLeads(300, 20261126), split = 240;
  var trainX = data.X.slice(0, split), trainY = data.y.slice(0, split), testX = data.X.slice(split), testY = data.y.slice(split);
  var lr = trainLogReg(trainX, trainY, { epochs: 900, lr: 0.6, l2: 0.002 });
  var baseRate = data.y.reduce(function (a, b) { return a + b; }, 0) / data.y.length;

  var LeadScorer = {
    features: FEATURES,
    weights: lr.w,
    bias: lr.b,
    trainSize: trainX.length,
    testSize: testX.length,
    testAccuracy: accuracy(lr, testX, testY),
    baseline: Math.max(baseRate, 1 - baseRate), // accuracy of always guessing the majority outcome
    // x: object keyed by feature key, values 0..1. Returns score 0..100, tier and each factor's contribution.
    score: function (x) {
      var z = lr.b, parts = FEATURES.map(function (f, k) { var c = lr.w[k] * (x[f.key] || 0); z += c; return { key: f.key, label: f.label, value: x[f.key] || 0, contribution: c }; });
      var s = Math.round(sigmoid(z) * 100);
      return { score: s, tier: s >= 70 ? "Hot" : s >= 40 ? "Warm" : "Cold", parts: parts };
    }
  };

  window.HH_AI = { IntentModel: IntentModel, LeadScorer: LeadScorer, tokens: tokens };
})();
