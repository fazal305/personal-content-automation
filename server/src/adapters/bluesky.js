// Real automation: publish + analytics, fully open AT Protocol — app-password
// auth, no business verification anywhere. See docs/api-research.md.
import { buildStatusText } from './textFormat.js';

const SERVICE = 'https://bsky.social';

async function createSession() {
  const { BLUESKY_IDENTIFIER, BLUESKY_APP_PASSWORD } = process.env;
  if (!BLUESKY_IDENTIFIER || !BLUESKY_APP_PASSWORD) return null;

  const res = await fetch(`${SERVICE}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: BLUESKY_IDENTIFIER, password: BLUESKY_APP_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Bluesky auth failed: HTTP ${res.status}`);
  return res.json(); // { accessJwt, did, handle, ... }
}

export const blueskyAdapter = {
  async testConnection() {
    try {
      const session = await createSession();
      if (!session) return { connected: false, reason: 'BLUESKY_IDENTIFIER / BLUESKY_APP_PASSWORD not set' };
      return { connected: true, account: `@${session.handle}` };
    } catch (err) {
      return { connected: false, reason: err.message };
    }
  },

  async publish(content) {
    const session = await createSession();
    if (!session) throw new Error('Bluesky not configured — set BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD in .env');

    const text = buildStatusText(content).slice(0, 300);
    const res = await fetch(`${SERVICE}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessJwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record: { text, createdAt: new Date().toISOString(), $type: 'app.bsky.feed.post' },
      }),
    });
    if (!res.ok) throw new Error(`Bluesky publish failed: HTTP ${res.status}`);
    const data = await res.json();
    return { id: data.uri, url: null };
  },

  async getAnalytics(externalPostId) {
    const session = await createSession();
    if (!session) throw new Error('Bluesky not configured');
    const res = await fetch(`${SERVICE}/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(externalPostId)}`, {
      headers: { Authorization: `Bearer ${session.accessJwt}` },
    });
    if (!res.ok) throw new Error(`Bluesky post fetch failed: HTTP ${res.status}`);
    const data = await res.json();
    const post = data.posts?.[0];
    return { likes: post?.likeCount ?? 0, shares: post?.repostCount ?? 0, comments: post?.replyCount ?? 0 };
  },
};
