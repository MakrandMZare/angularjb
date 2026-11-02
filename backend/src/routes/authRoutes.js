const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomInt, randomUUID } = require('node:crypto');
const {
  sendEmailOtp,
  sendMobileOtp
} = require('../services/otpDelivery');

const router = express.Router();
const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function createToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      sub: String(user.user_id),
      username: user.username,
      role: user.role || 'user',
      tokenType: 'access'
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      algorithm: 'HS256',
      issuer: 'angularjb-api',
      audience: 'angularjb-client'
    }
  );
}

function createRegistrationToken(registrationId, step) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      sub: registrationId,
      purpose: 'registration',
      step
    },
    secret,
    { expiresIn: `${OTP_TTL_MINUTES}m` }
  );
}

function readRegistrationToken(token, step) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const claims = jwt.verify(token, secret);
    if (
      typeof claims === 'string' ||
      claims.purpose !== 'registration' ||
      claims.step !== step ||
      typeof claims.sub !== 'string'
    ) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

function createOtp() {
  return randomInt(100000, 1000000).toString();
}

async function findPendingRegistration(pool, registrationId) {
  const [rows] = await pool.execute(
    `SELECT registration_id, username, email, mobile, password_hash,
            email_otp_hash, email_otp_attempts, email_otp_expires_at, email_verified,
            mobile_otp_hash, mobile_otp_attempts, mobile_otp_expires_at, mobile_verified,
            expires_at,
            TIMESTAMPDIFF(SECOND, email_last_sent_at, UTC_TIMESTAMP()) AS email_seconds_since_sent,
            TIMESTAMPDIFF(SECOND, mobile_last_sent_at, UTC_TIMESTAMP()) AS mobile_seconds_since_sent
     FROM pending_registrations
     WHERE registration_id = ?`,
    [registrationId]
  );

  return rows[0];
}

function isExpired(dateValue) {
  return !dateValue || new Date(dateValue).getTime() <= Date.now();
}

function handleServerError(label, error, res) {
  console.error(`${label}:`, error.message);
  return res.status(500).json({ error: `${label} failed` });
}

function requireRegistrationClaims(req, res, step) {
  try {
    const claims = readRegistrationToken(req.body?.registrationToken, step);
    if (!claims) {
      res.status(401).json({ error: 'Registration session is invalid or expired' });
      return null;
    }

    return claims;
  } catch (error) {
    handleServerError('Registration token validation', error, res);
    return null;
  }
}

