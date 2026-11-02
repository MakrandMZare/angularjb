app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const [rows] = await pool.execute(
      `SELECT user_id, username, email, mobile,
              password_hash, role
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const user = rows[0];

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const token = generateToken(user);

    return res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Login failed'
    });
  }
});