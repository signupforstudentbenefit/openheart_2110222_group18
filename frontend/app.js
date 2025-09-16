// frontend/app.js
import { mountRouter } from "../router.js";
import { mountEntryForm } from "../components/EntryForm.js";
import { renderEntries } from "../components/EntryList.js";
import { mountAnalytics, renderOverview } from "../components/Analytics.js";
import { mountVentForm } from "../components/VentForm.js";
import { renderVents } from "../components/VentList.js";
import { mountCalendar } from "../components/Calendar.js"; // optional

// ---------- ROUTER MAP ----------
mountRouter({
  "#/": "#view-home",              // or "#/journal" if you want journal as default
  "#/journal": "#view-journal",
  "#/vent": "#view-vent",
  "#/analytics": "#view-analytics",
  "#/credits": "#view-credits",
});

// ---------- HELPERS ----------
function mountOnce(hostId, fn) {
  const host = document.getElementById(hostId);
  if (host && !host.dataset.mounted) {
    fn(host);
    host.dataset.mounted = "1";
  }
}

function updateNavActive() {
  const hash = location.hash || "#/";
  document.querySelectorAll(".nav-link, .tab-pill").forEach(a => {
    const active = a.getAttribute("href") === hash;
    a.classList.toggle("is-active", active);
    a.classList.toggle("active", active);
    a.setAttribute("aria-current", active ? "page" : "false");
  });
}

function updateBlob() {
  const hash = location.hash || "#/";
  const blob = document.getElementById("blob");
  const active = document.querySelector(`.tab-pill[href="${hash}"], .nav-link.tab-pill[href="${hash}"]`);
  if (blob && active && active.offsetParent) {
    blob.style.left = active.offsetLeft + "px";
    blob.style.width = active.offsetWidth + "px";
  } else if (blob) {
    blob.style.width = "0";
  }
}

function updateDocumentTitle() {
  const map = {
    "#/": "OpenHeart — Home",
    "#/journal": "OpenHeart — Journal",
    "#/vent": "OpenHeart — Vent",
    "#/analytics": "OpenHeart — Analytics",
    "#/credits": "OpenHeart — Credits",
    "#/credit": "OpenHeart — Credits",
  };
  document.title = map[location.hash] || "OpenHeart — Emotion Journal";
}

// Remove the Analytics "Refresh" button (DOM + any re-render)
function removeAnalyticsRefresh() {
  const root = document.getElementById("view-analytics");
  if (!root) return;

  // Try common selectors first
  root.querySelectorAll("#an-refresh, .btn-refresh, button[data-action='refresh']")
      .forEach(btn => btn.remove());

  // Fallback: any <button> whose text is exactly "Refresh"
  root.querySelectorAll("button").forEach(b => {
    if ((b.textContent || "").trim().toLowerCase() === "refresh") b.remove();
  });
}

// ---------- ROUTE HANDLER ----------
function handleRoute() {
  const hash = location.hash || "#/";

  if (hash === "#/journal" || hash === "#/") {
    mountOnce("entry-form", mountEntryForm);
    if (typeof renderEntries === "function") renderEntries();
  }

  if (hash === "#/vent") {
    mountOnce("vent-form", mountVentForm);
    if (typeof renderVents === "function") renderVents();
  }

  if (hash === "#/analytics") {
    mountOnce("analytics", mountAnalytics);
    const container =
      document.getElementById("analytics-content") ||
      document.getElementById("analytics");
    if (container && typeof renderOverview === "function") {
      renderOverview(container);
    }
    removeAnalyticsRefresh(); // <- kill the Refresh button after render
  }

  // credits is static; no JS needed
}

// ---------- WIRE EVENTS ----------
function onRouteChange() {
  handleRoute();
  updateNavActive();
  updateBlob();
  updateDocumentTitle();
}

window.addEventListener("load", onRouteChange);
window.addEventListener("hashchange", onRouteChange);

// also keep removing Refresh when data changes / view re-renders
window.addEventListener("load", removeAnalyticsRefresh);
window.addEventListener("hashchange", removeAnalyticsRefresh);
window.addEventListener("entries-changed", removeAnalyticsRefresh);

// ---------- DATA REFRESH ----------
window.addEventListener("entries-changed", () => {
  const hash = location.hash || "#/";
  if (hash === "#/journal" && typeof renderEntries === "function") renderEntries();
  if (hash === "#/vent" && typeof renderVents === "function") renderVents();
  if (hash === "#/analytics") {
    const c = document.getElementById("analytics-content") || document.getElementById("analytics");
    if (c && typeof renderOverview === "function") renderOverview(c);
    removeAnalyticsRefresh();
  }
});

console.log("[OpenHeart] app.js v8");

// ---------- DISCLAIMER: force always visible (no dismiss) ----------
(() => {
  const bar = document.getElementById("disclaimer");
  if (bar) bar.classList.remove("hidden");
})();
