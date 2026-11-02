import { Router } from "express";
import Interview from "../models/Interview.js";
import Application from "../models/Application.js";
import User from "../models/User.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { notifyUserWithWarning } from "../services/notifications.js";
import { audit } from "../services/audit.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const filter = req.user.role === "admin"
      ? {}
      : req.user.role === "recruiter"
        ? { recruiter: req.user.id }
        : { candidate: req.user.id };
    const interviews = await Interview.find(filter)
      .populate("application", "status")
      .populate("candidate", "name email")
      .populate("recruiter", "name company")
      .sort({ scheduledAt: 1 });
    res.json({ interviews });
  } catch (error) { next(error); }
});

router.post("/", allowRoles("recruiter", "admin"), async (req, res, next) => {
  try {
    const { applicationId, scheduledAt, format, meetingLink = "", location = "", instructions = "" } = req.body;
    const date = new Date(scheduledAt);
    if (!applicationId || !Number.isFinite(date.getTime()) || date <= new Date() ||
        !["Online", "In person"].includes(format) ||
        (format === "Online" && !/^https:\/\/\S+$/i.test(meetingLink)) ||
        (format === "In person" && !location.trim())) {
      return res.status(400).json({ message: "Provide a future date, valid interview format, and meeting link or location." });
    }
    if ([meetingLink, location, instructions].some((value) => typeof value !== "string" || value.length > 2000)) {
      return res.status(400).json({ message: "Interview details exceed the allowed length." });
    }
    const application = await Application.findById(applicationId).populate("job", "createdBy title");
    if (!application) return res.status(404).json({ message: "Application not found." });
    if (req.user.role !== "admin" && application.job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only schedule interviews for your own job postings." });
    }
    if (["Rejected", "Withdrawn", "Hired"].includes(application.status)) {
      return res.status(409).json({ message: "This application cannot be scheduled for an interview." });
    }
    const interview = await Interview.create({
      application: application.id,
      recruiter: req.user.id,
      candidate: application.candidate,
      scheduledAt: date,
      format,
      meetingLink,
      location,
      instructions,
    });
    application.status = "Interview Scheduled";
    application.history.push({ status: application.status, changedBy: req.user.id });
    await application.save();
    const candidate = await User.findById(application.candidate);
    const warning = candidate
      ? await notifyUserWithWarning(candidate, "interview", "Interview scheduled", `An interview for ${application.job.title} has been scheduled.`, "/workspace/interviews")
      : null;
    await audit(req.user, "interview.scheduled", "Interview", interview.id);
    res.status(201).json({ interview, warning });
  } catch (error) { next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ message: "Interview not found." });
    const isRecruiter = req.user.role === "admin" || interview.recruiter.toString() === req.user.id;
    const isCandidate = interview.candidate.toString() === req.user.id;
    if (!isRecruiter && !isCandidate) return res.status(403).json({ message: "You cannot access this interview." });
    const updates = {};
    if (isRecruiter) {
      const editable = ["scheduledAt", "format", "meetingLink", "location", "instructions", "status", "feedback"];
      if (Object.keys(req.body).some((key) => !editable.includes(key))) return res.status(400).json({ message: "An interview field cannot be updated." });
      for (const key of ["scheduledAt", "format", "meetingLink", "location", "instructions", "status", "feedback"]) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
    } else {
      if (typeof req.body.feedback === "string") updates.feedback = req.body.feedback;
      if (req.body.status === "Completed") {
        if (new Date(interview.scheduledAt) > new Date()) return res.status(409).json({ message: "You can add interview feedback after the scheduled time." });
        updates.status = "Completed";
      }
      else if (Object.keys(req.body).some((key) => key !== "feedback")) {
        return res.status(403).json({ message: "Candidates may only add feedback after their interview." });
      }
    }
    if (updates.scheduledAt !== undefined) {
      updates.scheduledAt = new Date(updates.scheduledAt);
      if (!Number.isFinite(updates.scheduledAt.getTime()) || updates.scheduledAt <= new Date()) return res.status(400).json({ message: "Choose a future interview date." });
    }
    if (updates.format && !["Online", "In person"].includes(updates.format)) return res.status(400).json({ message: "Choose a valid interview format." });
    if (updates.status && !["Scheduled", "Completed", "Cancelled"].includes(updates.status)) return res.status(400).json({ message: "Choose a valid interview status." });
    if (updates.status === "Scheduled" && interview.status === "Cancelled") return res.status(409).json({ message: "Create a new interview instead of reopening a cancelled one." });
    for (const key of ["meetingLink", "location", "instructions", "feedback"]) {
      if (updates[key] !== undefined && (typeof updates[key] !== "string" || updates[key].length > 2000)) return res.status(400).json({ message: "Interview details exceed the allowed length." });
    }
    if (updates.format === "Online" && (updates.meetingLink || interview.meetingLink) && !/^https:\/\/\S+$/i.test(updates.meetingLink || interview.meetingLink)) return res.status(400).json({ message: "Online meeting links must use HTTPS." });
    Object.assign(interview, updates);
    await interview.save();
    const recipient = await User.findById(isRecruiter ? interview.candidate : interview.recruiter);
    const warning = recipient
      ? await notifyUserWithWarning(recipient, "interview", "Interview updated", "Your interview details have changed.", "/workspace/interviews")
      : null;
    await audit(req.user, "interview.updated", "Interview", interview.id);
    res.json({ interview, warning });
  } catch (error) { next(error); }
});

export default router;
