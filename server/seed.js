import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Job from "./models/Job.js";
import Category from "./models/Category.js";

if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI before running the seed script.");
await mongoose.connect(process.env.MONGODB_URI);
const accounts = [
  { name: "CareerConnect Demo", email: "hello@careerconnect.demo", role: "recruiter", company: "Northstar Studio", password: "CareerConnectDemo2026", recruiterVerified: true },
  { name: "Jordan Lee", email: "candidate@careerconnect.demo", role: "candidate", title: "Frontend developer", location: "Bengaluru, India", skills: ["React", "TypeScript", "Accessibility"], password: "CareerConnectDemo2026" },
  { name: "Platform Admin", email: "admin@careerconnect.demo", role: "admin", password: "CareerConnectDemo2026" },
];
const users = {};
for (const account of accounts) {
  let user = await User.findOne({ email: account.email });
  if (!user) {
    user = await User.create({
      ...account,
      emailVerified: true,
      password: await bcrypt.hash(account.password, 12),
    });
  }
  users[account.role] = user;
}
const recruiter = users.recruiter;

const samples = [
  {
    title: "Product Designer",
    company: "Northstar Studio",
    location: "Bengaluru, India",
    mode: "Hybrid",
    type: "Full-time",
    level: "Mid-level",
    salary: "₹12–18 LPA",
    category: "Design",
    description: "Shape thoughtful product experiences with a close-knit design and engineering team. You will own discovery, interaction design and polished handoffs from concept through launch.",
    skills: ["Figma", "Product thinking", "Prototyping"],
  },
  {
    title: "Frontend Engineer",
    company: "Layer Labs",
    location: "Remote, India",
    mode: "Remote",
    type: "Full-time",
    level: "Mid-level",
    salary: "₹16–24 LPA",
    category: "Engineering",
    description: "Build fast, accessible interfaces for products used by teams around the world. Work across React, design systems and the complete product delivery lifecycle.",
    skills: ["React", "TypeScript", "Accessibility"],
  },
  {
    title: "Data Analyst Intern",
    company: "Goodwell",
    location: "Pune, India",
    mode: "On-site",
    type: "Internship",
    level: "Entry-level",
    salary: "₹25–35k / month",
    category: "Data",
    description: "Turn complex business questions into clear, actionable insights. Partner with product and operations teams to build dashboards and communicate findings.",
    skills: ["SQL", "Python", "Data visualization"],
  },
];

for (const sample of samples) {
  await Job.updateOne(
    { title: sample.title, company: sample.company, sample: true },
    { $setOnInsert: { ...sample, createdBy: recruiter.id, sample: true } },
    { upsert: true }
  );
}
const categories = ["Design", "Engineering", "Data", "People"];
for (const name of categories) {
  await Category.updateOne({ name }, { $setOnInsert: { name, skills: [] } }, { upsert: true });
}
console.log("Added sample jobs and categories (rerunnable without overwriting existing records).");
console.log("Local demo accounts (password for all: CareerConnectDemo2026):");
console.log("  Candidate: candidate@careerconnect.demo");
console.log("  Recruiter: hello@careerconnect.demo");
console.log("  Admin:     admin@careerconnect.demo");
console.log("Change or remove demo accounts before using a shared or production database.");
await mongoose.disconnect();
