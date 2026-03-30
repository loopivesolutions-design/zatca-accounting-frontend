import axios from 'axios';

export const BACKEND_URL = 'https://zatca-backend.loopive.com';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let isRefreshing = false;
let pendingQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, and not on the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/token/refresh/')
    ) {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BACKEND_URL}/api/v1/user/token/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = data.access;
        localStorage.setItem('auth_token', newAccessToken);

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function redirectToLogin() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
  window.location.href = '/';
}

export default api;
