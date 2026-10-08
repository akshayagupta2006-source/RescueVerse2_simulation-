import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request if present
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// Global error handling — only force-logout on expired/invalid session tokens,
// not on failed login/register/google attempts.
api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const url = err.config?.url || '';

    const isAuthAttempt = /\/auth\/(login|register|google)/.test(url);

    if (status === 401 && !isAuthAttempt) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];

      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;