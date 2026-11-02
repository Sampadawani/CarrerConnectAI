import Notification from "../models/Notification.js";

export async function notifyUser(user, type, title, message, link = "") {
  const preferences = user.notificationPreferences || {};
  const preference = type === "application" || type === "status" ? "applications" : type === "interview" ? "interviews" : type === "job" ? "recommendations" : null;
  if (preference && preferences[preference] === false) return;
  await Notification.create({ user: user._id || user, type, title, message, link });
}

export async function notifyUserWithWarning(user, type, title, message, link = "") {
  try {
    await notifyUser(user, type, title, message, link);
    return null;
  } catch (error) {
    console.error("Could not save an in-app notification:", error);
    return "The change was saved, but its in-app notification could not be created.";
  }
}
