import mongoose from "mongoose";

const entrySchema = new mongoose.Schema({
  text: { type: String, required: true },
  label: { type: String, enum: ["Happy","Sad","Angry","Worried","Excited","Calm"], required: true },
  confidence: { type: Number, min: 0, max: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Entry", entrySchema);
