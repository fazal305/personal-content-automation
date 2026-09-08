import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const CONFIG_FIELDS = [
  ['brand_name', 'Name'],
  ['bio', 'Bio'],
  ['website', 'Website'],
  ['github_url', 'GitHub URL'],
  ['linkedin_url', 'LinkedIn URL'],
  ['tone', 'Tone (e.g. direct, technical, builder-focused)'],
  ['default_hashtags', 'Default hashtags'],
  ['cta_preference', 'CTA preference'],
];

export default function Settings() {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="mb-6 text-lg font-semibold">Settings</h1>
      <PlatformConnections />
      <BrandConfig />
    </div>
  );
}

function PlatformConnections() {
  const [platforms, setPlatforms] = useState([]);
  const [testing, setTesting] = useState(null);

  function load() {
    api.platforms().then(setPlatforms).catch(() => {});
  }

  useEffect(load, []);

  async function handleTest(slug) {
    setTesting(slug);
    try {
      await api.testConnection(slug);
    } catch {
      // result is written to the platform row regardless; reload shows it either way
    } finally {
      setTesting(null);
      load();
    }
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-medium text-text-muted">Platform Connections</h2>
      <p className="mb-3 text-xs text-text-muted">
        Credentials live only in your local <code>.env</code> file, never in this database. Testing a connection just confirms the credentials work.
      </p>
      <div className="rounded border border-border bg-surface">
        {platforms.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-sm last:border-b-0">
            <div>
              <div>{p.display_name}</div>
              <div className="text-xs text-text-muted">
                {p.slug === 'github' ? 'trigger source' : p.supports_publishing ? 'real automation' : 'manual-assist'}
                {p.last_checked_at && ` · checked ${new Date(p.last_checked_at).toLocaleString()}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ConnStatus status={p.connection_status} />
              {(p.supports_publishing || p.slug === 'github') && (
                <button
                  onClick={() => handleTest(p.slug)}
                  disabled={testing === p.slug}
                  aria-label={`Test ${p.display_name} connection`}
                  className="rounded border border-border px-2 py-1 text-xs text-text-muted hover:text-text disabled:opacity-50"
                >
                  {testing === p.slug ? 'Testing…' : 'Test connection'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConnStatus({ status }) {
  const map = {
    connected: ['bg-success', 'connected'],
    error: ['bg-danger', 'error'],
    expired: ['bg-danger', 'expired'],
    disconnected: ['bg-text-muted', 'not tested'],
  };
  const [color, label] = map[status] ?? map.disconnected;
  return (
    <span className="flex items-center gap-1.5 text-xs text-text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function BrandConfig() {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    api.config().then(setForm).catch(() => {});
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateConfig(form);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-text-muted">Brand Voice</h2>
      <p className="mb-3 text-xs text-text-muted">
        Used by the AI assistant (Phase 6) so drafts sound like you, not a generic template.
      </p>
      <div className="space-y-2 rounded border border-border bg-surface p-4">
        {CONFIG_FIELDS.map(([field, label]) => (
          <input
            key={field}
            value={form[field] ?? ''}
            onChange={(e) => set(field, e.target.value)}
            placeholder={label}
            aria-label={label}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent"
          />
        ))}
        <div className="flex items-center justify-end gap-3 pt-1">
          {savedAt && <span className="text-xs text-text-muted">Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </section>
  );
}
