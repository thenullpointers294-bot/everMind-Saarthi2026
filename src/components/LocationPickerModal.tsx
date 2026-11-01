import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, X, Check, Loader2 } from "lucide-react";
import { Card } from "./ui";

interface LocationPickerModalProps {
  initialLat?: number;
  initialLon?: number;
  onSelect: (coords: { lat: number; lon: number; label?: string }) => void;
  onClose: () => void;
}

export default function LocationPickerModal({
  initialLat = 30.3165,
  initialLon = 78.0322,
  onSelect,
  onClose,
}: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number }>({
    lat: initialLat,
    lon: initialLon,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [addressLabel, setAddressLabel] = useState<string>("");

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const customIcon = L.divIcon({
      className: "",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;">
          <div style="position:absolute;inset:-6px;border-radius:9999px;background:#2563eb;opacity:0.35;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="width:30px;height:30px;border-radius:9999px;background:#0f172a;border:2.5px solid #ffffff;box-shadow:0 4px 10px rgba(15,23,42,0.3);display:flex;align-items:center;justify-content:center;">
            <div style="width:9px;height:9px;border-radius:9999px;background:#38bdf8;"></div>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const marker = L.marker([initialLat, initialLon], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      const next = { lat: Number(pos.lat.toFixed(6)), lon: Number(pos.lng.toFixed(6)) };
      setSelectedCoords(next);
    });

    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      setSelectedCoords({
        lat: Number(e.latlng.lat.toFixed(6)),
        lon: Number(e.latlng.lng.toFixed(6)),
      });
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initialLat, initialLon]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.trim()
      )}`;
      const res = await fetch(url, { headers: { "User-Agent": "EverMindWearableApp" } });
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const nextLat = parseFloat(first.lat);
        const nextLon = parseFloat(first.lon);
        setSelectedCoords({ lat: nextLat, lon: nextLon });
        setAddressLabel(first.display_name);

        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([nextLat, nextLon], 16);
          markerRef.current.setLatLng([nextLat, nextLon]);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    onSelect({
      ...selectedCoords,
      label: addressLabel,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-lg bg-white p-0 overflow-hidden shadow-2xl rounded-3xl border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 text-sky-700 rounded-xl">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Set Exact Device Location</h3>
              <p className="text-[11px] text-slate-500">Search address or tap anywhere on the map</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, area, street, or landmark..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-slate-800 transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
            </button>
          </form>
          {addressLabel && (
            <p className="text-[11px] text-slate-600 truncate mt-2 font-medium">
              📍 {addressLabel}
            </p>
          )}
        </div>

        {/* Interactive Leaflet Map */}
        <div ref={mapContainerRef} className="w-full h-64 bg-slate-100 relative cursor-crosshair" />

        {/* Footer actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-500">
            {selectedCoords.lat.toFixed(5)}, {selectedCoords.lon.toFixed(5)}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
