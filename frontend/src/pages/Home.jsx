// ── Home.jsx ─────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';

import { db } from '../firebase';

export function Home() {
const [stats, setStats] = useState(null);
const BGs = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

useEffect(() => {
  const loadStats = async () => {

    // Default values
    let totalDonors = 0;
    let verifiedHospitals = 0;
    let completedDonations = 0;
    let bloodGroupStats = [];
    let recentDonations = [];

    // =========================
    // DONORS
    // =========================
    try {
      const donorsSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('role', '==', 'donor')
        )
      );

      totalDonors = donorsSnapshot.size;

      const counts = {};

      donorsSnapshot.docs.forEach(docSnap => {
        const donor = docSnap.data();

        if (donor.blood_group) {
          counts[donor.blood_group] =
            (counts[donor.blood_group] || 0) + 1;
        }
      });

      bloodGroupStats = Object.entries(counts).map(
        ([blood_group, cnt]) => ({
          blood_group,
          cnt
        })
      );

    } catch (error) {
      console.error('Donor stats error:', error);
    }


    // =========================
    // VERIFIED HOSPITALS
    // =========================
    try {
      const hospitalsSnapshot = await getDocs(
        query(
          collection(db, 'hospitals'),
          where('verified', '==', true)
        )
      );

      verifiedHospitals = hospitalsSnapshot.size;

    } catch (error) {
      console.error('Hospital stats error:', error);
    }


    // =========================
    // DONATIONS
    // =========================
    // This collection may not exist yet.
    // That is completely okay.
    try {
      const donationsSnapshot = await getDocs(
        query(
          collection(db, 'donations'),
          where('status', '==', 'Completed')
        )
      );

      completedDonations = donationsSnapshot.size;

      recentDonations = donationsSnapshot.docs
        .map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        .sort((a, b) => {
          const dateA = a.donation_date?.toDate
            ? a.donation_date.toDate()
            : new Date(a.donation_date || 0);

          const dateB = b.donation_date?.toDate
            ? b.donation_date.toDate()
            : new Date(b.donation_date || 0);

          return dateB - dateA;
        })
        .slice(0, 5);

    } catch (error) {
      console.log('No donation records yet.');
    }


    // =========================
    // SET STATS
    // =========================
    setStats({
      totalDonors,
      completedDonations,
      verifiedHospitals,
      bloodGroupStats,
      recentDonations
    });
  };

  loadStats();
}, []);
  return (
    <div>
      {/* Hero */}
      <section style={{ position:'relative', minHeight:'88vh', display:'flex', alignItems:'center', padding:'80px 24px', background:'linear-gradient(160deg,#fff8f5 0%,#ffeef0 40%,#fff4f0 100%)', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', width:600,height:600, borderRadius:'50%', background:'var(--red)', opacity:0.06, right:-150, top:-100 }}></div>
          <div style={{ position:'absolute', width:200,height:200, borderRadius:'50%', background:'var(--red)', opacity:0.04, left:'10%', top:'20%' }}></div>
        </div>
        <div className="container fade-in" style={{ position:'relative', maxWidth:700 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 16px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, fontSize:'0.82rem', fontWeight:600, color:'var(--red)', marginBottom:24 }}>🩸 Save Lives Today</div>
          <h1 style={{ marginBottom:20 }}>Be Someone's<br /><em style={{ color:'var(--red)', fontStyle:'italic', fontWeight:700 }}>Life Anchor</em></h1>
          <p style={{ fontSize:'1.05rem', color:'var(--text2)', marginBottom:36, maxWidth:500, lineHeight:1.7 }}>Connect blood donors with those in need through a secure, hospital-verified platform. Every donation is a lifeline.</p>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:52 }}>
            <Link to="/register" className="btn btn-primary btn-lg">🩸 Become a Donor</Link>
            <Link to="/find-donors" className="btn btn-outline btn-lg">Find Blood Now</Link>
          </div>
          <div style={{ display:'flex', gap:32, flexWrap:'wrap' }}>
            {[[stats?.totalDonors,'Registered Donors'],[stats?.completedDonations,'Lives Saved'],[stats?.verifiedHospitals,'Verified Hospitals']].map(([n,l])=>(
              <div key={l}>
                <div style={{ fontFamily:'var(--font-d)', fontSize:'1.9rem', fontWeight:700, color:'var(--red)', lineHeight:1 }}>{n??'—'}</div>
                <div style={{ fontSize:'0.78rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blood groups */}
      <section style={{ padding:'72px 0', background:'#fff' }}>
        <div className="container">
          <div className="sec-title"><h2>All Blood Types Welcome</h2><div className="sec-line"></div></div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:12 }}>
            {BGs.map(bg=>(
              <Link key={bg} to={`/find-donors?blood_group=${bg}`} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'18px 10px', borderRadius:'var(--radius)', border:'1.5px solid var(--border)', background:'var(--warm)', textDecoration:'none', transition:'all 0.2s', color:'var(--text)' }}
                onMouseOver={e=>{e.currentTarget.style.borderColor='var(--red)';e.currentTarget.style.transform='translateY(-3px)';}}
                onMouseOut={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none';}}>
                <span className="bchip">{bg}</span>
                <span style={{ fontSize:'0.78rem', color:'var(--text2)', fontWeight:600 }}>{bg}</span>
                <span style={{ fontSize:'0.72rem', color:'var(--muted)' }}>{stats?.bloodGroupStats?.find(s=>s.blood_group===bg)?.cnt||0} donors</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding:'72px 0' }}>
        <div className="container">
          <div className="sec-title"><h2>How It Works</h2><div className="sec-line"></div></div>
          <div className="grid-3">
            {[['📝','01','Register & Verify','Create your account as a donor or seeker. Hospitals get verified by our admin team to prevent illegal blood trading.'],
              ['🔍','02','Match & Connect','Our smart system matches blood requests with eligible nearby donors based on blood group, city, and 90-day safety gap.'],
              ['💉','03','Donate & Save','Communicate via secure temporary chat. Complete the donation and earn your Life Anchor badge.']].map(([ico,n,t,d])=>(
              <div key={n} className="card fade-in">
                <div style={{ fontFamily:'var(--font-d)', fontSize:'2.8rem', fontWeight:700, color:'var(--red)', opacity:0.12, lineHeight:1, marginBottom:8 }}>{n}</div>
                <div style={{ fontSize:'2rem', marginBottom:12 }}>{ico}</div>
                <h3 style={{ marginBottom:8 }}>{t}</h3>
                <p style={{ color:'var(--text2)', fontSize:'0.9rem', lineHeight:1.6 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:'72px 0', background:'var(--cream)' }}>
        <div className="container">
          <div className="sec-title"><h2>Platform Features</h2><div className="sec-line"></div></div>
          <div className="grid-2">
            {[['🚨','Emergency Broadcast','Critical requests instantly notify all matching donors and verified hospitals.'],
              ['🏥','Hospital Verification','All hospitals manually verified with license certificates.'],
              ['💬','Secure Temp Chat','30-minute auto-deleting chat with typing indicators & online presence.'],
              ['📞','Direct Contact','Seekers see donor phone number and WhatsApp button instantly.'],
              ['🏆','Donor Reputation','Earn badges from Helper to Life Anchor for every donation.'],
              ['📅','Blood Camps','Register for upcoming donation camps organised by verified hospitals.']].map(([i,t,d])=>(
              <div key={t} className="card" style={{ display:'flex', gap:18, alignItems:'flex-start' }}>
                <div style={{ fontSize:'1.8rem', flexShrink:0 }}>{i}</div>
                <div><h3 style={{ marginBottom:6 }}>{t}</h3><p style={{ color:'var(--text2)', fontSize:'0.88rem', lineHeight:1.6 }}>{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'72px 0', background:'var(--red)' }}>
        <div className="container" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:32, flexWrap:'wrap' }}>
          <div><h2 style={{ color:'#fff', fontSize:'1.9rem' }}>Ready to Save Lives?</h2><p style={{ color:'rgba(255,255,255,0.8)', marginTop:6 }}>Join thousands of donors making a difference.</p></div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <Link to="/register" className="btn btn-lg" style={{ background:'#fff', color:'var(--red)' }}>Register as Donor</Link>
            <Link to="/hospital/register" className="btn btn-outline btn-lg" style={{ borderColor:'rgba(255,255,255,0.6)', color:'#fff' }}>Register Hospital</Link>
          </div>
        </div>
      </section>

      {/* Recent */}
      {stats?.recentDonations?.length > 0 && (
        <section style={{ padding:'60px 0', background:'#fff' }}>
          <div className="container">
            <div className="sec-title"><h2>Recent Donations</h2><div className="sec-line"></div></div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {stats.recentDonations.map((d,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'var(--warm)', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
                  <span className="bchip" style={{ width:34,height:34,fontSize:'0.72rem' }}>{d.blood_group}</span>
                  <div><div style={{ fontWeight:600,fontSize:'0.9rem' }}>{d.donor_name}</div><div style={{ fontSize:'0.78rem',color:'var(--muted)' }}>{new Date(d.donation_date).toLocaleDateString()}</div></div>
                  <div style={{ marginLeft:'auto', fontSize:'0.82rem', color:'var(--red)', fontWeight:600 }}>❤️ Donated</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ background:'var(--text)', color:'rgba(255,255,255,0.6)', padding:'48px 0 0' }}>
        <div className="container" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:32, flexWrap:'wrap', paddingBottom:40 }}>
          <div><div style={{ fontFamily:'var(--font-d)', fontSize:'1.2rem', color:'#fff', marginBottom:8 }}>🩸 Life Anchor</div><p style={{ fontSize:'0.84rem', maxWidth:260, lineHeight:1.6 }}>Connecting blood donors with those in need, one drop at a time.</p></div>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'center' }}>
            {[['/about','About'],['/find-donors','Find Donors'],['/blood-camps','Blood Camps'],['/register','Register']].map(([p,l])=>(
              <Link key={p} to={p} style={{ fontSize:'0.87rem', color:'rgba(255,255,255,0.6)', transition:'color 0.2s' }}>{l}</Link>
            ))}
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', padding:'18px 24px', textAlign:'center', fontSize:'0.78rem' }}>© 2025 Life Anchor. Built to save lives.</div>
      </footer>
    </div>
  );
}
export default Home;
