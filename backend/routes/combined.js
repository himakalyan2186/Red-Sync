// ── hospitals.js ──────────────────────────────────────────────────────────────
const express = require('express');
const { pool: db } = require('../config/db');
const { auth } = require('../middleware/auth');

const hospitalsRouter = express.Router();
hospitalsRouter.get('/', async (_, res) => {
  try { const [r] = await db.query('SELECT id,hospital_name,city,address,phone,verified FROM hospitals WHERE verified=1'); res.json(r); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
hospitalsRouter.get('/profile', auth, async (req, res) => {
  try {
    const [r] = await db.query('SELECT id,hospital_name,email,address,city,pincode,phone,verified,created_at FROM hospitals WHERE id=?', [req.user.id]);
    if (!r.length) return res.status(404).json({ message: 'Not found' });
    res.json(r[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
hospitalsRouter.get('/requests', auth, async (req, res) => {
  try {
    const [r] = await db.query(
      `SELECT br.*, u.name AS seeker_name FROM blood_requests br JOIN users u ON br.seeker_id=u.id WHERE br.hospital_id=? ORDER BY br.created_at DESC`,
      [req.user.id]);
    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── bloodCamps.js ─────────────────────────────────────────────────────────────
const campsRouter = express.Router();
campsRouter.get('/', async (req, res) => {
  try {
    const { city } = req.query;
    let q = `SELECT bc.*, h.hospital_name, h.city AS hospital_city,
             (SELECT COUNT(*) FROM camp_registrations cr WHERE cr.camp_id=bc.id) AS registered_count
             FROM blood_camps bc JOIN hospitals h ON bc.hospital_id=h.id WHERE bc.date>=CURDATE()`;
    const p = [];
    if (city) { q += ' AND (bc.city LIKE ? OR h.city LIKE ?)'; p.push(`%${city}%`,`%${city}%`); }
    q += ' ORDER BY bc.date ASC';
    const [r] = await db.query(q, p);
    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
campsRouter.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'hospital') return res.status(403).json({ message: 'Hospital only' });
    const { camp_name, date, time, city, location, description, max_participants } = req.body;
    const [r] = await db.query(
      'INSERT INTO blood_camps (hospital_id,camp_name,date,time,city,location,description,max_participants) VALUES (?,?,?,?,?,?,?,?)',
      [req.user.id, camp_name, date, time||null, city, location||null, description||null, max_participants||100]
    );
    res.status(201).json({ id: r.insertId, message: 'Camp created' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
campsRouter.post('/:id/register', auth, async (req, res) => {
  try {
    await db.query('INSERT INTO camp_registrations (camp_id,user_id) VALUES (?,?)', [req.params.id, req.user.id]);
    res.json({ message: 'Registered for camp!' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Already registered for this camp' });
    res.status(500).json({ message: err.message });
  }
});
campsRouter.get('/my-registrations', auth, async (req, res) => {
  try {
    const [r] = await db.query(
      `SELECT bc.*, h.hospital_name FROM camp_registrations cr JOIN blood_camps bc ON cr.camp_id=bc.id JOIN hospitals h ON bc.hospital_id=h.id WHERE cr.user_id=? ORDER BY bc.date DESC`,
      [req.user.id]);
    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
campsRouter.get('/my-camps', auth, async (req, res) => {
  try {
    const [r] = await db.query(
      `SELECT bc.*, (SELECT COUNT(*) FROM camp_registrations cr WHERE cr.camp_id=bc.id) AS registered_count FROM blood_camps bc WHERE bc.hospital_id=? ORDER BY bc.date DESC`,
      [req.user.id]);
    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── donations.js ──────────────────────────────────────────────────────────────
const donationsRouter = express.Router();
donationsRouter.get('/history', auth, async (req, res) => {
  try {
    const [r] = await db.query(
      `SELECT d.*, br.patient_name, br.blood_group, br.hospital_name FROM donations d LEFT JOIN blood_requests br ON d.request_id=br.id WHERE d.donor_id=? ORDER BY d.donation_date DESC`,
      [req.user.id]);
    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── admin.js ──────────────────────────────────────────────────────────────────
const adminRouter = express.Router();
const { adminOnly } = require('../middleware/auth');
adminRouter.use(auth, adminOnly);
adminRouter.get('/dashboard', async (_, res) => {
  try {
    const [[u]] = await db.query("SELECT COUNT(*) c FROM users WHERE role!='admin'");
    const [[h]] = await db.query('SELECT COUNT(*) c FROM hospitals');
    const [[ph]] = await db.query('SELECT COUNT(*) c FROM hospitals WHERE verified=0');
    const [[rq]] = await db.query('SELECT COUNT(*) c FROM blood_requests');
    const [pending] = await db.query('SELECT id,hospital_name,email,city,phone,created_at FROM hospitals WHERE verified=0 ORDER BY created_at DESC');
    const [recent] = await db.query("SELECT id,name,email,role,blood_group,city,created_at FROM users WHERE role!='admin' ORDER BY created_at DESC LIMIT 10");
    res.json({ stats: { users: u.c, hospitals: h.c, pendingHospitals: ph.c, requests: rq.c }, pendingHospitals: pending, recentUsers: recent });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
adminRouter.put('/hospitals/:id/verify', async (req, res) => {
  try { await db.query('UPDATE hospitals SET verified=1, verified_at=NOW() WHERE id=?', [req.params.id]); res.json({ message: 'Hospital verified ✅' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
adminRouter.put('/hospitals/:id/reject', async (req, res) => {
  try { await db.query('DELETE FROM hospitals WHERE id=? AND verified=0', [req.params.id]); res.json({ message: 'Hospital rejected' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
adminRouter.put('/users/:id/suspend', async (req, res) => {
  try { await db.query('UPDATE users SET is_active=0 WHERE id=?', [req.params.id]); res.json({ message: 'User suspended' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
adminRouter.put('/users/:id/activate', async (req, res) => {
  try { await db.query('UPDATE users SET is_active=1 WHERE id=?', [req.params.id]); res.json({ message: 'User re-activated' }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
adminRouter.get('/users', async (_, res) => {
  try { const [r] = await db.query("SELECT id,name,email,role,blood_group,city,is_active,donation_count,badge,created_at FROM users WHERE role!='admin' ORDER BY created_at DESC"); res.json(r); }
  catch (err) { res.status(500).json({ message: err.message }); }
});
adminRouter.get('/hospitals', async (_, res) => {
  try { const [r] = await db.query('SELECT id,hospital_name,email,city,phone,verified,created_at FROM hospitals ORDER BY verified ASC, created_at DESC'); res.json(r); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// ── stats.js ──────────────────────────────────────────────────────────────────
const statsRouter = express.Router();
statsRouter.get('/', async (_, res) => {
  try {
    const [[tD]]  = await db.query("SELECT COUNT(*) c FROM users WHERE role='donor' AND is_active=1");
    const [[tR]]  = await db.query('SELECT COUNT(*) c FROM blood_requests');
    const [[pR]]  = await db.query("SELECT COUNT(*) c FROM blood_requests WHERE status='Pending'");
    const [[cD]]  = await db.query('SELECT COUNT(*) c FROM donations');
    const [[vH]]  = await db.query('SELECT COUNT(*) c FROM hospitals WHERE verified=1');
    const [[uC]]  = await db.query('SELECT COUNT(*) c FROM blood_camps WHERE date>=CURDATE()');
    const [bgS]   = await db.query("SELECT blood_group, COUNT(*) cnt FROM users WHERE role='donor' AND is_active=1 GROUP BY blood_group ORDER BY cnt DESC");
    const [recent]= await db.query('SELECT d.donation_date, u.name donor_name, u.blood_group FROM donations d JOIN users u ON d.donor_id=u.id ORDER BY d.donation_date DESC LIMIT 5');
    res.json({ totalDonors: tD.c, totalRequests: tR.c, pendingRequests: pR.c, completedDonations: cD.c, verifiedHospitals: vH.c, upcomingCamps: uC.c, bloodGroupStats: bgS, recentDonations: recent });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = { hospitalsRouter, campsRouter, donationsRouter, adminRouter, statsRouter };
