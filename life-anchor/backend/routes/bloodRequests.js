const router = require('express').Router();
const { pool: db } = require('../config/db');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Create request
router.post('/', auth, async (req, res) => {
  try {
    const { patient_name, blood_group, units, emergency_level, description, hospital_id, hospital_name, city } = req.body;
    const sessionId = uuidv4();
    const [r] = await db.query(
      `INSERT INTO blood_requests (seeker_id,patient_name,blood_group,units,emergency_level,description,hospital_id,hospital_name,city,chat_session_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.user.id, patient_name, blood_group, units, emergency_level, description||null, hospital_id||null, hospital_name||null, city, sessionId]
    );
    // Notify matching eligible donors
    const [donors] = await db.query(
      `SELECT id FROM users WHERE blood_group=? AND role='donor' AND is_active=1 AND city=?
       AND (last_donation_date IS NULL OR DATEDIFF(NOW(),last_donation_date)>=90)`,
      [blood_group, city]
    );
    if (donors.length) {
      const vals = donors.map(d => [d.id, null, 'blood_request',
        `🩸 Blood Needed: ${blood_group}`,
        `${units} unit(s) of ${blood_group} needed at ${hospital_name||city}. Emergency: ${emergency_level}`
      ]);
      await db.query('INSERT INTO notifications (user_id,hospital_id,type,title,message) VALUES ?', [vals]);
    }
    // Critical → also notify verified hospitals
    if (emergency_level === 'Critical') {
      const [hosps] = await db.query('SELECT id FROM hospitals WHERE verified=1 AND city=?', [city]);
      if (hosps.length) {
        const hVals = hosps.map(h => [null, h.id, 'emergency',
          `🚨 CRITICAL: ${blood_group} Urgently Needed`,
          `Critical request for ${patient_name} at ${hospital_name||city}`
        ]);
        await db.query('INSERT INTO notifications (user_id,hospital_id,type,title,message) VALUES ?', [hVals]);
      }
    }
    res.status(201).json({ id: r.insertId, sessionId, message: 'Request created. Donors notified.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// List requests (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { blood_group, city, status, limit = 20, offset = 0 } = req.query;
    let q = `SELECT br.*, u.name AS seeker_name, h.hospital_name AS verified_hospital
             FROM blood_requests br
             LEFT JOIN users u ON br.seeker_id=u.id
             LEFT JOIN hospitals h ON br.hospital_id=h.id WHERE 1=1`;
    const p = [];
    if (blood_group) { q += ' AND br.blood_group=?'; p.push(blood_group); }
    if (city)        { q += ' AND br.city LIKE ?';   p.push(`%${city}%`); }
    if (status)      { q += ' AND br.status=?';      p.push(status); }
    q += ' ORDER BY (br.emergency_level="Critical") DESC, br.created_at DESC LIMIT ? OFFSET ?';
    p.push(parseInt(limit), parseInt(offset));
    const [rows] = await db.query(q, p);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// My requests (seeker) - includes full donor contact when accepted
router.get('/my', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT br.*,
              u.name  AS donor_name,
              u.phone AS donor_phone,
              u.city  AS donor_city,
              u.blood_group AS donor_blood_group,
              u.donation_count AS donor_donation_count,
              u.badge AS donor_badge
       FROM blood_requests br
       LEFT JOIN users u ON br.accepted_by=u.id
       WHERE br.seeker_id=?
       ORDER BY br.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Accept request (donor)
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const [dRows] = await db.query('SELECT * FROM users WHERE id=? AND role="donor"', [req.user.id]);
    if (!dRows.length) return res.status(403).json({ message: 'Only donors can accept requests' });
    const donor = dRows[0];

    if (donor.last_donation_date) {
      const days = Math.floor((Date.now() - new Date(donor.last_donation_date)) / 86400000);
      if (days < 90) return res.status(400).json({ message: `You must wait ${90 - days} more days before donating again.` });
    }

    const [rRows] = await db.query('SELECT * FROM blood_requests WHERE id=?', [req.params.id]);
    if (!rRows.length) return res.status(404).json({ message: 'Request not found' });
    const req_ = rRows[0];
    if (req_.status !== 'Pending') return res.status(400).json({ message: `Request is already ${req_.status}` });
    if (req_.blood_group !== donor.blood_group)
      return res.status(400).json({ message: `Blood group mismatch. Request needs ${req_.blood_group}, you are ${donor.blood_group}.` });

    await db.query('UPDATE blood_requests SET status="Accepted", accepted_by=? WHERE id=?', [req.user.id, req.params.id]);

    // Notify seeker with FULL donor contact info
    await db.query(
      'INSERT INTO notifications (user_id,type,title,message) VALUES (?,?,?,?)',
      [req_.seeker_id, 'blood_request',
       '✅ Donor Found!',
       `${donor.name} (${donor.blood_group}) has accepted your request. Phone: ${donor.phone||'Not provided'}. City: ${donor.city||'—'}`
      ]
    );

    res.json({
      message: 'Request accepted successfully!',
      sessionId: req_.chat_session_id,
      donor: { name: donor.name, phone: donor.phone, city: donor.city, blood_group: donor.blood_group },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update status (seeker only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Completed','Cancelled'].includes(status))
      return res.status(400).json({ message: 'Invalid status. Use Completed or Cancelled.' });

    const [rRows] = await db.query('SELECT * FROM blood_requests WHERE id=? AND seeker_id=?', [req.params.id, req.user.id]);
    if (!rRows.length) return res.status(404).json({ message: 'Request not found or not yours' });
    const req_ = rRows[0];

    await db.query('UPDATE blood_requests SET status=? WHERE id=?', [status, req.params.id]);

    if (status === 'Completed' && req_.accepted_by) {
      await db.query(`UPDATE users SET donation_count=donation_count+1, last_donation_date=CURDATE() WHERE id=?`, [req_.accepted_by]);
      const [[d]] = await db.query('SELECT donation_count FROM users WHERE id=?', [req_.accepted_by]);
      let badge = d.donation_count >= 25 ? 'Life Anchor' : d.donation_count >= 10 ? 'Hero' : d.donation_count >= 5 ? 'Lifesaver' : 'Helper';
      await db.query('UPDATE users SET badge=? WHERE id=?', [badge, req_.accepted_by]);
      await db.query('INSERT INTO donations (donor_id,request_id,donation_date,units) VALUES (?,?,CURDATE(),?)', [req_.accepted_by, req.params.id, req_.units]);
      // Notify donor of completion
      await db.query('INSERT INTO notifications (user_id,type,title,message) VALUES (?,?,?,?)',
        [req_.accepted_by, 'system', '🎉 Donation Confirmed!', `Your donation for ${req_.patient_name} has been confirmed. Thank you for saving a life!`]);
    }
    res.json({ message: `Request marked as ${status}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get single request (for chat page - both donor and seeker can access if involved)
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT br.*,
              s.name AS seeker_name, s.phone AS seeker_phone, s.city AS seeker_city,
              d.name AS donor_name,  d.phone AS donor_phone,  d.city AS donor_city,
              d.blood_group AS donor_blood_group, d.badge AS donor_badge,
              h.hospital_name AS verified_hospital_name
       FROM blood_requests br
       LEFT JOIN users s ON br.seeker_id=s.id
       LEFT JOIN users d ON br.accepted_by=d.id
       LEFT JOIN hospitals h ON br.hospital_id=h.id
       WHERE br.id=?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Request not found' });
    const r = rows[0];
    // Only the seeker or the accepted donor can see full details
    const isSeekerOrDonor = r.seeker_id === req.user.id || r.accepted_by === req.user.id || req.user.role === 'admin';
    if (!isSeekerOrDonor) return res.status(403).json({ message: 'Access denied' });
    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
