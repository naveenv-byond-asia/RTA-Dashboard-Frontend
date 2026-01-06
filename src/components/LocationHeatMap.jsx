import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

function HeatLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.heatLayer(points, { radius: 25, blur: 15 }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);
  return null;
}

export default function HeatMap({ data = [] }) {
  const heatPoints = data.map((point) => [
    point.latitude,
    point.longitude,
    point.weight ?? 1,
  ]);
  return (
    <div className="panel">
      <strong>Location Heatmap</strong>
      <div className="heatmap-wrap">
        <MapContainer center={[25.23479, 55.301873]} zoom={14}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <HeatLayer points={heatPoints} />
        </MapContainer>
      </div>
    </div>
  );
}
