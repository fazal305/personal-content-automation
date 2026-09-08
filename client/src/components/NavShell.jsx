import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Command Center', end: true },
  { to: '/ideas', label: 'Ideas' },
  { to: '/library', label: 'Content Library' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/automation', label: 'Automation' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/experiments', label: 'Experiment Lab' },
  { to: '/settings', label: 'Settings' },
];

export default function NavShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // A route change is the clearest signal the drawer did its job — close it.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-screen bg-background text-text md:flex">
      <header className="flex items-center justify-between border-b border-border bg-surface px-3 py-2.5 md:hidden">
        <div>
          <div className="font-mono text-sm font-semibold text-text">content-os</div>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="rounded border border-border px-2 py-1 text-sm text-text-muted"
        >
          Menu
        </button>
      </header>

      {open && (
        <button
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-background/70 md:hidden"
        />
      )}

      <aside
        aria-label="Primary"
        className={`fixed inset-y-0 left-0 z-50 w-60 shrink-0 border-r border-border bg-surface px-3 py-4 transition-transform md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <div>
            <div className="font-mono text-sm font-semibold text-text">content-os</div>
            <div className="text-xs text-text-muted">personal automation</div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close navigation menu" className="text-text-muted md:hidden">
            ✕
          </button>
        </div>
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded px-2 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-surface-elevated text-text'
                    : 'text-text-muted hover:bg-surface-elevated hover:text-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
