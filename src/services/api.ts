import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import { AUTH_EXPIRED_EVENT, clearStoredAuth } from '../utils/storage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const PUBLIC_AUTH_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/google',
  '/auth/logout',
]);

// Add a request interceptor to handle multipart requests
api.interceptors.request.use(
  (config) => {
    // Let the browser set the multipart boundary for FormData requests.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
        if (typeof (config.headers as any).delete === 'function') {
          (config.headers as any).delete('Content-Type');
          (config.headers as any).delete('content-type');
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url || '');
    const status = Number(error?.response?.status || 0);
    const isPublicAuthRequest = Array.from(PUBLIC_AUTH_PATHS).some((path) => requestUrl.includes(path));
    const isSessionProbe = requestUrl.includes('/auth/me');

    if (status === 401 && !isPublicAuthRequest && !isSessionProbe) {
      clearStoredAuth();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      }
    }

    const fallbackMessage = error?.code === 'ERR_NETWORK'
      ? 'Unable to reach the server. Check VITE_API_URL and backend deployment.'
      : error?.response?.data?.error
        || error?.response?.data?.message
        || error?.message
        || 'Request failed';

    if (!(isSessionProbe && [401, 403].includes(status))) {
      console.error('[api:error]', {
        url: error?.config?.url,
        method: error?.config?.method,
        baseURL: error?.config?.baseURL,
        message: fallbackMessage,
        status: error?.response?.status,
        data: error?.response?.data,
      });
    }

    const normalizedError = Object.assign(new Error(fallbackMessage), error, {
      message: fallbackMessage,
    });

    return Promise.reject(normalizedError);
  }
);

export default api;
