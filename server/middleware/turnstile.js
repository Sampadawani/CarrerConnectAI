import { verifyTurnstileToken } from "../services/turnstile.js";

export function requireTurnstile(action) {
  return async (req, res, next) => {
    const token = req.body?.captchaToken;
    if (typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ message: "Complete the CAPTCHA challenge and try again." });
    }

    try {
      const result = await verifyTurnstileToken(token, action);
      if (result.verified) return next();
      if (result.reason === "not-configured") {
        return res.status(503).json({ message: "CAPTCHA verification is not configured on the server." });
      }
      if (result.reason === "unavailable") {
        return res.status(503).json({ message: "CAPTCHA verification is temporarily unavailable. Please try again." });
      }
      return res.status(400).json({ message: "CAPTCHA verification failed. Complete the challenge and try again." });
    } catch (error) {
      next(error);
    }
  };
}
