import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.analyticsOverview().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-sm text-danger">{error}</div>;
  if (!data) return <div className="p-8 text-sm text-text-muted">Loading…</div>;

  return (
    <div className="p-8">
      <h1 className="mb-1 text-lg font-semibold">Analytics</h1>
      <p className="mb-6 text-sm text-text-muted">
        Real metrics only, from platforms that actually offer an analytics API — nothing here is estimated or fabricated.
      </p>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="Total published" value={data.totalPublished} />
        <Stat label="Platforms tracked" value={data.byPlatform.filter((p) => p.supports_analytics).length} />
        <Stat label="Posts with real metrics" value={data.hasAnyRealData ? data.topContent.length : 0} />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <section>
          <h2 className="mb-3 text-sm font-medium text-text-muted">Published by Platform</h2>
          <div className="rounded border border-border bg-surface">
            {data.byPlatform.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0">
                <span>{p.display_name}</span>
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  {p.published_count} published
                  {!p.supports_analytics && <span className="rounded border border-border px-1.5 py-0.5">no analytics API</span>}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-text-muted">Published by Pillar</h2>
          <div className="rounded border border-border bg-surface">
            {data.byPillar.length === 0 && <div className="px-3 py-4 text-sm text-text-muted">Nothing published yet.</div>}
            {data.byPillar.map((p) => (
              <div key={p.pillar} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0">
                <span>{p.pillar}</span>
                <span className="text-xs text-text-muted">{p.n}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-text-muted">Top Performing Content</h2>
        {!data.hasAnyRealData ? (
          <div className="rounded border border-border bg-surface px-3 py-6 text-center text-sm text-text-muted">
            Not available through connected API — no platform with real analytics has been synced yet. Connect Mastodon or Bluesky in Settings and publish something outside dry-run mode.
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Content</th>
                  <th className="px-3 py-2 font-medium">Platform</th>
                  <th className="px-3 py-2 font-medium">Likes</th>
                  <th className="px-3 py-2 font-medium">Shares</th>
                  <th className="px-3 py-2 font-medium">Comments</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.topContent.map((c, i) => (
                  <tr key={i} onClick={() => navigate(`/content/${c.content_id}`)} className="cursor-pointer border-t border-border bg-surface hover:bg-surface-elevated">
                    <td className="px-3 py-2">{c.title}</td>
                    <td className="px-3 py-2 text-text-muted">{c.platform}</td>
                    <td className="px-3 py-2 text-text-muted">{c.metrics.likes ?? '—'}</td>
                    <td className="px-3 py-2 text-text-muted">{c.metrics.shares ?? '—'}</td>
                    <td className="px-3 py-2 text-text-muted">{c.metrics.comments ?? '—'}</td>
                    <td className="px-3 py-2 font-medium">{c.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded border border-border bg-surface px-3 py-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}
