import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';


const BGs = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

const AuthLayout = ({ visual, children }) => (
  <div style={{ minHeight:'calc(100vh - 64px)', display:'grid', gridTemplateColumns:'1fr 1.4fr' }}>
    <div style={{ background:'linear-gradient(160deg,var(--red-dark),var(--red),var(--red-light))', display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 48px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:400,height:400, borderRadius:'50%', background:'rgba(255,255,255,0.05)', right:-100,bottom:-100 }}></div>
      <div style={{ position:'relative', textAlign:'center', color:'#fff' }}>{visual}</div>
    </div>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px', background:'var(--warm)' }}>
      <div style={{ width:'100%', maxWidth:460 }}>{children}</div>
    </div>
    <style>{`@media(max-width:768px){div[style*="grid"]{grid-template-columns:1fr!important}div[style*="linear-gradient(160deg"]{display:none!important}}`}</style>
  </div>
);

// ── Login ────────────────────────────────────────────────────────────────────
export function Login() {
  const [form, setForm] = useState({ email:'', password:'', type:'user' });
  const [loading, setLoading] = useState(false);
  const { login, setAuthenticatedUser } = useAuth();  
  const navigate = useNavigate();

const submit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {

    // ─────────────────────────────────────
    // HOSPITAL LOGIN
    // ─────────────────────────────────────

    if (form.type === 'hospital') {

      const result = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const firebaseUser = result.user;

      const hospitalSnapshot = await getDoc(
        doc(db, 'hospitals', firebaseUser.uid)
      );

      if (!hospitalSnapshot.exists()) {
        await auth.signOut();
        toast.error('Hospital profile not found');
        return;
      }

      const hospital = hospitalSnapshot.data();

      setAuthenticatedUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: hospital.hospital_name,
        hospital_name: hospital.hospital_name,
        address: hospital.address,
        city: hospital.city,
        pincode: hospital.pincode,
        phone: hospital.phone,
        role: 'hospital',
        verified: hospital.verified || false
      });

      toast.success(
        `Welcome back, ${hospital.hospital_name}! 👋`
      );

      navigate('/dashboard');
      return;
    }


    // ─────────────────────────────────────
    // NORMAL USER LOGIN → FIREBASE
    // ─────────────────────────────────────

    const result = await signInWithEmailAndPassword(
      auth,
      form.email,
      form.password
    );

    const firebaseUser = result.user;

    // Get user's Firestore profile
    const userSnapshot = await getDoc(
      doc(db, 'users', firebaseUser.uid)
    );

    if (!userSnapshot.exists()) {
      await auth.signOut();
      toast.error('User profile not found');
      return;
    }

    const userData = userSnapshot.data();

    // Check whether account is suspended
    if (userData.is_active === false) {
      await auth.signOut();
      toast.error('Your account has been suspended');
      return;
    }

    // Store complete user information in AuthContext
    setAuthenticatedUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: userData.name,
      blood_group: userData.blood_group,
      age: userData.age,
      gender: userData.gender,
      phone: userData.phone,
      city: userData.city,
      role: userData.role || 'seeker',
      last_donation_date: userData.last_donation_date,
      donation_count: userData.donation_count || 0,
      badge: userData.badge || null,
      is_active: userData.is_active !== false
    });

    toast.success(
      `Welcome back, ${userData.name}! 👋`
    );

    navigate('/dashboard');

  } catch (error) {

    console.error('Firebase login error:', error);

    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password'
    ) {
      toast.error('Invalid email or password');

    } else if (error.code === 'auth/invalid-email') {
      toast.error('Invalid email address');

    } else if (error.code === 'auth/too-many-requests') {
      toast.error(
        'Too many login attempts. Please try again later.'
      );

    } else {
      toast.error(
        error.message || 'Login failed'
      );
    }

  } finally {
    setLoading(false);
  }
};
  return (
    <AuthLayout visual={<>
      <div style={{ fontSize:'3.5rem', marginBottom:20, animation:'heartbeat 2.5s ease-in-out infinite' }}>🩸</div>
      <h2 style={{ fontSize:'1.8rem', marginBottom:14 }}>Welcome Back</h2>
      <p style={{ opacity:0.85, lineHeight:1.7 }}>Your generosity keeps hearts beating.</p>
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.25)', paddingTop:22, marginTop:24, fontSize:'0.88rem', opacity:0.7 }}><em>"The gift of blood is the gift of life."</em></div>
    </>}>
      <h2 style={{ marginBottom:6 }}>Sign In</h2>
      <p style={{ color:'var(--muted)', marginBottom:24, fontSize:'0.9rem' }}>Access your Life Anchor dashboard</p>
      <div style={{ display:'flex', background:'var(--surface)', padding:4, borderRadius:10, gap:4, marginBottom:24 }}>
        {[['user','👤 User'],['hospital','🏥 Hospital']].map(([v,l])=>(
          <button key={v} onClick={()=>setForm(f=>({...f,type:v}))} style={{ flex:1, padding:'9px', borderRadius:7, border:'none', background:form.type===v?'#fff':'transparent', color:form.type===v?'var(--red)':'var(--muted)', fontWeight:500, fontSize:'0.87rem', cursor:'pointer', transition:'all 0.2s', boxShadow:form.type===v?'var(--shadow-sm)':'' }}>{l}</button>
        ))}
      </div>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
        <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" placeholder="you@example.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required /></div>
        <div className="form-group"><label className="form-label">Password</label><input type="password" className="form-control" placeholder="••••••••" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required /></div>
        <button type="submit" className="btn btn-primary btn-lg" style={{ justifyContent:'center', width:'100%' }} disabled={loading}>{loading?'⏳ Signing in…':'🩸 Sign In'}</button>
      </form>
      <div style={{ marginTop:18, textAlign:'center', fontSize:'0.87rem', color:'var(--muted)' }}>
        <p>No account? <Link to="/register" style={{ color:'var(--red)', fontWeight:500 }}>Register here</Link></p>
        {form.type==='hospital' && <p style={{ marginTop:6 }}>New hospital? <Link to="/hospital/register" style={{ color:'var(--red)', fontWeight:500 }}>Register hospital</Link></p>}
      </div>
      {/* Demo creds */}
      <div style={{ marginTop:22, padding:14, background:'var(--surface)', borderRadius:'var(--radius)', border:'1px dashed var(--border2)' }}>
        <div style={{ fontSize:'0.73rem', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginBottom:10, fontWeight:600 }}>Demo Credentials</div>
        {[['👑 Admin','admin@lifeanchor.com','Admin@123','user'],['💉 Donor','ravi@demo.com','donor123','user'],['🙏 Seeker','meera@demo.com','seeker123','user'],['🏥 Hospital','citygeneral@demo.com','hospital123','hospital']].map(([r,e,p,t])=>(
          <div key={e} onClick={()=>setForm({email:e,password:p,type:t})} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', background:'#fff', borderRadius:6, cursor:'pointer', fontSize:'0.81rem', border:'1px solid var(--border)', marginBottom:6, transition:'all 0.15s' }}
            onMouseOver={ev=>ev.currentTarget.style.borderColor='var(--red)'}
            onMouseOut={ev=>ev.currentTarget.style.borderColor='var(--border)'}>
            <span style={{ fontWeight:600 }}>{r}</span><span style={{ color:'var(--muted)', fontFamily:'monospace' }}>{e}</span>
          </div>
        ))}
      </div>
    </AuthLayout>
  );
}

