import { Router } from "express";
import Notification from "../models/Notification.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100);
    const unread = await Notification.countDocuments({ user: req.user.id, readAt: null });
    res.json({ notifications, unread });
  } catch (error) { next(error); }
});

router.patch("/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user.id, readAt: null }, { readAt: new Date() });
    res.json({ message: "Notifications marked as read." });
  } catch (error) { next(error); }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    res.json({ notification });
  } catch (error) { next(error); }
});

router.patch("/preferences", async (req, res, next) => {
  try {
    const allowed = ["applications", "interviews", "recommendations"];
    if (Object.keys(req.body).some((key) => !allowed.includes(key)) ||
        Object.values(req.body).some((value) => typeof value !== "boolean") ||
        Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "Provide at least one valid notification preference." });
    }
    Object.assign(req.user.notificationPreferences, req.body);
    await req.user.save();
    res.json({ preferences: req.user.notificationPreferences });
  } catch (error) { next(error); }
});

export default router;
