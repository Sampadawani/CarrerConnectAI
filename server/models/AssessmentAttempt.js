import mongoose from "mongoose";

const assessmentAttemptSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assessmentKey: { type: String, required: true, maxlength: 80 },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

assessmentAttemptSchema.index({ candidate: 1, assessmentKey: 1, startedAt: -1 });
export default mongoose.model("AssessmentAttempt", assessmentAttemptSchema);
