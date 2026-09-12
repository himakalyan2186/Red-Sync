import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import HospitalRegister from './pages/HospitalRegister';
import FindDonors from './pages/FindDonors';
import BloodCamps from './pages/BloodCamps';
import DonorDashboard from './pages/DonorDashboard';
import SeekerDashboard from './pages/SeekerDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AdminDashboard from './pages/AdminDashboard';

const Guard = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"></div>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const DashRouter = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'donor')    return <DonorDashboard />;
  if (user.role === 'seeker')   return <SeekerDashboard />;
  if (user.role === 'hospital') return <HospitalDashboard />;
  if (user.role === 'admin')    return <AdminDashboard />;
  return <Navigate to="/" />;
};

function AppContent() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/find-donors" element={<FindDonors />} />
        <Route path="/blood-camps" element={<BloodCamps />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/hospital/register" element={user ? <Navigate to="/dashboard" /> : <HospitalRegister />} />
        <Route path="/dashboard" element={<Guard><DashRouter /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem', borderRadius: 10 } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
