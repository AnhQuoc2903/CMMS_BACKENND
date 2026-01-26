const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendCode = async ({ to, subject, html }) => {
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};
