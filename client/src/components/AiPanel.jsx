import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const REWRITE_MODES = [
  ['concise', 'Make concise'],
  ['professional', 'More professional'],
  ['conversational', 'More conversational'],
  ['strengthen_hook', 'Strengthen hook'],
  ['improve_cta', 'Improve CTA'],
  ['simplify', 'Simplify'],
  ['bullets', 'Convert to bullets'],
];

// AI is strictly an assistant here: every result is a preview the user applies
// explicitly (via onApply, which just edits in-memory form state) — nothing this
// panel does saves to the database on its own. Save is still a separate, human click.
export default function AiPanel({ content, onApplyDraft, onApplyBody }) {
  const [configured, setConfigured] = useState(null);
  const [draft, setDraft] = useState(null);
  const [mode, setMode] = useState('concise');
  const [issues, setIssues] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.aiStatus().then((s) => setConfigured(s.configured)).catch(() => setConfigured(false));
  }, []);

  if (configured === null) return null;

  if (!configured) {
    return (
      <div className="mb-4 rounded border border-border bg-surface px-3 py-2 text-xs text-text-muted">
        AI assistant not configured — set <code>ANTHROPIC_API_KEY</code> in <code>.env</code> to enable draft generation, rewriting, and quality checks. Everything else in this app works without it.
      </div>
    );
  }

  async function handleGenerateDraft() {
    setBusy('draft');
    setError(null);
    try {
      const result = await api.aiGenerateDraft(content.id);
      setDraft(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleRewrite() {
    setBusy('rewrite');
    setError(null);
    try {
      const { text } = await api.aiRewrite(content.id, mode);
      onApplyBody(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleQualityCheck() {
    setBusy('check');
    setError(null);
    try {
      const result = await api.aiQualityCheck(content.id);
      setIssues(result.issues ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-4 rounded border border-border bg-surface px-3 py-3">
      <div className="mb-2 text-sm font-medium">AI Assistant</div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleGenerateDraft} disabled={busy === 'draft'} className="rounded border border-border px-2 py-1.5 text-xs text-text-muted hover:text-text disabled:opacity-50">
          {busy === 'draft' ? 'Generating…' : 'Generate draft from idea'}
        </button>
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Rewrite mode" className="rounded border border-border bg-background px-2 py-1.5 text-xs">
          {REWRITE_MODES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button onClick={handleRewrite} disabled={busy === 'rewrite' || !content.body} className="rounded border border-border px-2 py-1.5 text-xs text-text-muted hover:text-text disabled:opacity-50">
          {busy === 'rewrite' ? 'Rewriting…' : 'Rewrite body'}
        </button>
        <button onClick={handleQualityCheck} disabled={busy === 'check'} className="rounded border border-border px-2 py-1.5 text-xs text-text-muted hover:text-text disabled:opacity-50">
          {busy === 'check' ? 'Checking…' : 'Quality check'}
        </button>
      </div>

      {error && <div className="mt-2 text-xs text-danger">{error}</div>}

      {draft && (
        <div className="mt-3 rounded border border-accent/30 bg-background p-3 text-sm">
          <div className="mb-1 text-xs uppercase tracking-wide text-text-muted">AI-generated draft — review before using</div>
          {draft.hook && <p className="mb-1"><span className="text-text-muted">Hook:</span> {draft.hook}</p>}
          {draft.body && <p className="mb-1 whitespace-pre-wrap">{draft.body}</p>}
          {draft.cta && <p className="mb-1 text-text-muted">CTA: {draft.cta}</p>}
          {draft.hashtags && <p className="mb-2 text-text-muted">{draft.hashtags}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onApplyDraft(draft);
                setDraft(null);
              }}
              className="rounded bg-accent px-2 py-1 text-xs font-medium text-background"
            >
              Use this draft
            </button>
            <button onClick={() => setDraft(null)} className="rounded border border-border px-2 py-1 text-xs text-text-muted">
              Discard
            </button>
          </div>
        </div>
      )}

      {issues && (
        <div className="mt-3 rounded border border-border bg-background p-3 text-sm">
          <div className="mb-1 text-xs uppercase tracking-wide text-text-muted">Quality check</div>
          {issues.length === 0 ? (
            <p className="text-text-muted">No issues found.</p>
          ) : (
            <ul className="list-inside list-disc space-y-0.5 text-text-muted">
              {issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
