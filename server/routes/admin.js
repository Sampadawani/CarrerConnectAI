import { Router } from "express";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import Interview from "../models/Interview.js";
import Category from "../models/Category.js";
import AuditLog from "../models/AuditLog.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { audit } from "../services/audit.js";

const router = Router();
router.use(authenticate, allowRoles("admin"));

router.get("/stats", async (_req, res, next) => {
  try {
    const [users, candidates, recruiters, jobs, activeJobs, applications, shortlisted, hired, interviews] = await Promise.all([
      User.countDocuments({ accountActive: true }),
      User.countDocuments({ role: "candidate", accountActive: true }),
      User.countDocuments({ role: "recruiter", accountActive: true }),
      Job.countDocuments(),
      Job.countDocuments({ status: "active" }),
      Application.countDocuments(),
      Application.countDocuments({ status: "Shortlisted" }),
      Application.countDocuments({ status: "Hired" }),
      Interview.countDocuments(),
    ]);
    res.json({ stats: { users, candidates, recruiters, jobs, activeJobs, applications, shortlisted, hired, interviews } });
  } catch (error) { next(error); }
});

router.get("/users", async (req, res, next) => {
  try {
    const filter = {};
    if (["candidate", "recruiter", "admin"].includes(req.query.role)) filter.role = req.query.role;
    const users = await User.find(filter).select("name email role company accountActive emailVerified recruiterVerified createdAt").sort({ createdAt: -1 }).limit(500);
    res.json({ users });
  } catch (error) { next(error); }
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const allowed = ["accountActive", "recruiterVerified"];
    if (Object.keys(req.body).length !== 1 || !allowed.includes(Object.keys(req.body)[0]) || typeof Object.values(req.body)[0] !== "boolean") {
      return res.status(400).json({ message: "Provide one supported boolean user setting." });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found." });
    if (target.role === "admin") return res.status(403).json({ message: "Admin accounts cannot be changed here." });
    const key = Object.keys(req.body)[0];
    if (key === "recruiterVerified" && target.role !== "recruiter") return res.status(400).json({ message: "Only recruiter accounts can be verified." });
    target[key] = req.body[key];
    await target.save();
    await audit(req.user, `user.${key}`, "User", target.id, String(target[key]));
    res.json({ user: { id: target.id, name: target.name, role: target.role, accountActive: target.accountActive, recruiterVerified: target.recruiterVerified } });
  } catch (error) { next(error); }
});

router.get("/jobs", async (req, res, next) => {
  try {
    const filter = ["active", "closed"].includes(req.query.status) ? { status: req.query.status } : {};
    const jobs = await Job.find(filter).populate("createdBy", "name email company").sort({ createdAt: -1 }).limit(500);
    res.json({ jobs });
  } catch (error) { next(error); }
});

router.patch("/jobs/:id", async (req, res, next) => {
  try {
    if (!["active", "closed"].includes(req.body.status)) return res.status(400).json({ message: "Choose active or closed." });
    const job = await Job.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ message: "Job not found." });
    await audit(req.user, "job.moderated", "Job", job.id, job.status);
    res.json({ job });
  } catch (error) { next(error); }
});

router.get("/categories", async (_req, res, next) => {
  try {
    const [categories, jobs] = await Promise.all([
      Category.find().sort({ name: 1 }),
      Job.distinct("category", { status: "active" }),
    ]);
    const current = new Set(categories.map((category) => category.name));
    res.json({ categories, discovered: jobs.filter((name) => name && !current.has(name)) });
  } catch (error) { next(error); }
});

router.post("/categories", async (req, res, next) => {
  try {
    const { name, skills = [] } = req.body;
    if (typeof name !== "string" || !name.trim() || name.length > 80 || !Array.isArray(skills) || skills.length > 50 || skills.some((skill) => typeof skill !== "string" || skill.length > 50)) {
      return res.status(400).json({ message: "Enter a category name and up to 50 valid skills." });
    }
    const category = await Category.create({ name: name.trim(), skills });
    await audit(req.user, "category.created", "Category", category.id);
    res.status(201).json({ category });
  } catch (error) { next(error); }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found." });
    await audit(req.user, "category.deleted", "Category", category.id);
    res.json({ message: "Category deleted." });
  } catch (error) { next(error); }
});

router.get("/audit", async (_req, res, next) => {
  try {
    const logs = await AuditLog.find().populate("actor", "name email role").sort({ createdAt: -1 }).limit(300);
    res.json({ logs });
  } catch (error) { next(error); }
});

export default router;
