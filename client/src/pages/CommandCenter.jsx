import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const STAGES = [
  ['idea', 'Ideas'],
  ['draft', 'Drafting'],
  ['in_review', 'Review'],
  ['approved', 'Approved'],
  ['scheduled', 'Scheduled'],
  ['published', 'Published'],
];

export default function CommandCenter() {
  const [counts, setCounts] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  function refresh() {
    return Promise.all([api.pipelineCounts(), api.platforms(), api.events({ limit: 8 }), api.health()])
      .then(([c, p, e, h]) => {
        setCounts(c);
        setPlatforms(p);
        setEvents(e);
        setHealth(h);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleRunAutomation() {
    setRunning(true);
    try {
      await api.runAutomation();
      await refresh();
    } finally {
      setRunning(false);
    }
  }

  if (error) {
    return (
      <div className="p-8 text-sm text-danger">
        Could not reach the API — is the server running? ({error})
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Command Center</h1>
          <p className="text-sm text-text-muted">
            {health?.demoMode ? 'Demo mode — showing seeded sample content, not a real account.' : 'Live mode'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {health && (
            <span className="rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-text-muted">
              dry_run={String(health.dryRun)}
            </span>
          )}
          <button
            onClick={handleRunAutomation}
            disabled={running}
            className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-muted hover:text-text disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run automation now'}
          </button>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-text-muted">Content Pipeline</h2>
        <div className="grid grid-cols-6 gap-2">
          {STAGES.map(([key, label]) => (
            <div key={key} className="rounded border border-border bg-surface px-3 py-3">
              <div className="text-2xl font-semibold tabular-nums">{counts?.[key] ?? '—'}</div>
              <div className="text-xs text-text-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-8">
        <section>
          <h2 className="mb-3 text-sm font-medium text-text-muted">Automation Health</h2>
          {health?.scheduler && (
            <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
              <span>last tick: {health.scheduler.lastTickAt ? new Date(health.scheduler.lastTickAt).toLocaleTimeString() : 'never'}</span>
              <span>next job: {health.scheduler.nextScheduledFor ? new Date(health.scheduler.nextScheduledFor).toLocaleString() : 'none'}</span>
              <span>pending: {health.scheduler.pendingJobs}</span>
              <span className={health.scheduler.failedJobs > 0 ? 'text-danger' : ''}>failed: {health.scheduler.failedJobs}</span>
            </div>
          )}
          <div className="rounded border border-border bg-surface">
            {platforms.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0">
                <span>{p.display_name}</span>
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  {p.supports_publishing ? 'real automation' : 'manual-assist'}
                  <StatusDot status={p.connection_status} />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-text-muted">Recent Activity</h2>
          <div className="rounded border border-border bg-surface">
            {events.length === 0 && <div className="px-3 py-4 text-sm text-text-muted">No events yet.</div>}
            {events.map((e) => (
              <div key={e.id} className="border-b border-border px-3 py-2 text-sm last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-accent">{e.event_type}</span>
                  <span className="text-xs text-text-muted">{new Date(e.created_at).toLocaleTimeString()}</span>
                </div>
                {e.message && <div className="mt-0.5 text-text-muted">{e.message}</div>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const color = status === 'connected' ? 'bg-success' : status === 'expired' || status === 'error' ? 'bg-danger' : 'bg-text-muted';
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />;
}
