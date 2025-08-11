import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  validateToken: () =>
    api.get('/auth/validate'),
};

export const equipamentosAPI = {
  getAll: () => api.get('/equipamentos'),
  getById: (id: number) => api.get(`/equipamentos/${id}`),
  create: (data: any) => api.post('/equipamentos', data),
  update: (id: number, data: any) => api.put(`/equipamentos/${id}`, data),
  delete: (id: number) => api.delete(`/equipamentos/${id}`),
  getBackups: (id: number) => api.get(`/equipamentos/${id}/backups`),
};

export const backupsAPI = {
  getAll: () => api.get('/backups'),
  getById: (id: number) => api.get(`/backups/${id}`),
  getRecent: (limit?: number) => api.get(`/backups/recent${limit ? `?limit=${limit}` : ''}`),
  upload: (equipamentoId: number, file: File, providerId?: number) => {
    const formData = new FormData();
    formData.append('backup', file);
    if (providerId) {
      formData.append('providerId', providerId.toString());
    }
    return api.post(`/backups/equipamento/${equipamentoId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  download: (id: number) => api.get(`/backups/${id}/download`, { responseType: 'blob' }),
  delete: (id: number) => api.delete(`/backups/${id}`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getEquipamentoStats: () => api.get('/dashboard/equipamentos'),
  getProviderHealth: () => api.get('/dashboard/providers/health'),
  getBackupJobsStats: () => api.get('/dashboard/backup-jobs/stats'),
};

export const providersAPI = {
  getAll: () => api.get('/providers'),
  getById: (id: number) => api.get(`/providers/${id}`),
  getActive: () => api.get('/providers/active'),
  create: (data: any) => api.post('/providers', data),
  update: (id: number, data: any) => api.put(`/providers/${id}`, data),
  delete: (id: number) => api.delete(`/providers/${id}`),
  toggleActive: (id: number) => api.post(`/providers/${id}/toggle`),
  testConnection: (id: number) => api.post(`/providers/${id}/test`),
};

export const backupJobsAPI = {
  getAll: () => api.get('/backup-jobs'),
  getById: (id: number) => api.get(`/backup-jobs/${id}`),
  getStats: () => api.get('/backup-jobs/stats'),
  getByEquipamento: (equipamentoId: number) => api.get(`/backup-jobs/equipamento/${equipamentoId}`),
  create: (data: any) => api.post('/backup-jobs', data),
  update: (id: number, data: any) => api.put(`/backup-jobs/${id}`, data),
  delete: (id: number) => api.delete(`/backup-jobs/${id}`),
  pause: (id: number) => api.post(`/backup-jobs/${id}/pause`),
  resume: (id: number) => api.post(`/backup-jobs/${id}/resume`),
  runNow: (id: number) => api.post(`/backup-jobs/${id}/run`),
  validateCron: (pattern: string) => api.post('/backup-jobs/validate-cron', { pattern }),
};

export const autoBackupAPI = {
  getConfig: (equipamentoId: number) => api.get(`/auto-backup/config/${equipamentoId}`),
  updateConfig: (equipamentoId: number, data: any) => api.put(`/auto-backup/config/${equipamentoId}`, data),
  testConnectivity: (equipamentoId: number) => api.post(`/auto-backup/test-connectivity/${equipamentoId}`),
  executeBackup: (equipamentoId: number) => api.post(`/auto-backup/execute/${equipamentoId}`),
  getScripts: () => api.get('/auto-backup/scripts'),
  getHistory: (equipamentoId: number) => api.get(`/auto-backup/history/${equipamentoId}`),
};