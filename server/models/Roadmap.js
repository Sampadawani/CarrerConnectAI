import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, maxlength: 1000, default: "" },
    resources: [{ type: String, maxlength: 500 }],
    completedAt: { type: Date, default: null },
  },
  { _id: true }
);

const roadmapSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    goal: { type: String, required: true, maxlength: 100 },
    milestones: [milestoneSchema],
  },
  { timestamps: true }
);

roadmapSchema.index({ candidate: 1, goal: 1 }, { unique: true });
export default mongoose.model("Roadmap", roadmapSchema);
