import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
  upload: (equipamentoId: number, file: File) => {
    const formData = new FormData();
    formData.append('backup', file);
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
};