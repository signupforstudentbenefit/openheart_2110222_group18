import mongoose from "mongoose";

const ventSchema = new mongoose.Schema({
  text: { type: String, required: true },
  label: { type: String, enum: ["Happy","Sad","Angry","Worried","Excited","Calm"], required: true },
  confidence: { type: Number, min: 0, max: 1 },
  summary: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Vent", ventSchema);
