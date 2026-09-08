import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const SEVERITY_COLOR = {
  info: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
};

export default function Automation() {
  const [tab, setTab] = useState('events');

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Automation</h1>
        <div className="flex items-center gap-2 text-sm" role="group" aria-label="Automation view">
          <button onClick={() => setTab('events')} aria-pressed={tab === 'events'} className={`rounded px-2 py-1 ${tab === 'events' ? 'bg-surface-elevated text-text' : 'text-text-muted'}`}>Event Log</button>
          <button onClick={() => setTab('rules')} aria-pressed={tab === 'rules'} className={`rounded px-2 py-1 ${tab === 'rules' ? 'bg-surface-elevated text-text' : 'text-text-muted'}`}>Rules</button>
        </div>
      </div>
      {tab === 'events' ? <EventLog /> : <Rules />}
    </div>
  );
}

function EventLog() {
  const [events, setEvents] = useState([]);
  const [types, setTypes] = useState([]);
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');

  useEffect(() => {
    api.eventTypes().then(setTypes).catch(() => {});
  }, []);

  useEffect(() => {
    const params = { limit: 100 };
    if (eventType) params.event_type = eventType;
    if (severity) params.severity = severity;
    api.events(params).then(setEvents).catch(() => {});
  }, [eventType, severity]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <select value={eventType} onChange={(e) => setEventType(e.target.value)} aria-label="Filter by event type" className="rounded border border-border bg-surface px-2 py-1.5 text-sm">
          <option value="">All event types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter by severity" className="rounded border border-border bg-surface px-2 py-1.5 text-sm">
          <option value="">All severities</option>
          <option value="info">info</option>
          <option value="success">success</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
        </select>
      </div>

      <div className="rounded border border-border bg-surface">
        {events.length === 0 && <div className="px-3 py-6 text-center text-sm text-text-muted">No events match these filters.</div>}
        {events.map((e) => (
          <div key={e.id} className="flex flex-col gap-1 border-b border-border px-3 py-2 text-sm last:border-b-0 sm:flex-row sm:items-start sm:gap-3">
            <span className="font-mono text-xs text-text-muted sm:w-20 sm:shrink-0">{new Date(e.created_at).toLocaleTimeString()}</span>
            <span className={`font-mono text-xs sm:w-48 sm:shrink-0 ${SEVERITY_COLOR[e.severity] ?? 'text-text-muted'}`}>{e.event_type}</span>
            <span className="text-text-muted">{e.message ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Rules() {
  const [rules, setRules] = useState([]);

  function load() {
    api.automationRules().then(setRules).catch(() => {});
  }

  useEffect(load, []);

  async function toggle(rule) {
    await api.toggleRule(rule.id, rule.enabled ? 0 : 1);
    load();
  }

  return (
    <div className="rounded border border-border bg-surface">
      {rules.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-4 border-b border-border px-3 py-3 text-sm last:border-b-0">
          <div>
            <div className="font-medium">{r.name}</div>
            <div className="mt-0.5 font-mono text-xs text-text-muted">
              WHEN <span className="text-accent">{r.trigger_type}</span> THEN <span className="text-accent">{r.action_type}</span>
            </div>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs text-text-muted">
            {r.enabled ? 'enabled' : 'disabled'}
            <input type="checkbox" checked={!!r.enabled} onChange={() => toggle(r)} />
          </label>
        </div>
      ))}
      {rules.length === 0 && <div className="px-3 py-6 text-center text-sm text-text-muted">No rules yet.</div>}
    </div>
  );
}
