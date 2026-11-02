import { Router } from "express";
import multer from "multer";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import PDFDocument from "pdfkit";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Resume from "../models/Resume.js";
import ResumeAnalysis from "../models/ResumeAnalysis.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import User from "../models/User.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { audit } from "../services/audit.js";

const router = Router();
const uploadDirectory = fileURLToPath(new URL("../../uploads/resumes/", import.meta.url));
await mkdir(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, _file, callback) => callback(null, `${randomUUID()}.pdf`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf" || path.extname(file.originalname).toLowerCase() !== ".pdf") {
      const error = new Error("Upload a PDF resume under 5 MB.");
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

router.use(authenticate);

router.post("/upload", allowRoles("candidate"), upload.single("resume"), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: "Choose a PDF resume to upload." });
  try {
    const bytes = await readFile(req.file.path);
    if (bytes.subarray(0, 5).toString() !== "%PDF-") {
      await unlink(req.file.path);
      return res.status(400).json({ message: "The uploaded file is not a valid PDF." });
    }
    let parsed;
    try { parsed = await pdfParse(bytes); }
    catch {
      await unlink(req.file.path);
      return res.status(400).json({ message: "Could not read this PDF. Try exporting it again as a text-based PDF." });
    }
    const extractedText = parsed.text?.trim();
    if (!extractedText) {
      await unlink(req.file.path);
      return res.status(400).json({ message: "This PDF contains no extractable text. Scanned-image PDFs are not supported." });
    }
    const previous = await Resume.findOne({ candidate: req.user.id }).select("+storedName");
    const resume = await Resume.findOneAndUpdate(
      { candidate: req.user.id },
      {
        candidate: req.user.id,
        originalName: path.basename(req.file.originalname).slice(0, 255),
        storedName: req.file.filename,
        size: req.file.size,
        extractedText: extractedText.slice(0, 100000),
      },
      { upsert: true, new: true, runValidators: true }
    );
    if (previous?.storedName && previous.storedName !== req.file.filename) {
      await unlink(path.join(uploadDirectory, previous.storedName)).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    await audit(req.user, "resume.uploaded", "Resume", resume.id);
    res.status(201).json({ resume: { id: resume.id, originalName: resume.originalName, size: resume.size, updatedAt: resume.updatedAt } });
  } catch (error) {
    await unlink(req.file.path).catch((cleanupError) => { if (cleanupError.code !== "ENOENT") console.error(cleanupError); });
    next(error);
  }
});

router.get("/mine", allowRoles("candidate"), async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ candidate: req.user.id });
    res.json({ resume: resume ? { id: resume.id, originalName: resume.originalName, size: resume.size, updatedAt: resume.updatedAt } : null });
  } catch (error) { next(error); }
});

router.get("/mine/download", allowRoles("candidate"), async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ candidate: req.user.id }).select("+storedName");
    if (!resume) return res.status(404).json({ message: "Upload a resume before downloading it." });
    res.download(path.join(uploadDirectory, path.basename(resume.storedName)), resume.originalName);
  } catch (error) { next(error); }
});

router.get("/builder", allowRoles("candidate"), async (req, res, next) => {
  try {
    const user = req.user;
    const hasContent = user.title || user.bio || user.skills?.length || user.education?.length || user.experience?.length || user.projects?.length;
    if (!hasContent) return res.status(409).json({ message: "Add profile details before building a resume." });
    const document = new PDFDocument({ margin: 54, size: "A4", info: { Title: `${user.name} — Resume`, Author: user.name, Subject: "Candidate profile resume" } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="careerconnect-resume.pdf"');
    document.pipe(res);
    document.fontSize(22).fillColor("#172033").text(user.name, { continued: false });
    document.moveDown(0.25);
    if (user.title) document.fontSize(11).fillColor("#6853c5").text(user.title);
    document.fontSize(9).fillColor("#5f6877").text([user.email, user.location, user.links?.linkedin, user.links?.github, user.links?.portfolio].filter(Boolean).join("  ·  "));
    if (user.bio || user.careerObjective) {
      document.moveDown().fontSize(13).fillColor("#172033").text(user.careerObjective ? "Career objective" : "Professional summary");
      document.moveDown(0.25).fontSize(9).fillColor("#414b5e").text(user.careerObjective || user.bio, { lineGap: 3 });
      if (user.bio && user.careerObjective) document.moveDown(0.35).fontSize(13).fillColor("#172033").text("Professional summary").moveDown(0.25).fontSize(9).fillColor("#414b5e").text(user.bio, { lineGap: 3 });
    }
    if (user.skills?.length) document.moveDown().fontSize(13).fillColor("#172033").text("Skills").moveDown(0.25).fontSize(9).fillColor("#414b5e").text(user.skills.join("  ·  "));
    for (const [heading, rows, fields] of [
      ["Experience", user.experience, ["title", "company", "start", "end", "description"]],
      ["Education", user.education, ["degree", "school", "year"]],
      ["Projects", user.projects, ["title", "description", "url"]],
      ["Certifications", user.certifications, ["name", "issuer", "year"]],
    ]) {
      if (!rows?.length) continue;
      document.moveDown().fontSize(13).fillColor("#172033").text(heading);
      for (const row of rows) {
        document.moveDown(0.3).fontSize(10).fillColor("#273148").text([row.title || row.degree || row.name, row.company || row.school || row.issuer, row.start && row.end ? `${row.start}–${row.end}` : row.year].filter(Boolean).join("  ·  "));
        for (const field of fields) {
          if (["title", "company", "start", "end", "degree", "school", "name", "issuer", "year"].includes(field) || !row[field]) continue;
          document.fontSize(9).fillColor("#545f70").text(row[field], { lineGap: 2 });
        }
      }
    }
    await audit(req.user, "resume.generated", "Resume", req.user.id);
    document.end();
  } catch (error) { next(error); }
});

router.get("/candidate/:id/download", allowRoles("recruiter", "admin"), async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ candidate: req.params.id }).select("+storedName");
    if (!resume) return res.status(404).json({ message: "This candidate has not uploaded a resume." });
    if (req.user.role !== "admin") {
      const candidate = await User.findById(req.params.id).select("profileVisible");
      if (!candidate?.profileVisible) return res.status(403).json({ message: "This candidate has chosen to keep their profile private." });
      const ownedJobs = await Job.find({ createdBy: req.user.id }).distinct("_id");
      const application = await Application.findOne({ candidate: req.params.id, job: { $in: ownedJobs } });
      if (!application) return res.status(403).json({ message: "A candidate resume is available only to a team they applied to." });
    }
    await audit(req.user, "resume.downloaded", "Resume", resume.id);
    res.download(path.join(uploadDirectory, path.basename(resume.storedName)), resume.originalName);
  } catch (error) { next(error); }
});

