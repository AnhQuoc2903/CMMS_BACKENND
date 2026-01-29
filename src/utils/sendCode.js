const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

exports.sendCode = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"CMMS" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
