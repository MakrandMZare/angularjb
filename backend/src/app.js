app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      username,
      email,
      mobile,
      password
    } = req.body;

    if (!username || !email || !mobile || !password) {
      return res.status(400).json({
        error: 'Username, email, mobile and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users
       (username, email, mobile, password_hash)
       VALUES (?, ?, ?, ?)`,
      [
        cleanUsername,
        cleanEmail,
        cleanMobile,
        passwordHash
      ]
    );

    const [rows] = await pool.execute(
      `SELECT user_id, username, email, mobile, role, created_at
       FROM users
       WHERE id = ?`,
      [result.insertId]
    );

    const user = rows[0];
    const token = generateToken(user);

    return res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Username, email or mobile already exists'
      });
    }

    console.error(error);

    return res.status(500).json({
      error: 'Registration failed'
    });
  }
});