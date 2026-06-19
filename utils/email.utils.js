const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

const sendEmail = async ({ email, subject, template, data }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const html = await ejs.renderFile(
    path.join(__dirname, `../emails/${template}.ejs`),
    data,
  );

  await transporter.sendMail({
    from: "Handmade Marketplace App <no-reply@app.com>",
    to: email,
    subject,
    html,
  });
};

module.exports = sendEmail;
