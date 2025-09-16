// frontend/components/Analytics.js
import { getVents, getStats, getEntries, } from "../api.js";
import { mountCalendar } from "./Calendar.js";

// --- CSV export helpers (inline) ---
function toCSVRow(fields) {
  return fields.map((v) => {
    const s = v == null ? "" : String(v);
    const needsQuotes = /[",\n]/.test(s);
    const out = s.replace(/"/g, '""');
    return needsQuotes ? `"${out}"` : out;
  }).join(",");
}

function downloadCSV(filename, rows) {
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

async function exportAllCSV() {
  const rows = [["id","type","label","confidence","text","createdAt","updatedAt"]];
  // entries
  const entries = await getEntries();
  for (const e of entries || []) {
    const id = e.id ?? e.id ?? "";
    rows.push([
      id, "entry", e.label ?? "", e.confidence ?? "",
      e.text ?? "", e.createdAt ?? "", e.updatedAt ?? "",
    ]);
  }
  // vents
  const vents = await getVents().catch(() => []);
  for (const v of vents || []) {
    const id = v.id ?? v.id ?? "";
    rows.push([
      id, "vent", "", "", v.text ?? "", v.createdAt ?? "", v.updatedAt ?? "",
    ]);
  }
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  downloadCSV(`openheart-export-${ts}.csv`, rows.map(toCSVRow));
}


const COLORS = {
  Happy:  "#22c55e",
  Sad:    "#3b82f6",
  Angry:  "#ef4444",
  Worried:"#f59e0b",
  Excited:"#a855f7",
  Calm:   "#94a3b8"
};

export function mountAnalytics(host) {
  host.innerHTML = `
    <h2>Analytics</h2>
    <nav class="subtabs" style="display:flex; gap:8px; margin-bottom:12px;">
      <button class="subtab active" data-tab="overview">Overview</button>
      <button class="subtab" data-tab="calendar">Calendar</button>
    </nav>
    <div id="analytics-content"></div>
  `;
    // Add an Export button (idempotent)
  let toolbar = host.querySelector(".analytics-toolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "analytics-toolbar";
     host.prepend(toolbar);

  }
  if (!toolbar.querySelector("#btn-export-csv")) {
    const btn = document.createElement("button");
    btn.id = "btn-export-csv";
    btn.className = "btn btn-secondary";
    btn.textContent = "Export (.csv)";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Exporting…";
      try { await exportAllCSV(); }
      catch (e) { alert(`Export failed: ${e?.message || e}`); }
      finally { btn.disabled = false; btn.textContent = "Export (.csv)"; }
    });
    toolbar.appendChild(btn);
  }

  const content = host.querySelector("#analytics-content");
  const tabs = host.querySelectorAll(".subtab");

  function activate(tab) {
    tabs.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    if (tab === "calendar") {
      mountCalendar(content);
    } else {
      renderOverview(content); // our old analytics, now scoped here
    }
  }

  tabs.forEach(b => b.addEventListener("click", () => activate(b.dataset.tab)));
  activate("overview"); // default
}

/* ===== Overview (your old renderAnalytics, adapted) ===== */
export async function renderOverview(container) {
  container.innerHTML = `
    <div class="analytic-toolbar">
      <label>
        Emotion:
        <select id="flt-emotion">
          <option value="">All</option>
          ${Object.keys(COLORS).map(k => `<option value="${k}">${k}</option>`).join("")}
        </select>
      </label>
      <label>
        Sort:
        <select id="flt-sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </label>
      <button id="btn-refresh">Refresh</button>
    </div>
    <div class="analytic-grid">
      <div id="donut-wrap"></div>
      <div class="analytic-side">
        <div class="totals" id="totals"></div>
        <div class="legend" id="legend"></div>
      </div>
    </div>
    <h3 style="margin-top:16px">Entries</h3>
    <div id="entries-analytic-list" class="list"></div>
  `;

  const elEmotion = container.querySelector("#flt-emotion");
  const elSort = container.querySelector("#flt-sort");
  const elRefresh = container.querySelector("#btn-refresh");

  elRefresh.addEventListener("click", draw);
  elEmotion.addEventListener("change", draw);
  elSort.addEventListener("change", draw);

  await draw();

  async function draw() {
    try {
      const [s, all] = await Promise.all([getStats(), getEntries()]);
      let items = all.slice();

      // filters
      const emotion = elEmotion.value;
      if (emotion) items = items.filter(e => e.label === emotion);

      items.sort((a,b) => elSort.value === "oldest"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt));

      buildDonut(s, container);

      const total = s.total || 0;
      container.querySelector("#totals").innerHTML =
        `<div><strong>Total entries:</strong> ${total}</div>`;

      container.querySelector("#legend").innerHTML = Object.keys(COLORS).map(k => `
        <div class="legend-item">
          <span class="swatch" style="background:${COLORS[k]}"></span>
          <span class="legend-key">${k}</span>
          <span class="legend-val">${s.countsByLabel?.[k] || 0}</span>
        </div>
      `).join("");

      // entries list
      const listHost = container.querySelector("#entries-analytic-list");
      if (!items.length) {
        listHost.innerHTML = `<p class="muted">No entries${emotion ? ` for “${emotion}”` : ""}.</p>`;
      } else {
        listHost.innerHTML = items.map(card).join("");
      }
    } catch (err) {
      console.error("Analytics load failed", err);
      container.innerHTML = `<p style="color:#c00">Analytics failed to load. Check server routes.</p>`;
    }
  }
}

