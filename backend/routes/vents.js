import { Router } from "express";
import * as DB from "../db/vents-mongo.js";
import { classifyEmotion, summarizeVent } from "../services/ai.js";

const r = Router();
r.post("/", async (req, res) => {
  try {
    const text = String(req.body?.text ?? "").trim();
    if (!text) return res.status(400).json({ error: "Text is required" });

    let { label, confidence } = req.body || {};
    label = typeof label === "string" ? label.trim() : label;

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
        // Fallback when AI is disabled
        label = "Calm";
        confidence = 0.0;
      }
    }

    // Optional: try summarization when AI is available; don't fail if it errors
    let summary = "";
    try {
      if (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) {
        summary = await summarizeVent(text);
      }
    } catch (e) {
      console.warn("[AI summarize failed]", e?.message || e);
    }

    if (!label) return res.status(400).json({ error: "Label is required" });

    const doc = await DB.create({ text, label, confidence, summary });
    return res.status(201).json(doc);
  } catch (e) {
    console.error("POST /api/vents error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// LIST
r.get("/", async (_req, res) => {
  const items = await DB.list();
  res.json(items);
});

// GET by id
r.get("/:id", async (req, res) => {
  const doc = await DB.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Vent not found" });
  res.json(doc);
});

// UPDATE
r.patch("/:id", async (req, res) => {
  const patch = req.body || {};
  const doc = await DB.update(req.params.id, patch);
  if (!doc) return res.status(404).json({ error: "Vent not found" });
  res.json(doc);
});

// DELETE
r.delete("/:id", async (req, res) => {
  const deleted = await DB.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Vent not found" });
  res.sendStatus(204);
});

// Stats
r.get("/stats/summary", async (_req, res) => {
  const data = await DB.stats();
  res.json(data);
});

export default r;
