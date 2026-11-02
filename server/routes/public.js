import { Router } from "express";
import Job from "../models/Job.js";
import Application from "../models/Application.js";

const router = Router();

router.get("/stats", async (_req, res, next) => {
  try {
    const [activeJobs, companies, applications] = await Promise.all([
      Job.countDocuments({ status: "active" }),
      Job.distinct("company", { status: "active" }),
      Application.countDocuments(),
    ]);
    res.json({ stats: { activeJobs, hiringTeams: companies.length, applications } });
  } catch (error) { next(error); }
});

export default router;
