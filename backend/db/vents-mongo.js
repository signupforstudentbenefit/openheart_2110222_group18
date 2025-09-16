import mongoose from "mongoose";
import Vent from "../models/Vent.js";

// Normalize a Mongoose doc or plain object to client shape: { id, ...fields }
function toClient(doc) {
  if (!doc) return null;
  const raw = typeof doc.toObject === "function"
    ? doc.toObject({ getters: false, virtuals: false, versionKey: false })
    : { ...doc };
  const { _id, __v, id: _maybeId, ...rest } = raw;
  const id = (_maybeId ?? _id)?.toString?.() ?? String(_maybeId ?? _id ?? "");
  return { id, ...rest };
}

export async function list() {
  const items = await Vent.find({}).lean();
  return items.map(({ _id, __v, ...rest }) => ({ id: String(_id), ...rest }));
}

export async function findById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const doc = await Vent.findById(id);
  return toClient(doc);
}

export async function create(data) {
  const created = await Vent.create(data);
  return toClient(created);
}

export async function update(id, patch) {
  if (!mongoose.isValidObjectId(id)) return null;
  const doc = await Vent.findByIdAndUpdate(id, patch, { new: true });
  return toClient(doc);
}

export async function remove(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const deleted = await Vent.findByIdAndDelete(id);
  return toClient(deleted);
}

export async function stats() {
  const labels = ["Happy","Sad","Angry","Worried","Excited","Calm"];
  const items = await Vent.find({}, { label: 1, confidence: 1 }).lean();
  const counts = Object.fromEntries(labels.map(l => [l, 0]));
  const sumConf = Object.fromEntries(labels.map(l => [l, 0]));
  for (const e of items) {
    if (counts[e.label] != null) {
      counts[e.label] += 1;
      if (typeof e.confidence === "number") sumConf[e.label] += e.confidence;
    }
  }
  const avgConfidenceByLabel = Object.fromEntries(labels.map(l => [
    l, counts[l] ? +(sumConf[l] / counts[l]).toFixed(3) : 0
  ]));
  return { total: items.length, countsByLabel: counts, avgConfidenceByLabel };
}
