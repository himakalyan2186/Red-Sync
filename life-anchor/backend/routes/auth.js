const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool: db } = require('../config/db');
const JWT_SECRET = process.env.JWT_SECRET || 'lifeanchor_secret_2024';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, blood_group, age, gender, phone, city, pincode, role, last_donation_date } = req.body;
    const [ex] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (ex.length) return res.status(400).json({ message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const userRole = ['donor','seeker'].includes(role) ? role : 'seeker';
    const [r] = await db.query(
      'INSERT INTO users (name,email,password,blood_group,age,gender,phone,city,pincode,role,last_donation_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [name, email, hashed, blood_group, age||null, gender||null, phone||null, city||null, pincode||null, userRole, last_donation_date||null]
    );
    const token = jwt.sign({ id: r.insertId, email, role: userRole, name }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: r.insertId, name, email, role: userRole, blood_group, city, phone } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE email=?', [email]);
    if (!users.length) return res.status(400).json({ message: 'Invalid credentials' });
    const u = users[0];
    if (!u.is_active) return res.status(403).json({ message: 'Account suspended. Contact admin.' });
    if (!await bcrypt.compare(password, u.password)) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userData } = u;
    res.json({ token, user: userData });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/hospital/register', async (req, res) => {
  try {
    const { hospital_name, email, password, address, city, pincode, phone } = req.body;
    const [ex] = await db.query('SELECT id FROM hospitals WHERE email=?', [email]);
    if (ex.length) return res.status(400).json({ message: 'Hospital email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      'INSERT INTO hospitals (hospital_name,email,password,address,city,pincode,phone) VALUES (?,?,?,?,?,?,?)',
      [hospital_name, email, hashed, address||null, city||null, pincode||null, phone||null]
    );
    const token = jwt.sign({ id: r.insertId, email, role: 'hospital', name: hospital_name }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, hospital: { id: r.insertId, hospital_name, email, verified: false } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/hospital/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [hosps] = await db.query('SELECT * FROM hospitals WHERE email=?', [email]);
    if (!hosps.length) return res.status(400).json({ message: 'Invalid credentials' });
    const h = hosps[0];
    if (!await bcrypt.compare(password, h.password)) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: h.id, email: h.email, role: 'hospital', name: h.hospital_name }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...hData } = h;
    res.json({ token, hospital: hData });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
