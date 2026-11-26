/* =========================================================================
   ZC Smart Digital — SITE SETTINGS
   Edit this one file to update contact details, links, integrations and
   pricing. Leave a value as "" (empty) to hide it from the website.
   ========================================================================= */
window.ZC_CONFIG = {

  /* ---------- Contact details (shown in Contact section and footer) ---------- */
  contact: {
    company: "ZC Smart Digital",
    phone: "+63 997 700 0232",         // primary contact number
    phone2: "+63 898 007 1965",        // secondary contact number
    email: "zcsmartdigital@gmail.com", // primary email (also used as form fallback)
    email2: "info@zcsmartdigital.com", // secondary email
    whatsapp: "",       // digits only with country code, e.g. "639000000000"
    address: "",        // e.g. "Manila, Philippines" (or leave empty for online-only)
    hours: ""           // e.g. "Mon–Fri, 9:00 AM – 6:00 PM (PHT)"
  },

  /* ---------- Social media (icons appear in the footer when filled) ---------- */
  social: {
    facebook: "",       // full URL, e.g. "https://facebook.com/zcsmartdigital"
    instagram: "",
    linkedin: "",
    youtube: "",
    tiktok: ""
  },

  /* ---------- Consultation booking ----------
     Free options: Cal.com (free plan) or Calendly (free plan).
     Paste your public booking link, e.g. "https://cal.com/zcsmartdigital/consultation".
     embed: true shows the calendar inside the "Book a Consultation" section;
     false opens it in a new tab. Empty = buttons scroll to the contact form. */
  booking: {
    url: "",
    embed: false
  },

  /* ---------- Contact form delivery ----------
     Free options:
       Web3Forms  -> endpoint "https://api.web3forms.com/submit", accessKey from web3forms.com
       Formspree  -> endpoint "https://formspree.io/f/XXXXXXX", accessKey ""
     Until an endpoint is set, the form explains it is not yet connected. */
  form: {
    endpoint: "",
    accessKey: "",
    subject: "New inquiry from zcsmartdigital.com"
  },

  /* ---------- Future integrations ----------
     n8nWebhook: a production webhook URL from your n8n workflow. Every form
     submission is also sent here (use it to push leads into your CRM,
     Google Sheets, email alerts, etc.). */
  integrations: {
    n8nWebhook: "",
    crmWebhook: ""
  },

  /* ---------- Company introduction video ----------
     Plays in the branded pop-up player when visitors click "Watch Intro".
     Put the file in assets/video/ with exactly this name, or change the path.
     A YouTube/Vimeo link also works. Leave empty to show "Coming soon". */
  introVideo: "assets/video/ZC_Smart_Digital_Introduction.mp4",
  introPoster: "assets/video/intro-poster.jpg",   // cover image shown before playback

  /* ---------- Website development pricing ----------
     price: shown large, e.g. "₱15,000" or "$299". Use "Custom quote" if you prefer.
     note:  small line under the price, e.g. "one-time" or "starting price". */
  pricing: [
    {
      name: "Starter",
      description: "A professional online presence for new and small businesses.",
      price: "Custom quote",
      note: "Tailored to your project",
      features: [
        "Up to 5 responsive pages",
        "Mobile-friendly design",
        "Contact form and social links",
        "Basic on-page SEO setup",
        "Domain and hosting setup assistance"
      ],
      featured: false,
      cta: "Get Started"
    },
    {
      name: "Business",
      description: "A complete website built to generate leads and bookings.",
      price: "Custom quote",
      note: "Tailored to your project",
      features: [
        "Up to 10 responsive pages",
        "Custom design to match your brand",
        "Booking or inquiry integration",
        "SEO setup and speed optimisation",
        "Analytics and Google Business setup",
        "Training on updating your site"
      ],
      featured: true,
      badge: "Most Popular",
      cta: "Choose Business"
    },
    {
      name: "Premium",
      description: "Advanced websites with e-commerce, apps or AI automation.",
      price: "Custom quote",
      note: "Tailored to your project",
      features: [
        "Custom pages and features",
        "E-commerce or web app functionality",
        "AI chatbot integration",
        "CRM and n8n workflow automation",
        "Priority support after launch"
      ],
      featured: false,
      cta: "Request a Quote"
    }
  ]
};
