import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// QR Code API
export const qrCodeAPI = {
  getAll: (params) => api.get('/qrcodes', { params }),
  getOne: (id) => api.get(`/qrcodes/${id}`),
  create: (data) => api.post('/qrcodes', data),
  update: (id, data) => api.put(`/qrcodes/${id}`, data),
  delete: (id) => api.delete(`/qrcodes/${id}`),
  deleteMany: (ids) => api.post('/qrcodes/bulk-delete', { ids }),
  download: (id, format, size) => 
    api.get(`/qrcodes/${id}/download`, { 
      params: { format, size },
      responseType: 'blob'
    }),
  duplicate: (id, data) => api.post(`/qrcodes/${id}/duplicate`, data),
};

// Content API
export const contentAPI = {
  upload: (formData) => api.post('/content/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  get: (qrCodeId) => api.get(`/content/${qrCodeId}`),
  update: (qrCodeId, data) => api.put(`/content/${qrCodeId}`, data),
  deleteFile: (filePath) => api.delete('/content/file', { data: { filePath } }),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getQRAnalytics: (qrCodeId, params) => api.get(`/analytics/${qrCodeId}`, { params }),
  getStats: (qrCodeId, period) => api.get(`/analytics/${qrCodeId}/stats`, { params: { period } }),
  getQRLocations: (qrCodeId) => api.get(`/analytics/${qrCodeId}/locations`),
};

export default api;