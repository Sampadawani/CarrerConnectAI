import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: ["Open", "Reviewing", "Resolved", "Dismissed"], default: "Open" },
    adminNote: { type: String, maxlength: 2000, default: "" },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
export default mongoose.model("Report", reportSchema);
