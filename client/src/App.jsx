import { Routes, Route } from 'react-router-dom';
import NavShell from './components/NavShell.jsx';
import ComingSoon from './components/ComingSoon.jsx';
import CommandCenter from './pages/CommandCenter.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<NavShell />}>
        <Route index element={<CommandCenter />} />
        <Route
          path="ideas"
          element={<ComingSoon title="Ideas" phase="Phase 2 — Content System" description="Fast capture for content ideas: title, hook, category, platform, priority." />}
        />
        <Route
          path="library"
          element={<ComingSoon title="Content Library" phase="Phase 2 — Content System" description="Search, filter, and browse every idea, draft, and published post." />}
        />
        <Route
          path="calendar"
          element={<ComingSoon title="Calendar" phase="Phase 3 — Calendar + Scheduling" description="Month/week/day views of scheduled and published content." />}
        />
        <Route
          path="analytics"
          element={<ComingSoon title="Analytics" phase="Phase 7 — Analytics" description="Real metrics from connected platforms only — never fabricated." />}
        />
        <Route
          path="experiments"
          element={<ComingSoon title="Experiment Lab" phase="Phase 9 — Experiment Lab" description="Documented automation experiments: trigger, input, processing, output, learnings." />}
        />
        <Route
          path="settings"
          element={<ComingSoon title="Settings" phase="Phase 1 (this one) / Phase 5" description="Brand voice, content pillars, and platform connections." />}
        />
      </Route>
    </Routes>
  );
}
