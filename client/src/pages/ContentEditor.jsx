import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { LIFECYCLE, STATUS_LABEL, CONTENT_TYPES, PRIORITIES } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import TagInput from '../components/TagInput';
import ScheduleBox from '../components/ScheduleBox';

const EMPTY = {
  title: '', hook: '', body: '', cta: '', hashtags: '',
  content_type: '', target_platform: '', pillar_id: '', priority: 'normal',
  status: 'idea', source_url: '', notes: '', tags: [],
};

export default function ContentEditor() {
  const { id } = useParams();
  const isNew = id === 'new' || id === undefined;
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [pillars, setPillars] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);

  function reload() {
    return api.getContent(id).then((item) => {
      setForm({
        ...EMPTY,
        ...item,
        pillar_id: item.pillar_id ?? '',
        tags: (item.tags || []).map((t) => t.name),
      });
      setDirty(false);
      setLoading(false);
    });
  }

  useEffect(() => {
    api.pillars().then(setPillars).catch(() => {});
    api.platforms().then(setPlatforms).catch(() => {});
    if (!isNew) {
      reload().catch((e) => {
        setError(e.message);
        setLoading(false);
      });
    }
  }, [id, isNew]);

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
    setDirty(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = { ...form, pillar_id: form.pillar_id || null };
    try {
      if (isNew) {
        const created = await api.createContent(payload);
        navigate(`/content/${created.id}`, { replace: true });
      } else {
        await api.updateContent(id, payload);
        setDirty(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this content item? This cannot be undone.')) return;
    await api.deleteContent(id);
    navigate('/library');
  }

  if (loading) return <div className="p-8 text-sm text-text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/library" className="text-sm text-text-muted hover:text-text">← Back to library</Link>
        {!isNew && <StatusBadge status={form.status} />}
      </div>

      <input
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        placeholder="Title"
        className="mb-3 w-full rounded border border-border bg-surface px-3 py-2 text-base font-medium outline-none focus-visible:border-accent"
      />
      <input
        value={form.hook}
        onChange={(e) => set('hook', e.target.value)}
        placeholder="Hook"
        className="mb-3 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent"
      />
      <textarea
        value={form.body}
        onChange={(e) => set('body', e.target.value)}
        placeholder="Body"
        rows={8}
        className="mb-3 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent"
      />
      <div className="mb-3 grid grid-cols-2 gap-3">
        <input
          value={form.cta}
          onChange={(e) => set('cta', e.target.value)}
          placeholder="CTA"
          className="rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent"
        />
        <input
          value={form.hashtags}
          onChange={(e) => set('hashtags', e.target.value)}
          placeholder="Hashtags"
          className="rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent"
        />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <select value={form.status} onChange={(e) => set('status', e.target.value)} className="rounded border border-border bg-surface px-2 py-2 text-sm">
          {LIFECYCLE.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select value={form.pillar_id} onChange={(e) => set('pillar_id', e.target.value)} className="rounded border border-border bg-surface px-2 py-2 text-sm">
          <option value="">Pillar…</option>
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={form.target_platform ?? ''} onChange={(e) => set('target_platform', e.target.value)} className="rounded border border-border bg-surface px-2 py-2 text-sm">
          <option value="">Platform…</option>
          {platforms.map((p) => (
            <option key={p.id} value={p.slug}>{p.display_name}</option>
          ))}
        </select>
        <select value={form.content_type ?? ''} onChange={(e) => set('content_type', e.target.value)} className="rounded border border-border bg-surface px-2 py-2 text-sm">
          <option value="">Type…</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="mb-3 rounded border border-border bg-surface px-2 py-2 text-sm">
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>{p} priority</option>
        ))}
      </select>

      {!isNew && <ScheduleBox content={form} onScheduled={reload} />}

      <div className="mb-3">
        <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} />
      </div>

      <input
        value={form.source_url ?? ''}
        onChange={(e) => set('source_url', e.target.value)}
        placeholder="Reference URL"
        className="mb-3 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent"
      />
      <textarea
        value={form.notes ?? ''}
        onChange={(e) => set('notes', e.target.value)}
        placeholder="Notes"
        rows={2}
        className="mb-4 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent"
      />

      <div className="flex items-center justify-between">
        <div>
          {!isNew && (
            <button onClick={handleDelete} className="text-sm text-danger hover:underline">
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-danger">{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving || (!dirty && !isNew)}
            className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
