import { Link } from "react-router-dom";
import { Card, PageHeader, Badge } from "../../components/ui";

const FIELDS = [
  { name: "type", type: "string", desc: '"sos" | "possible_fall" | "ok" | "home" | "location"' },
  { name: "deviceId", type: "string", desc: 'Pendant id, default "mg-demo-01"' },
  { name: "hasFix", type: "boolean", desc: "Whether the GPS had a fix when the event fired" },
  { name: "lat", type: "number | null", desc: "Latitude, null when there is no GPS fix" },
  { name: "lon", type: "number | null", desc: "Longitude, null when there is no GPS fix" },
  { name: "fixAgeMs", type: "integer (optional)", desc: "Age of the GPS fix in milliseconds" },
  { name: "experimental", type: "boolean (optional)", desc: 'Only present on "possible_fall" events' },
  { name: "createdAt", type: "timestamp", desc: "Firestore server timestamp" },
  { name: "uptimeMs", type: "integer", desc: "Pendant uptime in milliseconds" },
];

export default function ApiContract() {
  return (
    <div className="pb-28 min-h-dvh bg-slate-50">
      <PageHeader
        title="API contract"
        subtitle="Event format written by the ESP32 pendant"
        right={
          <Link to="/dev/simulator" className="rounded-xl bg-slate-800 text-white text-xs font-bold px-3 py-2">
            🛠 Simulator
          </Link>
        }
      />
      <div className="px-4 space-y-4 max-w-md mx-auto">
        <Card>
          <h2 className="font-bold text-slate-800 text-sm">Collection path</h2>
          <code className="block mt-2 rounded-xl bg-slate-900 text-emerald-300 text-xs p-3 font-mono">
            devices/{"{deviceId}"}/events
          </code>
          <p className="text-xs text-slate-500 mt-2">
            <b>Realtime Database:</b> push each event under this path with{" "}
            <code>createdAt</code> as a Unix-ms number (or{" "}
            <code>{"{\".sv\":\"timestamp\"}"}</code> for a server timestamp). The app listens with{" "}
            <code>orderByChild("createdAt"), limitToLast(50)</code>.
            <br />
            <b>Firestore:</b> same path, listened with{" "}
            <code>orderBy("createdAt","desc"), limit(50)</code>.
            <br />
            Device events
            are <b>read-only</b>; caregiver actions (acknowledge / note / resolve) live in{" "}
            <code>alerts/{"{eventId}"}</code>.
          </p>
        </Card>

        <Card>
          <h2 className="font-bold text-slate-800 text-sm mb-2">Document fields</h2>
          <div className="divide-y divide-slate-100">
            {FIELDS.map((f) => (
              <div key={f.name} className="py-2">
                <p className="text-sm">
                  <code className="font-bold text-teal-700">{f.name}</code>{" "}
                  <Badge tone="slate">{f.type}</Badge>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-slate-800 text-sm mb-2">App interpretation</h2>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
            <li><b>location</b> → latest available location + freshness badge (Recent &lt;1 min, Updated &lt;10 min, Old &gt;10 min)</li>
            <li><b>sos</b> → SOS alert (New / Acknowledged / Resolved)</li>
            <li><b>possible_fall</b> → alert labelled "Possible fall (experimental)"</li>
            <li><b>ok</b> → shows "Wearer pressed I'm OK" and cancels a pending fall alert</li>
            <li><b>home</b> → "Take me home" request: wearer location + route-to-home on the caregiver map</li>
            <li>Device is <b>Online</b> if the last location event is under 2 minutes old, else "Offline / last seen X"</li>
          </ul>
        </Card>

        <Card>
          <h2 className="font-bold text-slate-800 text-sm">Example document</h2>
          <pre className="mt-2 rounded-xl bg-slate-900 text-slate-200 text-[11px] p-3 font-mono overflow-x-auto">{`{
  "type": "sos",
  "deviceId": "mg-demo-01",
  "hasFix": true,
  "lat": 30.3165,
  "lon": 78.0322,
  "fixAgeMs": 1200,
  "createdAt": <server timestamp>,
  "uptimeMs": 5400000
}`}</pre>
        </Card>
      </div>
    </div>
  );
}
