import { Router } from "express";
import SavedJob from "../models/SavedJob.js";
import Job from "../models/Job.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, allowRoles("candidate"));

router.get("/", async (req, res, next) => {
  try {
    const saved = await SavedJob.find({ candidate: req.user.id }).populate({
      path: "job",
      match: { status: "active" },
    }).sort({ createdAt: -1 });
    res.json({ jobs: saved.filter((item) => item.job).map((item) => ({ ...item.job.toObject(), savedId: item.id })) });
  } catch (error) { next(error); }
});

router.post("/:jobId", async (req, res, next) => {
  try {
    if (!await Job.exists({ _id: req.params.jobId, status: "active" })) return res.status(404).json({ message: "Job not found." });
    const saved = await SavedJob.findOneAndUpdate(
      { candidate: req.user.id, job: req.params.jobId },
      { $setOnInsert: { candidate: req.user.id, job: req.params.jobId } },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json({ saved });
  } catch (error) { next(error); }
});

router.delete("/:jobId", async (req, res, next) => {
  try {
    await SavedJob.findOneAndDelete({ candidate: req.user.id, job: req.params.jobId });
    res.json({ message: "Saved job removed." });
  } catch (error) { next(error); }
});

export default router;
