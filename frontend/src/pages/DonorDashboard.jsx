import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../utils/api';
import ChatWindow from '../components/ChatWindow';

const NEXT = { null:{name:'Helper',need:1}, Helper:{name:'Lifesaver',need:5}, Lifesaver:{name:'Hero',need:10}, Hero:{name:'Life Anchor',need:25}, 'Life Anchor':null };
const ICONS = { Helper:'🤝', Lifesaver:'⭐', Hero:'🦸', 'Life Anchor':'⚓' };

export default function DonorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('requests');
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [camps, setCamps] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ blood_group:'', city:'' });
  const [chat, setChat] = useState(null); // { sessionId, request, seeker }
  const [acceptedReq, setAcceptedReq] = useState(null); // request the donor accepted, to show seeker contact

  useEffect(() => { loadProfile(); loadNotifs(); }, []);
  useEffect(() => { if (tab==='requests') loadRequests(); }, [tab, filter]);
  useEffect(() => { if (tab==='history') loadDonations(); }, [tab]);
  useEffect(() => { if (tab==='camps') loadCamps(); }, [tab]);

  const loadProfile = async () => {
    try { const r = await api.get('/users/profile'); setProfile(r.data); } catch {}
    setLoading(false);
  };
  const loadNotifs = async () => {
    try { const r = await api.get('/users/notifications'); setNotifs(r.data); } catch {}
  };
  const loadRequests = async () => {
    try {
      const p = {};
      if (filter.blood_group) p.blood_group = filter.blood_group;
      if (filter.city) p.city = filter.city;
      const r = await api.get('/blood-requests', { params: p });
      setRequests(r.data.filter(x => x.status==='Pending'));
    } catch {}
  };
  const loadDonations = async () => {
    try { const r = await api.get('/donations/history'); setDonations(r.data); } catch {}
  };
  const loadCamps = async () => {
    try { const r = await api.get('/blood-camps'); setCamps(r.data); } catch {}
  };

  const accept = async (req) => {
    try {
      const { data } = await api.put(`/blood-requests/${req.id}/accept`);
      toast.success('Request accepted! Seeker has been notified. ✅');
      // Show seeker contact and open chat
      setAcceptedReq({ ...req, sessionId: data.sessionId });
      setChat({
        sessionId: data.sessionId,
        request: req,
        seeker: { id: req.seeker_id, name: req.seeker_name, role:'seeker' },
      });
      loadRequests();
      setProfile(p => p ? {...p, donation_count: p.donation_count} : p);
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot accept'); }
  };

  const registerCamp = async (id) => {
    try { await api.post(`/blood-camps/${id}/register`); toast.success('Registered for camp! 📅'); loadCamps(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const markRead = async (id) => {
    await api.put(`/users/notifications/${id}/read`);
    setNotifs(n => n.map(x => x.id===id ? {...x,is_read:1} : x));
  };

  const markAllRead = async () => {
    await api.put('/users/notifications/read-all');
    setNotifs(n => n.map(x => ({...x,is_read:1})));
  };

  const cooldownDays = () => {
    if (!profile?.last_donation_date) return 0;
    return Math.max(0, 90 - Math.floor((Date.now()-new Date(profile.last_donation_date))/86400000));
  };

  const days = cooldownDays();
  const next = NEXT[profile?.badge||'null'] || NEXT[null];

  if (loading) return <div className="page loading"><div className="spinner"></div>Loading…</div>;

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:20, marginBottom:28, paddingBottom:24, borderBottom:'1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--muted)', marginBottom:4 }}>Donor Dashboard</div>
          <h1 style={{ fontSize:'1.8rem', marginBottom:10 }}>
            {ICONS[profile?.badge]||'🩸'} {profile?.name||user.name}
          </h1>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <span className="bchip" style={{ width:32,height:32,fontSize:'0.72rem' }}>{profile?.blood_group||user.blood_group}</span>
            {profile?.city && <span style={{ fontSize:'0.85rem',color:'var(--muted)' }}>📍 {profile.city}</span>}
            {profile?.badge && <span className="badge badge-completed">{ICONS[profile.badge]} {profile.badge}</span>}
            {days>0 ? <span className="badge badge-medium">⏳ {days} days until eligible</span>
                    : <span className="badge badge-completed">✅ Eligible to donate</span>}
          </div>
        </div>

        {/* Badge progress */}
        {next && (
          <div className="badge-prog">
            <div className="badge-prog-title">Next: {ICONS[next.name]} {next.name}</div>
            <div className="prog-bar-wrap">
              <div className="prog-bar" style={{ width:`${Math.min(100,((profile?.donation_count||0)/next.need)*100)}%` }}></div>
            </div>
            <div className="prog-label">{profile?.donation_count||0} / {next.need} donations</div>
          </div>
        )}
        {!next && profile?.badge==='Life Anchor' && (
          <div className="badge-prog" style={{ borderColor:'#D4AF37' }}>
            <div className="badge-prog-title">⚓ Life Anchor — Max Badge!</div>
            <div className="prog-label">{profile?.donation_count} lifetime donations</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:28 }}>
        {[
          [profile?.donation_count||0,'Total Donations','💉'],
          [requests.length,'Open Requests','🩸'],
          [camps.length,'Upcoming Camps','📅'],
          [notifs.filter(n=>!n.is_read).length,'Unread Alerts','🔔'],
        ].map(([n,l,i])=>(
          <div key={l} className="stat-card"><div className="stat-num">{n}</div><div className="stat-lbl">{l}</div><div className="stat-ico">{i}</div></div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:24 }}>
        {[['requests','🩸 Blood Requests'],['history','📋 My Donations'],['camps','📅 Blood Camps'],['notifications','🔔 Notifications']].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* BLOOD REQUESTS */}
      {tab==='requests' && (
        <div>
          <div className="filter-bar">
            <select className="form-control" style={{ width:160 }} value={filter.blood_group} onChange={e=>setFilter(f=>({...f,blood_group:e.target.value}))}>
              <option value="">All Blood Groups</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg=><option key={bg}>{bg}</option>)}
            </select>
            <input className="form-control" style={{ width:200 }} placeholder="Filter by city…" value={filter.city} onChange={e=>setFilter(f=>({...f,city:e.target.value}))} />
          </div>

          {requests.length===0 ? (
            <div className="empty"><div className="ico">🩸</div><p>No matching blood requests right now.</p></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
              {requests.map(r=>(
                <div key={r.id} className={`card req-card ${r.emergency_level==='Critical'?'critical':''}`}>
                  <div className="req-top">
                    <div className="bchip">{r.blood_group}</div>
                    <span className={`badge badge-${r.emergency_level.toLowerCase()}`}>{r.emergency_level}</span>
                  </div>
                  <div className="req-patient">{r.patient_name}</div>
                  <div className="req-meta">
                    <span>🏥 {r.hospital_name||r.verified_hospital||'Not specified'}</span>
                    <span>📍 {r.city}</span>
                    <span>🩸 {r.units} unit(s) needed</span>
                    {r.description && <span style={{ color:'var(--muted)' }}>{r.description}</span>}
                  </div>
                  <div className="req-footer">
                    <span className="req-time">{new Date(r.created_at).toLocaleDateString()}</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={()=>accept(r)}
                      disabled={days>0}
                      title={days>0?`Wait ${days} more days`:'Accept this request'}
                    >
                      {days>0 ? `⏳ ${days}d` : '✅ Accept'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DONATION HISTORY */}
      {tab==='history' && (
        <div>
          {donations.length===0 ? (
            <div className="empty"><div className="ico">📋</div><p>No donation history yet. Accept a request to start!</p></div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Date</th><th>Patient</th><th>Blood</th><th>Hospital</th><th>Units</th></tr></thead>
                <tbody>
                  {donations.map(d=>(
                    <tr key={d.id}>
                      <td>{new Date(d.donation_date).toLocaleDateString()}</td>
                      <td><strong>{d.patient_name||'—'}</strong></td>
                      <td><span className="bchip" style={{ width:30,height:30,fontSize:'0.7rem' }}>{d.blood_group||profile?.blood_group}</span></td>
                      <td>{d.hospital_name||'—'}</td>
                      <td>{d.units||1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CAMPS */}
      {tab==='camps' && (
        <div className="grid-2">
          {camps.length===0 ? (
            <div className="empty" style={{ gridColumn:'1/-1' }}><div className="ico">📅</div><p>No upcoming camps.</p></div>
          ) : camps.map(c=>(
            <div key={c.id} className="card">
              <div style={{ display:'flex', gap:14, marginBottom:14 }}>
                <div style={{ background:'var(--surface)', borderRadius:10, padding:'10px 14px', textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--font-d)', fontSize:'1.5rem', fontWeight:700, color:'var(--red)', lineHeight:1 }}>{new Date(c.date).getDate()}</div>
                  <div style={{ fontSize:'0.72rem', color:'var(--muted)', textTransform:'uppercase' }}>{new Date(c.date).toLocaleDateString('en',{month:'short'})}</div>
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:'1rem', marginBottom:2 }}>{c.camp_name}</div>
                  <div style={{ fontSize:'0.82rem', color:'var(--muted)' }}>🏥 {c.hospital_name}</div>
                </div>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
                {c.time && <span style={{ background:'var(--surface)', padding:'3px 10px', borderRadius:12, fontSize:'0.8rem' }}>🕐 {c.time}</span>}
                <span style={{ background:'var(--surface)', padding:'3px 10px', borderRadius:12, fontSize:'0.8rem' }}>📍 {c.city||c.location}</span>
                <span style={{ background:'var(--surface)', padding:'3px 10px', borderRadius:12, fontSize:'0.8rem' }}>👥 {c.registered_count}/{c.max_participants}</span>
              </div>
              {c.description && <p style={{ fontSize:'0.84rem', color:'var(--text2)', marginBottom:12 }}>{c.description}</p>}
              <button className="btn btn-primary btn-sm" onClick={()=>registerCamp(c.id)} disabled={c.registered_count>=c.max_participants}>
                {c.registered_count>=c.max_participants ? '🚫 Full' : '✅ Register'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab==='notifications' && (
        <div>
          {notifs.length>0 && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
            </div>
          )}
          {notifs.length===0 ? (
            <div className="empty"><div className="ico">🔔</div><p>No notifications yet.</p></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {notifs.map(n=>(
                <div key={n.id} onClick={()=>!n.is_read&&markRead(n.id)} style={{ display:'flex', gap:14, alignItems:'flex-start', padding:'14px 18px', background:n.is_read?'#fff':'var(--surface)', border:`1px solid ${n.is_read?'var(--border)':'var(--border2)'}`, borderRadius:'var(--radius)', cursor:n.is_read?'default':'pointer', transition:'all 0.2s' }}>
                  <span style={{ fontSize:'1.4rem' }}>{n.type==='emergency'?'🚨':n.type==='blood_request'?'🩸':'📅'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:'0.9rem', marginBottom:3 }}>{n.title}</div>
                    <div style={{ fontSize:'0.84rem', color:'var(--text2)' }}>{n.message}</div>
                    <div style={{ fontSize:'0.74rem', color:'var(--muted)', marginTop:4 }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {!n.is_read && <div style={{ width:8,height:8,background:'var(--red)',borderRadius:'50%',flexShrink:0,marginTop:6,animation:'pulse-red 2s infinite' }}></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat window (opens after accepting) */}
      {chat && (
        <ChatWindow
          sessionId={chat.sessionId}
          currentUser={{ id: user.id, name: user.name, role: user.role }}
          otherParty={chat.seeker}
          requestInfo={chat.request}
          onClose={() => setChat(null)}
        />
      )}
    </div>
  );
}
