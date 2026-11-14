// Applies the saved theme before React loads, to avoid a flash of the wrong theme.
// Kept as an external file (not inline) so the production Content-Security-Policy can stay strict.
try {
  var t = localStorage.getItem("titanium_theme");
  if (t === "light" || t === "dark")
    document.documentElement.setAttribute("data-theme", t);
} catch (e) {}

<div className="brand">
  <img
    src="/favicon.png"
    alt="Saheem Panel"
    className="brand-logo"
  />
  <span>saheem.panel</span>
</div>
