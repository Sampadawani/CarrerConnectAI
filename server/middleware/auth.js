import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Sign in to continue." });
  if (!process.env.JWT_SECRET) return res.status(503).json({ message: "Authentication is not configured." });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }

  try {
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Your account could not be found." });
    if (!user.accountActive) return res.status(403).json({ message: "This account is currently deactivated." });
    if (payload.version !== user.tokenVersion) return res.status(401).json({ message: "Your session has been revoked. Please sign in again." });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission to do that." });
    next();
  };
}
