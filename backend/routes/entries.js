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
r.post("/", async (req, res) => {
  try {
    const text = String(req.body?.text ?? "").trim();
    if (!text) return res.status(400).json({ error: "Text is required" });

    let { label, confidence } = req.body || {};

    if (!label) {
      const haveAI = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
      if (haveAI) {
        try {
          ({ label, confidence } = await classifyEmotion(text));
        } catch (e) {
          console.error("[AI classify failed]", e?.message || e);
          return res.status(503).json({ error: "AI unavailable" });
        }
      } else {
        // Fallback when AI is disabled: store with a safe default label
        label = "Calm";
        confidence = 0.0;
      }
    }

    if (!label) return res.status(400).json({ error: "Label is required" });

    const doc = await DB.create({ text, label, confidence });
    return res.status(201).json(doc);
  } catch (e) {
    console.error("POST /api/entries error:", e.stack || e);
    return res.status(500).json({ error: "Server error" });
  }
});
r.post("/classify", async (req, res) => {
  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Text required" });

  try {
    const result = await classifyEmotion(text);
    if (!result?.label) throw new Error("Empty label");
    res.json(result);
  } catch (e) {
    console.error("[LLM error]", e); // <---- ADD THIS IF MISSING
    res.status(503).json({ error: "AI unavailable" });
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
