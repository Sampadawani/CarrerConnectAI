import { Router } from "express";
import Company from "../models/Company.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

const router = Router();

router.get("/mine", authenticate, allowRoles("recruiter", "admin"), async (req, res, next) => {
  try {
    const company = await Company.findOne({ recruiter: req.user.id });
    res.json({ company });
  } catch (error) { next(error); }
});

router.put("/mine", authenticate, allowRoles("recruiter", "admin"), async (req, res, next) => {
  try {
    const allowed = ["name", "website", "location", "about", "industry"];
    if (Object.keys(req.body).some((key) => !allowed.includes(key)) ||
        !["name", "website", "location", "about", "industry"].some((key) => req.body[key] !== undefined)) {
      return res.status(400).json({ message: "Provide company profile fields only." });
    }
    if (Object.values(req.body).some((value) => typeof value !== "string")) return res.status(400).json({ message: "Company profile values must be text." });
    if (req.body.name !== undefined && !req.body.name.trim()) return res.status(400).json({ message: "Company name is required." });
    const updates = { ...req.body };
    const company = await Company.findOneAndUpdate(
      { recruiter: req.user.id },
      { $set: updates, $setOnInsert: { recruiter: req.user.id, name: req.user.company || updates.name } },
      { upsert: true, new: true, runValidators: true }
    );
    if (updates.name) {
      req.user.company = updates.name.trim();
      await req.user.save();
    }
    res.json({ company });
  } catch (error) { next(error); }
});

export default router;
