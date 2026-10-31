import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppSettings, Contact, Reminder } from "../types";
import {
  getSettings,
  saveSettings,
  subscribeSettings,
  subscribeReminders,
  subscribeContacts,
  setScope,
  onScopeChange,
} from "../services/dataService";
import {
  subscribeDevice,
  type DeviceSnapshot,
} from "../services/deviceService";
import {
  getSession,
  subscribeSession,
  subscribePairing,
  type UserProfile,
} from "../services/authService";

interface AppCtx {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  session: UserProfile | null;
  device: DeviceSnapshot | null;
  reminders: Reminder[];
  contacts: Contact[];
  now: Date;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [session, setSession] = useState<UserProfile | null>(getSession());
  const [device, setDevice] = useState<DeviceSnapshot | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [now, setNow] = useState(new Date());
  const [scopeTick, setScopeTick] = useState(0);

  useEffect(() => subscribeSettings(setSettings), []);
  useEffect(() => subscribeSession(setSession), []);

  // Patient scope = the patient's own code, or the code a caregiver linked to
  useEffect(() => {
    setScope(session?.role === "patient" ? session.pairCode : session?.linkedCode);
  }, [session]);
  useEffect(() => onScopeChange(() => setScopeTick((t) => t + 1)), []);

  // Follow the pairing record so pendant id / patient name stay in sync on both sides
  const pairCode = session?.role === "patient" ? session.pairCode : session?.linkedCode;
  useEffect(() => {
    if (!pairCode) return;
    return subscribePairing(pairCode, (p) => {
      if (!p) return;
      const patch: Partial<AppSettings> = {};
      if (p.deviceId && p.deviceId !== getSettings().deviceId) patch.deviceId = p.deviceId;
      if (session?.role === "caregiver" && p.patientName && p.patientName !== getSettings().wearerName)
        patch.wearerName = p.patientName;
      if (Object.keys(patch).length) saveSettings(patch);
    });
  }, [pairCode, session?.role]);

  useEffect(() => subscribeReminders(setReminders), [scopeTick]);
  useEffect(() => subscribeContacts(setContacts), [scopeTick]);
  useEffect(
    () => subscribeDevice(settings.deviceId, setDevice),
    [settings.deviceId, scopeTick]
  );
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  const value = useMemo<AppCtx>(
    () => ({
      settings,
      updateSettings: saveSettings,
      session,
      device,
      reminders,
      contacts,
      now,
    }),
    [settings, session, device, reminders, contacts, now]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
