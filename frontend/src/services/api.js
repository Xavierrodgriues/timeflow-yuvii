const API_BASE = 'https://timeflow-backend.yuviiconsultancy.com/api';

function getToken() {
  return localStorage.getItem('tt_token');
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({})); // Handle non-JSON responses safely
  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data;
}

export const authApi = {
  login: (body) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  adminLogin: (body) =>
    apiRequest('/auth/admin/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiRequest('/auth/me'),
};

export const sessionApi = {
  start: (body) =>
    apiRequest('/sessions/start', { method: 'POST', body: JSON.stringify(body) }),
  heartbeat: (body) =>
    apiRequest('/sessions/heartbeat', { method: 'POST', body: JSON.stringify(body) }),
  event: (body) =>
    apiRequest('/sessions/event', { method: 'POST', body: JSON.stringify(body) }),
  end: (body) =>
    apiRequest('/sessions/end', { method: 'POST', body: JSON.stringify(body) }),
  today: (date) =>
    apiRequest(`/sessions/today${date ? `?date=${date}` : ''}`),
};

export const adminApi = {
  getUsers: () => apiRequest('/admin/users'),
  createUser: (body) => apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (userId, body) => apiRequest(`/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (userId) => apiRequest(`/admin/users/${userId}`, { method: 'DELETE' }),
  getUserSessions: (userId, dateStr) => apiRequest(`/admin/users/${userId}/sessions${dateStr ? `?date=${dateStr}` : ''}`),
  getClaims: () => apiRequest('/admin/claims'),
  updateClaimStatus: (id, status) => apiRequest(`/admin/claims/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getUnproductiveConfig: () => apiRequest('/admin/config/unproductive'),
  updateUnproductiveConfig: (keywords) => apiRequest('/admin/config/unproductive', { method: 'PUT', body: JSON.stringify({ keywords }) }),
};

export const claimApi = {
  create: (body) => apiRequest('/claims', { method: 'POST', body: JSON.stringify(body) }),
  getMy: () => apiRequest('/claims/my'),
};

// Local agent synchronization logic removed as per user request for simplification.
// The agent now polls the backend for active sessions.
