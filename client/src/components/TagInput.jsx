import { useState } from 'react';

// Comma/Enter-delimited tag editor. Value is an array of tag name strings.
export default function TagInput({ value = [], onChange }) {
  const [draft, setDraft] = useState('');

  function commit(raw) {
    const name = raw.trim();
    if (!name || value.includes(name)) return;
    onChange([...value, name]);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded border border-border bg-surface px-2 py-1.5">
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-muted">
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-text-muted hover:text-danger"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          commit(draft);
          setDraft('');
        }}
        placeholder={value.length === 0 ? 'Add tags…' : ''}
        className="min-w-[6ch] flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
      />
    </div>
  );
}
