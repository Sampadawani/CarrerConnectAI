import mongoose from "mongoose";

const assessmentResultSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assessmentKey: { type: String, required: true, maxlength: 80 },
    title: { type: String, required: true, maxlength: 160 },
    score: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 1 },
    answers: [{ questionId: String, correct: Boolean }],
    durationSeconds: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

assessmentResultSchema.index({ candidate: 1, createdAt: -1 });
export default mongoose.model("AssessmentResult", assessmentResultSchema);
