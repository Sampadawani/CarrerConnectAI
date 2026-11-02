import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    mode: { type: String, enum: ["Remote", "Hybrid", "On-site"], default: "Hybrid" },
    type: { type: String, enum: ["Full-time", "Part-time", "Contract", "Internship"], default: "Full-time" },
    level: { type: String, trim: true, maxlength: 80, default: "Mid-level" },
    salary: { type: String, trim: true, maxlength: 80, default: "" },
    category: { type: String, trim: true, maxlength: 80, default: "Technology" },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    skills: [{ type: String, trim: true, maxlength: 50 }],
    status: { type: String, enum: ["active", "closed"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ title: "text", company: "text", location: "text", skills: "text" });

export default mongoose.model("Job", jobSchema);
