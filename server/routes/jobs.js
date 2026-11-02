import { Router } from "express";
import Job from "../models/Job.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { notifyMatchingCandidates } from "../services/jobNotifications.js";

const router = Router();

async function matchingNotificationWarning(job) {
  try {
    await notifyMatchingCandidates(job);
    return null;
  } catch (error) {
    console.error("Could not save job-match notifications:", error);
    return "The role was saved, but matching-candidate notifications could not be created.";
  }
}

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const filter = { status: "active" };
    for (const key of ["search", "mode", "category", "type", "level", "location", "sort"]) {
      if (req.query[key] !== undefined && typeof req.query[key] !== "string") {
        return res.status(400).json({ message: `Query parameter "${key}" must be a single value.` });
      }
    }
    const search = req.query.search?.trim();
    if (search && search.length > 200) return res.status(400).json({ message: "Search must be 200 characters or fewer." });
    if (req.query.mode && !["Remote", "Hybrid", "On-site"].includes(req.query.mode)) {
      return res.status(400).json({ message: "Choose a valid work style." });
    }
    if (req.query.sort && !["newest", "oldest"].includes(req.query.sort)) return res.status(400).json({ message: "Choose newest or oldest sorting." });
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["title", "company", "location", "skills"].map((field) => ({ [field]: { $regex: escaped, $options: "i" } }));
    }
    if (req.query.mode) filter.mode = req.query.mode;
    for (const key of ["category", "type", "level"]) {
      if (req.query[key]) {
        if (req.query[key].length > 100) return res.status(400).json({ message: `Filter "${key}" is too long.` });
        filter[key] = req.query[key];
      }
    }
    if (req.query.location) {
      if (req.query.location.length > 120) return res.status(400).json({ message: "Location is too long." });
      filter.location = { $regex: req.query.location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }
    const [jobs, total] = await Promise.all([
      Job.find(filter).populate("createdBy", "name").sort({ createdAt: req.query.sort === "oldest" ? 1 : -1 }).skip((page - 1) * limit).limit(limit),
      Job.countDocuments(filter),
    ]);
    res.json({ jobs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await Job.distinct("category", { status: "active" });
    res.json({ categories: categories.filter(Boolean).sort() });
  } catch (error) { next(error); }
});

router.get("/mine", authenticate, allowRoles("recruiter", "admin"), async (req, res, next) => {
  try {
    const jobs = await Job.find(req.user.role === "admin" ? {} : { createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, status: "active" }).populate("createdBy", "name company");
    if (!job) return res.status(404).json({ message: "This job is no longer available." });
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, allowRoles("recruiter", "admin"), async (req, res, next) => {
  try {
    const { title, company, location, description } = req.body;
    if (![title, company, location, description].every((value) => typeof value === "string" && value.trim())) {
      return res.status(400).json({ message: "Job title, company, location and description are required." });
    }
    const job = await Job.create({
      mode: req.body.mode,
      type: req.body.type,
      level: req.body.level,
      salary: req.body.salary,
      category: req.body.category,
      skills: req.body.skills,
      title: title.trim(),
      company: req.user.role === "recruiter" ? req.user.company : company.trim(),
      location: location.trim(),
      description: description.trim(),
      createdBy: req.user.id,
    });
    const warning = await matchingNotificationWarning(job);
    res.status(201).json({ job, warning });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", authenticate, allowRoles("recruiter", "admin"), async (req, res, next) => {
  try {
    const editable = ["title", "company", "location", "mode", "type", "level", "salary", "category", "description", "skills", "status"];
    const updates = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (!editable.includes(key)) return res.status(400).json({ message: `Job field "${key}" cannot be updated.` });
      updates[key] = value;
    }
    if (req.user.role === "recruiter" && updates.company !== undefined) {
      updates.company = req.user.company;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: "Add at least one field to update." });
    const filter = req.user.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user.id };
    const job = await Job.findOneAndUpdate(filter, updates, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ message: "Job not found or you do not have access to it." });
    const warning = job.status === "active" && updates.status === "active"
      ? await matchingNotificationWarning(job)
      : null;
    res.json({ job, warning });
  } catch (error) {
    next(error);
  }
});

export default router;
