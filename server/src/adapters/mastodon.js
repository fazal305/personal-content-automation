// Real automation: publish + analytics, no app review or business verification —
// just a per-instance OAuth app. See docs/api-research.md.
import { buildStatusText } from './textFormat.js';

function config() {
  const { MASTODON_INSTANCE_URL, MASTODON_ACCESS_TOKEN } = process.env;
  if (!MASTODON_INSTANCE_URL || !MASTODON_ACCESS_TOKEN) return null;
  return { instanceUrl: MASTODON_INSTANCE_URL.replace(/\/$/, ''), token: MASTODON_ACCESS_TOKEN };
}

export const mastodonAdapter = {
  async testConnection() {
    const cfg = config();
    if (!cfg) return { connected: false, reason: 'MASTODON_INSTANCE_URL / MASTODON_ACCESS_TOKEN not set' };
    const res = await fetch(`${cfg.instanceUrl}/api/v1/accounts/verify_credentials`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    if (!res.ok) return { connected: false, reason: `HTTP ${res.status}` };
    const account = await res.json();
    return { connected: true, account: `@${account.username}` };
  },

  async publish(content) {
    const cfg = config();
    if (!cfg) throw new Error('Mastodon not configured — set MASTODON_INSTANCE_URL and MASTODON_ACCESS_TOKEN in .env');

    const status = buildStatusText(content).slice(0, 500);
    const res = await fetch(`${cfg.instanceUrl}/api/v1/statuses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Mastodon publish failed: HTTP ${res.status}`);
    const data = await res.json();
    return { id: data.id, url: data.url };
  },

  async getAnalytics(externalPostId) {
    const cfg = config();
    if (!cfg) throw new Error('Mastodon not configured');
    const res = await fetch(`${cfg.instanceUrl}/api/v1/statuses/${externalPostId}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    if (!res.ok) throw new Error(`Mastodon status fetch failed: HTTP ${res.status}`);
    const data = await res.json();
    return { likes: data.favourites_count, shares: data.reblogs_count, comments: data.replies_count };
  },
};
