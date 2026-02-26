import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

import Landing from '@/pages/Landing';
import Auth from '@/pages/Auth';
import Game from '@/pages/Game';
import Wallet from '@/pages/Wallet';
import Withdrawal from '@/pages/Withdrawal';
import History from '@/pages/History';
import Admin from '@/pages/Admin';
import Mines from '@/pages/Mines'; // ✅ NEW

import { AuthProvider, useAuth } from '@/context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
        <div className="text-center">
          <div className="text-2xl neon-green mb-2">Loading...</div>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/auth" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
        <div className="text-center">
          <div className="text-2xl neon-green mb-2">Loading...</div>
        </div>
      </div>
    );
  }
  
  return user && user.role === 'admin' ? children : <Navigate to="/" replace />;
};

function AppContent() {
  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />

        {/* Protected User Routes */}
        <Route path="/game/:mode" element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        } />

        <Route path="/mines" element={  // ✅ NEW MINES ROUTE
          <ProtectedRoute>
            <Mines />
          </ProtectedRoute>
        } />

        <Route path="/wallet" element={
          <ProtectedRoute>
            <Wallet />
          </ProtectedRoute>
        } />

        <Route path="/withdrawal" element={
          <ProtectedRoute>
            <Withdrawal />
          </ProtectedRoute>
        } />

        <Route path="/history" element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } />

        {/* Admin Route */}
        <Route path="/admin" element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        } />

      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
