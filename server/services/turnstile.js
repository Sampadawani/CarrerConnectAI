const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token, expectedAction) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { verified: false, reason: "not-configured" };
  if (typeof token !== "string" || !token.trim() || token.length > 2048) {
    return { verified: false, reason: "invalid-token" };
  }

  let response;
  try {
    response = await fetch(siteverifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("Cloudflare Turnstile Siteverify request failed:", error.message);
    return { verified: false, reason: "unavailable" };
  }

  if (!response.ok) {
    console.error("Cloudflare Turnstile Siteverify returned HTTP", response.status);
    return { verified: false, reason: "unavailable" };
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    console.error("Cloudflare Turnstile Siteverify returned invalid JSON:", error.message);
    return { verified: false, reason: "unavailable" };
  }

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    console.error("Cloudflare Turnstile Siteverify returned an invalid response.");
    return { verified: false, reason: "unavailable" };
  }

  if (result.success !== true || result.action !== expectedAction) {
    return { verified: false, reason: "invalid-token" };
  }
  return { verified: true };
}
