import { Router } from "express";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

const router = Router();

router.get("/recruiter", authenticate, allowRoles("recruiter", "admin"), async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(7, Number.parseInt(req.query.days, 10) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const jobFilter = req.user.role === "admin" ? {} : { createdBy: req.user.id };
    const jobs = await Job.find(jobFilter).select("_id title status");
    const jobIds = jobs.map((job) => job._id);
    const filter = { job: { $in: jobIds }, createdAt: { $gte: since } };
    const [total, byStatus, trends, perJob, hires] = await Promise.all([
      Application.countDocuments(filter),
      Application.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Application.aggregate([
        { $match: filter },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, applications: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Application.aggregate([
        { $match: filter },
        { $group: { _id: "$job", applications: { $sum: 1 } } },
        { $sort: { applications: -1 } },
        { $limit: 15 },
      ]),
      Application.countDocuments({ ...filter, status: "Hired" }),
    ]);
    const jobMap = new Map(jobs.map((job) => [job.id, job.title]));
    res.json({
      days,
      totals: {
        jobs: jobs.length,
        activeJobs: jobs.filter((job) => job.status === "active").length,
        applications: total,
        hires,
        conversionRate: total ? Math.round((hires / total) * 100) : 0,
      },
      byStatus: byStatus.map(({ _id, count }) => ({ status: _id, count })),
      trends: trends.map(({ _id, applications }) => ({ date: _id, applications })),
      perJob: perJob.map(({ _id, applications }) => ({ title: jobMap.get(_id.toString()) || "Removed job", applications })),
    });
  } catch (error) { next(error); }
});

export default router;
