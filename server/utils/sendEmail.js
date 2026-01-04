const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email configuration missing. Please set EMAIL_USER and EMAIL_PASS in your .env file.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Student Pilot" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
  } catch (error) {
    if (error.code === "EAUTH" || error.message.includes("Invalid login") || error.message.includes("BadCredentials")) {
      throw new Error("Gmail authentication failed. Please use a Gmail App Password (not your regular password). Visit: https://myaccount.google.com/apppasswords");
    }
    if (error.code === "ECONNECTION" || error.message.includes("Connection")) {
      throw new Error("Failed to connect to email service. Please check your internet connection.");
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = sendEmail;
