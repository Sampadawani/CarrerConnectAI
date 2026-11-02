import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    originalName: { type: String, required: true, maxlength: 255 },
    storedName: { type: String, required: true, select: false },
    size: { type: Number, required: true },
    extractedText: { type: String, select: false, maxlength: 100000 },
  },
  { timestamps: true }
);

export default mongoose.model("Resume", resumeSchema);