/* ===== helpers from your old file ===== */
function buildDonut(s, scopeEl) {
  const data = [
    { key: "Happy",   value: s.countsByLabel?.Happy   || 0 },
    { key: "Sad",     value: s.countsByLabel?.Sad     || 0 },
    { key: "Angry",   value: s.countsByLabel?.Angry   || 0 },
    { key: "Worried", value: s.countsByLabel?.Worried || 0 },
    { key: "Excited", value: s.countsByLabel?.Excited || 0 },
    { key: "Calm",    value: s.countsByLabel?.Calm    || 0 },
  ];
  const total = data.reduce((a, b) => a + b.value, 0);

  const wrap = scopeEl.querySelector("#donut-wrap");
  if (!total) {
    wrap.innerHTML = `
      <div class="donut-wrap">
        <svg viewBox="0 0 220 220" width="220" height="220">
          <circle r="90" cx="110" cy="110" fill="transparent" stroke="#e5e7eb" stroke-width="28" />
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="donut-center">0</text>
        </svg>
      </div>
    `;
    return;
  }

  const size = 220, radius = 90, stroke = 28;
  const C = 2 * Math.PI * radius;
  let offset = 0;

  const segments = data
    .filter(d => d.value > 0)
    .map(d => {
      const frac = d.value / total;
      const dash = frac * C;
      const gap = C - dash;
      const seg = `
        <circle class="donut-seg" r="${radius}" cx="${size/2}" cy="${size/2}"
          fill="transparent" stroke="${COLORS[d.key]}" stroke-width="${stroke}"
          stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset * C}"
          transform="rotate(-90 ${size/2} ${size/2})" />
      `;
      offset += frac;
      return seg;
    }).join("");

  wrap.innerHTML = `
    <div class="donut-wrap">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle r="${radius}" cx="${size/2}" cy="${size/2}"
          fill="transparent" stroke="#e5e7eb" stroke-width="${stroke}" />
        ${segments}
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="donut-center">${total}</text>
      </svg>
    </div>
  `;
}

function card(e) {
  const color = COLORS[e.label] || "#e5e7eb";
  const when = new Date(e.createdAt).toLocaleString();
  return `
    <article class="card entry-card">
      <header class="entry-head">
        <span class="swatch" style="background:${color}"></span>
        <span class="badge">${e.label}</span>
        <span class="muted">· ${Math.round((e.confidence ?? 0)*100)}%</span>
        <span class="muted" style="margin-left:auto">${when}</span>
      </header>
      <p>${escapeHtml(e.text)}</p>
    </article>
  `;
}
function escapeHtml(s) {
  return (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
