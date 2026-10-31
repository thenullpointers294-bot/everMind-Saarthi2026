import { HashRouter, Routes, Route, Navigate, Outlet, Link } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { BottomNav, type TabDef } from "./components/ui";
import AuthPage from "./pages/AuthPage";
import Settings from "./pages/Settings";
import WearerHome from "./pages/wearer/WearerHome";
import WearerReminders from "./pages/wearer/WearerReminders";
import WearerGames from "./pages/wearer/WearerGames";
import WearerFamily from "./pages/wearer/WearerFamily";
import Dashboard from "./pages/caregiver/Dashboard";
import Alerts from "./pages/caregiver/Alerts";
import Manage from "./pages/caregiver/Manage";
import History from "./pages/caregiver/History";
import Simulator from "./pages/dev/Simulator";
import ApiContract from "./pages/dev/ApiContract";

const WEARER_TABS: TabDef[] = [
  { to: "/wearer", label: "Home", icon: "🏠" },
  { to: "/wearer/reminders", label: "Reminders", icon: "⏰" },
  { to: "/wearer/games", label: "Games", icon: "🎲" },
  { to: "/wearer/family", label: "Family", icon: "👪" },
];

const CAREGIVER_TABS: TabDef[] = [
  { to: "/caregiver", label: "Dashboard", icon: "🗺️" },
  { to: "/caregiver/alerts", label: "Alerts", icon: "🚨" },
  { to: "/caregiver/manage", label: "Manage", icon: "🧩" },
  { to: "/caregiver/history", label: "History", icon: "🕘" },
];

function SettingsFab() {
  return (
    <Link
      to="/settings"
      aria-label="Settings"
      className="fixed top-4 right-4 z-[1001] h-10 w-10 rounded-full bg-white/90 backdrop-blur shadow-md border border-slate-200 flex items-center justify-center text-lg"
    >
      ⚙️
    </Link>
  );
}

/** Route guard: requires a logged-in session with the given role. */
function RequireRole({
  role,
  tabs,
}: {
  role: "patient" | "caregiver";
  tabs: TabDef[];
}) {
  const { session } = useApp();
  if (!session) return <Navigate to="/auth" replace />;
  if (session.role !== role)
    return <Navigate to={session.role === "patient" ? "/wearer" : "/caregiver"} replace />;
  return (
    <div className="max-w-md mx-auto">
      <SettingsFab />
      <Outlet />
      <BottomNav tabs={tabs} />
    </div>
  );
}

function DevLayout() {
  const { settings, session } = useApp();
  if (!session) return <Navigate to="/auth" replace />;
  if (!settings.developerMode) return <Navigate to="/settings" replace />;
  return (
    <div className="max-w-md mx-auto">
      <SettingsFab />
      <Outlet />
      <BottomNav tabs={session.role === "patient" ? WEARER_TABS : CAREGIVER_TABS} />
    </div>
  );
}

function Landing() {
  const { session } = useApp();
  if (!session) return <Navigate to="/auth" replace />;
  return <Navigate to={session.role === "patient" ? "/wearer" : "/caregiver"} replace />;
}

function AuthRoute() {
  const { session } = useApp();
  if (session) return <Navigate to="/" replace />;
  return <AuthPage />;
}

function SettingsLayout() {
  const { session } = useApp();
  if (!session) return <Navigate to="/auth" replace />;
  return (
    <div className="max-w-md mx-auto">
      <Settings />
      <BottomNav tabs={session.role === "patient" ? WEARER_TABS : CAREGIVER_TABS} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/settings" element={<SettingsLayout />} />
          <Route element={<RequireRole role="patient" tabs={WEARER_TABS} />}>
            <Route path="/wearer" element={<WearerHome />} />
            <Route path="/wearer/reminders" element={<WearerReminders />} />
            <Route path="/wearer/games" element={<WearerGames />} />
            <Route path="/wearer/family" element={<WearerFamily />} />
          </Route>
          <Route element={<RequireRole role="caregiver" tabs={CAREGIVER_TABS} />}>
            <Route path="/caregiver" element={<Dashboard />} />
            <Route path="/caregiver/alerts" element={<Alerts />} />
            <Route path="/caregiver/manage" element={<Manage />} />
            <Route path="/caregiver/history" element={<History />} />
          </Route>
          <Route element={<DevLayout />}>
            <Route path="/dev/simulator" element={<Simulator />} />
            <Route path="/dev/api" element={<ApiContract />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
