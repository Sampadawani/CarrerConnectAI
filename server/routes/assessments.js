import { Router } from "express";
import AssessmentResult from "../models/AssessmentResult.js";
import AssessmentAttempt from "../models/AssessmentAttempt.js";
import { assessments, publicAssessment } from "../data/assessments.js";
import { authenticate, allowRoles } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, allowRoles("candidate"), async (_req, res) => {
  res.json({ assessments: assessments.map(publicAssessment) });
});

router.get("/results", authenticate, allowRoles("candidate"), async (req, res, next) => {
  try {
    const results = await AssessmentResult.find({ candidate: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json({ results });
  } catch (error) { next(error); }
});

router.post("/:key/start", authenticate, allowRoles("candidate"), async (req, res, next) => {
  try {
    const assessment = assessments.find((item) => item.key === req.params.key);
    if (!assessment) return res.status(404).json({ message: "Assessment not found." });
    const startedAt = new Date();
    const attempt = await AssessmentAttempt.create({
      candidate: req.user.id,
      assessmentKey: assessment.key,
      startedAt,
      expiresAt: new Date(startedAt.getTime() + assessment.minutes * 60 * 1000),
    });
    res.status(201).json({ attempt: { id: attempt.id, startedAt, expiresAt: attempt.expiresAt }, assessment: publicAssessment(assessment) });
  } catch (error) { next(error); }
});

router.post("/:key/submit", authenticate, allowRoles("candidate"), async (req, res, next) => {
  try {
    const assessment = assessments.find((item) => item.key === req.params.key);
    if (!assessment) return res.status(404).json({ message: "Assessment not found." });
    const attempt = await AssessmentAttempt.findOne({
      _id: req.body.attemptId,
      candidate: req.user.id,
      assessmentKey: assessment.key,
      completedAt: null,
    });
    if (!attempt) return res.status(409).json({ message: "Start a new assessment before submitting answers." });
    if (new Date() > attempt.expiresAt) {
      attempt.completedAt = new Date();
      await attempt.save();
      return res.status(408).json({ message: "Time is up. Start a new attempt to try again." });
    }
    const submitted = req.body.answers;
    if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) return res.status(400).json({ message: "Submit an answer for each question." });
    const questionIds = new Set(assessment.questions.map((question) => question.id));
    if (Object.keys(submitted).length !== questionIds.size || Object.keys(submitted).some((id) => !questionIds.has(id)) ||
        Object.values(submitted).some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 3)) {
      return res.status(400).json({ message: "Answer every question using one of its listed choices." });
    }
    const answers = assessment.questions.map((question) => ({
      questionId: question.id,
      correct: submitted[question.id] === question.answer,
    }));
    const score = answers.filter((answer) => answer.correct).length;
    const durationSeconds = Number(req.body.durationSeconds);
    const result = await AssessmentResult.create({
      candidate: req.user.id,
      assessmentKey: assessment.key,
      title: assessment.title,
      score,
      total: assessment.questions.length,
      answers,
      durationSeconds: Number.isFinite(durationSeconds) ? Math.min(3600, Math.max(0, durationSeconds)) : 0,
    });
    attempt.completedAt = new Date();
    await attempt.save();
    res.status(201).json({ result });
  } catch (error) { next(error); }
});

export default router;
