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

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Verify your JanBazar email address',
    text: `Hello ${username},\n\nYour JanBazar email verification code is ${otp}. It expires in 10 minutes.\n\nIf you did not start this registration, you can ignore this email.`,
    html: `<p>Hello ${escapeHtml(username)},</p><p>Your JanBazar email verification code is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes.</p><p>If you did not start this registration, you can ignore this email.</p>`
  });
}

async function sendMobileOtp(mobile, otp) {
  const { MSG91_AUTH_KEY, MSG91_TEMPLATE_ID } = process.env;
  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    throw new Error('MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required');
  }

  const countryCode = String(process.env.MSG91_COUNTRY_CODE || '91').replace(/\D/g, '');
  if (!/^\d{1,3}$/.test(countryCode)) {
    throw new Error('MSG91_COUNTRY_CODE must contain 1 to 3 digits');
  }

  let recipient = mobile.replace(/\D/g, '').replace(/^0+/, '');
  if (recipient.length === 10 && countryCode) {
    recipient = `${countryCode}${recipient}`;
  }
  if (recipient.length < 8 || recipient.length > 15) {
    throw new Error('Mobile number must include a valid country code or be a valid 10-digit local number');
  }

  const response = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      authkey: MSG91_AUTH_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      template_id: MSG91_TEMPLATE_ID,
      short_url: '0',
      recipients: [
        {
          mobiles: recipient,
          OTP: otp
        }
      ]
    })
  });

  const result = await response.json();
  if (!response.ok || result?.type === 'error') {
    throw new Error(`MSG91 request failed with status ${response.status}`);
  }
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
  sendEmailOtp,
  sendMobileOtp
};
