// routes/users.js
const router = require('express').Router();
const { pool: db } = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/profile', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id,name,email,blood_group,age,gender,phone,city,pincode,role,last_donation_date,donation_count,badge,created_at FROM users WHERE id=?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, city, pincode, age, gender } = req.body;
    await db.query('UPDATE users SET name=?,phone=?,city=?,pincode=?,age=?,gender=? WHERE id=?',
      [name, phone, city, pincode, age, gender, req.user.id]);
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const { blood_group, city } = req.query;
    let q = `SELECT id,name,blood_group,city,donation_count,badge,last_donation_date FROM users WHERE role='donor' AND is_active=1`;
    const p = [];
    if (blood_group) { q += ' AND blood_group=?'; p.push(blood_group); }
    if (city)        { q += ' AND city LIKE ?';   p.push(`%${city}%`); }
    q += ' ORDER BY donation_count DESC LIMIT 50';
    const [rows] = await db.query(q, p);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/notifications', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
