function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role.toLowerCase() !== requiredRole.toLowerCase()) {
      return res.status(403).json({ error: 'You are not authorized to access this resource' });
    }

    return next();
  };
}

module.exports = requireRole;
