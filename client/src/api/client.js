import axios from 'axios';

// withCredentials makes the browser send the HTTP-only auth cookie with every request.
export const api = axios.create({ baseURL: '/api', withCredentials: true });

export const getError = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || (err?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running?' : fallback);

// Per-field messages from the server (used to show errors under inputs).
export const getFieldErrors = (err) => err?.response?.data?.errors || {};

// Called by AuthContext so an expired session sends the user back to login from anywhere.
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthCall = url.startsWith('/auth/login') || url.startsWith('/auth/register') || url.startsWith('/auth/me') || url.includes('password');
    if (err.response?.status === 401 && !isAuthCall) onUnauthorized();
    return Promise.reject(err);
  }
);