router.post("/analyze", allowRoles("candidate"), async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ candidate: req.user.id }).select("+extractedText");
    if (!resume) return res.status(409).json({ message: "Upload a PDF resume before running an analysis." });
    let job = null;
    if (req.body.jobId) {
      job = await Job.findOne({ _id: req.body.jobId, status: "active" });
      if (!job) return res.status(404).json({ message: "Selected job not found." });
    }
    const text = resume.extractedText;
    const normalized = text.toLowerCase();
    const requiredSkills = job?.skills?.length
      ? job.skills
      : ["javascript", "typescript", "react", "node.js", "python", "java", "sql", "mongodb", "communication", "project management", "figma", "excel", "leadership"];
    const matchedSkills = requiredSkills.filter((skill) => normalized.includes(skill.toLowerCase()));
    const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));
    const skillsScore = requiredSkills.length ? matchedSkills.length / requiredSkills.length : 0;
    const experienceScore = /experience|worked|employment|intern(ship)?/i.test(text) ? 1 : 0;
    const educationScore = /education|bachelor|master|degree|university|college/i.test(text) ? 1 : 0;
    const score = Math.round((skillsScore * 70) + (experienceScore * 15) + (educationScore * 15));
    const checks = [
      { label: "Readable text-based PDF", passed: text.length >= 500, detail: `${text.length} characters extracted.` },
      { label: "Contact details", passed: /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text), detail: "Check that your email and phone appear in the document." },
      { label: "Experience section", passed: experienceScore > 0, detail: "Use clear role titles, employers, dates, and measurable outcomes." },
      { label: "Education section", passed: educationScore > 0, detail: "List relevant qualifications, institutions, and graduation dates." },
      { label: "Concise resume", passed: text.length < 16000, detail: "A focused resume is easier for a hiring team to scan." },
    ];
    const suggestions = [];
    if (missingSkills.length) suggestions.push(`Where accurate, highlight evidence for these ${job ? "job" : "common"} skills: ${missingSkills.slice(0, 8).join(", ")}.`);
    if (!checks[1].passed) suggestions.push("Add clear contact information near the top of your resume.");
    if (!experienceScore) suggestions.push("Add a concise experience or project section with outcomes.");
    if (!educationScore) suggestions.push("Add an education or qualification section.");
    if (text.length < 500) suggestions.push("Add enough detail to describe your projects, experience, and skills.");
    if (!suggestions.length) suggestions.push("Your resume passed the basic checks. Tailor the opening summary to the role.");
    const analysis = await ResumeAnalysis.create({
      candidate: req.user.id,
      job: job?._id || null,
      score,
      matchedSkills,
      missingSkills,
      suggestions,
      checks,
    });
    res.status(201).json({
      analysis,
      method: "Explainable keyword overlap and document checks; this is not semantic NLP or a generative AI assessment.",
    });
  } catch (error) { next(error); }
});

router.get("/analyses", allowRoles("candidate"), async (req, res, next) => {
  try {
    const analyses = await ResumeAnalysis.find({ candidate: req.user.id })
      .populate("job", "title company")
      .sort({ createdAt: -1 }).limit(50);
    res.json({ analyses });
  } catch (error) { next(error); }
});

router.get("/analyses/:id/report", allowRoles("candidate"), async (req, res, next) => {
  try {
    const analysis = await ResumeAnalysis.findOne({ _id: req.params.id, candidate: req.user.id }).populate("job", "title company");
    if (!analysis) return res.status(404).json({ message: "Analysis not found." });
    const lines = [
      "CareerConnect AI — Resume analysis",
      `Created: ${analysis.createdAt.toISOString()}`,
      `Job: ${analysis.job ? `${analysis.job.title} at ${analysis.job.company}` : "General resume review"}`,
      `Explainable keyword score: ${analysis.score}%`,
      "",
      `Matched skills: ${analysis.matchedSkills.join(", ") || "None"}`,
      `Missing skills: ${analysis.missingSkills.join(", ") || "None"}`,
      "",
      "Resume checks:",
      ...analysis.checks.map((check) => `${check.passed ? "PASS" : "REVIEW"} — ${check.label}: ${check.detail}`),
      "",
      "Suggestions:",
      ...analysis.suggestions.map((suggestion) => `- ${suggestion}`),
      "",
      analysis.method,
    ];
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="careerconnect-analysis-${analysis.id}.txt"`);
    res.send(lines.join("\n"));
  } catch (error) { next(error); }
});

export default router;
