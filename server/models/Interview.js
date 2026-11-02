import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scheduledAt: { type: Date, required: true },
    format: { type: String, enum: ["Online", "In person"], required: true },
    meetingLink: { type: String, maxlength: 500, default: "" },
    location: { type: String, maxlength: 250, default: "" },
    instructions: { type: String, maxlength: 2000, default: "" },
    status: { type: String, enum: ["Scheduled", "Completed", "Cancelled"], default: "Scheduled" },
    feedback: { type: String, maxlength: 2000, default: "" },
  },
  { timestamps: true }
);

interviewSchema.index({ candidate: 1, scheduledAt: 1 });
interviewSchema.index({ recruiter: 1, scheduledAt: 1 });
export default mongoose.model("Interview", interviewSchema);
