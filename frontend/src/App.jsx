import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import MainLayout from './components/Layout/MainLayout';
import CreateQR from './pages/CreateQR';
import MyQRCodes from './pages/MyQRCodes';
import QRCodeDetail from './pages/QRCodeDetail';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import Register from './pages/Register';
import ScanPage from './pages/ScanPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-[3vw] w-[3vw]" style={{ borderBottom: '2px solid #2563eb' }}></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/scan/:code" element={<ScanPage />} />
      
      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/qrcodes" replace />} />
                <Route path="/dashboard" element={<Navigate to="/qrcodes" replace />} />
                <Route path="/create" element={<CreateQR />} />
                <Route path="/qrcodes" element={<MyQRCodes />} />
                <Route path="/qrcodes/:id" element={<QRCodeDetail />} />
                <Route path="/analytics" element={<Analytics />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;