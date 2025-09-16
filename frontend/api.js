// Frontend API helpers (same-origin backend)
const BASE = "";

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  // some endpoints may return 204 No Content
  return res.status === 204 ? null : res.json();
}

// EXPOSE a tiny wrapper if your code imports `api`
export const api2 = {
  get:  (p)        => apiFetch(p),
  post: (p, body)  => apiFetch(p, { method: "POST", body: JSON.stringify(body) }),
  put:  (p, body)  => apiFetch(p, { method: "PUT",  body: JSON.stringify(body) }),
  del:  (p)        => apiFetch(p, { method: "DELETE" }),
};

// -------- Entries API (leave as-is if not needed by your current screen) --------
export async function getEntries(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`${BASE}/api/entries${q ? "?" + q : ""}`);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  return r.json();
}
export async function createEntry(text) {
  const r = await fetch(`${BASE}/api/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  return r.json();
}
export async function deleteEntry(id) {
  const r = await fetch(`${BASE}/api/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status} ${await r.text()}`);
}
export async function updateEntry(id, patch) {
  const r = await fetch(`${BASE}/api/entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

// -------- Vents API (normalized id everywhere) --------
export async function getVents() {
  const r = await fetch(`${BASE}/api/vents`);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  return r.json(); // [{ id, text, label, confidence, summary, ... }]
}

export async function createVent(text) {
  const r = await fetch(`${BASE}/api/vents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

export async function updateVent(id, patch) {
  const r = await fetch(`${BASE}/api/vents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

export async function deleteVent(id) {
  const r = await fetch(`${BASE}/api/vents/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status} ${await r.text()}`);
}

export async function getStats() {
  const r = await fetch(`/api/entries/stats`);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  return r.json(); // { total, countsByLabel, avgConfidenceByLabel }
}

export async function classifyText(text) {
  const r = await fetch(`${BASE}/api/entries/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  return r.json(); // { label, confidence }
}

// Keep a legacy default export for components that do `import { api }`
export const api = {
  // entries
  getEntries, createEntry, updateEntry, deleteEntry,
  // vents
  getVents, createVent, updateVent, deleteVent,
  getStats,
  classifyText,

};

export default api;
