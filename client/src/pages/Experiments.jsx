import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const STATUS_ORDER = ['working', 'in_progress', 'planned', 'abandoned'];
const STATUS_LABEL = { working: 'Working', in_progress: 'In Progress', planned: 'Planned', abandoned: 'Abandoned' };
const STATUS_COLOR = { working: 'text-success border-success/40', in_progress: 'text-warning border-warning/40', planned: 'text-text-muted border-border', abandoned: 'text-danger border-danger/40' };

const EMPTY_FORM = { name: '', goal: '', trigger_desc: '', input_desc: '', processing_desc: '', output_desc: '', api_used: '', automation_used: '', status: 'planned', learnings: '' };

export default function Experiments() {
  const [experiments, setExperiments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState(null);

  function load() {
    api.experiments().then(setExperiments).catch(() => {});
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await api.createExperiment(form);
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: experiments.filter((e) => e.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Experiment Lab</h1>
        <button onClick={() => setShowForm((s) => !s)} aria-expanded={showForm} className="rounded border border-border px-2 py-1 text-xs text-text-muted hover:text-text">
          {showForm ? 'Cancel' : '+ New experiment'}
        </button>
      </div>
      <p className="mb-6 text-sm text-text-muted">
        Small, documented automation experiments — trigger, input, processing, output, and what actually happened when it ran.
      </p>

      {showForm && (
        <form onSubmit={handleCreate} aria-label="New experiment" className="mb-6 space-y-2 rounded border border-border bg-surface p-4">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Experiment name" aria-label="Experiment name" className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent" />
          <input value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} placeholder="Goal" aria-label="Goal" className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={form.trigger_desc} onChange={(e) => setForm((f) => ({ ...f, trigger_desc: e.target.value }))} placeholder="Trigger" aria-label="Trigger" className="rounded border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent" />
            <input value={form.input_desc} onChange={(e) => setForm((f) => ({ ...f, input_desc: e.target.value }))} placeholder="Input" aria-label="Input" className="rounded border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent" />
            <input value={form.processing_desc} onChange={(e) => setForm((f) => ({ ...f, processing_desc: e.target.value }))} placeholder="Processing" aria-label="Processing" className="rounded border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent" />
            <input value={form.output_desc} onChange={(e) => setForm((f) => ({ ...f, output_desc: e.target.value }))} placeholder="Output" aria-label="Output" className="rounded border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent" />
            <input value={form.api_used} onChange={(e) => setForm((f) => ({ ...f, api_used: e.target.value }))} placeholder="API used" aria-label="API used" className="rounded border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent" />
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} aria-label="Status" className="rounded border border-border bg-background px-3 py-2 text-sm">
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <textarea value={form.learnings} onChange={(e) => setForm((f) => ({ ...f, learnings: e.target.value }))} placeholder="What I learned" aria-label="What I learned" rows={2} className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent" />
          <button type="submit" className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-background">Save experiment</button>
        </form>
      )}

      {grouped.map((group) => (
        <div key={group.status} className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-text-muted">{STATUS_LABEL[group.status]} ({group.items.length})</h2>
          <div className="space-y-2">
            {group.items.map((exp) => (
              <div key={exp.id} className="rounded border border-border bg-surface px-3 py-2.5 text-sm">
                <button onClick={() => setExpanded(expanded === exp.id ? null : exp.id)} aria-expanded={expanded === exp.id} className="flex w-full items-center justify-between text-left">
                  <span className="font-medium">{exp.name}</span>
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[11px] uppercase ${STATUS_COLOR[exp.status]}`}>{STATUS_LABEL[exp.status]}</span>
                </button>
                {exp.goal && <p className="mt-1 text-xs text-text-muted">{exp.goal}</p>}
                {expanded === exp.id && (
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
                    <Field label="Trigger" value={exp.trigger_desc} />
                    <Field label="Input" value={exp.input_desc} />
                    <Field label="Processing" value={exp.processing_desc} />
                    <Field label="Output" value={exp.output_desc} />
                    <Field label="API used" value={exp.api_used} />
                    <Field label="Automation" value={exp.automation_used} />
                    {exp.learnings && (
                      <div className="col-span-2 mt-1 rounded border border-accent/30 bg-background p-2">
                        <div className="mb-0.5 uppercase tracking-wide text-text-muted">What I learned</div>
                        <div className="text-text-muted">{exp.learnings}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {experiments.length === 0 && <p className="text-sm text-text-muted">No experiments logged yet.</p>}
    </div>
  );
}

function Field({ label, value }) {
  if (!value || value === '—') return null;
  return (
    <div>
      <div className="uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
