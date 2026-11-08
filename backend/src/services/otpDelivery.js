const nodemailer = require('nodemailer');

async function sendEmailOtp(email, username, otp) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const port = Number(process.env.SMTP_PORT || 587);

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM || !Number.isInteger(port)) {
    throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM and a valid SMTP_PORT are required');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD
    }
  });

  const result = await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Verify your JanBazar email address',
    text: `Hello ${username},\n\nYour JanBazar email verification code is ${otp}. It expires in 10 minutes.\n\nIf you did not start this registration, you can ignore this email.`,
    html: `<p>Hello ${escapeHtml(username)},</p><p>Your JanBazar email verification code is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes.</p><p>If you did not start this registration, you can ignore this email.</p>`
  });

  const acceptedRecipients = result.accepted
    .map((recipient) => typeof recipient === 'string' ? recipient : recipient.address)
    .filter((recipient) => typeof recipient === 'string')
    .map((recipient) => recipient.toLowerCase());
  if (!acceptedRecipients.includes(email.toLowerCase())) {
    throw new Error('SMTP server did not accept the verification email recipient');
  }

  return result;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[character];
  });
}

module.exports = {
  sendEmailOtp
};
