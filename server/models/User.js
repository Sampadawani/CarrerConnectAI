import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0 },
    role: { type: String, enum: ["candidate", "recruiter", "admin"], default: "candidate" },
    title: { type: String, trim: true, maxlength: 120, default: "" },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    skills: [{ type: String, trim: true, maxlength: 50 }],
    bio: { type: String, trim: true, maxlength: 1000, default: "" },
    careerObjective: { type: String, trim: true, maxlength: 1000, default: "" },
    company: { type: String, trim: true, maxlength: 120, default: "" },
    education: [{ school: { type: String, maxlength: 160 }, degree: { type: String, maxlength: 120 }, year: { type: String, maxlength: 20 } }],
    experience: [{ company: { type: String, maxlength: 160 }, title: { type: String, maxlength: 120 }, start: { type: String, maxlength: 20 }, end: { type: String, maxlength: 20 }, description: { type: String, maxlength: 1000 } }],
    projects: [{ title: { type: String, maxlength: 120 }, description: { type: String, maxlength: 1000 }, url: { type: String, maxlength: 500 } }],
    certifications: [{ name: { type: String, maxlength: 160 }, issuer: { type: String, maxlength: 160 }, year: { type: String, maxlength: 20 } }],
    links: { linkedin: { type: String, maxlength: 500 }, github: { type: String, maxlength: 500 }, portfolio: { type: String, maxlength: 500 } },
    preferredLocations: [{ type: String, trim: true, maxlength: 120 }],
    preferredWorkModes: [{ type: String, enum: ["Remote", "Hybrid", "On-site"] }],
    careerInterests: [{ type: String, trim: true, maxlength: 100 }],
    salaryMinimum: { type: Number, min: 0, default: null },
    salaryMaximum: { type: Number, min: 0, default: null },
    profileVisible: { type: Boolean, default: true },
    accountActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    recruiterVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, select: false },
    verificationExpires: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
    notificationPreferences: {
      applications: { type: Boolean, default: true },
      interviews: { type: Boolean, default: true },
      recommendations: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
