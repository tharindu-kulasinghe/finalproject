import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    return config;
  }
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

const isAuthFailureRequest = (config) => {
  const path = `${config?.baseURL || ''}${config?.url || ''}`;
  // Do not full-page redirect on failed login/forgot-password — those return 401/403 too
  // and `window.location` would remount the app and wipe the login form + error message.
  return /\/auth\/login/i.test(path) || /\/auth\/forgot-password/i.test(path);
};

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !isAuthFailureRequest(err.config)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;