import { Routes, Route } from 'react-router-dom';
import NavShell from './components/NavShell.jsx';
import ComingSoon from './components/ComingSoon.jsx';
import CommandCenter from './pages/CommandCenter.jsx';
import Ideas from './pages/Ideas.jsx';
import Library from './pages/Library.jsx';
import ContentEditor from './pages/ContentEditor.jsx';
import CalendarPage from './pages/Calendar.jsx';
import Automation from './pages/Automation.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<NavShell />}>
        <Route index element={<CommandCenter />} />
        <Route path="ideas" element={<Ideas />} />
        <Route path="library" element={<Library />} />
        <Route path="content/new" element={<ContentEditor />} />
        <Route path="content/:id" element={<ContentEditor />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="automation" element={<Automation />} />
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
