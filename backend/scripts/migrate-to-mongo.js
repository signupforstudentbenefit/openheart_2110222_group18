// scripts/migrate-to-mongo.js
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import url from "url";

import Entry from "../backend/models/Entry.js";
import Vent from "../backend/models/Vent.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../backend/data");

// 1. connect to Mongo
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/openheart";
await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
console.log("[MongoDB] Connected:", MONGO_URL);

// 2. read JSON files
const entriesPath = path.join(DATA_DIR, "entries.json");
const ventsPath = path.join(DATA_DIR, "vents.json");

const entries = JSON.parse(fs.readFileSync(entriesPath, "utf-8"));
const vents = JSON.parse(fs.readFileSync(ventsPath, "utf-8"));

// 3. insert into collections
if (entries.length) {
  await Entry.insertMany(entries);
  console.log(`Migrated ${entries.length} entries`);
}
if (vents.length) {
  await Vent.insertMany(vents);
  console.log(`Migrated ${vents.length} vents`);
}

console.log("✅ Migration done");
process.exit(0);
