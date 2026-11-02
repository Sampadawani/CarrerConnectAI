import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import jobRoutes from "./routes/jobs.js";
import applicationRoutes from "./routes/applications.js";
import profileRoutes from "./routes/profile.js";
import interviewRoutes from "./routes/interviews.js";
import notificationRoutes from "./routes/notifications.js";
import roadmapRoutes from "./routes/roadmaps.js";
import assessmentRoutes from "./routes/assessments.js";
import recommendationRoutes from "./routes/recommendations.js";
import savedJobRoutes from "./routes/savedJobs.js";
import resumeRoutes from "./routes/resumes.js";
import companyRoutes from "./routes/companies.js";
import analyticsRoutes from "./routes/analytics.js";
import adminRoutes from "./routes/admin.js";
import reportRoutes from "./routes/reports.js";
import publicRoutes from "./routes/public.js";

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method) &&
      req.is("application/json") &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))) {
    return res.status(400).json({ message: "Request body must be a JSON object." });
  }
  next();
});
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", database: mongoose.connection.readyState === 1 }));
const requireDatabase = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: "Database unavailable. Configure and connect MongoDB to use this feature." });
  }
  next();
};
app.use("/api/public", requireDatabase, publicRoutes);
app.use("/api/auth", requireDatabase, authRoutes);
app.use("/api/jobs", requireDatabase, jobRoutes);
app.use("/api/applications", requireDatabase, applicationRoutes);
app.use("/api/profile", requireDatabase, profileRoutes);
app.use("/api/interviews", requireDatabase, interviewRoutes);
app.use("/api/notifications", requireDatabase, notificationRoutes);
app.use("/api/roadmaps", requireDatabase, roadmapRoutes);
app.use("/api/assessments", requireDatabase, assessmentRoutes);
app.use("/api/recommendations", requireDatabase, recommendationRoutes);
app.use("/api/saved-jobs", requireDatabase, savedJobRoutes);
app.use("/api/resumes", requireDatabase, resumeRoutes);
app.use("/api/companies", requireDatabase, companyRoutes);
app.use("/api/analytics", requireDatabase, analyticsRoutes);
app.use("/api/admin", requireDatabase, adminRoutes);
app.use("/api/reports", requireDatabase, reportRoutes);
app.use("/api", (_req, res) => res.status(404).json({ message: "API route not found." }));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.type === "entity.parse.failed") return res.status(400).json({ message: "Request body must contain valid JSON." });
  if (error.type === "entity.too.large") return res.status(413).json({ message: "Request body must be no larger than 1 MB." });
  if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "Resume must be 5 MB or smaller." });
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) return res.status(error.status).json({ message: error.message });
  if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
  if (error.code === 11000) return res.status(409).json({ message: "This record already exists." });
  if (error.name === "CastError") return res.status(400).json({ message: "The requested record ID is invalid." });
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

const clientDist = fileURLToPath(new URL("../dist/", import.meta.url));
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(fileURLToPath(new URL("../dist/index.html", import.meta.url))));
}

connectDatabase().catch((error) => console.error("Could not connect to MongoDB:", error.message));

app.listen(port, () => console.log(`CareerConnect API listening on http://localhost:${port}`));
