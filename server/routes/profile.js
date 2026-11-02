import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/auth.js";

const router = Router();

router.patch("/", authenticate, allowRoles("candidate"), async (req, res, next) => {
  try {
    const allowed = ["name", "title", "location", "skills", "bio", "careerObjective", "education", "experience", "projects", "certifications", "links", "profileVisible", "notificationPreferences", "preferredLocations", "preferredWorkModes", "careerInterests", "salaryMinimum", "salaryMaximum"];
    if (Object.keys(req.body).length === 0) return res.status(400).json({ message: "Add at least one profile field to update." });
    for (const key of Object.keys(req.body)) {
      if (!allowed.includes(key)) return res.status(400).json({ message: `Profile field "${key}" cannot be updated here.` });
    }
    if (req.body.name !== undefined && (typeof req.body.name !== "string" || !req.body.name.trim() || req.body.name.length > 100)) {
      return res.status(400).json({ message: "Name is required and must be under 100 characters." });
    }
    if (req.body.skills !== undefined && (!Array.isArray(req.body.skills) || req.body.skills.length > 40 || req.body.skills.some((skill) => typeof skill !== "string" || skill.length > 50))) {
      return res.status(400).json({ message: "Skills must be a list of up to 40 items." });
    }
    if (req.body.title !== undefined && (typeof req.body.title !== "string" || req.body.title.length > 120)) return res.status(400).json({ message: "Headline must be under 120 characters." });
    if (req.body.location !== undefined && (typeof req.body.location !== "string" || req.body.location.length > 120)) return res.status(400).json({ message: "Location must be under 120 characters." });
    if (req.body.bio !== undefined && (typeof req.body.bio !== "string" || req.body.bio.length > 1000)) return res.status(400).json({ message: "About you must be under 1,000 characters." });
    if (req.body.careerObjective !== undefined && (typeof req.body.careerObjective !== "string" || req.body.careerObjective.length > 1000)) return res.status(400).json({ message: "Career objective must be under 1,000 characters." });
    if (req.body.profileVisible !== undefined && typeof req.body.profileVisible !== "boolean") return res.status(400).json({ message: "Profile visibility must be a boolean." });
    for (const key of ["education", "experience", "projects", "certifications"]) {
      if (req.body[key] !== undefined && (!Array.isArray(req.body[key]) || req.body[key].length > 30 || req.body[key].some((item) => !item || typeof item !== "object" || Array.isArray(item)))) {
        return res.status(400).json({ message: `${key} must be a list of up to 30 entries.` });
      }
    }
    if (req.body.links !== undefined && (!req.body.links || typeof req.body.links !== "object" || Array.isArray(req.body.links) ||
      Object.keys(req.body.links).some((key) => !["linkedin", "github", "portfolio"].includes(key)) ||
      Object.values(req.body.links).some((url) => typeof url !== "string" || url.length > 500))) {
      return res.status(400).json({ message: "Provide valid LinkedIn, GitHub, or portfolio links." });
    }
    if (req.body.notificationPreferences !== undefined && (!req.body.notificationPreferences || typeof req.body.notificationPreferences !== "object" || Array.isArray(req.body.notificationPreferences) ||
      Object.keys(req.body.notificationPreferences).some((key) => !["applications", "interviews", "recommendations"].includes(key)) ||
      Object.values(req.body.notificationPreferences).some((value) => typeof value !== "boolean"))) {
      return res.status(400).json({ message: "Notification preferences must use supported boolean settings." });
    }
    for (const key of ["preferredLocations", "preferredWorkModes", "careerInterests"]) {
      if (req.body[key] !== undefined && (!Array.isArray(req.body[key]) || req.body[key].length > 20 || req.body[key].some((value) => typeof value !== "string" || value.length > 120))) {
        return res.status(400).json({ message: `${key} must be a list of up to 20 text values.` });
      }
    }
    if (req.body.preferredWorkModes?.some((mode) => !["Remote", "Hybrid", "On-site"].includes(mode))) return res.status(400).json({ message: "Choose valid preferred work modes." });
    for (const key of ["salaryMinimum", "salaryMaximum"]) {
      if (req.body[key] !== undefined && req.body[key] !== null && (!Number.isFinite(req.body[key]) || req.body[key] < 0 || req.body[key] > 1000000000)) {
        return res.status(400).json({ message: "Salary preferences must be non-negative numbers." });
      }
    }
    if (req.body.salaryMinimum != null && req.body.salaryMaximum != null && req.body.salaryMinimum > req.body.salaryMaximum) {
      return res.status(400).json({ message: "Minimum salary cannot exceed maximum salary." });
    }
    Object.assign(req.user, req.body);
    await req.user.save();
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
});

export default router;
