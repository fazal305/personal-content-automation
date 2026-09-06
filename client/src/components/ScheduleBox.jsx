import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// Shown in the content editor once a piece is approved — the bridge between
// approval and the calendar/scheduler.
export default function ScheduleBox({ content, onScheduled }) {
  const [platforms, setPlatforms] = useState([]);
  const [job, setJob] = useState(null);
  const [platformId, setPlatformId] = useState('');
  const [when, setWhen] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.platforms().then(setPlatforms).catch(() => {});
  }, []);

  useEffect(() => {
    if (content.status === 'scheduled' || content.status === 'publishing') {
      api.calendar({ content_id: content.id }).then((rows) => {
        setJob(rows.find((r) => r.status === 'pending' || r.status === 'publishing') ?? rows[0] ?? null);
      });
    } else {
      setJob(null);
    }
  }, [content.id, content.status]);

  async function handleSchedule() {
    if (!platformId || !when) return;
    setBusy(true);
    setError(null);
    try {
      await api.scheduleContent({
        content_id: content.id,
        platform_id: Number(platformId),
        scheduled_for: new Date(when).toISOString(),
      });
      onScheduled?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!job) return;
    setBusy(true);
    try {
      await api.cancelSchedule(job.id);
      onScheduled?.();
    } finally {
      setBusy(false);
    }
  }

  if (content.status === 'scheduled' && job) {
    return (
      <div className="mb-4 rounded border border-accent/30 bg-surface px-3 py-2 text-sm">
        <div>Scheduled for <strong>{new Date(job.scheduled_for).toLocaleString()}</strong> on {job.platform_name}</div>
        {job.dry_run === 1 && <div className="mt-0.5 text-xs text-text-muted">Dry run — no external API will be called.</div>}
        <button onClick={handleCancel} disabled={busy} className="mt-2 text-xs text-danger hover:underline">Cancel schedule</button>
      </div>
    );
  }

  if (content.status !== 'approved') return null;

  return (
    <div className="mb-4 rounded border border-border bg-surface px-3 py-3">
      <div className="mb-2 text-sm font-medium">Schedule</div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={platformId} onChange={(e) => setPlatformId(e.target.value)} className="rounded border border-border bg-background px-2 py-1.5 text-sm">
          <option value="">Platform…</option>
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}{p.supports_publishing ? '' : ' (manual-assist)'}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="rounded border border-border bg-background px-2 py-1.5 text-sm"
        />
        <button
          onClick={handleSchedule}
          disabled={busy || !platformId || !when}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
        >
          Schedule
        </button>
      </div>
      {error && <div className="mt-1 text-xs text-danger">{error}</div>}
    </div>
  );
}
