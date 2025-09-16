// frontend/utils/exportCSV.js
import { getEntries, getVents } from "../api.js";

function toCSVRow(fields) {
  // CSV-safe quoting
  return fields.map((v) => {
    const s = v === null || v === undefined ? "" : String(v);
    // escape quotes by doubling them, wrap in quotes if needed
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
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

export async function exportAllCSV() {
  // header row
  const rows = [["id", "type", "label", "confidence", "text", "createdAt", "updatedAt"]];
  // entries
  const entries = await getEntries();
  for (const e of entries || []) {
    const id = e.id ?? e.id ?? "";
    rows.push([
      id,
      "entry",
      e.label ?? "",
      e.confidence ?? "",
      e.text ?? "",
      e.createdAt ?? "",
      e.updatedAt ?? "",
    ]);
  }
  // vents
  const vents = await getVents().catch(() => []);
  for (const v of vents || []) {
    const id = v.id ?? v.id ?? "";
    rows.push([
      id,
      "vent",
      "",               // vents typically have no label
      "",               // or confidence
      v.text ?? "",
      v.createdAt ?? "",
      v.updatedAt ?? "",
    ]);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  downloadCSV(`openheart-export-${ts}.csv`, rows.map(toCSVRow));
}
