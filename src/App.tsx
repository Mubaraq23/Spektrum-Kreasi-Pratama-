import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ThemeProvider } from './lib/ThemeContext';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Calibrators } from './pages/Calibrators';
import { Worksheets } from './pages/Worksheets';
import { WorkMethods } from './pages/WorkMethods';
import { WorksheetEditor } from './pages/WorksheetEditor';
import { CertificateDetail } from './pages/CertificateDetail';
import { Reports } from './pages/Reports';
import EquipmentInventory from './pages/EquipmentInventory';
import { UserManagement } from './pages/UserManagement';
import { IKAssistant } from './pages/IKAssistant';
import { Certificates } from './pages/Certificates';
import { CertificateExtractor } from './pages/CertificateExtractor';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { IPMModule } from './pages/IPMModule';
import { UkesModule } from './pages/UkesModule';
import { WorkOrders } from './pages/WorkOrders';
import { ServiceHistory } from './pages/ServiceHistory';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Terjadi Kesalahan Sistem</h1>
          <p className="text-slate-400 mb-8 max-w-md">Aplikasi mengalami kesalahan saat memuat. Silakan coba muat ulang halaman.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-cyan-500 rounded-lg text-slate-950 font-bold"
          >
            Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthLoadingGuard({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#030612]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-6 text-sm font-black text-cyan-400/50 uppercase tracking-[0.3em] animate-pulse">Initializing System</p>
      </div>
    );
  }
  
  return <>{children}</>;
}

function RoleRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;
  
  // Retrieve the loaded user role (defaulting safely to 'technician')
  const userRole = profile?.role || 'technician';
  
  if (!allowedRoles.includes(userRole)) {
    // Re-route to standard dashboard if user role does not match permissions
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

export default function App() {
  const allRoles = ['admin', 'supervisor', 'technician', 'management', 'client'];
  const operRoles = ['admin', 'supervisor', 'technician'];
  const viewRoles = ['admin', 'supervisor'];
  const techRoles = ['admin', 'technician', 'supervisor'];
  const rptsRoles = ['admin', 'supervisor', 'management'];

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AuthLoadingGuard>
            <Router>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                
                <Route path="/dashboard" element={
                  <RoleRoute allowedRoles={allRoles}><Dashboard /></RoleRoute>
                } />
                
                <Route path="/work-orders" element={
                  <RoleRoute allowedRoles={allRoles}><WorkOrders /></RoleRoute>
                } />
                
                <Route path="/service-history" element={
                  <RoleRoute allowedRoles={allRoles}><ServiceHistory /></RoleRoute>
                } />
                
                <Route path="/calibrators" element={
                  <RoleRoute allowedRoles={viewRoles}><Calibrators /></RoleRoute>
                } />
                
                <Route path="/worksheets" element={
                  <RoleRoute allowedRoles={techRoles}><Worksheets /></RoleRoute>
                } />
                
                <Route path="/worksheets/:id/edit" element={
                  <RoleRoute allowedRoles={techRoles}><WorksheetEditor /></RoleRoute>
                } />
                
                <Route path="/certificates" element={
                  <RoleRoute allowedRoles={viewRoles}><Certificates /></RoleRoute>
                } />
                
                <Route path="/certificates/:id" element={
                  <RoleRoute allowedRoles={viewRoles}><CertificateDetail /></RoleRoute>
                } />
                
                <Route path="/reports" element={
                  <RoleRoute allowedRoles={rptsRoles}><Reports /></RoleRoute>
                } />
                
                <Route path="/methods" element={
                  <RoleRoute allowedRoles={techRoles}><WorkMethods /></RoleRoute>
                } />
                
                <Route path="/inventory" element={
                  <RoleRoute allowedRoles={viewRoles}><EquipmentInventory /></RoleRoute>
                } />
                
                <Route path="/users" element={
                  <RoleRoute allowedRoles={['admin']}><UserManagement /></RoleRoute>
                } />
                
                <Route path="/ik-assistant" element={
                  <RoleRoute allowedRoles={techRoles}><IKAssistant /></RoleRoute>
                } />
                
                <Route path="/extractor" element={
                  <RoleRoute allowedRoles={operRoles}><CertificateExtractor /></RoleRoute>
                } />

                <Route path="/ipm" element={
                  <RoleRoute allowedRoles={techRoles}><IPMModule /></RoleRoute>
                } />
                
                <Route path="/ukes" element={
                  <RoleRoute allowedRoles={techRoles}><UkesModule /></RoleRoute>
                } />

                <Route path="/audit-logs" element={
                  <RoleRoute allowedRoles={['admin', 'supervisor']}><AuditLogs /></RoleRoute>
                } />
                
                <Route path="/settings" element={
                  <RoleRoute allowedRoles={allRoles}><Settings /></RoleRoute>
                } />
                
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Router>
          </AuthLoadingGuard>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
