import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../utils/api';
import ChatWindow from '../components/ChatWindow';

const BGs = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const STEPS = ['Pending','Accepted','Completed'];

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [chat, setChat] = useState(null); // { sessionId, request, donor }
  const [form, setForm] = useState({ patient_name:'', blood_group:'', units:1, emergency_level:'Medium', description:'', hospital_id:'', hospital_name:'', city:'' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [r, h] = await Promise.all([api.get('/blood-requests/my'), api.get('/hospitals')]);
      setRequests(r.data);
      setHospitals(h.data);
    } catch {}
    setLoading(false);
  };

  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const pickHospital = (id) => {
    const h = hospitals.find(x => String(x.id) === String(id));
    setForm(f => ({...f, hospital_id:id, hospital_name:h?.hospital_name||'', city:f.city||h?.city||''}));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/blood-requests', form);
      toast.success('Request created! Notifying matching donors 🩸');
      setForm({ patient_name:'', blood_group:'', units:1, emergency_level:'Medium', description:'', hospital_id:'', hospital_name:'', city:'' });
      setTab('requests');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    setSubmitting(false);
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this request?')) return;
    try { await api.put(`/blood-requests/${id}/status`, { status:'Cancelled' }); toast.success('Request cancelled'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const complete = async (id) => {
    try { await api.put(`/blood-requests/${id}/status`, { status:'Completed' }); toast.success('Donation confirmed! 🎉 Donor rewarded.'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openChat = (req) => {
    if (!req.chat_session_id) { toast.error('No chat session for this request'); return; }
    setChat({
      sessionId: req.chat_session_id,
      request: req,
      donor: req.accepted_by ? {
        id: req.accepted_by,
        name: req.donor_name,
        phone: req.donor_phone,
        city: req.donor_city,
        blood_group: req.donor_blood_group,
        badge: req.donor_badge,
        role: 'donor',
      } : null,
    });
  };

  const stepIdx = (s) => STEPS.indexOf(s);

  if (loading) return <div className="page loading"><div className="spinner"></div>Loading…</div>;

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:28, paddingBottom:24, borderBottom:'1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--muted)', marginBottom:4 }}>Seeker Dashboard</div>
          <h1 style={{ fontSize:'1.8rem', marginBottom:10 }}>🙏 {user.name}</h1>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <span className="badge badge-pending">Seeker</span>
            <span className="bchip" style={{ width:32,height:32,fontSize:'0.72rem' }}>{user.blood_group}</span>
            {user.city && <span style={{ fontSize:'0.85rem', color:'var(--muted)' }}>📍 {user.city}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:28 }}>
        {[
          [requests.length,'Total Requests','📋'],
          [requests.filter(r=>r.status==='Pending').length,'Pending','⏳'],
          [requests.filter(r=>r.status==='Accepted').length,'Donor Found','✅'],
          [requests.filter(r=>r.status==='Completed').length,'Completed','🎉'],
        ].map(([n,l,i]) => (
          <div key={l} className="stat-card"><div className="stat-num">{n}</div><div className="stat-lbl">{l}</div><div className="stat-ico">{i}</div></div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:24 }}>
        <button className={`tab ${tab==='requests'?'active':''}`} onClick={()=>setTab('requests')}>📋 My Requests</button>
        <button className={`tab ${tab==='create'?'active':''}`} onClick={()=>setTab('create')}>➕ New Request</button>
      </div>

      {/* MY REQUESTS */}
      {tab==='requests' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {requests.length===0 ? (
            <div className="empty">
              <div className="ico">🩸</div>
              <p>No requests yet.</p>
              <button className="btn btn-primary" style={{ marginTop:16 }} onClick={()=>setTab('create')}>Create First Request</button>
            </div>
          ) : requests.map(r => (
            <div key={r.id} className={`card req-card ${r.emergency_level==='Critical'?'critical':''}`}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div className="bchip">{r.blood_group}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'1.05rem', marginBottom:4 }}>{r.patient_name}</div>
                    <div style={{ fontSize:'0.83rem', color:'var(--text2)' }}>
                      🏥 {r.hospital_name||'Not specified'} · 📍 {r.city} · 🩸 {r.units} unit(s)
                    </div>
                    {r.description && <div style={{ marginTop:6, fontSize:'0.83rem', color:'var(--muted)' }}>{r.description}</div>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span className={`badge badge-${r.emergency_level.toLowerCase()}`}>{r.emergency_level}</span>
                  <span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span>
                </div>
              </div>

              {/* Status tracker */}
              <div className="status-track">
                {STEPS.map((step, i) => {
                  const cur = stepIdx(r.status);
                  const cls = i < cur ? 'done' : i === cur ? 'active' : '';
                  return (
                    <div key={step} className={`s-step ${cls}`}>
                      <div className="s-dot">{i < cur ? '✓' : i+1}</div>
                      <div className="s-label">{step}</div>
                    </div>
                  );
                })}
              </div>

              {/* DONOR CONTACT CARD — shown when accepted */}
              {r.status === 'Accepted' && r.donor_name && (
                <div className="contact-card">
                  <div className="contact-header">
                    <div className="contact-avatar">{r.donor_name.charAt(0)}</div>
                    <div>
                      <div className="contact-name">💉 {r.donor_name}</div>
                      <div className="contact-meta">
                        {r.donor_blood_group && <span className="bchip" style={{ width:26,height:26,fontSize:'0.65rem',display:'inline-flex',marginRight:6 }}>{r.donor_blood_group}</span>}
                        {r.donor_badge && <span>{r.donor_badge} · </span>}
                        {r.donor_city && <span>📍 {r.donor_city}</span>}
                      </div>
                    </div>
                    <div style={{ marginLeft:'auto' }}>
                      <span className="badge badge-completed">Donor Found ✅</span>
                    </div>
                  </div>
                  <div className="contact-actions">
                    {r.donor_phone ? (
                      <>
                        <a href={`tel:${r.donor_phone}`} className="btn btn-primary btn-sm">📞 {r.donor_phone}</a>
                        <a href={`https://wa.me/${r.donor_phone.replace(/\D/g,'')}?text=Hi%20${encodeURIComponent(r.donor_name)}%2C%20I%20am%20${encodeURIComponent(user.name)}%20from%20Life%20Anchor.%20Thank%20you%20for%20accepting%20my%20blood%20request!`} target="_blank" rel="noreferrer" className="btn btn-whatsapp btn-sm">💬 WhatsApp</a>
                      </>
                    ) : (
                      <span style={{ fontSize:'0.83rem', color:'var(--muted)' }}>⚠️ No phone number provided</span>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={()=>openChat(r)}>💬 Open Chat</button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:14, flexWrap:'wrap' }}>
                <span style={{ fontSize:'0.78rem', color:'var(--muted)', alignSelf:'center' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                {r.status==='Accepted' && (
                  <button className="btn btn-success btn-sm" onClick={()=>complete(r.id)}>✅ Mark Completed</button>
                )}
                {['Pending','Accepted'].includes(r.status) && (
                  <button className="btn btn-outline btn-sm" style={{ borderColor:'#ef4444',color:'#ef4444' }} onClick={()=>cancel(r.id)}>Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE REQUEST */}
      {tab==='create' && (
        <div className="card" style={{ maxWidth:640 }}>
          <h2 style={{ marginBottom:22 }}>🩸 New Blood Request</h2>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input className="form-control" placeholder="Patient's full name" value={form.patient_name} onChange={e=>set('patient_name',e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Required Blood Group</label>
                <select className="form-control" value={form.blood_group} onChange={e=>set('blood_group',e.target.value)} required>
                  <option value="">Select</option>
                  {BGs.map(bg=><option key={bg}>{bg}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Units Required</label>
                <input type="number" className="form-control" min={1} max={10} value={form.units} onChange={e=>set('units',e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Level</label>
                <select className="form-control" value={form.emergency_level} onChange={e=>set('emergency_level',e.target.value)}>
                  <option>Low</option><option>Medium</option><option>Critical</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Hospital (Verified)</label>
              <select className="form-control" value={form.hospital_id} onChange={e=>pickHospital(e.target.value)}>
                <option value="">— Select verified hospital (optional) —</option>
                {hospitals.map(h=><option key={h.id} value={h.id}>🏥 {h.hospital_name} — {h.city}</option>)}
              </select>
            </div>
            {!form.hospital_id && (
              <div className="form-group">
                <label className="form-label">Hospital Name (if not verified)</label>
                <input className="form-control" placeholder="Hospital name" value={form.hospital_name} onChange={e=>set('hospital_name',e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-control" placeholder="City where blood is needed" value={form.city} onChange={e=>set('city',e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-control" rows={3} placeholder="Patient condition, urgency details…" value={form.description} onChange={e=>set('description',e.target.value)} />
            </div>
            {form.emergency_level==='Critical' && (
              <div className="warn-banner">🚨 Critical — all matching donors and verified hospitals in your city will be notified immediately.</div>
            )}
            <div style={{ display:'flex', gap:12 }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting ? '⏳ Submitting…' : '🩸 Submit Request'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={()=>setTab('requests')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Chat window */}
      {chat && (
        <ChatWindow
          sessionId={chat.sessionId}
          currentUser={{ id: user.id, name: user.name, role: user.role }}
          otherParty={chat.donor}
          requestInfo={chat.request}
          onClose={() => setChat(null)}
        />
      )}
    </div>
  );
}
