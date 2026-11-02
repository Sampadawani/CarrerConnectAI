
export async function sendAccountEmail(to, subject, text) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY is missing.");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CareerConnect AI <onboarding@resend.dev>",
        to: [to],
        subject,
        text,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend email error:", result);
      return false;
    }

    console.log("Email sent successfully. Resend ID:", result.id);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error.message);
    return false;
  }
}
