import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const BGs = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const BADGES = { Helper:'🤝', Lifesaver:'⭐', Hero:'🦸', 'Life Anchor':'⚓' };

// ── Contact Modal shown when seeker/hospital clicks a donor ────────────────
function ContactModal({ donor, onClose }) {
  const waUrl = donor.phone
    ? `https://wa.me/${donor.phone.replace(/\D/g,'')}?text=Hi%20${encodeURIComponent(donor.name)}%2C%20I%20found%20your%20profile%20on%20Life%20Anchor%20and%20need%20${donor.blood_group}%20blood.%20Can%20you%20help%3F`
    : null;

  const isEligible = !donor.last_donation_date ||
    Math.floor((Date.now() - new Date(donor.last_donation_date)) / 86400000) >= 90;

  return (
    <div className="chat-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:'var(--radius-lg)', width:'100%', maxWidth:440, padding:28, boxShadow:'var(--shadow-lg)', animation:'slideUp 0.25s ease' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontFamily:'var(--font-d)' }}>Donor Contact</h3>
          <button onClick={onClose} style={{ background:'var(--surface)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:'1rem' }}>✕</button>
        </div>

        {/* Donor profile */}
        <div style={{ display:'flex', gap:16, alignItems:'center', padding:16, background:'var(--surface)', borderRadius:'var(--radius)', marginBottom:20 }}>
          <div className="donor-avatar">{donor.name?.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:'1.05rem' }}>{donor.name}</div>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4, flexWrap:'wrap' }}>
              <span className="bchip" style={{ width:34, height:34, fontSize:'0.78rem' }}>{donor.blood_group}</span>
              {donor.badge && <span style={{ fontSize:'0.82rem' }}>{BADGES[donor.badge]} {donor.badge}</span>}
              <span className={isEligible ? 'eligible' : 'ineligible'} style={{ fontSize:'0.82rem' }}>
                {isEligible ? '✅ Eligible to donate' : '⏳ On cooldown'}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
          {[
            ['📍 City', donor.city || 'Not provided'],
            ['💉 Donations', `${donor.donation_count} lifetime donations`],
            ['📅 Last Donated', donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString() : 'Never / Not recorded'],
          ].map(([label, value]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:'0.85rem', color:'var(--muted)' }}>{label}</span>
              <span style={{ fontSize:'0.85rem', fontWeight:500 }}>{value}</span>
            </div>
          ))}
          {donor.phone && (
            <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:'0.85rem', color:'var(--muted)' }}>📞 Phone</span>
              <a href={`tel:${donor.phone}`} style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--red)' }}>{donor.phone}</a>
            </div>
          )}
        </div>

        {/* Contact actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {donor.phone ? (
            <>
              <a href={`tel:${donor.phone}`} className="btn btn-primary" style={{ justifyContent:'center' }}>
                📞 Call {donor.name}
              </a>
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noreferrer" className="btn btn-whatsapp" style={{ justifyContent:'center' }}>
                  💬 WhatsApp {donor.name}
                </a>
              )}
            </>
          ) : (
            <div className="warn-banner">
              ⚠️ This donor has not provided a phone number. Contact them through a blood request on the platform.
            </div>
          )}
          <p style={{ fontSize:'0.78rem', color:'var(--muted)', textAlign:'center', marginTop:4 }}>
            🔒 Contact details are shared to facilitate voluntary blood donation only.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FindDonors() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [filter, setFilter] = useState({
    blood_group: params.get('blood_group') || '',
    city: params.get('city') || '',
  });

  useEffect(() => {
    if (params.get('blood_group')) search();
  }, []);

  const search = async () => {
    setLoading(true); setSearched(true);
    try {
      const { data } = await api.get('/users/search', { params: filter });
      setDonors(data);
    } catch { toast.error('Search failed'); }
    setLoading(false);
  };

  const isEligible = (d) => !d.last_donation_date ||
    Math.floor((Date.now() - new Date(d.last_donation_date)) / 86400000) >= 90;

  const canContact = user && ['seeker','hospital','admin'].includes(user.role);

  return (
    <div className="page">
      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:32 }} className="fade-in">
        <h1>Find Blood Donors</h1>
        <p style={{ color:'var(--muted)', marginTop:8 }}>Search for eligible donors by blood group and location</p>
      </div>

      {/* Search form */}
      <div className="card fade-in" style={{ marginBottom:24 }}>
        <div style={{ display:'flex', gap:16, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div className="form-group" style={{ flex:1, minWidth:160 }}>
            <label className="form-label">Blood Group</label>
            <select className="form-control" value={filter.blood_group} onChange={e => setFilter(f => ({...f, blood_group: e.target.value}))}>
              <option value="">All Blood Groups</option>
              {BGs.map(bg => <option key={bg}>{bg}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex:2, minWidth:200 }}>
            <label className="form-label">City</label>
            <input className="form-control" placeholder="Enter city name…" value={filter.city} onChange={e => setFilter(f => ({...f, city: e.target.value}))} onKeyDown={e => e.key==='Enter' && search()} />
          </div>
          <button className="btn btn-primary btn-lg" onClick={search} disabled={loading}>
            {loading ? '⏳ Searching…' : '🔍 Search Donors'}
          </button>
        </div>
      </div>

      {/* Quick BG select */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', marginBottom:28 }} className="fade-in">
        {BGs.map(bg => (
          <button key={bg} onClick={() => { setFilter(f=>({...f,blood_group:bg})); setTimeout(search,50); }}
            style={{ background:'none', border:`1.5px solid ${filter.blood_group===bg?'var(--red)':'var(--border)'}`, borderRadius:10, padding:'8px 12px', cursor:'pointer', transition:'all 0.2s', background: filter.blood_group===bg ? 'var(--surface)' : '#fff' }}>
            <span className="bchip" style={{ width:36, height:36, fontSize:'0.78rem' }}>{bg}</span>
          </button>
        ))}
      </div>

      {/* Role hint */}
      {!user && (
        <div className="info-banner fade-in" style={{ marginBottom:20 }}>
          ℹ️ <Link to="/login" style={{ color:'var(--red)', fontWeight:600 }}>Sign in</Link> as a seeker or hospital to view donor contact details and initiate contact.
        </div>
      )}
      {user?.role === 'donor' && (
        <div className="info-banner fade-in" style={{ marginBottom:20 }}>
          ℹ️ As a donor, you can see other donors but cannot contact them. Contact happens when a seeker raises a request and you accept it.
        </div>
      )}

      {/* Results */}
      {loading && <div className="loading"><div className="spinner"></div>Searching donors…</div>}

      {searched && !loading && (
        <div className="fade-in">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <strong>{donors.length} donor{donors.length!==1?'s':''} found</strong>
            {filter.blood_group && <span className="bchip" style={{ width:30,height:30,fontSize:'0.7rem' }}>{filter.blood_group}</span>}
            {filter.city && <span style={{ color:'var(--muted)', fontSize:'0.9rem' }}>in {filter.city}</span>}
          </div>

          {donors.length === 0 ? (
            <div className="empty">
              <div className="ico">🩸</div>
              <p>No donors found. Try a different blood group or city.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:16 }}>
              {donors.map(d => (
                <div key={d.id} className="card donor-card">
                  <div className="donor-avatar">{d.name?.charAt(0).toUpperCase()}</div>
                  <div className="donor-name">{d.name}</div>
                  {d.badge && <div className="donor-badge">{BADGES[d.badge]} {d.badge}</div>}
                  <span className="bchip" style={{ margin:'8px auto', display:'flex' }}>{d.blood_group}</span>
                  <div className="donor-info">
                    {d.city && <span>📍 {d.city}</span>}
                    <span>💉 {d.donation_count} donation{d.donation_count!==1?'s':''}</span>
                    <span className={isEligible(d) ? 'eligible' : 'ineligible'}>
                      {isEligible(d) ? '✅ Eligible' : '⏳ On cooldown'}
                    </span>
                  </div>

                  {/* CONTACT BUTTON — only for seekers and hospitals */}
                  {canContact ? (
                    <button
                      className="btn btn-primary btn-sm donor-contact-btn"
                      onClick={() => setSelectedDonor(d)}
                    >
                      📞 Contact Donor
                    </button>
                  ) : !user ? (
                    <Link to="/login" className="btn btn-outline btn-sm donor-contact-btn" style={{ justifyContent:'center', marginTop:14 }}>
                      Login to Contact
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }} className="fade-in">
          <div style={{ fontSize:'3.5rem', marginBottom:16 }}>🔍</div>
          <p>Enter a blood group or city to find donors near you</p>
        </div>
      )}

      {/* Contact Modal */}
      {selectedDonor && (
        <ContactModal donor={selectedDonor} onClose={() => setSelectedDonor(null)} />
      )}
    </div>
  );
}
