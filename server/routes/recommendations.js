import { Router } from "express";
import Job from "../models/Job.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

const router = Router();

function annualSalary(salary) {
  const text = salary?.toLowerCase() || "";
  const lpa = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)?\s*(\d+(?:\.\d+)?)?\s*lpa/);
  if (lpa) return [Number(lpa[1]) * 100000, lpa[2] ? Number(lpa[2]) * 100000 : null];
  const monthly = text.match(/(?:₹\s*)?(\d+(?:\.\d+)?)\s*(k|thousand)\s*(?:-|–|to)?\s*(\d+(?:\.\d+)?)?\s*(k|thousand)?\s*(?:\/\s*month|per month|monthly)/);
  if (monthly) return [Number(monthly[1]) * 12000, monthly[3] ? Number(monthly[3]) * 12000 : null];
  return null;
}

router.get("/", authenticate, allowRoles("candidate"), async (req, res, next) => {
  try {
    const jobs = await Job.find({ status: "active" }).sort({ createdAt: -1 }).limit(200);
    const profileSkills = new Set((req.user.skills || []).map((skill) => skill.toLowerCase()));
    const candidates = jobs.map((job) => {
      const required = job.skills || [];
      const matchedSkills = required.filter((skill) => profileSkills.has(skill.toLowerCase()));
      const missingSkills = required.filter((skill) => !profileSkills.has(skill.toLowerCase()));
      const preferredLocations = req.user.preferredLocations?.length ? req.user.preferredLocations : [req.user.location].filter(Boolean);
      const locationMatch = preferredLocations.some((location) => job.location.toLowerCase().includes(location.toLowerCase()));
      const modes = req.user.preferredWorkModes || [];
      const modeMatch = modes.length > 0 && modes.includes(job.mode);
      const interests = (req.user.careerInterests || []).map((interest) => interest.toLowerCase());
      const interestMatch = interests.some((interest) => `${job.title} ${job.category}`.toLowerCase().includes(interest));
      const titleMatch = req.user.title && job.title.toLowerCase().includes(req.user.title.toLowerCase());
      const salaryRange = annualSalary(job.salary);
      const salaryMatch = salaryRange && (
        (req.user.salaryMinimum == null || salaryRange[1] == null || salaryRange[1] >= req.user.salaryMinimum) &&
        (req.user.salaryMaximum == null || salaryRange[0] <= req.user.salaryMaximum)
      );
      const skillScore = required.length ? Math.round((matchedSkills.length / required.length) * 75) : 0;
      const score = Math.min(98, skillScore + (locationMatch ? 8 : 0) + (modeMatch ? 7 : 0) + (interestMatch || titleMatch ? 10 : 0) + (salaryMatch ? 5 : 0));
      const reasons = [];
      if (matchedSkills.length) reasons.push(`Your profile lists ${matchedSkills.join(", ")}.`);
      if (locationMatch) reasons.push(`The role matches one of your saved location preferences.`);
      if (modeMatch) reasons.push(`This matches your ${job.mode.toLowerCase()} work-style preference.`);
      if (interestMatch) reasons.push(`The role matches a career interest from your profile.`);
      if (salaryMatch) reasons.push("The posted salary overlaps your saved salary preference.");
      if (!matchedSkills.length) reasons.push("Add skills to your profile to improve the relevance of this match.");
      return { job, score, matchedSkills, missingSkills, reasons };
    }).sort((a, b) => b.score - a.score).slice(0, 30);
    res.json({
      recommendations: candidates,
      method: "Transparent heuristic: exact skill overlap (75 points), plus matching profile location, work style, career interest, and posted salary where the salary is parseable. Scores are not AI predictions.",
    });
  } catch (error) { next(error); }
});

export default router;
