const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const pool = require('../db');

const router = express.Router();

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT user_id, username, email, mobile, role, created_at
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [req.user.sub]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: rows[0] });
  } catch (error) {
    console.error('Loading authenticated user failed:', error.message);
    return res.status(500).json({ error: 'Could not load user' });
  }
});

module.exports = router;
