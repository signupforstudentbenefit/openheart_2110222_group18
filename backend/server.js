import express from "express";
import cors from "cors";
import path from "path";
import url from "url";
import dotenv from "dotenv"; // CHANGED: explicit import instead of 'dotenv/config'
import os from "os"; 

import ventsRouter from "./routes/vents.js";
import { fileURLToPath } from "url";
import { aiDiag } from "./services/ai.js";
import entriesRouter from "./routes/entries.js";
import { connectMongo } from "./db/mongo.js";


// --- add this near the top (after imports) ---
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Helpful: catch process-level errors too
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});




await connectMongo();

const app = express();

// --- ESM __dirname / __filename ---
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// --- Load .env from project root (../.env) ---
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// middleware
app.use(cors());
app.use(express.json());

// static (serve frontend)
app.use(express.static(path.join(__dirname, "..", "frontend")));

// health
app.get("/api/health/ai", (_req, res) => {
  res.json(aiDiag());
});
app.get("/api/health/ping", (_req,res)=>res.json({ok:true})); 

// API routes
app.use("/api/vents", ventsRouter);
app.use("/api/entries", entriesRouter);

// request log
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`, req.body || {});
  next();
});

const PORT = process.env.PORT || 3000;
const HOST = (process.env.HOST && !['localhost','127.0.0.1'].includes(process.env.HOST))
  ? process.env.HOST
  : '0.0.0.0';

// --- global error handler (keep this AFTER all routes) ---
app.use((err, req, res, _next) => {
  // show route + method and a compact stack
  console.error(`[ERR] ${req.method} ${req.originalUrl}`, err && err.stack || err);

  const status = err.status || err.statusCode || 500;
  const msg = err.message || "Internal Server Error";
  res.status(status).json({ error: msg });
});

// server.js (or wherever you call app.listen)

app.listen(PORT, HOST, () =>
  console.log(`[OpenHeart] listening on http://${HOST}:${PORT}`)
);
// helper to print LAN URLs
function logLanUrls(port) {
  const nets = os.networkInterfaces();
  Object.values(nets).flat().forEach(n => {
    if (n && n.family === "IPv4" && !n.internal) {
      console.log(`LAN:  http://${n.address}:${port}`);
    }
  });
}
