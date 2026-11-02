import { Router } from "express";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { notifyUserWithWarning } from "../services/notifications.js";
import { audit } from "../services/audit.js";

const router = Router();

router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const query = req.user.role === "candidate"
      ? { candidate: req.user.id }
      : req.user.role === "admin"
        ? {}
        : { job: { $in: (await Job.find({ createdBy: req.user.id }).select("_id")).map((job) => job.id) } };
    const applications = await Application.find(query)
      .populate("job", "title company location mode type status")
      .populate("candidate", "name email title location skills profileVisible")
      .sort({ createdAt: -1 }).limit(200);
    res.json({ applications });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("job", "title company location mode type description createdBy")
      .populate("candidate", "name email title location skills bio education experience projects certifications links profileVisible")
      .populate("history.changedBy", "name role");
    if (!application) return res.status(404).json({ message: "Application not found." });
    const isCandidate = application.candidate.id === req.user.id;
    const isRecruiter = req.user.role === "recruiter" && application.job.createdBy.toString() === req.user.id;
    if (!isCandidate && !isRecruiter && req.user.role !== "admin") return res.status(403).json({ message: "You cannot access this application." });
    res.json({ application });
  } catch (error) { next(error); }
});

router.post("/:jobId", authenticate, allowRoles("candidate"), async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.jobId, status: "active" });
    if (!job) return res.status(404).json({ message: "This job is no longer available." });
    if (await Application.exists({ job: job.id, candidate: req.user.id })) {
      return res.status(409).json({ message: "You have already applied for this role." });
    }
    const application = await Application.create({
      job: job.id,
      candidate: req.user.id,
      history: [{ status: "Applied", changedBy: req.user.id }],
    });
    const warning = await notifyUserWithWarning(job.createdBy, "application", "New application", `A candidate applied for ${job.title}.`, "/dashboard");
    await audit(req.user, "application.created", "Application", application.id);
    res.status(201).json({ application, warning });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already applied for this role." });
    next(error);
  }
});

router.patch("/:id/withdraw", authenticate, allowRoles("candidate"), async (req, res, next) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, candidate: req.user.id });
    if (!application) return res.status(404).json({ message: "Application not found." });
    if (["Hired", "Rejected", "Withdrawn"].includes(application.status)) {
      return res.status(409).json({ message: "This application can no longer be withdrawn." });
    }
    application.status = "Withdrawn";
    application.history.push({ status: "Withdrawn", changedBy: req.user.id });
    await application.save();
    await audit(req.user, "application.withdrawn", "Application", application.id);
    res.json({ application });
  } catch (error) { next(error); }
});

router.patch("/:id/status", authenticate, allowRoles("recruiter", "admin"), async (req, res, next) => {
  try {
    const allowed = ["Screening", "Shortlisted", "Interview Scheduled", "Offered", "Hired", "Rejected"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Choose a valid application status." });
    if (req.body.note !== undefined && (typeof req.body.note !== "string" || req.body.note.length > 1000)) {
      return res.status(400).json({ message: "Feedback must be under 1,000 characters." });
    }
    const application = await Application.findById(req.params.id).populate("job", "createdBy title");
    if (!application) return res.status(404).json({ message: "Application not found." });
    if (req.user.role !== "admin" && application.job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only manage applications for your own jobs." });
    }
    if (["Withdrawn", "Rejected", "Hired"].includes(application.status)) {
      return res.status(409).json({ message: "This application is already closed." });
    }
    application.status = req.body.status;
    if (req.body.note !== undefined) application.note = req.body.note;
    application.history.push({ status: req.body.status, note: application.note, changedBy: req.user.id });
    await application.save();
    const candidate = await User.findById(application.candidate);
    const warning = candidate
      ? await notifyUserWithWarning(candidate, "status", `Application ${req.body.status.toLowerCase()}`, `Your application for ${application.job.title} is now ${req.body.status.toLowerCase()}.`, "/workspace/applications")
      : null;
    await audit(req.user, "application.status_changed", "Application", application.id, req.body.status);
    res.json({ application, warning });
  } catch (error) { next(error); }
});

export default router;
