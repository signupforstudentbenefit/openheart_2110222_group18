// frontend/router.js
export function mountRouter(map) {
  const routes  = { ...map };                          // { "#/journal": "#view-journal", ... }
  const targets = [...new Set(Object.values(routes))]; // unique list of view selectors

  function pickHash() {
    const h = location.hash;
    return (h && routes[h]) ? h : "#/journal";         // default to journal
  }

  function show(sel) {
    // Hide every view hard (inline wins against rogue CSS)
    targets.forEach(t => {
      const el = document.querySelector(t);
      if (el) { el.style.display = "none"; el.classList.remove("active"); }
    });
    // Show only the requested view
    const el = document.querySelector(sel);
    if (el) { el.style.display = ""; el.classList.add("active"); }

    // Highlight active tab
    const hash = Object.entries(routes).find(([, s]) => s === sel)?.[0] ?? "#/journal";
    document.querySelectorAll('a[href^="#/"]').forEach(a => {
      const on = a.getAttribute("href") === hash;
      a.classList.toggle("is-active", on);
      a.classList.toggle("active", on);
      a.setAttribute("aria-current", on ? "page" : "false");
    });
  }

  function apply() {
    const hash = pickHash();
    const sel  = routes[hash];
    if (sel) show(sel);
  }

  window.addEventListener("hashchange", apply);
  document.addEventListener("DOMContentLoaded", apply);
  apply();
}
