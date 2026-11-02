const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authorization = req.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token is required' });
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not configured');
    return res.status(500).json({ error: 'Authentication is not configured' });
  }

  try {
    const claims = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'angularjb-api',
      audience: 'angularjb-client'
    });

    if (
      typeof claims === 'string' ||
      claims.tokenType !== 'access' ||
      !claims.sub ||
      typeof claims.role !== 'string'
    ) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    req.user = claims;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

module.exports = authenticateToken;
