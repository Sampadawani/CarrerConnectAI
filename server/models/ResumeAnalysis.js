import mongoose from "mongoose";

const resumeAnalysisSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
    score: { type: Number, required: true, min: 0, max: 100 },
    matchedSkills: [String],
    missingSkills: [String],
    suggestions: [String],
    checks: [{ label: String, passed: Boolean, detail: String }],
    method: { type: String, default: "Explainable keyword overlap; not generative AI." },
  },
  { timestamps: true }
);

resumeAnalysisSchema.index({ candidate: 1, createdAt: -1 });
export default mongoose.model("ResumeAnalysis", resumeAnalysisSchema);
