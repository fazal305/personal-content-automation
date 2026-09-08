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
  events: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events${qs ? `?${qs}` : ''}`);
  },
  eventTypes: () => request('/events/types'),
  config: () => request('/config'),
  updateConfig: (data) => request('/config', { method: 'PATCH', body: JSON.stringify(data) }),
  testConnection: (slug) => request(`/platforms/${slug}/test-connection`, { method: 'POST' }),
  calendar: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/calendar${qs ? `?${qs}` : ''}`);
  },
  scheduleContent: (data) => request('/schedule', { method: 'POST', body: JSON.stringify(data) }),
  cancelSchedule: (jobId) => request(`/schedule/${jobId}`, { method: 'DELETE' }),
  runAutomation: () => request('/automation/run', { method: 'POST' }),
  automationStatus: () => request('/automation/status'),
  automationRules: () => request('/automation/rules'),
  toggleRule: (id, enabled) => request(`/automation/rules/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  aiStatus: () => request('/ai/status'),
  aiGenerateDraft: (content_id) => request('/ai/generate-draft', { method: 'POST', body: JSON.stringify({ content_id }) }),
  aiRewrite: (content_id, mode) => request('/ai/rewrite', { method: 'POST', body: JSON.stringify({ content_id, mode }) }),
  aiRepurpose: (content_id, platform_id) => request('/ai/repurpose', { method: 'POST', body: JSON.stringify({ content_id, platform_id }) }),
  aiQualityCheck: (content_id) => request('/ai/quality-check', { method: 'POST', body: JSON.stringify({ content_id }) }),
  variants: (contentId) => request(`/content/${contentId}/variants`),
  saveVariant: (contentId, platformId, data) => request(`/content/${contentId}/variants/${platformId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVariant: (contentId, platformId) => request(`/content/${contentId}/variants/${platformId}`, { method: 'DELETE' }),
  analyticsOverview: () => request('/analytics/overview'),
  contentAnalytics: (contentId) => request(`/analytics/content/${contentId}`),
  intelligenceInsights: () => request('/intelligence/insights'),
};
