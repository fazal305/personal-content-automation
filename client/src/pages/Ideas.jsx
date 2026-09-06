import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { CONTENT_TYPES, PRIORITIES } from '../lib/constants';
import PillarChip from '../components/PillarChip';
import TagInput from '../components/TagInput';

const EMPTY = {
  title: '',
  hook: '',
  pillar_id: '',
  target_platform: '',
  content_type: '',
  priority: 'normal',
  source_url: '',
  notes: '',
  tags: [],
};

export default function Ideas() {
  const [form, setForm] = useState(EMPTY);
  const [pillars, setPillars] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function loadIdeas() {
    api.listContent({ status: 'idea' }).then(setIdeas).catch((e) => setError(e.message));
  }

  useEffect(() => {
    api.pillars().then(setPillars).catch(() => {});
    api.platforms().then(setPlatforms).catch(() => {});
    loadIdeas();
  }, []);

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createContent({
        ...form,
        pillar_id: form.pillar_id || null,
        target_platform: form.target_platform || null,
        content_type: form.content_type || null,
        source_url: form.source_url || null,
      });
      setForm(EMPTY);
      loadIdeas();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-1 text-lg font-semibold">Ideas</h1>
      <p className="mb-6 text-sm text-text-muted">Fast capture. You can fill everything else in later, in the editor.</p>

      <form onSubmit={handleSubmit} className="mb-10 space-y-3 rounded border border-border bg-surface p-4">
        <input
          autoFocus
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="What's the idea? (title)"
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-text outline-none focus-visible:border-accent"
        />
        <input
          value={form.hook}
          onChange={(e) => set('hook', e.target.value)}
          placeholder="Hook — the one line that makes someone stop scrolling"
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-text outline-none focus-visible:border-accent"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select value={form.pillar_id} onChange={(e) => set('pillar_id', e.target.value)} className="rounded border border-border bg-background px-2 py-2 text-sm">
            <option value="">Pillar…</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={form.target_platform} onChange={(e) => set('target_platform', e.target.value)} className="rounded border border-border bg-background px-2 py-2 text-sm">
            <option value="">Platform…</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.slug}>{p.display_name}</option>
            ))}
          </select>
          <select value={form.content_type} onChange={(e) => set('content_type', e.target.value)} className="rounded border border-border bg-background px-2 py-2 text-sm">
            <option value="">Type…</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="rounded border border-border bg-background px-2 py-2 text-sm">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} />

        <input
          value={form.source_url}
          onChange={(e) => set('source_url', e.target.value)}
          placeholder="Reference URL (optional)"
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-text outline-none focus-visible:border-accent"
        />
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-text outline-none focus-visible:border-accent"
        />

        <div className="flex items-center justify-between">
          {error && <span className="text-xs text-danger">{error}</span>}
          <button
            type="submit"
            disabled={saving || !form.title.trim()}
            className="ml-auto rounded bg-accent px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Capture idea'}
          </button>
        </div>
      </form>

      <h2 className="mb-3 text-sm font-medium text-text-muted">Open ideas ({ideas.length})</h2>
      <ul className="space-y-2">
        {ideas.map((idea) => (
          <li key={idea.id}>
            <button
              onClick={() => navigate(`/content/${idea.id}`)}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-left text-sm hover:border-accent/40"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{idea.title}</span>
                <PillarChip name={idea.pillar_name} />
              </div>
              {idea.hook && <div className="mt-0.5 text-xs text-text-muted">{idea.hook}</div>}
            </button>
          </li>
        ))}
        {ideas.length === 0 && <li className="text-sm text-text-muted">No open ideas yet — capture one above.</li>}
      </ul>
    </div>
  );
}
