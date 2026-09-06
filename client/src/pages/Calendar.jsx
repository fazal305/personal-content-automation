import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthGrid(anchor) {
  const first = startOfMonth(anchor);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(new Date());
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState('month');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.calendar().then(setJobs).catch((e) => setError(e.message));
  }, []);

  const jobsByDay = useMemo(() => {
    const map = {};
    for (const job of jobs) {
      const key = job.scheduled_for.slice(0, 10);
      (map[key] ??= []).push(job);
    }
    return map;
  }, [jobs]);

  const days = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const monthLabel = anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  async function handleCancel(jobId, e) {
    e.stopPropagation();
    if (!confirm('Cancel this scheduled job?')) return;
    await api.cancelSchedule(jobId);
    api.calendar().then(setJobs);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Calendar</h1>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setView('month')} className={`rounded px-2 py-1 ${view === 'month' ? 'bg-surface-elevated text-text' : 'text-text-muted'}`}>Month</button>
          <button onClick={() => setView('list')} className={`rounded px-2 py-1 ${view === 'list' ? 'bg-surface-elevated text-text' : 'text-text-muted'}`}>List</button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      {view === 'month' ? (
        <>
          <div className="mb-3 flex items-center gap-3">
            <button onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))} className="rounded border border-border px-2 py-1 text-sm text-text-muted hover:text-text">←</button>
            <span className="text-sm font-medium">{monthLabel}</span>
            <button onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))} className="rounded border border-border px-2 py-1 text-sm text-text-muted hover:text-text">→</button>
            <button onClick={() => setAnchor(new Date())} className="text-xs text-text-muted hover:text-text">today</button>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded border border-border bg-border text-xs">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bg-surface px-2 py-1 text-center text-text-muted">{w}</div>
            ))}
            {days.map((d) => {
              const key = dateKey(d);
              const inMonth = d.getMonth() === anchor.getMonth();
              const dayJobs = jobsByDay[key] ?? [];
              return (
                <div key={key} className={`min-h-[92px] bg-surface p-1.5 ${inMonth ? '' : 'opacity-40'}`}>
                  <div className="mb-1 text-text-muted">{d.getDate()}</div>
                  <div className="space-y-1">
                    {dayJobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => navigate(`/content/${job.content_id}`)}
                        title={`${job.content_title} — ${job.platform_name}`}
                        className="block w-full truncate rounded bg-surface-elevated px-1 py-0.5 text-left text-[11px] hover:border hover:border-accent/40"
                      >
                        {job.content_title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Content</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} onClick={() => navigate(`/content/${job.content_id}`)} className="cursor-pointer border-t border-border bg-surface hover:bg-surface-elevated">
                  <td className="px-3 py-2 text-xs text-text-muted">{new Date(job.scheduled_for).toLocaleString()}</td>
                  <td className="px-3 py-2">{job.content_title}</td>
                  <td className="px-3 py-2 text-text-muted">{job.platform_name}</td>
                  <td className="px-3 py-2"><StatusBadge status={job.status} /></td>
                  <td className="px-3 py-2 text-right">
                    {job.status === 'pending' && (
                      <button onClick={(e) => handleCancel(job.id, e)} className="text-xs text-danger hover:underline">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-text-muted">Nothing scheduled yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
