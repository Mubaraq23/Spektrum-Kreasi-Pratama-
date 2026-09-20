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
import { WorkOrders } from './pages/WorkOrders';
import { ServiceHistory } from './pages/ServiceHistory';
import { CalculationEngine } from './pages/CalculationEngine';
import { KANScopeMatrix } from './pages/KANScopeMatrix';
import { CustomProtocolBuilder } from './pages/CustomProtocolBuilder';
import { MetadataManager } from './pages/MetadataManager';
import { UkesRadiologyDashboard } from './pages/UkesRadiologyDashboard';
import { UkesRadiologyWizard } from './pages/UkesRadiologyWizard';
import { UkesRadiologyMasterRegulations } from './pages/UkesRadiologyMasterRegulations';
import { UkesMasterModalityAdmin } from './pages/UkesMasterModalityAdmin';
import { UkesBapetenReportingAdmin } from './pages/UkesBapetenReportingAdmin';
import { UkesRadiologyInstruments } from './pages/UkesRadiologyInstruments';
import { UkesRadiologyCertificateDetail } from './pages/UkesRadiologyCertificateDetail';
import { IpmDashboard } from './pages/IpmDashboard';
import { IpmWizard } from './pages/IpmWizard';
import { IpmMasterTemplates } from './pages/IpmMasterTemplates';
import { IpmSpareParts } from './pages/IpmSpareParts';
import { IpmReportDetail } from './pages/IpmReportDetail';
import { RepairDashboard } from './pages/RepairDashboard';
import { RepairWizard } from './pages/RepairWizard';
import { RepairMasterCatalog } from './pages/RepairMasterCatalog';
import { RepairReportDetail } from './pages/RepairReportDetail';
import { MasterUnifiedHub } from './pages/MasterUnifiedHub';
import { ServiceRecap } from './pages/ServiceRecap';
import { DailyRecap } from './pages/DailyRecap';
import { SatuSehatBridgingHub } from './pages/SatuSehatBridgingHub';
import { ThermalStickerStudio } from './pages/ThermalStickerStudio';
import { BapetenSiIntanDispatcher } from './pages/BapetenSiIntanDispatcher';
import { MetrologicalValidationWorkspace } from './pages/MetrologicalValidationWorkspace';
import { CustomerPortal } from './pages/CustomerPortal';
import { UniversalWorkspace } from './pages/UniversalWorkspace';
import { DigitalAssetPassport } from './pages/DigitalAssetPassport';
import { LiveMeasurementConsole } from './pages/LiveMeasurementConsole';
import { UncertaintyLab } from './pages/UncertaintyLab';
import { ScopeCommandCenter } from './pages/ScopeCommandCenter';
import { CalibratorHealthCenter } from './pages/CalibratorHealthCenter';
import { ExecutiveIntelligenceDashboard } from './pages/ExecutiveIntelligenceDashboard';
import { OneClickAuditPackage } from './pages/OneClickAuditPackage';
import { PublicQRVerification } from './pages/PublicQRVerification';
import { FieldTechnicianMode } from './pages/FieldTechnicianMode';
import { SmartWorkOrderEngine } from './pages/SmartWorkOrderEngine';
import { DigitalTraceabilityGraph } from './pages/DigitalTraceabilityGraph';
import { QualityCommandCenter } from './pages/QualityCommandCenter';
import { MethodBuilderVisual } from './pages/MethodBuilderVisual';
import { IncidentManagementCenter } from './pages/IncidentManagementCenter';




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

                <Route path="/service-recap" element={
                  <RoleRoute allowedRoles={allRoles}><ServiceRecap /></RoleRoute>
                } />

                <Route path="/daily-recap" element={
                  <RoleRoute allowedRoles={allRoles}><DailyRecap /></RoleRoute>
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
                  <RoleRoute allowedRoles={allRoles}><WorkMethods /></RoleRoute>
                } />

                <Route path="/calculation-engine" element={
                  <RoleRoute allowedRoles={allRoles}><CalculationEngine /></RoleRoute>
                } />

                <Route path="/scope-matrix" element={
                  <RoleRoute allowedRoles={allRoles}><KANScopeMatrix /></RoleRoute>
                } />

                <Route path="/protocol-builder" element={
                  <RoleRoute allowedRoles={allRoles}><CustomProtocolBuilder /></RoleRoute>
                } />

                <Route path="/metadata-manager" element={
                  <RoleRoute allowedRoles={['admin', 'supervisor']}><MetadataManager /></RoleRoute>
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

                <Route path="/master-hub" element={
                  <RoleRoute allowedRoles={techRoles}><MasterUnifiedHub /></RoleRoute>
                } />

                <Route path="/satusehat-hub" element={
                  <RoleRoute allowedRoles={techRoles}><SatuSehatBridgingHub /></RoleRoute>
                } />

                <Route path="/thermal-sticker-studio" element={
                  <RoleRoute allowedRoles={techRoles}><ThermalStickerStudio /></RoleRoute>
                } />

                <Route path="/siintan-dispatcher" element={
                  <RoleRoute allowedRoles={techRoles}><BapetenSiIntanDispatcher /></RoleRoute>
                } />

                <Route path="/metrological-validation" element={
                  <RoleRoute allowedRoles={['admin', 'supervisor']}><MetrologicalValidationWorkspace /></RoleRoute>
                } />

                <Route path="/customer-portal" element={
                  <RoleRoute allowedRoles={allRoles}><CustomerPortal /></RoleRoute>
                } />

                <Route path="/universal-workspace" element={

                  <RoleRoute allowedRoles={allRoles}><UniversalWorkspace /></RoleRoute>
                } />

                <Route path="/asset-passport/:id" element={
                  <RoleRoute allowedRoles={allRoles}><DigitalAssetPassport /></RoleRoute>
                } />

                <Route path="/asset-passport" element={
                  <RoleRoute allowedRoles={allRoles}><DigitalAssetPassport /></RoleRoute>
                } />

                <Route path="/live-console" element={
                  <RoleRoute allowedRoles={techRoles}><LiveMeasurementConsole /></RoleRoute>
                } />

                <Route path="/uncertainty-lab" element={
                  <RoleRoute allowedRoles={viewRoles}><UncertaintyLab /></RoleRoute>
                } />

                <Route path="/scope-command-center" element={
                  <RoleRoute allowedRoles={viewRoles}><ScopeCommandCenter /></RoleRoute>
                } />

                <Route path="/calibrator-health" element={
                  <RoleRoute allowedRoles={viewRoles}><CalibratorHealthCenter /></RoleRoute>
                } />

                <Route path="/executive-intelligence" element={
                  <RoleRoute allowedRoles={rptsRoles}><ExecutiveIntelligenceDashboard /></RoleRoute>
                } />

                <Route path="/audit-package" element={
                  <RoleRoute allowedRoles={viewRoles}><OneClickAuditPackage /></RoleRoute>
                } />

                <Route path="/verify/:id" element={<PublicQRVerification />} />
                <Route path="/verify" element={<PublicQRVerification />} />

                <Route path="/field-mode" element={
                  <RoleRoute allowedRoles={techRoles}><FieldTechnicianMode /></RoleRoute>
                } />

                <Route path="/smart-work-orders" element={
                  <RoleRoute allowedRoles={allRoles}><SmartWorkOrderEngine /></RoleRoute>
                } />

                <Route path="/traceability-graph" element={
                  <RoleRoute allowedRoles={viewRoles}><DigitalTraceabilityGraph /></RoleRoute>
                } />

                <Route path="/quality-command-center" element={
                  <RoleRoute allowedRoles={viewRoles}><QualityCommandCenter /></RoleRoute>
                } />

                <Route path="/method-builder" element={
                  <RoleRoute allowedRoles={techRoles}><MethodBuilderVisual /></RoleRoute>
                } />

                <Route path="/incident-rca" element={
                  <RoleRoute allowedRoles={viewRoles}><IncidentManagementCenter /></RoleRoute>
                } />




                <Route path="/ipm" element={
                  <RoleRoute allowedRoles={techRoles}><IpmDashboard /></RoleRoute>
                } />

                <Route path="/ipm/wizard" element={
                  <RoleRoute allowedRoles={techRoles}><IpmWizard /></RoleRoute>
                } />

                <Route path="/ipm/wizard/:id" element={
                  <RoleRoute allowedRoles={techRoles}><IpmWizard /></RoleRoute>
                } />

                <Route path="/ipm/templates" element={
                  <RoleRoute allowedRoles={viewRoles}><IpmMasterTemplates /></RoleRoute>
                } />

                <Route path="/ipm/spare-parts" element={
                  <RoleRoute allowedRoles={viewRoles}><IpmSpareParts /></RoleRoute>
                } />

                <Route path="/ipm/reports/:id" element={
                  <RoleRoute allowedRoles={viewRoles}><IpmReportDetail /></RoleRoute>
                } />
                
                <Route path="/ukes" element={<Navigate to="/ukes-radiology" replace />} />

                <Route path="/ukes-radiology" element={
                  <RoleRoute allowedRoles={techRoles}><UkesRadiologyDashboard /></RoleRoute>
                } />

                <Route path="/ukes-radiology/wizard" element={
                  <RoleRoute allowedRoles={techRoles}><UkesRadiologyWizard /></RoleRoute>
                } />

                <Route path="/ukes-radiology/wizard/:id" element={
                  <RoleRoute allowedRoles={techRoles}><UkesRadiologyWizard /></RoleRoute>
                } />

                <Route path="/ukes-radiology/master-regulations" element={
                  <RoleRoute allowedRoles={viewRoles}><UkesRadiologyMasterRegulations /></RoleRoute>
                } />

                <Route path="/ukes-radiology/master-modalities" element={
                  <RoleRoute allowedRoles={viewRoles}><UkesMasterModalityAdmin /></RoleRoute>
                } />

                <Route path="/ukes-radiology/bapeten-reporting" element={
                  <RoleRoute allowedRoles={viewRoles}><UkesBapetenReportingAdmin /></RoleRoute>
                } />

                <Route path="/ukes-radiology/instruments" element={
                  <RoleRoute allowedRoles={viewRoles}><UkesRadiologyInstruments /></RoleRoute>
                } />

                <Route path="/ukes-radiology/reports/:id" element={
                  <RoleRoute allowedRoles={viewRoles}><UkesRadiologyCertificateDetail /></RoleRoute>
                } />

                <Route path="/repair" element={
                  <RoleRoute allowedRoles={techRoles}><RepairDashboard /></RoleRoute>
                } />

                <Route path="/repair/wizard" element={
                  <RoleRoute allowedRoles={techRoles}><RepairWizard /></RoleRoute>
                } />

                <Route path="/repair/wizard/:id" element={
                  <RoleRoute allowedRoles={techRoles}><RepairWizard /></RoleRoute>
                } />

                <Route path="/repair/master-catalog" element={
                  <RoleRoute allowedRoles={viewRoles}><RepairMasterCatalog /></RoleRoute>
                } />

                <Route path="/repair/reports/:id" element={
                  <RoleRoute allowedRoles={viewRoles}><RepairReportDetail /></RoleRoute>
                } />

                <Route path="/audit-logs" element={
                  <RoleRoute allowedRoles={['admin', 'supervisor']}><AuditLogs /></RoleRoute>
                } />
                
                <Route path="/regulation-manager" element={<Navigate to="/ukes-radiology/master-regulations" replace />} />
                
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
