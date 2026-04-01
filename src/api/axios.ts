import axios from 'axios';

export const BACKEND_URL = 'https://zatca-backend.loopive.com';

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token helpers ─────────────────────────────────────────────────────────────

/** Decode a JWT and return its `exp` Unix timestamp, or null on failure. */
function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Returns true if the token is already expired or will expire within `bufferSec` seconds. */
function isExpiredOrExpiringSoon(token: string, bufferSec = 90): boolean {
  const exp = getTokenExp(token);
  if (exp === null) return true;
  return Date.now() / 1000 + bufferSec >= exp;
}

// ── Shared refresh state (prevents simultaneous refresh calls) ────────────────
let isRefreshing = false;
let pendingQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  pendingQueue = [];
}

async function doRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

  const { data } = await axios.post(
    `${BACKEND_URL}/api/v1/user/token/refresh/`,
    { refresh: refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  const newAccess: string = data.access;
  localStorage.setItem('auth_token', newAccess);
  if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
  return newAccess;
}

function redirectToLogin() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
  window.location.href = '/';
}

// ── Request interceptor: attach token, proactively refresh if near expiry ─────
api.interceptors.request.use(async (config) => {
  // Skip the refresh endpoint itself to avoid loops
  if (config.url?.includes('/token/refresh/')) return config;

  // When sending FormData let the browser set the correct multipart Content-Type
  // (with boundary). Deleting the JSON default prevents axios from serializing
  // the FormData as "{}" and sending it with application/json.
  if (config.data instanceof FormData) {
    delete (config.headers as Record<string, unknown>)['Content-Type'];
  }

  let token = localStorage.getItem('auth_token');

  if (token && isExpiredOrExpiringSoon(token)) {
    if (isRefreshing) {
      // Another request is already refreshing — wait for it
      token = await new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      });
    } else {
      isRefreshing = true;
      try {
        token = await doRefresh();
        processQueue(null, token);
      } catch (err) {
        processQueue(err, null);
        redirectToLogin();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: fallback refresh on unexpected 401 ─────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/token/refresh/')
    ) {
      if (isRefreshing) {
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
        const newToken = await doRefresh();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
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
  },
);

export default api;
