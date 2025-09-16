import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "vents.json");

let writing = Promise.resolve();

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(DATA_FILE); }
  catch { await fs.writeFile(DATA_FILE, "[]", "utf-8"); }
}
async function readAll() { await ensureFile(); return JSON.parse(await fs.readFile(DATA_FILE, "utf-8")); }
async function writeAll(arr) {
  writing = writing.then(async () => {
    const tmp = DATA_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(arr, null, 2), "utf-8");
    await fs.rename(tmp, DATA_FILE);
  });
  return writing;
}

export async function list() { return readAll(); }
export async function create({ text, label, confidence, summary }) {
  const items = await readAll();
  const now = new Date().toISOString();
  const e = { id: randomUUID(), text, label, confidence, summary, createdAt: now, updatedAt: now };
  items.unshift(e);
  await writeAll(items);
  return e;
}
export async function update(id, patch) {
  const items = await readAll();
  const i = items.findIndex(e => e.id === id);
  if (i === -1) return null;
  items[i] = { ...items[i], ...patch, updatedAt: new Date().toISOString() };
  await writeAll(items);
  return items[i];
}
export async function remove(id) {
  const items = await readAll();
  const next = items.filter(e => e.id !== id);
  const changed = next.length !== items.length;
  if (changed) await writeAll(next);
  return changed;
}
