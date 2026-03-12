const API_BASE = 'http://localhost:5000/api';

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
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
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
  getUserSessions: (userId, dateStr) => apiRequest(`/admin/users/${userId}/sessions${dateStr ? `?date=${dateStr}` : ''}`),
};
