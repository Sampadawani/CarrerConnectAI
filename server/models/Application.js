import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["Applied", "Screening", "Shortlisted", "Interview Scheduled", "Offered", "Hired", "Rejected", "Withdrawn"],
      default: "Applied",
    },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    history: [{
      status: { type: String, required: true },
      note: { type: String, maxlength: 1000, default: "" },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      changedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

export default mongoose.model("Application", applicationSchema);
