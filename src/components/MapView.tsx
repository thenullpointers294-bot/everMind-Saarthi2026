import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  lat: number;
  lon: number;
  kind: "wearer" | "home" | "alert";
  label: string;
}

const ICONS: Record<MapMarker["kind"], { emoji: string; bg: string }> = {
  wearer: { emoji: "🧓", bg: "#0d9488" },
  home: { emoji: "🏠", bg: "#2563eb" },
  alert: { emoji: "🚨", bg: "#e11d48" },
};

function divIcon(kind: MapMarker["kind"]) {
  const { emoji, bg } = ICONS[kind];
  return L.divIcon({
    className: "",
    html: `<div style="width:38px;height:38px;border-radius:50% 50% 50% 4px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:19px;box-shadow:0 2px 8px rgba(0,0,0,.35);border:2.5px solid #fff;transform:rotate(0deg)">${emoji}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 36],
    popupAnchor: [0, -34],
  });
}

export default function MapView({
  markers,
  routeToHome = false,
  height = 260,
  className,
}: {
  markers: MapMarker[];
  routeToHome?: boolean;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: true, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.setView([30.3165, 78.0322], 15);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    markers.forEach((m) => {
      L.marker([m.lat, m.lon], { icon: divIcon(m.kind) })
        .bindPopup(m.label)
        .addTo(layer);
    });

    if (routeToHome) {
      const wearer = markers.find((m) => m.kind === "wearer" || m.kind === "alert");
      const home = markers.find((m) => m.kind === "home");
      if (wearer && home) {
        L.polyline(
          [
            [wearer.lat, wearer.lon],
            [home.lat, home.lon],
          ],
          { color: "#2563eb", weight: 4, dashArray: "8 10", opacity: 0.8 }
        ).addTo(layer);
      }
    }

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lon], 16);
    } else if (markers.length > 1) {
      map.fitBounds(
        L.latLngBounds(markers.map((m) => [m.lat, m.lon] as [number, number])),
        { padding: [40, 40], maxZoom: 16 }
      );
    }
  }, [markers, routeToHome]);

  return (
    <div
      ref={ref}
      style={{ height }}
      className={`w-full rounded-2xl overflow-hidden border border-slate-200 z-0 ${className ?? ""}`}
    />
  );
}
