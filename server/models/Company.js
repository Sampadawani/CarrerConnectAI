import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    website: { type: String, trim: true, maxlength: 500, default: "" },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    about: { type: String, trim: true, maxlength: 3000, default: "" },
    industry: { type: String, trim: true, maxlength: 120, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
