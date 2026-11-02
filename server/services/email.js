import nodemailer from "nodemailer";

export async function sendAccountEmail(to, subject, text) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error("GMAIL_USER or GMAIL_APP_PASSWORD is missing.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `"CareerConnect AI" <${gmailUser}>`,
      to,
      subject,
      text,
    });

    console.log("Email sent successfully to:", to);
    return true;
  } catch (error) {
    console.error("Gmail email sending failed:", error.message);
    return false;
  }
}