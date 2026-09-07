// GitHub isn't a publish target here (see docs/api-research.md — it's a trigger
// source: detecting real activity worth turning into a content idea). Public
// events API, no auth required for public repos, though a token raises the rate
// limit from 60/hr to 5,000/hr.
function headers() {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'personal-content-automation' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

export async function testConnection() {
  const username = process.env.GITHUB_USERNAME;
  if (!username) return { connected: false, reason: 'GITHUB_USERNAME not set' };
  const res = await fetch(`https://api.github.com/users/${username}`, { headers: headers() });
  if (!res.ok) return { connected: false, reason: `HTTP ${res.status}` };
  return { connected: true, account: `@${username}` };
}

// Only ReleaseEvents with action "published" count as meaningful — not every
// commit, matching "don't post about every commit" from the brief.
export async function fetchRecentReleases(username) {
  const res = await fetch(`https://api.github.com/users/${username}/events/public`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub API error: HTTP ${res.status}`);
  const events = await res.json();
  return events
    .filter((e) => e.type === 'ReleaseEvent' && e.payload?.action === 'published')
    .map((e) => ({
      id: e.id,
      repo: e.repo.name,
      tag: e.payload.release.tag_name,
      name: e.payload.release.name || e.payload.release.tag_name,
      url: e.payload.release.html_url,
      publishedAt: e.payload.release.published_at,
    }));
}