router.post('/register', async (req, res) => {
  const { username, email, mobile, password } = req.body ?? {};

  if (
    !isNonEmptyString(username) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(mobile) ||
    !isNonEmptyString(password)
  ) {
    return res.status(400).json({
      error: 'Username, email, mobile and password are required'
    });
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanMobile = mobile.trim();
  const mobileDigits = cleanMobile.replace(/\D/g, '');

  if (cleanUsername.length > 80 || cleanEmail.length > 254 || cleanMobile.length > 32) {
    return res.status(400).json({ error: 'One or more registration fields are too long' });
  }

  if (
    !/^[+]?[\d\s()-]+$/.test(cleanMobile) ||
    (mobileDigits.length !== 10 && (mobileDigits.length < 11 || mobileDigits.length > 15))
  ) {
    return res.status(400).json({
      error: 'Enter a valid mobile number with 10 local digits or an international country code'
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters'
    });
  }

  try {
    const pool = require('../db');
    await pool.execute(
      'DELETE FROM pending_registrations WHERE expires_at <= UTC_TIMESTAMP()'
    );

    const [existingUsers] = await pool.execute(
      `SELECT user_id
       FROM users
       WHERE LOWER(username) = LOWER(?)
          OR LOWER(email) = LOWER(?)
          OR mobile = ?
       LIMIT 1`,
      [cleanUsername, cleanEmail, cleanMobile]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Username, email or mobile already exists'
      });
    }

    const registrationId = randomUUID();
    const registrationToken = createRegistrationToken(registrationId, 'email');
    const emailOtp = createOtp();
    const emailOtpHash = await bcrypt.hash(emailOtp, 10);
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO pending_registrations
         (registration_id, username, email, mobile, password_hash,
          email_otp_hash, email_otp_expires_at, email_last_sent_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?,
               DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${OTP_TTL_MINUTES} MINUTE),
               UTC_TIMESTAMP(),
               DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${OTP_TTL_MINUTES} MINUTE))`,
      [
        registrationId,
        cleanUsername,
        cleanEmail,
        cleanMobile,
        passwordHash,
        emailOtpHash
      ]
    );

    try {
      await sendEmailOtp(cleanEmail, cleanUsername, emailOtp);
    } catch (error) {
      await pool.execute(
        'DELETE FROM pending_registrations WHERE registration_id = ?',
        [registrationId]
      );
      console.error('Email OTP delivery failed:', error.message);
      return res.status(502).json({
        error: 'Could not send the verification email. Check the email service configuration and try again.'
      });
    }

    return res.status(201).json({
      message: 'A verification code was sent to your email address.',
      registrationToken
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'A registration is already in progress for this username, email or mobile'
      });
    }

    return handleServerError('Registration', error, res);
  }
});

router.post('/register/resend-email', async (req, res) => {
  const claims = requireRegistrationClaims(req, res, 'email');
  if (!claims) {
    return;
  }

  let pending;
  let emailOtp;
  let emailOtpHash;
  try {
    const pool = require('../db');
    pending = await findPendingRegistration(pool, claims.sub);
    if (!pending || isExpired(pending.expires_at) || pending.email_verified) {
      return res.status(410).json({ error: 'This email verification session has expired' });
    }

    if (Number(pending.email_seconds_since_sent) < 60) {
      return res.status(429).json({ error: 'Wait a minute before requesting another code' });
    }

    emailOtp = createOtp();
    emailOtpHash = await bcrypt.hash(emailOtp, 10);
    await pool.execute(
      `UPDATE pending_registrations
       SET email_otp_hash = ?,
           email_otp_attempts = 0,
           email_otp_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${OTP_TTL_MINUTES} MINUTE),
           email_last_sent_at = UTC_TIMESTAMP(),
           expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${OTP_TTL_MINUTES} MINUTE)
       WHERE registration_id = ?`,
      [emailOtpHash, claims.sub]
    );
  } catch (error) {
    return handleServerError('Email OTP resend', error, res);
  }

  try {
    await sendEmailOtp(pending.email, pending.username, emailOtp);
    return res.json({
      message: 'A new verification code was sent to your email address.',
      registrationToken: createRegistrationToken(claims.sub, 'email')
    });
  } catch (error) {
    console.error('Email OTP delivery failed:', error.message);
    return res.status(502).json({ error: 'Could not resend the email verification code' });
  }
});

router.post('/register/verify-email', async (req, res) => {
  const claims = requireRegistrationClaims(req, res, 'email');
  if (!claims) {
    return;
  }

  const { otp } = req.body ?? {};
  if (!isNonEmptyString(otp) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Enter the 6-digit email verification code' });
  }

  try {
    const pool = require('../db');
    const pending = await findPendingRegistration(pool, claims.sub);
    if (!pending || isExpired(pending.expires_at) || isExpired(pending.email_otp_expires_at)) {
      return res.status(410).json({ error: 'This email verification code has expired' });
    }

    if (pending.email_verified) {
      return res.status(409).json({ error: 'This email address is already verified' });
    }

    if (Number(pending.email_otp_attempts) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect codes. Request a new code.' });
    }

    if (!(await bcrypt.compare(otp, pending.email_otp_hash))) {
      await pool.execute(
        `UPDATE pending_registrations
         SET email_otp_attempts = email_otp_attempts + 1
         WHERE registration_id = ?`,
        [claims.sub]
      );
      return res.status(400).json({ error: 'The email verification code is incorrect' });
    }

    const mobileOtp = createOtp();
    const mobileOtpHash = await bcrypt.hash(mobileOtp, 10);
    await pool.execute(
      `UPDATE pending_registrations
       SET email_verified = TRUE,
           email_otp_hash = NULL,
           email_otp_expires_at = NULL,
           mobile_otp_hash = ?,
           mobile_otp_attempts = 0,
           mobile_otp_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${OTP_TTL_MINUTES} MINUTE),
           mobile_last_sent_at = UTC_TIMESTAMP(),
           expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${OTP_TTL_MINUTES} MINUTE)
       WHERE registration_id = ?`,
      [mobileOtpHash, claims.sub]
    );

    const registrationToken = createRegistrationToken(claims.sub, 'mobile');
    try {
      await sendMobileOtp(pending.mobile, mobileOtp);
    } catch (error) {
      console.error('Mobile OTP delivery failed:', error.message);
      return res.status(502).json({
        error: 'Your email is verified, but the mobile code could not be sent. Retry sending the mobile code.',
        registrationToken,
        emailVerified: true
      });
    }

    return res.json({
      message: 'Email verified successfully. A code was sent to your mobile number.',
      registrationToken,
      emailVerified: true
    });
  } catch (error) {
    return handleServerError('Email verification', error, res);
  }
});

router.post('/register/resend-mobile', async (req, res) => {
  const claims = requireRegistrationClaims(req, res, 'mobile');
  if (!claims) {
    return;
  }

  let pending;
  let mobileOtp;
  let mobileOtpHash;
  try {
    const pool = require('../db');
    pending = await findPendingRegistration(pool, claims.sub);
    if (
      !pending ||
      isExpired(pending.expires_at) ||
      !pending.email_verified ||
      pending.mobile_verified
    ) {
      return res.status(410).json({ error: 'This mobile verification session has expired' });
    }

    if (Number(pending.mobile_seconds_since_sent) < 60) {
      return res.status(429).json({ error: 'Wait a minute before requesting another code' });
    }

    mobileOtp = createOtp();
    mobileOtpHash = await bcrypt.hash(mobileOtp, 10);
    await pool.execute(
      `UPDATE pending_registrations
       SET mobile_otp_hash = ?,
           mobile_otp_attempts = 0,
           mobile_otp_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${OTP_TTL_MINUTES} MINUTE),
           mobile_last_sent_at = UTC_TIMESTAMP(),
           expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${OTP_TTL_MINUTES} MINUTE)
       WHERE registration_id = ?`,
      [mobileOtpHash, claims.sub]
    );
  } catch (error) {
    return handleServerError('Mobile OTP resend', error, res);
  }

  try {
    await sendMobileOtp(pending.mobile, mobileOtp);
    return res.json({
      message: 'A new verification code was sent to your mobile number.',
      registrationToken: createRegistrationToken(claims.sub, 'mobile')
    });
  } catch (error) {
    console.error('Mobile OTP delivery failed:', error.message);
    return res.status(502).json({ error: 'Could not resend the mobile verification code' });
  }
});

router.post('/register/verify-mobile', async (req, res) => {
  const claims = requireRegistrationClaims(req, res, 'mobile');
  if (!claims) {
    return;
  }

  const { otp } = req.body ?? {};
  if (!isNonEmptyString(otp) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Enter the 6-digit mobile verification code' });
  }

  let connection;
  let transactionStarted = false;
  try {
    const pool = require('../db');
    const pending = await findPendingRegistration(pool, claims.sub);
    if (
      !pending ||
      isExpired(pending.expires_at) ||
      isExpired(pending.mobile_otp_expires_at) ||
      !pending.email_verified
    ) {
      return res.status(410).json({ error: 'This mobile verification code has expired' });
    }

    if (pending.mobile_verified) {
      return res.status(409).json({ error: 'This mobile number is already verified' });
    }

    if (Number(pending.mobile_otp_attempts) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect codes. Request a new code.' });
    }

    if (!(await bcrypt.compare(otp, pending.mobile_otp_hash))) {
      await pool.execute(
        `UPDATE pending_registrations
         SET mobile_otp_attempts = mobile_otp_attempts + 1
         WHERE registration_id = ?`,
        [claims.sub]
      );
      return res.status(400).json({ error: 'The mobile verification code is incorrect' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    const [result] = await connection.execute(
      `INSERT INTO users (username, email, mobile, password_hash)
       VALUES (?, ?, ?, ?)`,
      [pending.username, pending.email, pending.mobile, pending.password_hash]
    );

    const [rows] = await connection.execute(
      `SELECT user_id, username, email, mobile, role, created_at
       FROM users
       WHERE user_id = ?`,
      [result.insertId]
    );

    const user = rows[0];
    if (!user) {
      throw new Error('Created user could not be loaded');
    }

    const token = createToken(user);
    await connection.execute(
      'DELETE FROM pending_registrations WHERE registration_id = ?',
      [claims.sub]
    );
    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      message: 'Email and mobile verified. Your account has been created.',
      user,
      token
    });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Mobile verification rollback failed:', rollbackError.message);
      }
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Username, email or mobile already exists'
      });
    }

    return handleServerError('Mobile verification', error, res);
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.post('/login', async (req, res) => {
  const identifier = req.body?.identifier ?? req.body?.email ?? req.body?.username ?? req.body?.mobile;
  const { password } = req.body ?? {};

  if (!isNonEmptyString(identifier) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: 'Username, mobile, email and password are required' });
  }

  try {
    const pool = require('../db');
    const cleanIdentifier = identifier.trim();
    const [rows] = await pool.execute(
      `SELECT user_id, username, email, mobile, password_hash, role
       FROM users
       WHERE LOWER(username) = LOWER(?)
          OR LOWER(email) = LOWER(?)
          OR mobile = ?
       LIMIT 1`,
      [cleanIdentifier, cleanIdentifier, cleanIdentifier]
    );

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username, mobile, email or password' });
    }

    return res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      },
      token: createToken(user)
    });
  } catch (error) {
    return handleServerError('Login', error, res);
  }
});

module.exports = router;
