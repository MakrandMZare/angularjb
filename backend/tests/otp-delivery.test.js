const test = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const { sendEmailOtp } = require('../src/services/otpDelivery');

const originalCreateTransport = nodemailer.createTransport;
const originalEnvironment = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM: process.env.SMTP_FROM
};

test.beforeEach(() => {
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USER = 'mailer@example.com';
  process.env.SMTP_PASSWORD = 'test-password';
  process.env.SMTP_FROM = 'JanBazar <mailer@example.com>';
});

test.afterEach(() => {
  nodemailer.createTransport = originalCreateTransport;
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test('sends email OTP through SMTP and escapes the username in HTML', async () => {
  let transportOptions;
  let message;
  nodemailer.createTransport = (options) => {
    transportOptions = options;
    return {
      sendMail: async (outgoingMessage) => {
        message = outgoingMessage;
        return {
          messageId: 'message-1',
          accepted: ['jan@example.com']
        };
      }
    };
  };

  const result = await sendEmailOtp('jan@example.com', '<Jan>', '123456');

  assert.equal(transportOptions.host, 'smtp.example.com');
  assert.equal(transportOptions.port, 465);
  assert.equal(transportOptions.secure, true);
  assert.equal(message.to, 'jan@example.com');
  assert.match(message.text, /123456/);
  assert.match(message.html, /&lt;Jan&gt;/);
  assert.equal(result.messageId, 'message-1');
});

test('rejects when SMTP does not accept the requested recipient', async () => {
  nodemailer.createTransport = () => ({
    sendMail: async () => ({ accepted: ['other@example.com'] })
  });

  await assert.rejects(
    sendEmailOtp('jan@example.com', 'Jan', '123456'),
    /did not accept the verification email recipient/
  );
});
