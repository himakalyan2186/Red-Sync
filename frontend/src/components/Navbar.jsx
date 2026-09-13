import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const isA = (p) => loc.pathname === p;

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,248,245,0.96)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 0 var(--border)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.5rem', animation: 'heartbeat 2.5s ease-in-out infinite' }}>🩸</span>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: '1.25rem' }}>
            <span style={{ fontWeight: 300, color: 'var(--text2)' }}>Life</span>
            <span style={{ fontWeight: 700, color: 'var(--red)' }}>Anchor</span>
          </span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[['/', 'Home'], ['/about', 'About'], ['/find-donors', 'Find Donors'], ['/blood-camps', 'Blood Camps']].map(([path, label]) => (
            <Link key={path} to={path} style={{ padding: '6px 14px', borderRadius: 7, fontSize: '0.9rem', fontWeight: 500, color: isA(path) ? 'var(--red)' : 'var(--text2)', background: isA(path) ? 'var(--surface)' : 'transparent', transition: 'all 0.2s' }}>
              {label}
            </Link>
          ))}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8 }}>
              <Link to="/dashboard" className="btn btn-outline btn-sm">Dashboard</Link>
              <div style={{ position: 'relative' }} className="user-menu">
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--red)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px var(--red-glow)' }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'none', position: 'absolute', right: 0,top: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', minWidth: 180, overflow: 'hidden' }} className="user-dropdown">
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'capitalize' }}>{user.role}</div>
                  </div>
                  <button onClick={() => { logout(); navigate('/'); }} style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'none', fontSize: '0.88rem', color: 'var(--red)', cursor: 'pointer' }}>Sign Out</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Join Now</Link>
            </div>
          )}
        </div>
      </div>
      <style>{`.user-menu:hover .user-dropdown { display: block !important; animation: fadeIn 0.15s ease; }`}</style>
    </nav>
  );
}
