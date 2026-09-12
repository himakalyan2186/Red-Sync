// ── HospitalDashboard.jsx ─────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../utils/api';

export function HospitalDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('requests');
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [cf, setCf] = useState({ camp_name:'', date:'', time:'', city:'', location:'', description:'', max_participants:100 });

  useEffect(() => {
    Promise.all([api.get('/hospitals/profile'), api.get('/hospitals/requests'), api.get('/blood-camps/my-camps')])
      .then(([p,r,c]) => { setProfile(p.data); setRequests(r.data); setCamps(c.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createCamp = async (e) => {
    e.preventDefault();
    try {
      await api.post('/blood-camps', cf);
      toast.success('Blood camp created! 📅');
      setShowForm(false);
      const r = await api.get('/blood-camps/my-camps');
      setCamps(r.data);
    } catch (err) { toast.error(err.response?.data?.message||'Failed'); }
  };

  if (loading) return <div className="page loading"><div className="spinner"></div>Loading…</div>;

  return (
    <div className="page fade-in">
      <div style={{ marginBottom:28, paddingBottom:22, borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:'0.78rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--muted)', marginBottom:4 }}>Hospital Dashboard</div>
        <h1 style={{ fontSize:'1.8rem', marginBottom:10 }}>🏥 {profile?.hospital_name||user.name}</h1>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          {profile?.verified ? <span className="badge badge-verified">✅ Verified Hospital</span> : <span className="badge badge-unverified">⏳ Pending Verification</span>}
          {profile?.city && <span style={{ fontSize:'0.85rem',color:'var(--muted)' }}>📍 {profile.city}</span>}
          {profile?.phone && <span style={{ fontSize:'0.85rem',color:'var(--muted)' }}>📞 {profile.phone}</span>}
        </div>
        {!profile?.verified && <div className="warn-banner" style={{ marginTop:12,maxWidth:520 }}>⏳ Your hospital is pending admin verification. Camp creation is disabled until verified.</div>}
      </div>

      <div className="grid-3" style={{ marginBottom:28 }}>
        {[[requests.length,'Blood Requests','🩸'],[requests.filter(r=>r.status==='Pending').length,'Pending','⏳'],[camps.length,'Blood Camps','📅']].map(([n,l,i])=>(
          <div key={l} className="stat-card"><div className="stat-num">{n}</div><div className="stat-lbl">{l}</div><div className="stat-ico">{i}</div></div>
        ))}
      </div>

      <div className="tabs" style={{ marginBottom:24 }}>
        <button className={`tab ${tab==='requests'?'active':''}`} onClick={()=>setTab('requests')}>🩸 Blood Requests</button>
        <button className={`tab ${tab==='camps'?'active':''}`} onClick={()=>setTab('camps')}>📅 Blood Camps</button>
      </div>

      {tab==='requests' && (
        requests.length===0 ? <div className="empty"><div className="ico">🩸</div><p>No requests directed to your hospital yet.</p></div> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Patient</th><th>Blood</th><th>Units</th><th>Emergency</th><th>Seeker</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {requests.map(r=>(
                  <tr key={r.id}>
                    <td><strong>{r.patient_name}</strong></td>
                    <td><span className="bchip" style={{ width:30,height:30,fontSize:'0.7rem' }}>{r.blood_group}</span></td>
                    <td>{r.units}</td>
                    <td><span className={`badge badge-${r.emergency_level.toLowerCase()}`}>{r.emergency_level}</span></td>
                    <td>{r.seeker_name}</td>
                    <td><span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span></td>
                    <td style={{ fontSize:'0.8rem',color:'var(--muted)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab==='camps' && (
        <div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
            <h3>Your Camps</h3>
            {profile?.verified && <button className="btn btn-primary" onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Cancel':'+ Create Camp'}</button>}
          </div>
          {showForm && (
            <div className="card" style={{ marginBottom:24 }}>
              <h3 style={{ marginBottom:20 }}>Create Blood Camp</h3>
              <form onSubmit={createCamp} style={{ display:'flex',flexDirection:'column',gap:16 }}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
                  <div className="form-group"><label className="form-label">Camp Name</label><input className="form-control" placeholder="e.g. World Blood Donor Day" value={cf.camp_name} onChange={e=>setCf(f=>({...f,camp_name:e.target.value}))} required /></div>
                  <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-control" value={cf.date} onChange={e=>setCf(f=>({...f,date:e.target.value}))} required min={new Date().toISOString().split('T')[0]} /></div>
                  <div className="form-group"><label className="form-label">Time</label><input type="time" className="form-control" value={cf.time} onChange={e=>setCf(f=>({...f,time:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">City</label><input className="form-control" placeholder="City" value={cf.city} onChange={e=>setCf(f=>({...f,city:e.target.value}))} required /></div>
                  <div className="form-group"><label className="form-label">Max Participants</label><input type="number" className="form-control" min={10} value={cf.max_participants} onChange={e=>setCf(f=>({...f,max_participants:e.target.value}))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Venue/Location</label><input className="form-control" placeholder="Full venue address" value={cf.location} onChange={e=>setCf(f=>({...f,location:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" rows={3} placeholder="What donors can expect…" value={cf.description} onChange={e=>setCf(f=>({...f,description:e.target.value}))} /></div>
                <button type="submit" className="btn btn-primary">📅 Create Camp</button>
              </form>
            </div>
          )}
          {camps.length===0 ? <div className="empty"><div className="ico">📅</div><p>No camps created yet.</p></div> : (
            <div className="grid-2">
              {camps.map(c=>(
                <div key={c.id} className="card">
                  <div style={{ display:'flex',gap:14,marginBottom:14 }}>
                    <div style={{ background:'var(--surface)',borderRadius:10,padding:'10px 14px',textAlign:'center',flexShrink:0 }}>
                      <div style={{ fontFamily:'var(--font-d)',fontSize:'1.5rem',fontWeight:700,color:'var(--red)',lineHeight:1 }}>{new Date(c.date).getDate()}</div>
                      <div style={{ fontSize:'0.72rem',color:'var(--muted)',textTransform:'uppercase' }}>{new Date(c.date).toLocaleDateString('en',{month:'short'})}</div>
                    </div>
                    <div><div style={{ fontWeight:700,fontSize:'1rem',marginBottom:2 }}>{c.camp_name}</div><div style={{ fontSize:'0.82rem',color:'var(--muted)' }}>📍 {c.city} {c.time&&`· 🕐 ${c.time}`}</div></div>
                  </div>
                  <div style={{ display:'flex',gap:8,marginBottom:10 }}>
                    <span style={{ background:'var(--surface)',padding:'3px 10px',borderRadius:12,fontSize:'0.79rem' }}>👥 {c.registered_count}/{c.max_participants}</span>
                  </div>
                  {c.description && <p style={{ fontSize:'0.83rem',color:'var(--text2)' }}>{c.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AdminDashboard.jsx ────────────────────────────────────────────────────────
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [dash, setDash] = useState(null);
  const [users, setUsers] = useState([]);
  const [hosps, setHosps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/admin/dashboard'), api.get('/stats')])
      .then(([d,s]) => { setDash(d.data); setStats(s.data); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  useEffect(() => { if(tab==='users') api.get('/admin/users').then(r=>setUsers(r.data)).catch(()=>{}); },[tab]);
  useEffect(() => { if(tab==='hospitals') api.get('/admin/hospitals').then(r=>setHosps(r.data)).catch(()=>{}); },[tab]);

  const verify = async (id) => {
    try { await api.put(`/admin/hospitals/${id}/verify`); toast.success('Hospital verified ✅'); Promise.all([api.get('/admin/dashboard'),api.get('/admin/hospitals')]).then(([d,h])=>{setDash(d.data);setHosps(h.data);}); }
    catch { toast.error('Failed'); }
  };
  const reject = async (id) => {
    if(!confirm('Reject and delete this hospital?')) return;
    try { await api.put(`/admin/hospitals/${id}/reject`); toast.success('Rejected'); Promise.all([api.get('/admin/dashboard'),api.get('/admin/hospitals')]).then(([d,h])=>{setDash(d.data);setHosps(h.data);}); }
    catch { toast.error('Failed'); }
  };
  const suspend = async (id) => {
    try { await api.put(`/admin/users/${id}/suspend`); toast.success('User suspended'); api.get('/admin/users').then(r=>setUsers(r.data)); }
    catch { toast.error('Failed'); }
  };
  const activate = async (id) => {
    try { await api.put(`/admin/users/${id}/activate`); toast.success('User re-activated'); api.get('/admin/users').then(r=>setUsers(r.data)); }
    catch { toast.error('Failed'); }
  };

  if(loading) return <div className="page loading"><div className="spinner"></div>Loading…</div>;

  const chartData = stats?.bloodGroupStats && {
    labels: stats.bloodGroupStats.map(b=>b.blood_group),
    datasets: [{ label:'Donors', data: stats.bloodGroupStats.map(b=>b.cnt), backgroundColor:'#C8102E', borderRadius:6 }]
  };

  return (
    <div className="page fade-in">
      <div style={{ marginBottom:28,paddingBottom:22,borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:'0.78rem',textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--muted)',marginBottom:4 }}>Admin Panel</div>
        <h1 style={{ fontSize:'1.8rem' }}>👑 System Administrator</h1>
      </div>

      <div className="grid-4" style={{ marginBottom:28 }}>
        {[[dash?.stats?.users,'Total Users','👥'],[dash?.stats?.hospitals,'Hospitals','🏥'],[dash?.stats?.pendingHospitals,'Pending Verify','⏳'],[dash?.stats?.requests,'Blood Requests','🩸']].map(([n,l,i])=>(
          <div key={l} className="stat-card"><div className="stat-num" style={{ color:l==='Pending Verify'&&n>0?'var(--warn)':'var(--red)' }}>{n||0}</div><div className="stat-lbl">{l}</div><div className="stat-ico">{i}</div></div>
        ))}
      </div>

      <div className="tabs" style={{ marginBottom:24 }}>
        {[['overview','📊 Overview'],['hospitals','🏥 Hospitals'],['users','👥 Users']].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div>
          {dash?.pendingHospitals?.length>0 && (
            <div style={{ marginBottom:32 }}>
              <div className="sec-title"><h2>⏳ Pending Verifications</h2><div className="sec-line"></div></div>
              <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                {dash.pendingHospitals.map(h=>(
                  <div key={h.id} className="card" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12 }}>
                    <div>
                      <div style={{ fontWeight:700 }}>🏥 {h.hospital_name}</div>
                      <div style={{ fontSize:'0.83rem',color:'var(--muted)' }}>{h.email} · {h.city} · {h.phone}</div>
                      <div style={{ fontSize:'0.77rem',color:'var(--muted)' }}>Registered: {new Date(h.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display:'flex',gap:10 }}>
                      <button className="btn btn-success btn-sm" onClick={()=>verify(h.id)}>✅ Verify</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>reject(h.id)}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid-2" style={{ marginBottom:28 }}>
            {chartData && (
              <div className="card">
                <h3 style={{ marginBottom:16 }}>Blood Group Distribution</h3>
                <Bar data={chartData} options={{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }} />
              </div>
            )}
            <div className="card">
              <h3 style={{ marginBottom:16 }}>Platform Stats</h3>
              {[[stats?.totalDonors,'Total Donors','💉'],[stats?.verifiedHospitals,'Verified Hospitals','🏥'],[stats?.completedDonations,'Completed Donations','🎉'],[stats?.pendingRequests,'Pending Requests','⏳'],[stats?.upcomingCamps,'Upcoming Camps','📅']].map(([v,l,i])=>(
                <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:'0.9rem' }}>{i} {l}</span>
                  <strong style={{ color:'var(--red)' }}>{v||0}</strong>
                </div>
              ))}
            </div>
          </div>
          {dash?.recentUsers?.length>0 && (
            <div>
              <div className="sec-title"><h2>Recent Registrations</h2><div className="sec-line"></div></div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Blood</th><th>City</th><th>Joined</th></tr></thead>
                  <tbody>
                    {dash.recentUsers.map(u=>(
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td style={{ fontSize:'0.84rem' }}>{u.email}</td>
                        <td><span className={`badge badge-${u.role==='donor'?'completed':'pending'}`}>{u.role}</span></td>
                        <td><span className="bchip" style={{ width:28,height:28,fontSize:'0.68rem' }}>{u.blood_group}</span></td>
                        <td>{u.city||'—'}</td>
                        <td style={{ fontSize:'0.79rem',color:'var(--muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='hospitals' && (
        hosps.length===0 ? <div className="empty"><div className="ico">🏥</div><p>No hospitals registered.</p></div> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Hospital</th><th>Email</th><th>City</th><th>Phone</th><th>Status</th><th>Registered</th><th>Action</th></tr></thead>
              <tbody>
                {hosps.map(h=>(
                  <tr key={h.id}>
                    <td><strong>{h.hospital_name}</strong></td>
                    <td style={{ fontSize:'0.83rem' }}>{h.email}</td>
                    <td>{h.city}</td>
                    <td style={{ fontSize:'0.83rem' }}>{h.phone}</td>
                    <td><span className={`badge badge-${h.verified?'verified':'unverified'}`}>{h.verified?'✅ Verified':'⏳ Pending'}</span></td>
                    <td style={{ fontSize:'0.79rem',color:'var(--muted)' }}>{new Date(h.created_at).toLocaleDateString()}</td>
                    <td>{!h.verified && <div style={{ display:'flex',gap:6 }}><button className="btn btn-success btn-sm" onClick={()=>verify(h.id)}>✅</button><button className="btn btn-danger btn-sm" onClick={()=>reject(h.id)}>✕</button></div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab==='users' && (
        users.length===0 ? <div className="empty"><div className="ico">👥</div><p>No users.</p></div> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Blood</th><th>City</th><th>Donations</th><th>Badge</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td style={{ fontSize:'0.82rem' }}>{u.email}</td>
                    <td><span className={`badge badge-${u.role==='donor'?'completed':'pending'}`}>{u.role}</span></td>
                    <td><span className="bchip" style={{ width:26,height:26,fontSize:'0.65rem' }}>{u.blood_group}</span></td>
                    <td>{u.city||'—'}</td>
                    <td style={{ textAlign:'center' }}>{u.donation_count}</td>
                    <td style={{ fontSize:'0.82rem' }}>{u.badge||'—'}</td>
                    <td><span className={`badge badge-${u.is_active?'completed':'cancelled'}`}>{u.is_active?'Active':'Suspended'}</span></td>
                    <td>
                      {u.is_active
                        ? <button className="btn btn-danger btn-sm" onClick={()=>suspend(u.id)}>Suspend</button>
                        : <button className="btn btn-success btn-sm" onClick={()=>activate(u.id)}>Activate</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ── BloodCamps.jsx ────────────────────────────────────────────────────────────
export function BloodCamps() {
  const { user } = useAuth();
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/blood-camps', { params: city?{city}:{} }); setCamps(r.data); }
    catch {} setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const register = async (id) => {
    if (!user) { toast.error('Please login to register'); return; }
    try { await api.post(`/blood-camps/${id}/register`); toast.success('Registered for camp! 📅'); load(); }
    catch (err) { toast.error(err.response?.data?.message||'Failed'); }
  };

  return (
    <div className="page">
      <div style={{ textAlign:'center',marginBottom:36 }} className="fade-in">
        <h1>🩸 Blood Donation Camps</h1>
        <p style={{ color:'var(--muted)',marginTop:8 }}>Find and register for upcoming camps near you</p>
      </div>
      <div style={{ display:'flex',gap:12,marginBottom:28,maxWidth:480 }} className="fade-in">
        <input className="form-control" placeholder="Filter by city…" value={city} onChange={e=>setCity(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} />
        <button className="btn btn-primary" onClick={load}>Search</button>
        {city && <button className="btn btn-ghost" onClick={()=>{setCity('');setTimeout(load,50);}}>Clear</button>}
      </div>
      {loading ? <div className="loading"><div className="spinner"></div>Loading camps…</div>
        : camps.length===0 ? <div className="empty"><div className="ico">📅</div><p>No upcoming camps found.</p></div>
        : (
          <div className="grid-2 fade-in">
            {camps.map(c=>{
              const pct = Math.min(100,Math.round((c.registered_count/c.max_participants)*100));
              return (
                <div key={c.id} className="card" style={{ padding:26 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:'1.05rem',marginBottom:4 }}>{c.camp_name}</div>
                      <div style={{ fontSize:'0.83rem',color:'var(--muted)' }}>🏥 {c.hospital_name}</div>
                    </div>
                    <div style={{ background:'var(--surface)',borderRadius:8,padding:'8px 12px',textAlign:'center',flexShrink:0 }}>
                      <div style={{ fontFamily:'var(--font-d)',fontSize:'1.5rem',fontWeight:700,color:'var(--red)',lineHeight:1 }}>{new Date(c.date).getDate()}</div>
                      <div style={{ fontSize:'0.7rem',color:'var(--muted)',textTransform:'uppercase' }}>{new Date(c.date).toLocaleDateString('en',{month:'short'})}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginBottom:14 }}>
                    {c.time && <span style={{ background:'var(--surface)',padding:'3px 10px',borderRadius:12,fontSize:'0.8rem' }}>🕐 {c.time}</span>}
                    <span style={{ background:'var(--surface)',padding:'3px 10px',borderRadius:12,fontSize:'0.8rem' }}>📍 {c.city||c.location}</span>
                  </div>
                  {c.description && <p style={{ fontSize:'0.85rem',color:'var(--text2)',marginBottom:14,lineHeight:1.6 }}>{c.description}</p>}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:'0.77rem',color:'var(--muted)',marginBottom:5 }}>
                      <span>Registered: {c.registered_count}/{c.max_participants}</span><span>{pct}% full</span>
                    </div>
                    <div style={{ background:'var(--border)',borderRadius:4,height:6,overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${pct}%`,background:pct>80?'var(--warn)':'var(--red)',borderRadius:4,transition:'width 0.4s' }}></div>
                    </div>
                  </div>
                  {user && ['donor','seeker'].includes(user.role) ? (
                    <button className="btn btn-primary btn-sm" onClick={()=>register(c.id)} disabled={c.registered_count>=c.max_participants}>
                      {c.registered_count>=c.max_participants?'🚫 Full':'✅ Register'}
                    </button>
                  ) : !user ? (
                    <a href="/login" className="btn btn-outline btn-sm">Login to Register</a>
                  ) : null}
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ── About.jsx ─────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
export function About() {
  return (
    <div className="page">
      <div style={{ maxWidth:760,margin:'0 auto' }} className="fade-in">
        <div style={{ textAlign:'center',marginBottom:52 }}>
          <div style={{ fontSize:'4rem',marginBottom:16,display:'inline-block',animation:'heartbeat 2.5s ease-in-out infinite' }}>🩸</div>
          <h1>About Life Anchor</h1>
          <p style={{ color:'var(--muted)',fontSize:'1.02rem',marginTop:12,lineHeight:1.7 }}>A secure, hospital-verified platform connecting blood donors with those in need.</p>
        </div>
        <div className="card" style={{ marginBottom:22 }}>
          <h2 style={{ marginBottom:14 }}>Our Mission</h2>
          <p style={{ color:'var(--text2)',lineHeight:1.8 }}>Life Anchor solves a critical problem: during emergencies, finding the right blood type quickly can mean the difference between life and death. Our platform connects verified donors with seekers through a secure, transparent system backed by hospital verification — preventing illegal blood trading while ensuring genuine voluntary donations reach those who need them most.</p>
        </div>
        <div className="grid-2" style={{ marginBottom:22 }}>
          {[['🏥','Hospital Verification','All hospitals submit license certificates and get manually verified before participating.'],['🔒','Secure & Private','JWT auth, bcrypt passwords, role-based access, and auto-deleting 30-min chat sessions.'],['📞','Direct Contact','Seekers get donor phone + WhatsApp button. Hospitals can search and contact donors directly.'],['🚨','Emergency Ready','Critical requests trigger instant notifications to all matching donors and verified hospitals.']].map(([i,t,d])=>(
            <div key={t} className="card"><div style={{ fontSize:'2rem',marginBottom:10 }}>{i}</div><h3 style={{ marginBottom:8 }}>{t}</h3><p style={{ color:'var(--text2)',fontSize:'0.88rem',lineHeight:1.6 }}>{d}</p></div>
          ))}
        </div>
        <div className="card" style={{ marginBottom:22 }}>
          <h2 style={{ marginBottom:18 }}>Badge System</h2>
          {[['🤝 Helper','1 donation','Your first step.'],['⭐ Lifesaver','5 donations','Making real impact.'],['🦸 Hero','10 donations','A trusted community hero.'],['⚓ Life Anchor','25 donations','The highest honour.']].map(([b,r,d])=>(
            <div key={b} style={{ display:'flex',gap:14,alignItems:'center',padding:'11px 0',borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-d)',fontWeight:600,minWidth:140,fontSize:'1.05rem' }}>{b}</div>
              <div style={{ background:'var(--surface)',padding:'2px 12px',borderRadius:12,fontSize:'0.79rem',color:'var(--red)',fontWeight:600,minWidth:100,textAlign:'center' }}>{r}</div>
              <div style={{ color:'var(--muted)',fontSize:'0.87rem' }}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center',padding:'36px 0' }}>
          <h2 style={{ marginBottom:16 }}>Ready to Save Lives?</h2>
          <div style={{ display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">🩸 Register as Donor</Link>
            <Link to="/find-donors" className="btn btn-outline btn-lg">Find Blood Now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
