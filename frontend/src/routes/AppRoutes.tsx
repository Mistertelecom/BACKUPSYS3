import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { EquipamentosPage } from '../pages/EquipamentosPage';
import { BackupsPage } from '../pages/BackupsPage';
import { ProvidersPage } from '../pages/ProvidersPage';
import { UploadBackupPage } from '../pages/UploadBackupPage';
import { IntegrationPage } from '../pages/IntegrationPage';
import { UpdatesPage } from '../pages/UpdatesPage';
import UsersPage from '../pages/UsersPage';
import { Layout } from '../components/layout/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AdminRoute } from '../components/AdminRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="equipamentos" element={<EquipamentosPage />} />
        <Route path="equipamentos/:equipamentoId/upload" element={<UploadBackupPage />} />
        <Route path="backups" element={<BackupsPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="integration" element={<IntegrationPage />} />
        <Route path="updates" element={<UpdatesPage />} />
        <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
      </Route>
    </Routes>
  );
}