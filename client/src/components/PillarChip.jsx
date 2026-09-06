export default function PillarChip({ name }) {
  if (!name) return <span className="text-xs text-text-muted">No pillar</span>;
  return <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-muted">{name}</span>;
}
