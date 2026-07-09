import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ClientDetailPage from './pages/ClientDetailPage.jsx';
import ClientFormPage from './pages/ClientFormPage.jsx';
import ClientsPage from './pages/ClientsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InvoiceDetailPage from './pages/InvoiceDetailPage.jsx';
import InvoiceFormPage from './pages/InvoiceFormPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import FeaturesPage from './pages/FeaturesPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import ProposalFormPage from './pages/ProposalFormPage.jsx';
import ProposalsPage from './pages/ProposalsPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/register" element={<AuthPage mode="signup" />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
