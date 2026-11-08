const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const requireRole = require('../middleware/requireRole');
const pool = require('../db');

const router = express.Router();

router.get('/users', authenticateToken, requireRole('admin'), async (_req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT user_id, username, email, mobile, role, mobile_verified, created_at
       FROM users
       ORDER BY user_id DESC`
    );

    return res.json({ users });
  } catch (error) {
    console.error('Loading admin users failed:', error.message);
    return res.status(500).json({ error: 'Could not load users' });
  }
});

module.exports = router;
