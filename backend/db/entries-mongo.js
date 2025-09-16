import mongoose from "mongoose";
import Entry from "../models/Entry.js";

function toClient(doc) {
  if (!doc) return null;
  const raw = typeof doc.toObject === "function"
    ? doc.toObject({ getters: false, virtuals: false, versionKey: false })
    : { ...doc };
  const { _id, __v, id: maybeId, ...rest } = raw;
  const id = (maybeId ?? _id)?.toString?.() ?? String(maybeId ?? _id ?? "");
  return { id, ...rest };
}

export async function list(filter = {}) {
  const items = await Entry.find(filter).lean();
  return items.map(({ _id, __v, ...rest }) => ({ id: String(_id), ...rest }));
}

export async function findById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const doc = await Entry.findById(id);
  return toClient(doc);
}

export async function create(data) {
  const created = await Entry.create(data);
  return toClient(created);
}

export async function update(id, patch) {
  if (!mongoose.isValidObjectId(id)) return null;
  const updated = await Entry.findByIdAndUpdate(id, patch, { new: true });
  return toClient(updated);
}

export async function remove(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const deleted = await Entry.findByIdAndDelete(id);
  return toClient(deleted);
}

export async function computeCounts() {
  const pipeline = [
    {
      $group: {
        _id: "$label",
        count: { $sum: 1 }
      }
    }
  ];
  const results = await Entry.aggregate(pipeline);
  const counts = {};
  for (const r of results) {
    counts[r._id] = r.count;
  }
  return counts;
}
