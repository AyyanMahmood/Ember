import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ClientDetailPage from './pages/ClientDetailPage.jsx';
import ClientFormPage from './pages/ClientFormPage.jsx';
import ClientsPage from './pages/ClientsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InvoiceDetailPage from './pages/InvoiceDetailPage.jsx';
import InvoiceFormPage from './pages/InvoiceFormPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProposalFormPage from './pages/ProposalFormPage.jsx';
import ProposalsPage from './pages/ProposalsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/dashboard" element={<Navigate to="/app" replace />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/new" element={<ClientFormPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="clients/:id/edit" element={<ClientFormPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<InvoiceFormPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
        <Route path="proposals" element={<ProposalsPage />} />
        <Route path="proposals/new" element={<ProposalFormPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
