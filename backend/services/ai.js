// backend/services/ai.js
// Provider-agnostic emotion classification with robust JSON parsing

const LABELS = [ "Happy","Sad","Angry","Worried","Excited","Calm"];

function toTitle(s){ return String(s||"").toLowerCase().replace(/\b\w/g,m=>m.toUpperCase()); }
function clamp01(x){ x = Number(x); return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0; }


async function classifyWithGemini(text){
  const MODEL  = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const URL    = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const key    = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) throw new Error("Missing GEMINI_API_KEY");

  const body = {
    contents: [
      { role: "user", parts: [{ text:
        [
          "You are an expert emotion classifier. Return STRICT JSON ONLY, no preface, no code fences.",
          `Allowed labels: ${LABELS.join(", ")}.`,
          "Respond in this schema: {\"label\":\"<OneOfLabels>\",\"confidence\":0..1}.",
          "",
          "CONFIDENCE ASSESSMENT GUIDELINES:",
          "• 0.90-1.00: Very clear, explicit emotional language (e.g., 'I am extremely happy', 'I feel terrible')",
          "• 0.75-0.89: Strong emotional indicators (e.g., 'Great day!', 'This is awful')",
          "• 0.60-0.74: Moderate emotional cues (e.g., 'Pretty good', 'Not bad')",
          "• 0.40-0.59: Subtle or mixed emotions (e.g., 'It's okay', 'Things happened')",
          "• 0.20-0.39: Ambiguous or neutral text (e.g., 'Today was a day')",
          "• 0.05-0.19: Very unclear or factual statements only",
          "",
          "Consider: emotional intensity, explicit feeling words, context clues, exclamation marks, and text length.",
          "Be realistic - most casual text should be 0.60-0.80 confidence range.",
          "",
          "Text to classify: <<<",
          String(text).slice(0, 2000),
          ">>>"
        ].join("\n")
      } ] }
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 128 }
  };

  const r = await fetch(`${URL}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000)
  });
  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  let parsed;
  try { parsed = JSON.parse(txt); } catch { parsed = {}; }
  let label = toTitle(parsed.label);
  if (!LABELS.includes(label)) throw new Error(`Invalid label from Gemini: ${parsed.label}`);
  const confidence = clamp01(parsed.confidence ?? 0.0);
  return { label, confidence };
}

async function classifyWithOpenAI(text){
  const key   = (process.env.OPENAI_API_KEY || "").trim();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: "You are an expert emotion classifier. Output STRICT JSON only." },
        { role: "user", content: [
          `Allowed labels: ${LABELS.join(", ")}.`,
          "Schema: {\"label\":\"<OneOfLabels>\",\"confidence\":0..1}.",
          "",
          "CONFIDENCE GUIDELINES:",
          "• 0.90-1.00: Very clear emotional language",
          "• 0.75-0.89: Strong emotional indicators", 
          "• 0.60-0.74: Moderate emotional cues",
          "• 0.40-0.59: Subtle or mixed emotions",
          "• 0.20-0.39: Ambiguous or neutral text",
          "• 0.05-0.19: Very unclear or factual only",
          "",
          "Be realistic with confidence assessment.",
          "",
          "Text: <<<",
          String(text).slice(0,2000),
          ">>>"
        ].join("\n") }
      ]
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const txt = data?.choices?.[0]?.message?.content || "";
  let parsed;
  try { parsed = JSON.parse(txt); } catch { parsed = {}; }
  let label = toTitle(parsed.label);
  if (!LABELS.includes(label)) throw new Error(`Invalid label from OpenAI: ${parsed.label}`);
  const confidence = clamp01(parsed.confidence ?? 0.0);
  return { label, confidence };
}

export async function classifyEmotion(text){
  const t = (text || "").trim();
  if (!t) return { label: "Calm", confidence: 0.0 };

  const provider = (process.env.AI_PROVIDER || "").toLowerCase();

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return await classifyWithOpenAI(t);
  }

  if ((provider === "gemini" || !provider) && process.env.GEMINI_API_KEY) {
    return await classifyWithGemini(t);
  }

  throw new Error("No AI provider available (missing API keys or config)");
}

export const LABELS_CONST = LABELS;

export async function summarizeVent(text) {
  const t = String(text || "").slice(0, 6000); // safety
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();

  const prompt = [
    "Summarize the user's story in a neutral, nonjudgmental tone.",
    "Do NOT give advice. Do NOT evaluate. Use first person “they” to refer to the author.",
    "Be concise (2–4 sentences). Output STRICT JSON ONLY like: {\"summary\":\"...\"}.",
    "Story: <<<", t, ">>>"
  ].join("\n");

  async function viaGemini() {
    const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const key = (process.env.GEMINI_API_KEY || "").trim();
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const body = { contents: [{ role: "user", parts: [{ text: prompt }]}], generationConfig: { temperature: 0.2, maxOutputTokens: 256 } };
    const r = await fetch(`${URL}?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    try { return JSON.parse(txt).summary || ""; } catch { return ""; }
  }

  async function viaOpenAI() {
    const key = (process.env.OPENAI_API_KEY || "").trim();
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    if (!key) throw new Error("Missing OPENAI_API_KEY");
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.2, messages: [
        { role: "system", content: "You summarize neutrally. Output STRICT JSON only." },
        { role: "user", content: prompt }
      ] }),
      signal: AbortSignal.timeout(12000)
    });
    if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const txt = data?.choices?.[0]?.message?.content || "{}";
    try { return JSON.parse(txt).summary || ""; } catch { return ""; }
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return await viaOpenAI();
  }

  if ((provider === "gemini" || !provider) && process.env.GEMINI_API_KEY) {
    return await viaGemini();
  }

  throw new Error("No AI provider available for summarizeVent");
}

export function aiDiag() {
  const has = (k) => !!String(process.env[k] || "").trim();
  return {
    provider: (process.env.AI_PROVIDER || "").toLowerCase() || "(unset)",
    hasGemini: has("GEMINI_API_KEY"),
    hasOpenAI: has("OPENAI_API_KEY"),
    geminiModel: process.env.GEMINI_MODEL || "(default)",
    openaiModel: process.env.OPENAI_MODEL || "(default)"
  };
}
