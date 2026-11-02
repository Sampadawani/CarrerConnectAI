import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
import { sendAccountEmail } from "../services/email.js";

const router = Router();
const sensitiveLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-7", legacyHeaders: false });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const clientOrigin = () => process.env.CLIENT_ORIGIN || "http://localhost:5173";

router.use((_req, res, next) => {
  if (!process.env.JWT_SECRET) return res.status(503).json({ message: "Authentication is not configured. Set JWT_SECRET on the server." });
  next();
});

export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  title: user.title,
  location: user.location,
  skills: user.skills,
  bio: user.bio,
  careerObjective: user.careerObjective,
  company: user.company,
  education: user.education,
  experience: user.experience,
  projects: user.projects,
  certifications: user.certifications,
  preferredLocations: user.preferredLocations,
  preferredWorkModes: user.preferredWorkModes,
  careerInterests: user.careerInterests,
  salaryMinimum: user.salaryMinimum,
  salaryMaximum: user.salaryMaximum,
  profileVisible: user.profileVisible,
  emailVerified: user.emailVerified,
  recruiterVerified: user.recruiterVerified,
  links: user.links,
  notificationPreferences: user.notificationPreferences,
});

const sessionFor = (user) => ({
  token: jwt.sign({ sub: user.id, version: user.tokenVersion }, process.env.JWT_SECRET, { expiresIn: "7d" }),
  user: publicUser(user),
});

router.post("/register", sensitiveLimit, async (req, res, next) => {
  try {
    const { name, email, password, role = "candidate", company = "" } = req.body;
    if (typeof name !== "string" || !name.trim() || name.length > 100 || typeof email !== "string" || !emailPattern.test(email) || email.length > 254 || typeof password !== "string" || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: "Enter your name, a valid email and a password of at least 8 characters." });
    }
    if (!["candidate", "recruiter"].includes(role)) return res.status(400).json({ message: "Choose a valid account type." });
    if (typeof company !== "string" || company.length > 120 || (role === "recruiter" && !company.trim())) return res.status(400).json({ message: "Add a valid company name to create a recruiter account." });
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "An account with that email already exists." });

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role,
      company: company.trim(),
    });
    const verificationToken = randomBytes(32).toString("hex");
    user.verificationTokenHash = hashToken(verificationToken);
    user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    const sent = await sendAccountEmail(
      user.email,
      "Verify your CareerConnect account",
      `Verify your account: ${clientOrigin()}/verify-email?token=${verificationToken}`
    );
    if (sent) return res.status(201).json({ message: "Account created. Check your email to verify it before signing in." });
    if (process.env.NODE_ENV === "production") return res.status(503).json({ message: "Email delivery is not configured. Configure SMTP and request a new verification link." });
    res.status(201).json({ message: "Account created. Verify your email before signing in.", developmentVerificationToken: verificationToken });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-email", sensitiveLimit, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (typeof token !== "string" || token.length !== 64) return res.status(400).json({ message: "Verification link is invalid." });
    const user = await User.findOne({
      verificationTokenHash: hashToken(token),
      verificationExpires: { $gt: new Date() },
    }).select("+verificationTokenHash +verificationExpires");
    if (!user) return res.status(400).json({ message: "Verification link is invalid or expired." });
    user.emailVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationExpires = undefined;
    await user.save();
    res.json(sessionFor(user));
  } catch (error) {
    next(error);
  }
});

router.post("/resend-verification", sensitiveLimit, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (typeof email !== "string" || !emailPattern.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    const user = await User.findOne({ email: email.trim().toLowerCase(), emailVerified: false });
    const message = "If the account needs verification, a new link will be sent.";
    if (!user) return res.json({ message });
    const token = randomBytes(32).toString("hex");
    user.verificationTokenHash = hashToken(token);
    user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    const sent = await sendAccountEmail(user.email, "Verify your CareerConnect account", `Verify your account: ${clientOrigin()}/verify-email?token=${token}`);
    if (!sent && process.env.NODE_ENV !== "production") return res.json({ message, developmentVerificationToken: token });
    res.json({ message });
  } catch (error) { next(error); }
});

router.post("/login", sensitiveLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || !emailPattern.test(email) || email.length > 254 || typeof password !== "string" || password.length > 128) {
      return res.status(400).json({ message: "Enter a valid email and password." });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    if (!user.accountActive) return res.status(403).json({ message: "This account is currently deactivated." });
    if (!user.emailVerified) return res.status(403).json({ message: "Verify your email address before signing in." });
    res.json(sessionFor(user));
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", sensitiveLimit, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (typeof email !== "string" || !emailPattern.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    const user = await User.findOne({ email: email.trim().toLowerCase(), accountActive: true });
    const message = "If an active account uses that email, a password reset link will be sent.";
    if (!user) return res.json({ message });
    const token = randomBytes(32).toString("hex");
    user.resetTokenHash = hashToken(token);
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const sent = await sendAccountEmail(user.email, "Reset your CareerConnect password", `Reset your password: ${clientOrigin()}/reset-password?token=${token}`);
    if (!sent && process.env.NODE_ENV !== "production") return res.json({ message, developmentResetToken: token });
    if (!sent) {
      user.resetTokenHash = undefined;
      user.resetExpires = undefined;
      await user.save();
      return res.status(503).json({ message: "Email delivery is not configured for password recovery." });
    }
    res.json({ message });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", sensitiveLimit, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== "string" || token.length !== 64 || typeof password !== "string" || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: "Use a valid reset link and a password of 8 to 128 characters." });
    }
    const user = await User.findOne({
      resetTokenHash: hashToken(token),
      resetExpires: { $gt: new Date() },
    }).select("+resetTokenHash +resetExpires");
    if (!user) return res.status(400).json({ message: "Reset link is invalid or expired. Request a new one." });
    user.password = await bcrypt.hash(password, 12);
    user.tokenVersion += 1;
    user.resetTokenHash = undefined;
    user.resetExpires = undefined;
    await user.save();
    res.json({ message: "Password changed. You can now sign in." });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

router.patch("/account", authenticate, async (req, res, next) => {
  try {
    if (typeof req.body.accountActive !== "boolean") return res.status(400).json({ message: "Provide accountActive as a boolean." });
    if (req.user.role === "admin") return res.status(403).json({ message: "Admin accounts cannot be deactivated here." });
    req.user.accountActive = req.body.accountActive;
    if (!req.user.accountActive) req.user.tokenVersion += 1;
    await req.user.save();
    res.json({ message: "Account status updated. Deactivated accounts cannot sign in.", accountActive: req.user.accountActive });
  } catch (error) {
    next(error);
  }
});

export default router;