// ── Register ─────────────────────────────────────────────────────────────────
export function Register() {
  const [form, setForm] = useState({ name:'', email:'', password:'', blood_group:'', age:'', gender:'', phone:'', city:'', role:'donor', last_donation_date:'' });
  const [loading, setLoading] = useState(false);
  const { setAuthenticatedUser } = useAuth();
  const navigate = useNavigate();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async (e) => {
  e.preventDefault();

  if (form.password.length < 6) {
    return toast.error('Password must be at least 6 characters');
  }

  setLoading(true);

  try {
    // 1. Create Firebase Authentication account
    const result = await createUserWithEmailAndPassword(
      auth,
      form.email,
      form.password
    );

    const firebaseUser = result.user;

    // 2. Store additional user information in Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      uid: firebaseUser.uid,
      name: form.name,
      email: form.email,
      blood_group: form.blood_group,
      age: form.age ? Number(form.age) : null,
      gender: form.gender,
      phone: form.phone,
      city: form.city,
      role: form.role,
      last_donation_date:
        form.role === 'donor' ? form.last_donation_date || null : null,
      createdAt: serverTimestamp()
    });

    // 3. Update AuthContext
    setAuthenticatedUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: form.name,
      blood_group: form.blood_group,
      age: form.age,
      gender: form.gender,
      phone: form.phone,
      city: form.city,
      role: form.role
    });

    toast.success('Account created! Welcome to Life Anchor 🩸');

    navigate('/dashboard');

  } catch (err) {
    console.error('Firebase registration error:', err);

    if (err.code === 'auth/email-already-in-use') {
      toast.error('This email is already registered');
    } else if (err.code === 'auth/invalid-email') {
      toast.error('Invalid email address');
    } else if (err.code === 'auth/weak-password') {
      toast.error('Password is too weak');
    } else {
      toast.error(err.message || 'Registration failed');
    }

  } finally {
    setLoading(false);
  }
};

  return (
    <AuthLayout visual={<>
      <div style={{ fontSize:'3.5rem', marginBottom:20, animation:'heartbeat 2.5s ease-in-out infinite' }}>🩸</div>
      <h2 style={{ fontSize:'1.8rem', marginBottom:14 }}>Join Life Anchor</h2>
      <p style={{ opacity:0.85, lineHeight:1.7 }}>Become part of a community saving lives through voluntary donation.</p>
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.25)', paddingTop:22, marginTop:24, fontSize:'0.88rem', opacity:0.7 }}><em>"One donation can save up to three lives."</em></div>
    </>}>
      <h2 style={{ marginBottom:6 }}>Create Account</h2>
      <p style={{ color:'var(--muted)', marginBottom:22, fontSize:'0.9rem' }}>Join as a donor or seeker</p>
      <div style={{ display:'flex', background:'var(--surface)', padding:4, borderRadius:10, gap:4, marginBottom:22 }}>
        {[['donor','💉 I\'m a Donor'],['seeker','🙏 I Need Blood']].map(([v,l])=>(
          <button key={v} onClick={()=>set('role',v)} style={{ flex:1, padding:'9px', borderRadius:7, border:'none', background:form.role===v?'#fff':'transparent', color:form.role===v?'var(--red)':'var(--muted)', fontWeight:500, fontSize:'0.87rem', cursor:'pointer', transition:'all 0.2s', boxShadow:form.role===v?'var(--shadow-sm)':'' }}>{l}</button>
        ))}
      </div>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-control" placeholder="Your name" value={form.name} onChange={e=>set('name',e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" placeholder="email@example.com" value={form.email} onChange={e=>set('email',e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Password</label><input type="password" className="form-control" placeholder="Min 6 chars" value={form.password} onChange={e=>set('password',e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Blood Group</label><select className="form-control" value={form.blood_group} onChange={e=>set('blood_group',e.target.value)} required><option value="">Select</option>{BGs.map(bg=><option key={bg}>{bg}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Age</label><input type="number" className="form-control" placeholder="Age" min="18" max="65" value={form.age} onChange={e=>set('age',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Gender</label><select className="form-control" value={form.gender} onChange={e=>set('gender',e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
          <div className="form-group"><label className="form-label">Phone</label><input className="form-control" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">City</label><input className="form-control" placeholder="Your city" value={form.city} onChange={e=>set('city',e.target.value)} /></div>
        </div>
        {form.role==='donor' && (
          <div className="form-group"><label className="form-label">Last Donation Date (optional)</label><input type="date" className="form-control" value={form.last_donation_date} onChange={e=>set('last_donation_date',e.target.value)} max={new Date().toISOString().split('T')[0]} /></div>
        )}
        <button type="submit" className="btn btn-primary btn-lg" style={{ justifyContent:'center', width:'100%', marginTop:4 }} disabled={loading}>
          {loading?'⏳ Creating…':`🩸 Register as ${form.role==='donor'?'Donor':'Seeker'}`}
        </button>
      </form>
      <div style={{ marginTop:16, textAlign:'center', fontSize:'0.87rem', color:'var(--muted)' }}>
        <p>Have an account? <Link to="/login" style={{ color:'var(--red)', fontWeight:500 }}>Sign in</Link></p>
        <p style={{ marginTop:6 }}>Hospital? <Link to="/hospital/register" style={{ color:'var(--red)', fontWeight:500 }}>Register hospital</Link></p>
      </div>
    </AuthLayout>
  );
}

// ── Hospital Register ─────────────────────────────────────────────────────────
export function HospitalRegister() {
  const [form, setForm] = useState({ hospital_name:'', email:'', password:'', address:'', city:'', pincode:'', phone:'' });
  const [loading, setLoading] = useState(false);
  const { setAuthenticatedUser } = useAuth();
  const navigate = useNavigate();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

const submit = async (e) => {
  e.preventDefault();

  if (form.password.length < 6) {
    return toast.error('Password must be at least 6 characters');
  }

  setLoading(true);

  try {
    // 1. Create Firebase Authentication account
    const result = await createUserWithEmailAndPassword(
      auth,
      form.email,
      form.password
    );

    const firebaseUser = result.user;

    // 2. Store hospital information in Firestore
    await setDoc(doc(db, 'hospitals', firebaseUser.uid), {
      uid: firebaseUser.uid,
      hospital_name: form.hospital_name,
      email: form.email,
      address: form.address,
      city: form.city,
      pincode: form.pincode,
      phone: form.phone,

      // Hospital must be verified by admin
      verified: false,

      createdAt: serverTimestamp()
    });

    // 3. Update AuthContext
    setAuthenticatedUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: form.hospital_name,
      hospital_name: form.hospital_name,
      address: form.address,
      city: form.city,
      pincode: form.pincode,
      phone: form.phone,
      role: 'hospital',
      verified: false
    });

    toast.success(
      'Hospital registered! Awaiting admin verification 🏥'
    );

    navigate('/dashboard');

  } catch (err) {
    console.error('Firebase hospital registration error:', err);

    if (err.code === 'auth/email-already-in-use') {
      toast.error('This email is already registered');
    } else if (err.code === 'auth/invalid-email') {
      toast.error('Invalid email address');
    } else if (err.code === 'auth/weak-password') {
      toast.error('Password is too weak');
    } else {
      toast.error(err.message || 'Registration failed');
    }

  } finally {
    setLoading(false);
  }
};

  return (
    <AuthLayout visual={<>
      <div style={{ fontSize:'3.5rem', marginBottom:20 }}>🏥</div>
      <h2 style={{ fontSize:'1.8rem', marginBottom:14 }}>Hospital Registration</h2>
      <p style={{ opacity:0.85, lineHeight:1.7 }}>Join our verified hospital network. Admin verification ensures safe, legal blood donation.</p>
    </>}>
      <h2 style={{ marginBottom:6 }}>Register Hospital</h2>
      <p style={{ color:'var(--muted)', marginBottom:18, fontSize:'0.9rem' }}>Submit for admin verification</p>
      <div className="info-banner" style={{ marginBottom:20 }}>ℹ️ Your hospital will be <strong>manually reviewed</strong> by our admin team before you gain full platform access.</div>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div className="form-group"><label className="form-label">Hospital Name</label><input className="form-control" placeholder="e.g. City General Hospital" value={form.hospital_name} onChange={e=>set('hospital_name',e.target.value)} required /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div className="form-group"><label className="form-label">Official Email</label><input type="email" className="form-control" placeholder="hospital@example.com" value={form.email} onChange={e=>set('email',e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Password</label><input type="password" className="form-control" placeholder="Min 6 chars" value={form.password} onChange={e=>set('password',e.target.value)} required minLength={6} /></div>
          <div className="form-group"><label className="form-label">City</label><input className="form-control" placeholder="City" value={form.city} onChange={e=>set('city',e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Contact Number</label><input className="form-control" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
        </div>
        <div className="form-group"><label className="form-label">Full Address</label><textarea className="form-control" rows={3} placeholder="Complete hospital address" value={form.address} onChange={e=>set('address',e.target.value)} required /></div>
        <button type="submit" className="btn btn-primary btn-lg" style={{ justifyContent:'center', width:'100%' }} disabled={loading}>{loading?'⏳ Registering…':'🏥 Submit for Verification'}</button>
      </form>
      <div style={{ marginTop:16, textAlign:'center', fontSize:'0.87rem', color:'var(--muted)' }}>
        <p>Already registered? <Link to="/login" style={{ color:'var(--red)', fontWeight:500 }}>Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}

export default Login;
