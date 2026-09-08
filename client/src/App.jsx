import { Routes, Route } from 'react-router-dom';
import NavShell from './components/NavShell.jsx';
import CommandCenter from './pages/CommandCenter.jsx';
import Ideas from './pages/Ideas.jsx';
import Library from './pages/Library.jsx';
import ContentEditor from './pages/ContentEditor.jsx';
import CalendarPage from './pages/Calendar.jsx';
import Automation from './pages/Automation.jsx';
import Settings from './pages/Settings.jsx';
import Analytics from './pages/Analytics.jsx';
import Experiments from './pages/Experiments.jsx';

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
        <Route path="analytics" element={<Analytics />} />
        <Route path="experiments" element={<Experiments />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
