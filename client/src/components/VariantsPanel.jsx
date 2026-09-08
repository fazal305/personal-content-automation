import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// One master idea, multiple platform-specific versions (Module: Content Editor / Variants).
// Generating a variant is AI-assisted (Phase 6) but saving it is still an explicit action.
export default function VariantsPanel({ content }) {
  const [platforms, setPlatforms] = useState([]);
  const [variants, setVariants] = useState([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [busyPlatform, setBusyPlatform] = useState(null);
  const [drafts, setDrafts] = useState({});

  function load() {
    api.variants(content.id).then(setVariants).catch(() => {});
  }

  useEffect(() => {
    api.platforms().then(setPlatforms).catch(() => {});
    api.aiStatus().then((s) => setAiConfigured(s.configured)).catch(() => {});
    load();
  }, [content.id]);

  const variantByPlatform = Object.fromEntries(variants.map((v) => [v.platform_id, v]));

  async function handleGenerate(platform) {
    setBusyPlatform(platform.id);
    try {
      const { text } = await api.aiRepurpose(content.id, platform.id);
      setDrafts((d) => ({ ...d, [platform.id]: text }));
    } catch (err) {
      setDrafts((d) => ({ ...d, [platform.id]: null }));
      alert(err.message);
    } finally {
      setBusyPlatform(null);
    }
  }

  async function handleSave(platform, text) {
    await api.saveVariant(content.id, platform.id, { body: text });
    setDrafts((d) => ({ ...d, [platform.id]: undefined }));
    load();
  }

  async function handleDelete(platform) {
    await api.deleteVariant(content.id, platform.id);
    load();
  }

  return (
    <div className="mb-4">
      <div className="mb-2 text-sm font-medium">Platform Versions</div>
      <div className="space-y-2">
        {platforms.map((platform) => {
          const existing = variantByPlatform[platform.id];
          const draft = drafts[platform.id];
          return (
            <div key={platform.id} className="rounded border border-border bg-surface px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{platform.display_name}</span>
                {aiConfigured && (
                  <button
                    onClick={() => handleGenerate(platform)}
                    disabled={busyPlatform === platform.id}
                    className="text-xs text-text-muted hover:text-text disabled:opacity-50"
                  >
                    {busyPlatform === platform.id ? 'Generating…' : existing ? 'Regenerate' : 'Generate'}
                  </button>
                )}
              </div>

              {draft !== undefined && draft !== null && (
                <div className="mt-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [platform.id]: e.target.value }))}
                    rows={3}
                    aria-label={`${platform.display_name} version`}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-accent"
                  />
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => handleSave(platform, draft)} className="rounded bg-accent px-2 py-1 text-xs font-medium text-background">Save version</button>
                    <button onClick={() => setDrafts((d) => ({ ...d, [platform.id]: undefined }))} className="text-xs text-text-muted">Cancel</button>
                  </div>
                </div>
              )}

              {draft === undefined && existing && (
                <div className="mt-1">
                  <p className="whitespace-pre-wrap text-xs text-text-muted">{existing.body}</p>
                  <button onClick={() => handleDelete(platform)} className="mt-1 text-xs text-danger hover:underline">Delete</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
