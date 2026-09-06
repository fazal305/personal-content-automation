const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => request('/health'),
  pipelineCounts: () => request('/content/pipeline-counts'),
  listContent: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/content${qs ? `?${qs}` : ''}`);
  },
  getContent: (id) => request(`/content/${id}`),
  createContent: (data) => request('/content', { method: 'POST', body: JSON.stringify(data) }),
  updateContent: (id, data) => request(`/content/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteContent: (id) => request(`/content/${id}`, { method: 'DELETE' }),
  platforms: () => request('/platforms'),
  pillars: () => request('/pillars'),
  createPillar: (data) => request('/pillars', { method: 'POST', body: JSON.stringify(data) }),
  tags: () => request('/tags'),
  events: (limit = 20) => request(`/events?limit=${limit}`),
  config: () => request('/config'),
};
