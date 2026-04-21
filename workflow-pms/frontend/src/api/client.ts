import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Multipart uploads must not use application/json (browser sets boundary for FormData).
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (
    config.data != null &&
    typeof config.data === 'object' &&
    !(config.data instanceof FormData) &&
    !config.headers['Content-Type']
  ) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
