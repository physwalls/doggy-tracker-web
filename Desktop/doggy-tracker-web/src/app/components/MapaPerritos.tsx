"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// correcion por defecto
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export interface Reporte {
  id: string;
  usuario_id: string;
  latitud: number;
  longitud: number;
  estado: "perdido" | "avistado" | "rescatado";
  tamano: "pequeño" | "mediano" | "grande";
  color_principal: string;
  descripcion?: string;
  foto_url?: string;
  creado_en: string;
  perfil?: {
    id: string;
    nombre_usuario: string;
  };
}

interface MapaProps {
  reportes: Reporte[];
  coordenadasSeleccionadas: { lat: number; lng: number } | null;
  onSeleccionarCoordenadas: (lat: number, lng: number) => void;
}

// Subcomponente para detectar clics en el mapa y capturar coordenadas
function SelectorUbicacion({
  onSeleccionar,
}: {
  onSeleccionar: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSeleccionar(
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
      );
    },
  });
  return null;
}

export default function MapaPerritos({
  reportes,
  coordenadasSeleccionadas,
  onSeleccionarCoordenadas,
}: MapaProps) {
  // Coordenadas iniciales por defecto (31.7385, -106.4850 como el primer reporte)
  const centroInicial: [number, number] = [31.7385, -106.485];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 relative z-0">
      <MapContainer
        center={centroInicial}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SelectorUbicacion onSeleccionar={onSeleccionarCoordenadas} />

        {/* Marcadores de todos los perritos en la base de datos */}
        {reportes.map((rep) => (
          <Marker
            key={rep.id}
            position={[rep.latitud, rep.longitud]}
            icon={customIcon}
          >
            <Popup>
              <div className="p-1 max-w-[200px]">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full uppercase mb-1 ${
                    rep.estado === "perdido"
                      ? "bg-red-100 text-red-700"
                      : rep.estado === "avistado"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {rep.estado}
                </span>
                {rep.foto_url && (
                  <img
                    src={rep.foto_url}
                    alt="Perrito"
                    className="w-full h-28 object-cover rounded-lg my-1.5"
                  />
                )}
                <p className="font-semibold text-slate-800 text-sm m-0">
                  Tamaño {rep.tamano} • Color {rep.color_principal}
                </p>
                {rep.descripcion && (
                  <p className="text-xs text-slate-600 mt-1 m-0">
                    {rep.descripcion}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1 m-0">
                  Por: {rep.perfil?.nombre_usuario || "Usuario"}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Marcador temporal cuando haces clic para crear un reporte nuevo */}
        {coordenadasSeleccionadas && (
          <Marker
            position={[
              coordenadasSeleccionadas.lat,
              coordenadasSeleccionadas.lng,
            ]}
            icon={customIcon}
          >
            <Popup>
              <span className="font-semibold text-xs text-indigo-600">
                📍 Ubicación seleccionada para el nuevo reporte
              </span>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
