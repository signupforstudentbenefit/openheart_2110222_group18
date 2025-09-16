import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "entries.json");

// Simple write-queue to avoid overlapping writes
let writing = Promise.resolve();

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(DATA_FILE); }
  catch { await fs.writeFile(DATA_FILE, "[]", "utf-8"); }
}

async function readAll() {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try { return JSON.parse(raw); } catch { return []; }
}

async function writeAll(entries) {
  writing = writing.then(async () => {
    const tmp = DATA_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(entries, null, 2), "utf-8");
    await fs.rename(tmp, DATA_FILE);
  });
  return writing;
}

export async function create({ text, label, confidence }) {
  const entries = await readAll();
  const now = new Date().toISOString();
  const e = { id: randomUUID(), text, label, confidence, createdAt: now, updatedAt: now };
  entries.unshift(e);
  await writeAll(entries);
  return e;
}

/**
 * Retrieves a filtered list of entries based on provided criteria.
 *
 * This function reads all entries and filters them according to the optional parameters:
 * - `emotion`: If specified, only entries with a matching `label` are included.
 * - `from`: If specified, only entries with a `createdAt` date greater than or equal to `from` are included.
 * - `to`: If specified, only entries with a `createdAt` date less than or equal to `to` are included.
 *
 * @async
 * @function
 * @param {Object} [options={}] - Filtering options.
 * @param {string} [options.emotion] - The emotion label to filter by.
 * @param {Date|string|number} [options.from] - The start date/time to filter from.
 * @param {Date|string|number} [options.to] - The end date/time to filter to.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of filtered entry objects.
 */
export async function list({ emotion, from, to } = {}) {
  const entries = await readAll();
  return entries.filter(e => {
    if (emotion && e.label !== emotion) return false;
    if (from && e.createdAt < from) return false;
    if (to && e.createdAt > to) return false;
    return true;
  });
}

export async function update(id, patch) {
  const entries = await readAll();
  const i = entries.findIndex(e => e.id === id);
  if (i === -1) return null;
  entries[i] = { ...entries[i], ...patch, updatedAt: new Date().toISOString() };
  await writeAll(entries);
  return entries[i];
}

export async function remove(id) {
  const entries = await readAll();
  const next = entries.filter(e => e.id !== id);
  const changed = next.length !== entries.length;
  if (changed) await writeAll(next);
  return changed;
}
