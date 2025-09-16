import { Router } from "express";
import * as DB from "../db/entries-mongo.js";
import { classifyEmotion } from "../services/ai.js";
import { computeCounts } from "../db/entries-mongo.js";


const KEYS = ["Happy","Sad","Angry","Worried","Excited","Calm"];
function normalizeStats(countsByLabel) {
  const out = {};
  for (const k of KEYS) out[k] = countsByLabel[k] || 0;
  return out;
}

const r = Router();

// CREATE new tracker entry (auto classify)
// helper: try AI classify but don't crash if unavailable
async function safeClassify(text) {
  try {
    const r = await classifyEmotion(text);
    if (r && r.label) return r; // {label, confidence}
  } catch (e) {
    console.error("[AI classify failed]", e?.message || e);
  }
  return null;
}

// CREATE new tracker entry (auto classify if possible)

// TEMP: no AI — just save with a fallback label so it never 500s here
r.post("/", async (req, res) => {
  try {
    const text = String(req.body?.text ?? "").trim();
    if (!text) return res.status(400).json({ error: "Text required" });

    // allow client-supplied label, else fallback
    const label = String(req.body?.label ?? "Unlabeled");
    const confidence = Number(req.body?.confidence ?? 0);

    const doc = await DB.create({ text, label, confidence });
    res.status(201).json(doc);
  } catch (e) {
    console.error("POST /api/entries error:", e);
    res.status(500).json({ error: "Server error" });
  }
});


// LIST
r.get("/", async (req, res) => {
  const type = req.query?.type;
  const items = await DB.list(type ? { type } : {});
  res.json(items);
});

// GET /api/entries/stats
r.get("/stats", async (req, res) => {
  try {
    const raw = await computeCounts(); // your count logic
    const countsByLabel = normalizeStats(raw); // optional
    const total = Object.values(countsByLabel).reduce((a, b) => a + b, 0);
    res.json({ countsByLabel, total });
  } catch (e) {
    console.error("[/stats error]", e);
    res.status(500).json({ error: "Failed to load stats" });
  }
});


// GET by id
r.get("/:id", async (req, res) => {
  const doc = await DB.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Entry not found" });
  res.json(doc);
});

// UPDATE (PATCH)
r.patch("/:id", async (req, res) => {
  const patch = req.body || {};
  const doc = await DB.update(req.params.id, patch);
  if (!doc) return res.status(404).json({ error: "Entry not found" });
  res.json(doc);
});

// DELETE
r.delete("/:id", async (req, res) => {
  const deleted = await DB.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Entry not found" });
  res.sendStatus(204);
});

// STATS
r.get("/stats", async (_req, res) => {
  const items = await DB.list();
  const counts = Object.fromEntries(KEYS.map(l => [l, 0]));
  const sum = Object.fromEntries(KEYS.map(l => [l, 0]));
  for (const e of items) {
    if (counts[e.label] != null) {
      counts[e.label]++;
      if (typeof e.confidence === "number") sum[e.label] += e.confidence;
    }
  }
  const avgConfidenceByLabel = Object.fromEntries(KEYS.map(l => [
    l, counts[l] ? +(sum[l] / counts[l]).toFixed(3) : 0
  ]));
  res.json({ total: items.length, countsByLabel: counts, avgConfidenceByLabel });
});

export default r;


const EntrySchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    label: { type: String, default: "Unlabeled" },
    confidence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Entry = mongoose.models.Entry || mongoose.model("Entry", EntrySchema);

export async function create({ text, label, confidence }) {
  return await Entry.create({ text, label, confidence });
}

export async function list({ limit = 50 } = {}) {
  return await Entry.find().sort({ createdAt: -1 }).limit(limit).lean();
}