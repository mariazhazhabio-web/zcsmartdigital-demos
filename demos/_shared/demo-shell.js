/* "Back to Demos" goes to the site's Portfolio section (/#portfolio).
   When a demo is opened straight from disk (file://) there is no site root, so point at the live site instead. */
(function () {
  if (location.protocol !== "file:") return;
  var links = document.querySelectorAll("a[data-zc-back]");
  for (var i = 0; i < links.length; i++) links[i].href = "https://zcsmartdigital.com/#portfolio";
})();
