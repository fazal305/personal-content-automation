import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { LIFECYCLE, STATUS_LABEL } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import PillarChip from '../components/PillarChip';

export default function Library() {
  const [items, setItems] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [status, setStatus] = useState('');
  const [pillarId, setPillarId] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.pillars().then(setPillars).catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (status) params.status = status;
    if (pillarId) params.pillar_id = pillarId;
    if (q) params.q = q;
    const handle = setTimeout(() => {
      api.listContent(params).then(setItems).catch((e) => setError(e.message));
    }, 200);
    return () => clearTimeout(handle);
  }, [status, pillarId, q]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Content Library</h1>
        <button
          onClick={() => navigate('/content/new')}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-background"
        >
          + New
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, hook, body…"
          className="w-64 rounded border border-border bg-surface px-3 py-1.5 text-sm outline-none focus-visible:border-accent"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-border bg-surface px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          {LIFECYCLE.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select value={pillarId} onChange={(e) => setPillarId(e.target.value)} className="rounded border border-border bg-surface px-2 py-1.5 text-sm">
          <option value="">All pillars</option>
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <div className="overflow-hidden rounded border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Pillar</th>
              <th className="px-3 py-2 font-medium">Tags</th>
              <th className="px-3 py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => navigate(`/content/${item.id}`)}
                className="cursor-pointer border-t border-border bg-surface hover:bg-surface-elevated"
              >
                <td className="px-3 py-2">{item.title}</td>
                <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
                <td className="px-3 py-2"><PillarChip name={item.pillar_name} /></td>
                <td className="px-3 py-2 text-xs text-text-muted">{item.tags?.map((t) => t.name).join(', ') || '—'}</td>
                <td className="px-3 py-2 text-xs text-text-muted">{new Date(item.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-text-muted">No content matches these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
