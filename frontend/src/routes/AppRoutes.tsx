import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { EquipamentosPage } from '../pages/EquipamentosPage';
import { BackupsPage } from '../pages/BackupsPage';
import { Layout } from '../components/layout/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';

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
        <Route path="backups" element={<BackupsPage />} />
      </Route>
    </Routes>
  );
}