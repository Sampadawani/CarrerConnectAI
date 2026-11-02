import { Router } from "express";
import Report from "../models/Report.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { audit } from "../services/audit.js";

const router = Router();

router.post("/", authenticate, async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (typeof subject !== "string" || !subject.trim() || subject.length > 160 || typeof message !== "string" || !message.trim() || message.length > 3000) {
      return res.status(400).json({ message: "Enter a subject and a description under 3,000 characters." });
    }
    const report = await Report.create({ reporter: req.user.id, subject: subject.trim(), message: message.trim() });
    res.status(201).json({ report: { id: report.id, subject: report.subject, status: report.status, createdAt: report.createdAt } });
  } catch (error) { next(error); }
});

router.get("/", authenticate, allowRoles("admin"), async (_req, res, next) => {
  try {
    const reports = await Report.find().populate("reporter", "name email role").sort({ createdAt: -1 }).limit(300);
    res.json({ reports });
  } catch (error) { next(error); }
});

router.patch("/:id", authenticate, allowRoles("admin"), async (req, res, next) => {
  try {
    const allowedStatuses = ["Open", "Reviewing", "Resolved", "Dismissed"];
    if (!allowedStatuses.includes(req.body.status) ||
        (req.body.adminNote !== undefined && (typeof req.body.adminNote !== "string" || req.body.adminNote.length > 2000))) {
      return res.status(400).json({ message: "Provide a valid report status and optional note." });
    }
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, ...(req.body.adminNote === undefined ? {} : { adminNote: req.body.adminNote }) },
      { new: true, runValidators: true }
    );
    if (!report) return res.status(404).json({ message: "Report not found." });
    await audit(req.user, "report.updated", "Report", report.id, req.body.status);
    res.json({ report });
  } catch (error) { next(error); }
});

export default router;
