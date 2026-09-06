import { STATUS_LABEL, STATUS_COLOR } from '../lib/constants';

const COLOR_CLASSES = {
  muted: 'border-border text-text-muted',
  warning: 'border-warning/40 text-warning',
  accent: 'border-accent/40 text-accent',
  success: 'border-success/40 text-success',
  danger: 'border-danger/40 text-danger',
};

export default function StatusBadge({ status }) {
  const cls = COLOR_CLASSES[STATUS_COLOR[status]] ?? COLOR_CLASSES.muted;
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${cls}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
