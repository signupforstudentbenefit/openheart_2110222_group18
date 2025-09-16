// backend/db/mongo.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve project root and load .env explicitly so it works under systemd too
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const MONGO_URL = process.env.MONGO_URL; // no silent fallback

export async function connectMongo() {
  if (!MONGO_URL) {
    throw new Error("MONGO_URL is missing. Put it in .env next to where you run `node backend/server.js`");
  }
  try {
    await mongoose.connect(MONGO_URL);
    // hide credentials in logs
    console.log("[MongoDB] Connected:", MONGO_URL.replace(/\/\/.*@/, "//<credentials>@"));
  } catch (err) {
    console.error("[MongoDB] Connection error:", err.message);
    process.exit(1);
  }
}


