const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(express.json());

app.use(cors({
  origin: [
    'http://localhost:4200',
    'PORT=3000', 
    'https://janbazar.com'
  ]
}));

const PORT = Number(process.env.PORT || 3000);

app.get('/', (_req, res) => {
  res.json({
    name: 'JanBazar API',
    endpoints: {
      register: 'POST /api/auth/register',
      verifyEmail: 'POST /api/auth/register/verify-email',
      resendEmailCode: 'POST /api/auth/register/resend-email',
      verifyMobile: 'POST /api/auth/register/verify-mobile',
      resendMobileCode: 'POST /api/auth/register/resend-mobile',
      login: 'POST /api/auth/login',
      currentUser: 'GET /api/users/me (Bearer access token required)',
      adminUsers: 'GET /api/admin/users (admin access token required)'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});