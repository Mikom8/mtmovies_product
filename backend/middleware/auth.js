const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId, tokenVersion = 0) => {
  return jwt.sign({ id: userId, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Middleware: protect routes (require login)
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('../models/User');
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ error: 'User no longer exists.' });
    // Validate token version — mismatch means user logged out all devices
    // Use ?? 0 so existing users without this field in the DB are not incorrectly rejected
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (req.user.tokenVersion ?? 0)) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// Middleware: check if user has a valid subscription
const requirePlan = (requiredPlan) => {
  const planLevels = { free: 0, basic: 1, popular: 2, family: 3 };
  return (req, res, next) => {
    const userLevel = planLevels[req.user.plan] || 0;
    const required = planLevels[requiredPlan] || 0;

    if (userLevel < required) {
      return res.status(403).json({
        error: 'Upgrade your plan to access this content.',
        requiredPlan
      });
    }

    // Check plan hasn't expired
    if (req.user.planExpiresAt && new Date() > req.user.planExpiresAt) {
      return res.status(403).json({ error: 'Your subscription has expired. Please renew.' });
    }

    next();
  };
};

module.exports = { generateToken, protect, requirePlan };
