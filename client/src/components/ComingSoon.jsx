export default function ComingSoon({ title, phase, description }) {
  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold text-text">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-text-muted">{description}</p>
      <p className="mt-4 text-xs text-text-muted">Built in {phase}.</p>
    </div>
  );
}
