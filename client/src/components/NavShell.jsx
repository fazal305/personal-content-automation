import { NavLink, Outlet } from 'react-router-dom';

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
  return (
    <div className="flex min-h-screen bg-background text-text">
      <aside className="w-60 shrink-0 border-r border-border bg-surface px-3 py-4">
        <div className="mb-6 px-2">
          <div className="font-mono text-sm font-semibold text-text">content-os</div>
          <div className="text-xs text-text-muted">personal automation</div>
        </div>
        <nav className="flex flex-col gap-1">
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
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
