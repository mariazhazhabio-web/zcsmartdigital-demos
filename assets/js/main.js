/* =========================================================================
   ZC Smart Digital — site behaviour (no libraries)
   ========================================================================= */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var CFG = window.ZC_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
  function icon(id, cls) { return '<svg class="ico ' + (cls || "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }

  /* ---------- Header: sticky shadow, mobile menu, dropdown ---------- */
  var header = $(".site-header");
  var toggle = $(".nav-toggle");
  var dd = $(".has-dropdown");
  var ddBtn = $(".dropdown-toggle");

  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 10); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  function setMenu(open) {
    document.body.classList.toggle("nav-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      $("use", toggle).setAttribute("href", open ? "#i-close" : "#i-menu");
      $(".sr-only", toggle).textContent = open ? "Close menu" : "Open menu";
    }
  }
  function setDropdown(open) {
    if (!dd) return;
    dd.classList.toggle("is-open", open);
    ddBtn.setAttribute("aria-expanded", String(open));
  }
  if (toggle) toggle.addEventListener("click", function () { setMenu(!document.body.classList.contains("nav-open")); });
  if (ddBtn) ddBtn.addEventListener("click", function (e) { e.stopPropagation(); setDropdown(!dd.classList.contains("is-open")); });
  document.addEventListener("click", function (e) { if (dd && !dd.contains(e.target)) setDropdown(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setDropdown(false); setMenu(false); closeModal(); }
  });
  $$(".site-nav a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); setDropdown(false); }); });

  /* ---------- Active nav link on scroll (home page) ---------- */
  var navMap = { top: null, services: null, about: null, portfolio: null, contact: null };
  $$(".nav-list .nav-link").forEach(function (a) {
    var m = a.getAttribute("href").match(/^#(\w+)$/);
    if (m && m[1] in navMap) navMap[m[1]] = a;
  });
  if (navMap.top && "IntersectionObserver" in window) {
    var sections = ["about", "services", "portfolio", "contact"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var current = "top";
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) current = en.target.id; });
      if (window.scrollY < 300) current = "top";
      Object.keys(navMap).forEach(function (k) {
        if (!navMap[k]) return;
        var on = k === current;
        navMap[k].classList.toggle("is-active", on);
        if (on) navMap[k].setAttribute("aria-current", "true"); else navMap[k].removeAttribute("aria-current");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); rio.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { rio.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add("is-visible"); });

  /* ---------- Year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Contact details + social links from config ---------- */
  var c = CFG.contact || {};
  var contactItems = [];
  [c.phone, c.phone2].forEach(function (ph) {
    if (ph) contactItems.push(icon("i-phone") + '<a href="tel:' + esc(ph.replace(/[^\d+]/g, "")) + '">' + esc(ph) + "</a>");
  });
  [c.email, c.email2].forEach(function (em) {
    if (em) contactItems.push(icon("i-mail") + '<a href="mailto:' + esc(em) + '">' + esc(em) + "</a>");
  });
  if (c.whatsapp) contactItems.push(icon("i-whatsapp") + '<a href="https://wa.me/' + esc(c.whatsapp.replace(/\D/g, "")) + '" target="_blank" rel="noopener">WhatsApp</a>');
  if (c.address) contactItems.push(icon("i-pin") + "<span>" + esc(c.address) + "</span>");
  if (c.hours) contactItems.push(icon("i-clock") + "<span>" + esc(c.hours) + "</span>");
  $$("[data-contact-list]").forEach(function (ul) {
    ul.innerHTML = contactItems.map(function (h) { return "<li>" + h + "</li>"; }).join("");
    if (!contactItems.length) ul.hidden = true;
  });

  var socialIcons = { facebook: "i-facebook", instagram: "i-instagram", linkedin: "i-linkedin", youtube: "i-youtube", tiktok: "i-tiktok" };
  var s = CFG.social || {};
  $$("[data-social-list]").forEach(function (ul) {
    var html = Object.keys(socialIcons).filter(function (k) { return s[k]; }).map(function (k) {
      return '<li><a href="' + esc(s[k]) + '" target="_blank" rel="noopener" aria-label="ZC Smart Digital on ' + k.charAt(0).toUpperCase() + k.slice(1) + '">' + icon(socialIcons[k]) + "</a></li>";
    }).join("");
    ul.innerHTML = html;
    if (!html) ul.hidden = true;
  });

  /* ---------- Booking ---------- */
  var b = CFG.booking || {};
  if (b.url) {
    $$("[data-booking-link]").forEach(function (a) {
      if (b.embed && $("#book") && a.closest(".site-header, .site-footer")) { return; } // header/footer keep #book anchor when embedded
      if (b.embed && a.hasAttribute("data-booking-primary") && $("#book")) return;
      a.href = b.url; a.target = "_blank"; a.rel = "noopener";
    });
    var book = $("#book .book-card");
    if (book && b.embed) {
      var f = document.createElement("iframe");
      f.className = "booking-embed"; f.src = b.url; f.title = "Book a consultation with ZC Smart Digital"; f.loading = "lazy";
      book.appendChild(f);
      var primary = $("[data-booking-primary]", book); if (primary) primary.href = "#book";
      var note = $("[data-booking-note]"); if (note) note.textContent = "Pick a date and time in the calendar below.";
    }
  }

  /* ---------- Pricing from config ---------- */
  var pricingEl = $("[data-pricing]");
  if (pricingEl && Array.isArray(CFG.pricing)) {
    pricingEl.innerHTML = CFG.pricing.map(function (p) {
      return '<article class="price reveal is-visible' + (p.featured ? " is-featured" : "") + '">' +
        (p.badge ? '<span class="price-badge">' + esc(p.badge) + "</span>" : "") +
        "<h3>" + esc(p.name) + "</h3>" +
        '<p class="price-desc">' + esc(p.description || "") + "</p>" +
        '<p class="price-amount">' + esc(p.price || "") + (p.note ? "<small>" + esc(p.note) + "</small>" : "") + "</p>" +
        '<ul class="check-list">' + (p.features || []).map(function (f) { return "<li>" + icon("i-check") + esc(f) + "</li>"; }).join("") + "</ul>" +
        '<a class="btn ' + (p.featured ? "btn-gold" : "btn-outline") + '" href="#contact" data-package="' + esc(p.name) + '"><span>' + esc(p.cta || "Get a Quote") + "</span></a>" +
        "</article>";
    }).join("");
    $$("[data-package]", pricingEl).forEach(function (a) {
      a.addEventListener("click", function () {
        var msg = $("#cf-message"), sel = $("#cf-service");
        if (sel) sel.value = "Web & App Development";
        if (msg && !msg.value) msg.value = "I'm interested in the " + a.getAttribute("data-package") + " website package.";
      });
    });
  }

  /* ---------- Pre-select a service in the contact form (links like ?service=...#contact) ---------- */
  var wanted = new URLSearchParams(location.search).get("service");
  var svcSelect = $("#cf-service");
  if (wanted && svcSelect) {
    Array.prototype.forEach.call(svcSelect.options, function (o) { if (o.text === wanted) svcSelect.value = o.text; });
    var msgBox = $("#cf-message");
    if (msgBox && !msgBox.value) msgBox.placeholder = "Tell us about your business and what you would like for " + wanted + ".";
  }

  /* ---------- Portfolio filter ---------- */
  var filters = $$(".filter");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      filters.forEach(function (x) { var on = x === btn; x.classList.toggle("is-active", on); x.setAttribute("aria-pressed", String(on)); });
      $$(".work").forEach(function (w) { w.hidden = !(f === "all" || w.getAttribute("data-category") === f); });
    });
  });

  /* ---------- Intro video: branded modal player ----------
     The video is NOT loaded or played when the page loads. It is attached and
     started only after a visitor clicks "Watch Intro". */
  var modal = $("#video-modal");
  var lastFocus = null;
  var player = modal ? $("[data-player]", modal) : null;
  var video = player ? $("video", player) : null;
  var isIOS = /iP(hone|od|ad)/.test(navigator.platform) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) doc.classList.add("is-ios");

  function fmt(s) { if (!isFinite(s) || s < 0) s = 0; var m = Math.floor(s / 60), x = Math.floor(s % 60); return m + ":" + (x < 10 ? "0" : "") + x; }
  function embedFor(url) {
    var yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (yt) return "https://www.youtube-nocookie.com/embed/" + yt[1] + "?autoplay=1&rel=0";
    var vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return "https://player.vimeo.com/video/" + vm[1] + "?autoplay=1";
    return null;
  }
  function showMessage(html) {
    var m = $("[data-pl-message]", player);
    m.innerHTML = html; m.hidden = false; player.classList.add("has-error"); player.classList.remove("is-loading");
  }

  if (player && video) {
    var seek = $("[data-pl=seek]", player), vol = $("[data-pl=volume]", player);
    var tCur = $("[data-pl-current]", player), tDur = $("[data-pl-duration]", player);
    var idleTimer = null, seeking = false;

    var setIcon = function (btn, id) { $("use", btn).setAttribute("href", "#" + id); };
    var setRange = function (r, frac) { r.style.setProperty("--p", (frac * 100).toFixed(2) + "%"); };
    var updatePlay = function () {
      var playing = !video.paused && !video.ended;
      player.classList.toggle("is-playing", playing);
      $$("[data-pl=toggle]", player).forEach(function (b) { b.setAttribute("aria-label", playing ? "Pause" : "Play"); });
      setIcon($(".player-bar [data-pl=toggle]", player), playing ? "i-pause" : "i-play-solid");
    };
    var updateTime = function () {
      tCur.textContent = fmt(video.currentTime); tDur.textContent = fmt(video.duration);
      if (!seeking && video.duration) { seek.value = Math.round(video.currentTime / video.duration * 1000); setRange(seek, video.currentTime / video.duration); }
    };
    var updateVol = function () {
      var muted = video.muted || video.volume === 0, btn = $("[data-pl=mute]", player);
      setIcon(btn, muted ? "i-volume-off" : "i-volume"); btn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
      vol.value = video.muted ? 0 : video.volume; setRange(vol, video.muted ? 0 : video.volume);
    };
    var fsEl = function () { return document.fullscreenElement || document.webkitFullscreenElement; };
    var toggleFs = function () {
      if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (player.requestFullscreen) player.requestFullscreen().catch(function () {});
      else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iPhone
    };
    var onFsChange = function () {
      var on = !!fsEl(), btn = $("[data-pl=fullscreen]", player);
      setIcon(btn, on ? "i-fullscreen-exit" : "i-fullscreen"); btn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
    };
    var wake = function () {
      player.classList.remove("is-idle"); clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { if (!video.paused) player.classList.add("is-idle"); }, 2600);
    };
    var togglePlay = function () {
      if (video.paused || video.ended) {
        var p = video.play(); if (p && p.catch) p.catch(function () { updatePlay(); });
      } else video.pause();
    };

    var wasIdle = false;
    player.addEventListener("pointerdown", function () { wasIdle = player.classList.contains("is-idle"); wake(); });
    player.addEventListener("click", function (e) {
      var c = e.target.closest("[data-pl]"); wake();
      // First tap on hidden controls only reveals them (touch screens); otherwise tap/click toggles play
      if (!c) { if (e.target === video && !wasIdle) togglePlay(); wasIdle = false; return; }
      var a = c.getAttribute("data-pl");
      if (a === "toggle") togglePlay();
      else if (a === "mute") { video.muted = !video.muted; if (!video.muted && video.volume === 0) video.volume = .8; }
      else if (a === "fullscreen") toggleFs();
    });
    video.addEventListener("dblclick", toggleFs);
    seek.addEventListener("input", function () {
      seeking = true; var f = seek.value / 1000; setRange(seek, f);
      if (video.duration) { tCur.textContent = fmt(f * video.duration); video.currentTime = f * video.duration; }
    });
    seek.addEventListener("change", function () { seeking = false; });
    vol.addEventListener("input", function () { video.volume = +vol.value; video.muted = +vol.value === 0; });
    ["mousemove", "focusin"].forEach(function (ev) { player.addEventListener(ev, wake, { passive: true }); });

    video.addEventListener("play", function () { player.classList.add("has-started"); updatePlay(); wake(); });
    video.addEventListener("pause", function () { updatePlay(); player.classList.remove("is-idle"); });
    video.addEventListener("ended", function () { updatePlay(); player.classList.remove("is-idle"); });
    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateTime);
    video.addEventListener("durationchange", updateTime);
    video.addEventListener("volumechange", updateVol);
    video.addEventListener("waiting", function () { player.classList.add("is-loading"); });
    ["playing", "canplay", "pause"].forEach(function (ev) { video.addEventListener(ev, function () { player.classList.remove("is-loading"); }); });
    video.addEventListener("error", function () {
      showMessage(icon("i-play") + "<h3>Video unavailable</h3><p>The introduction video could not be loaded. Please try again later.</p>");
    });
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    // Keyboard shortcuts while the modal is open
    modal.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
      var k = e.key.toLowerCase();
      if (k === " " || k === "k") { if (e.target.tagName !== "BUTTON") { e.preventDefault(); togglePlay(); } }
      else if (k === "m") { video.muted = !video.muted; }
      else if (k === "f") { toggleFs(); }
      else if (e.key === "ArrowRight") { video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); }
      else if (e.key === "ArrowLeft") { video.currentTime = Math.max(0, video.currentTime - 5); }
      else if (e.key === "Tab") { // keep focus inside the dialog
        var f = $$("button, input, a[href], iframe", modal).filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
      wake();
    });
    updateVol();
  }

  function openModal() {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    var url = CFG.introVideo || "";
    var embed = url && embedFor(url);
    if (embed) {
      $("[data-video-body]", modal).innerHTML = '<div class="video-frame"><iframe src="' + esc(embed) + '" title="ZC Smart Digital introduction" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe></div>';
    } else if (!url) {
      showMessage(icon("i-play") + "<h3>Coming soon</h3><p>Our company introduction video is in production. In the meantime, book a free consultation to meet the team.</p>");
    } else if (video) {
      if (!video.getAttribute("src")) {           // attach the file only on first open
        if (CFG.introPoster) video.poster = CFG.introPoster;
        video.preload = "auto";
        video.src = url;
      }
      player.classList.add("is-loading");
      var p = video.play();                       // user clicked, so playback with sound is allowed
      if (p && p.catch) p.catch(function () { player.classList.remove("is-loading"); });
    }
    $(".modal-close", modal).focus();
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    if (document.fullscreenElement || document.webkitFullscreenElement) return; // Esc first leaves full screen
    if (video) video.pause();
    var frame = $("[data-video-body] iframe", modal); if (frame) frame.src = "about:blank";
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  $$("[data-open-video]").forEach(function (btn) { btn.addEventListener("click", openModal); });
  if (modal) modal.addEventListener("click", function (e) { if (e.target.closest("[data-close-modal]")) closeModal(); });

  /* ---------- Contact form ---------- */
  var form = $("#contact-form");
  if (form) {
    var status = $(".form-status", form);
    var setStatus = function (msg, type) { status.textContent = msg; status.className = "form-status" + (type ? " is-" + type : ""); };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      ["name", "email", "message"].forEach(function (n) {
        var el = form.elements[n], bad = !el.value.trim() || (n === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value));
        el.closest(".field").classList.toggle("has-error", bad);
        el.setAttribute("aria-invalid", String(bad));
        if (bad && ok) { el.focus(); ok = false; }
      });
      if (!ok) { setStatus("Please complete the required fields with valid details.", "error"); return; }
      if (!form.elements.consent.checked) { setStatus("Please tick the consent box so we can reply to you.", "error"); return; }
      if (form.elements.botcheck.value) return; // spam bot

      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== "botcheck" && k !== "consent") data[k] = v; });
      data.page = location.href;
      data.submitted_at = new Date().toISOString();

      var fc = CFG.form || {}, integ = CFG.integrations || {};
      // Forward to n8n / CRM webhooks (fire-and-forget) when configured
      [integ.n8nWebhook, integ.crmWebhook].filter(Boolean).forEach(function (url) {
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), keepalive: true }).catch(function () {});
      });

      if (!fc.endpoint) {
        var email = (CFG.contact || {}).email;
        setStatus(email
          ? "Our online form is being set up. Please email us at " + email + " for now."
          : "Our online form is not connected yet. Please check back soon.", "error");
        return;
      }
      var payload = Object.assign({}, data, { subject: fc.subject || "Website inquiry", from_name: "ZC Smart Digital website" });
      if (fc.accessKey) payload.access_key = fc.accessKey;
      var btn = $("button[type=submit]", form); btn.disabled = true;
      setStatus("Sending…");
      fetch(fc.endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
        .then(function () { form.reset(); setStatus("Thank you! Your message has been sent. We will get back to you soon.", "success"); })
        .catch(function () { setStatus("Sorry, something went wrong. Please try again in a moment.", "error"); })
        .then(function () { btn.disabled = false; });
    });
  }

  /* ---------- Digital globe (canvas) ---------- */
  var canvas = $("[data-globe]");
  if (canvas && canvas.getContext) initGlobe(canvas);

  function initGlobe(cv) {
    var ctx = cv.getContext("2d");
    var D2R = Math.PI / 180;
    // Simplified continent outlines [lat, lon] — decorative only
    var LAND = [
      [[70,-165],[72,-140],[70,-100],[74,-82],[62,-66],[52,-56],[46,-62],[41,-70],[35,-76],[30,-81],[25,-80],[29,-89],[28,-97],[21,-97],[18,-88],[15,-84],[9,-79],[8,-83],[15,-93],[19,-105],[30,-114],[34,-120],[40,-124],[48,-124],[55,-132],[60,-146],[58,-156],[55,-164],[62,-166]],
      [[82,-40],[78,-18],[70,-22],[60,-43],[66,-53],[76,-68],[80,-64]],
      [[12,-72],[10,-62],[5,-52],[0,-50],[-5,-35],[-10,-36],[-23,-42],[-33,-52],[-38,-57],[-42,-64],[-52,-68],[-55,-70],[-50,-75],[-40,-73],[-30,-71],[-18,-70],[-15,-76],[-5,-81],[1,-80],[8,-77]],
      [[36,-6],[43,-9],[48,-4],[51,2],[54,8],[57,8],[62,5],[68,15],[71,26],[69,40],[68,55],[73,70],[77,105],[73,130],[70,160],[66,178],[60,165],[60,150],[54,136],[48,140],[40,128],[35,127],[39,121],[31,122],[23,117],[21,108],[10,106],[9,100],[1,104],[7,98],[16,97],[22,90],[15,80],[8,77],[20,73],[25,67],[25,57],[30,48],[13,44],[20,40],[28,34],[31,32],[36,36],[37,28],[40,26],[37,22],[40,19],[45,13],[44,8],[43,3],[38,0]],
      [[37,10],[35,-6],[28,-13],[21,-17],[14,-17],[5,-8],[4,7],[-5,12],[-17,12],[-34,18],[-34,26],[-26,33],[-15,40],[-5,39],[5,48],[12,51],[12,43],[20,38],[31,32],[32,20],[33,10]],
      [[-12,131],[-12,137],[-17,141],[-11,142],[-19,147],[-28,153],[-38,148],[-38,140],[-32,133],[-35,117],[-22,114],[-14,127]],
      [[58,-5],[55,-1],[51,1],[50,-5],[54,-4]], [[45,142],[40,141],[35,140],[33,131],[35,133],[40,140]],
      [[18,121],[14,124],[7,126],[7,122],[13,120]], [[7,117],[1,119],[-4,116],[-3,110],[2,109]],
      [[5,95],[-6,105],[-3,106],[3,100]], [[-12,49],[-25,47],[-25,44],[-16,44]], [[-35,174],[-41,176],[-46,167],[-41,172]]
    ];
    var CITIES = [[14.6,121],[51.5,-0.1],[40.7,-74],[25.2,55.3],[1.35,103.8],[-33.9,151.2],[35.7,139.7],[-23.5,-46.6],[6.5,3.4],[34,-118],[43.7,-79.4],[19,72.8],[48.9,2.3],[-26.2,28]];
    var LINKS = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,2],[1,3],[1,8],[2,7],[2,9],[3,11],[1,12],[10,2],[4,11],[8,13],[7,1]];

    function inPoly(lat, lon, poly) {
      var inside = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var yi = poly[i][0], xi = poly[i][1], yj = poly[j][0], xj = poly[j][1];
        if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    }
    var dots = [];
    for (var lat = -58; lat <= 82; lat += 1.45) {
      var step = 1.45 / Math.max(Math.cos(lat * D2R), .2);
      for (var lon = -180; lon < 180; lon += step) {
        for (var p = 0; p < LAND.length; p++) if (inPoly(lat, lon, LAND[p])) { dots.push([lat * D2R, lon * D2R]); break; }
      }
    }

    var W, H, R, cx, cy, dpr;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * .42; cx = W / 2; cy = H / 2;
    }
    var lam0 = -40 * D2R, phi0 = 18 * D2R, t0 = performance.now();
    function project(phi, lam) {
      var dl = lam - lam0, cp = Math.cos(phi);
      var z = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * cp * Math.cos(dl);
      return [cx + R * cp * Math.sin(dl), cy - R * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * cp * Math.cos(dl)), z];
    }
    function toVec(phi, lam) { return [Math.cos(phi) * Math.cos(lam), Math.cos(phi) * Math.sin(lam), Math.sin(phi)]; }
    function slerp(a, b, t) {
      var d = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), s = Math.sin(d) || 1;
      var k1 = Math.sin((1 - t) * d) / s, k2 = Math.sin(t * d) / s;
      return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
    }
    function vecProject(v, lift) {
      var phi = Math.asin(v[2]), lam = Math.atan2(v[1], v[0]);
      var pr = project(phi, lam);
      return [cx + (pr[0] - cx) * lift, cy + (pr[1] - cy) * lift, pr[2]];
    }

    function draw(now) {
      var t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      // atmosphere glow
      var g = ctx.createRadialGradient(cx, cy, R * .85, cx, cy, R * 1.35);
      g.addColorStop(0, "rgba(58,160,255,.55)"); g.addColorStop(.35, "rgba(30,123,255,.18)"); g.addColorStop(1, "rgba(30,123,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();
      // sphere body
      var b2 = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
      b2.addColorStop(0, "rgba(30,100,230,.5)"); b2.addColorStop(.65, "rgba(8,34,110,.6)"); b2.addColorStop(1, "rgba(40,140,255,.9)");
      ctx.fillStyle = b2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      // graticule
      ctx.lineWidth = .6; ctx.strokeStyle = "rgba(140,200,255,.16)";
      for (var la = -60; la <= 60; la += 30) { line(function (k) { return [la * D2R, (k * 4 - 180) * D2R]; }, 90); }
      for (var lo = -180; lo < 180; lo += 30) { line(function (k) { return [(k * 2 - 90) * D2R, lo * D2R]; }, 90); }
      // land dots
      for (var i = 0; i < dots.length; i++) {
        var pr = project(dots[i][0], dots[i][1]);
        if (pr[2] <= 0) continue;
        ctx.fillStyle = "rgba(" + (90 + 130 * pr[2] | 0) + "," + (180 + 60 * pr[2] | 0) + ",255," + (.3 + .7 * pr[2]).toFixed(2) + ")";
        var sz = 1.2 + pr[2]; ctx.fillRect(pr[0] - sz / 2, pr[1] - sz / 2, sz, sz);
      }
      // network arcs
      ctx.lineWidth = 1.1;
      for (var l = 0; l < LINKS.length; l++) {
        var A = CITIES[LINKS[l][0]], B = CITIES[LINKS[l][1]];
        var va = toVec(A[0] * D2R, A[1] * D2R), vb = toVec(B[0] * D2R, B[1] * D2R);
        ctx.beginPath(); var started = false;
        for (var k = 0; k <= 32; k++) {
          var tt = k / 32, pv = vecProject(slerp(va, vb, tt), 1 + .08 * Math.sin(Math.PI * tt));
          if (pv[2] > -.05) { if (!started) { ctx.moveTo(pv[0], pv[1]); started = true; } else ctx.lineTo(pv[0], pv[1]); } else started = false;
        }
        ctx.strokeStyle = "rgba(170,220,255,.38)"; ctx.stroke();
        var ph = ((t * .25 + l * .17) % 1), pp = vecProject(slerp(va, vb, ph), 1 + .08 * Math.sin(Math.PI * ph));
        if (pp[2] > 0) { dot(pp[0], pp[1], 2.2, "rgba(255,226,130,.95)", 10, "rgba(246,199,68,.9)"); }
      }
      // city nodes
      for (var cI = 0; cI < CITIES.length; cI++) {
        var cp = project(CITIES[cI][0] * D2R, CITIES[cI][1] * D2R);
        if (cp[2] > 0) dot(cp[0], cp[1], 2.6 + Math.sin(t * 2 + cI) * .6, "rgba(235,248,255,.95)", 12, "rgba(90,180,255,1)");
      }
      ctx.shadowBlur = 0;
      // rim light
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(120,200,255,.55)"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    }
    function line(fn, n) {
      ctx.beginPath(); var on = false;
      for (var k = 0; k <= n; k++) {
        var ll = fn(k / n * 90), pr = project(ll[0], ll[1]);
        if (pr[2] > 0) { if (!on) { ctx.moveTo(pr[0], pr[1]); on = true; } else ctx.lineTo(pr[0], pr[1]); } else on = false;
      }
      ctx.stroke();
    }
    function dot(x, y, r, fill, blur, glow) { ctx.shadowBlur = blur; ctx.shadowColor = glow; ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

    var running = false, visible = true, last = 0;
    function frame(now) {
      if (!running) return;
      if (now - last > 33) { lam0 += .0016; draw(now); last = now; }
      requestAnimationFrame(frame);
    }
    function start() { if (!running && visible && !document.hidden && !reduceMotion) { running = true; requestAnimationFrame(frame); } }
    function stop() { running = false; }
    resize(); draw(performance.now());
    window.addEventListener("resize", function () { resize(); draw(performance.now()); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible ? start() : stop(); }).observe(cv);
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    start();
  }
})();
