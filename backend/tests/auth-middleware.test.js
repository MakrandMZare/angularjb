const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../src/middleware/authenticateToken');
const requireRole = require('../src/middleware/requireRole');

const secret = 'test-secret-with-sufficient-length';
process.env.JWT_SECRET = secret;

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function accessToken(overrides = {}) {
  return jwt.sign(
    {
      sub: '17',
      role: 'user',
      tokenType: 'access',
      ...overrides
    },
    secret,
    {
      algorithm: 'HS256',
      issuer: 'angularjb-api',
      audience: 'angularjb-client',
      expiresIn: '5m'
    }
  );
}

test('requires a bearer token', () => {
  const res = createResponse();
  let continued = false;

  authenticateToken({ get: () => undefined }, res, () => {
    continued = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(continued, false);
});

test('accepts a signed access token and assigns its claims', () => {
  const req = { get: () => `Bearer ${accessToken()}` };
  const res = createResponse();
  let continued = false;

  authenticateToken(req, res, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.equal(req.user.sub, '17');
  assert.equal(req.user.role, 'user');
});

test('rejects a registration token as an access token', () => {
  const token = accessToken({ tokenType: 'registration' });
  const res = createResponse();

  authenticateToken({ get: () => `Bearer ${token}` }, res, () => {
    assert.fail('registration tokens must not authorize API access');
  });

  assert.equal(res.statusCode, 401);
});

test('restricts admin routes to the admin role', () => {
  const res = createResponse();
  let continued = false;

  requireRole('admin')({ user: { role: 'user' } }, res, () => {
    continued = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(continued, false);
});
