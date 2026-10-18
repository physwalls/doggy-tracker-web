"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Dog,
  MapPin,
  Upload,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import type { Reporte } from "./components/MapaPerritos";

// Cargamos el mapa sin SSR para evitar errores de window en Next.js
const MapaPerritos = dynamic(() => import("./components/MapaPerritos"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-500">
      Cargando mapa interactivo...
    </div>
  ),
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function HomePage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [usuarioId, setUsuarioId] = useState<string>("");
  const [nombreUsuario, setNombreUsuario] = useState<string>("");
  const [cargando, setCargando] = useState<boolean>(true);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [filtroEstado, setFiltroEstado] = useState<
    "todos" | "perdido" | "avistado" | "rescatado"
  >("todos");

  // Filtramos los reportes que se ven en el mapa y en la lista lateral
  const reportesFiltrados = reportes.filter((rep) =>
    filtroEstado === "todos" ? true : rep.estado === filtroEstado,
  );

  // Estado del formulario de nuevo reporte
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number }>({
    lat: 31.7385,
    lng: -106.485,
  });
  const [estado, setEstado] = useState<"perdido" | "avistado" | "rescatado">(
    "avistado",
  );
  const [tamano, setTamano] = useState<"pequeño" | "mediano" | "grande">(
    "mediano",
  );
  const [colorPrincipal, setColorPrincipal] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);

  // Cargar perfiles y reportes desde nuestro backend NestJS
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resReportes, resPerfiles] = await Promise.all([
        fetch(`${API_URL}/reportes`),
        fetch(`${API_URL}/perfiles`),
      ]);

      if (resReportes.ok) {
        const dataReportes = await resReportes.json();
        setReportes(dataReportes);
      }

      if (resPerfiles.ok) {
        const dataPerfiles = await resPerfiles.json();
        if (dataPerfiles.length > 0) {
          setUsuarioId(dataPerfiles[0].id);
          setNombreUsuario(dataPerfiles[0].nombre_usuario);
        }
      }
    } catch (error) {
      console.error("Error conectando con la API:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Enviar el formulario (1. Sube la foto si existe -> 2. Crea el reporte)
  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioId) {
      alert("No se encontró un perfil activo en la base de datos.");
      return;
    }

    setEnviando(true);
    try {
      let fotoUrlFinal: string | undefined = undefined;

      // 1. Si seleccionó una foto, la subimos primero a Supabase Storage vía NestJS
      if (archivoFoto) {
        const formData = new FormData();
        formData.append("file", archivoFoto);

        const resUpload = await fetch(`${API_URL}/reportes/upload`, {
          method: "POST",
          body: formData,
        });

        if (!resUpload.ok) {
          throw new Error("Error al subir la fotografía");
        }
        const dataUpload = await resUpload.json();
        fotoUrlFinal = dataUpload.foto_url;
      }

      // 2. Guardamos el reporte en PostgreSQL
      const resReporte = await fetch(`${API_URL}/reportes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: usuarioId,
          latitud: Number(coordenadas.lat),
          longitud: Number(coordenadas.lng),
          estado,
          tamano,
          color_principal: colorPrincipal,
          descripcion: descripcion || undefined,
          foto_url: fotoUrlFinal,
        }),
      });

      if (!resReporte.ok) {
        throw new Error("Error al guardar el reporte");
      }

      // Limpiamos el formulario y recargamos el mapa
      setColorPrincipal("");
      setDescripcion("");
      setArchivoFoto(null);
      await cargarDatos();
      alert("¡Reporte publicado en el mapa con éxito! 🐾");
    } catch (error) {
      console.error(error);
      alert("Hubo un problema al publicar el reporte. Revisa la consola.");
    } finally {
      setEnviando(false);
    }
  };

  // PATCH /reportes/:id -> Cambia el estado del perrito a 'rescatado'
  const marcarComoRescatado = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que el clic mueva el mapa accidentalmente
    try {
      const res = await fetch(`${API_URL}/reportes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "rescatado" }),
      });

      if (res.ok) {
        await cargarDatos();
      }
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  };

  // DELETE /reportes/:id -> Borra el reporte de Supabase
  const eliminarReporte = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Estás segura de que deseas eliminar este reporte?")) return;

    try {
      const res = await fetch(`${API_URL}/reportes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await cargarDatos();
      }
    } catch (error) {
      console.error("Error al eliminar reporte:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Barra superior */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl text-white">
            <Dog size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Doggy Tracker</h1>
            <p className="text-xs text-slate-500">
              Red comunitaria de localización y rescate de perritos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {nombreUsuario && (
            <span className="text-sm bg-slate-100 px-3 py-1.5 rounded-full font-medium text-slate-700">
              👤 Perfil activo: <strong>{nombreUsuario}</strong>
            </span>
          )}
          <button
            onClick={cargarDatos}
            className="flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw size={15} className={cargando ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </header>

      {/* Contenido Principal: Mapa + Panel Lateral */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-[1600px] w-full mx-auto">
        {/* Columna Izquierda: Mapa Interactivo y Filtros (7 columnas) */}
        <section className="lg:col-span-7 flex flex-col gap-3 min-h-[500px] lg:h-[calc(100vh-120px)]">
          {/* Barra superior del mapa: Tip + Botones de Filtro */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <MapPin size={16} className="text-amber-600 shrink-0" />
              <span>Haz clic en el mapa para elegir coordenadas</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFiltroEstado("todos")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroEstado === "todos"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todos ({reportes.length})
              </button>
              <button
                onClick={() => setFiltroEstado("perdido")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroEstado === "perdido"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                🚨 Perdidos (
                {reportes.filter((r) => r.estado === "perdido").length})
              </button>
              <button
                onClick={() => setFiltroEstado("avistado")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroEstado === "avistado"
                    ? "bg-amber-500 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                👀 Avistados (
                {reportes.filter((r) => r.estado === "avistado").length})
              </button>
              <button
                onClick={() => setFiltroEstado("rescatado")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filtroEstado === "rescatado"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                🏡 Rescatados (
                {reportes.filter((r) => r.estado === "rescatado").length})
              </button>
            </div>
          </div>

          <div className="flex-1">
            <MapaPerritos
              reportes={reportesFiltrados}
              coordenadasSeleccionadas={coordenadas}
              onSeleccionarCoordenadas={(lat, lng) =>
                setCoordenadas({ lat, lng })
              }
            />
          </div>
        </section>

        {/* Columna Derecha: Formulario y Feed de Reportes (5 columnas) */}
        <section className="lg:col-span-5 flex flex-col gap-6 lg:h-[calc(100vh-120px)] lg:overflow-y-auto pr-1">
          {/* Formulario de Nuevo Reporte */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PlusCircle className="text-amber-500" size={20} />
              Reportar un Perrito
            </h2>

            <form onSubmit={manejarEnvio} className="space-y-4">
              {/* Coordenadas capturadas */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Latitud:</span>
                  <strong className="text-slate-800 text-sm">
                    {coordenadas.lat}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Longitud:</span>
                  <strong className="text-slate-800 text-sm">
                    {coordenadas.lng}
                  </strong>
                </div>
              </div>

              {/* Estado y Tamaño */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Estado del reporte
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="avistado">👀 Avistado en calle</option>
                    <option value="perdido">🚨 Perdido (Buscando)</option>
                    <option value="rescatado">🏡 Rescatado / Seguro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tamaño
                  </label>
                  <select
                    value={tamano}
                    onChange={(e) => setTamano(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="pequeño">Pequeño</option>
                    <option value="mediano">Mediano</option>
                    <option value="grande">Grande</option>
                  </select>
                </div>
              </div>

              {/* Color Principal */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Color principal / Señas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Miel con manchas blancas, collar azul..."
                  value={colorPrincipal}
                  onChange={(e) => setColorPrincipal(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Descripción adicional
                </label>
                <textarea
                  rows={2}
                  placeholder="¿Hacia dónde caminaba? ¿Se veía asustado o amigable?"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Subir Fotografía */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Fotografía del perrito (Opcional)
                </label>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-3 cursor-pointer transition bg-slate-50 text-xs text-slate-600">
                  <Upload size={16} className="text-amber-600" />
                  <span>
                    {archivoFoto
                      ? archivoFoto.name
                      : "Haz clic para seleccionar una imagen"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setArchivoFoto(e.target.files?.[0] || null)
                    }
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-2.5 rounded-xl shadow-sm transition cursor-pointer"
              >
                {enviando
                  ? "Subiendo reporte al mapa..."
                  : "Publicar Reporte 🐾"}
              </button>
            </form>
          </div>

          {/* Lista de Reportes Recientes */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-3">
              Reportes Mostrados ({reportesFiltrados.length})
            </h3>

            {reportesFiltrados.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay reportes en esta categoría.
              </p>
            ) : (
              <div className="space-y-3">
                {reportesFiltrados.map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() =>
                      setCoordenadas({ lat: rep.latitud, lng: rep.longitud })
                    }
                    className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:border-amber-300 hover:bg-amber-50/30 transition cursor-pointer"
                  >
                    {rep.foto_url ? (
                      <img
                        src={rep.foto_url}
                        alt="Perrito"
                        className="w-20 h-20 rounded-lg object-cover shrink-0 bg-slate-100"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Dog size={28} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-full uppercase ${
                            rep.estado === "perdido"
                              ? "bg-red-100 text-red-700"
                              : rep.estado === "avistado"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {rep.estado}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(rep.creado_en).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="font-semibold text-sm text-slate-800 mt-1 truncate">
                        Color {rep.color_principal} ({rep.tamano})
                      </p>
                      {rep.descripcion && (
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                          {rep.descripcion}
                        </p>
                      )}

                      {/* Botones de acción CRUD (PATCH y DELETE) */}
                      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                        {rep.estado !== "rescatado" && (
                          <button
                            onClick={(e) => marcarComoRescatado(rep.id, e)}
                            className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg transition cursor-pointer"
                            title="Marcar como rescatado"
                          >
                            <CheckCircle2 size={13} />
                            ¡Ya fue rescatado!
                          </button>
                        )}
                        <button
                          onClick={(e) => eliminarReporte(rep.id, e)}
                          className="flex items-center gap-1 text-[11px] font-medium bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg transition cursor-pointer"
                          title="Eliminar reporte"
                        >
                          <Trash2 size={13} />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
