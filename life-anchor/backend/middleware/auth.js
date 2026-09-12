const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'lifeanchor_secret_2024';

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

const hospitalOnly = (req, res, next) => {
  if (!['hospital', 'admin'].includes(req.user?.role))
    return res.status(403).json({ message: 'Hospital access required' });
  next();
};

module.exports = { auth, adminOnly, hospitalOnly };
