import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from "recharts";
import { 
  Calendar, 
  Filter, 
  ClipboardList, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  Truck, 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Navigation,
  Compass
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function AnalyticsDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Rango de fechas por defecto: últimos 30 días
  const [filters, setFilters] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    return {
      startDate: thirtyDaysAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
      tripType: "all",
      priority: "all",
      driver: "all"
    };
  });

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setTrips(data || []);
    } catch (e) {
      console.error("Error al cargar viajes para analítica:", e);
      setError("No se pudieron cargar los datos históricos de traslados. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // Botones de filtro rápido
  const setQuickDateRange = (days) => {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - days);
    
    setFilters(prev => ({
      ...prev,
      startDate: pastDate.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0]
    }));
  };

  // Obtener lista única de conductores para el selector de filtros
  const driversList = useMemo(() => {
    const list = trips
      .map(t => t.driver_name)
      .filter(name => name && name.trim() !== "");
    return ["all", ...new Set(list)];
  }, [trips]);

  // Filtrado de viajes interactivo reactivo
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      // Filtrado por fecha
      const tripDate = trip.scheduled_date || (trip.created_at ? trip.created_at.split("T")[0] : null);
      if (!tripDate) return false;
      
      const isAfterStart = tripDate >= filters.startDate;
      const isBeforeEnd = tripDate <= filters.endDate;
      if (!isAfterStart || !isBeforeEnd) return false;

      // Filtrado por tipo de viaje
      if (filters.tripType !== "all" && trip.trip_type !== filters.tripType) return false;

      // Filtrado por prioridad
      if (filters.priority !== "all" && trip.priority !== filters.priority) return false;

      // Filtrado por conductor
      if (filters.driver !== "all" && trip.driver_name !== filters.driver) return false;

      return true;
    });
  }, [trips, filters]);

  // --- CÁLCULO DE MÉTRICAS (KPIs) ---
  const metrics = useMemo(() => {
    const total = filteredTrips.length;
    const completed = filteredTrips.filter(t => t.status === "completado").length;
    const canceled = filteredTrips.filter(t => t.status === "cancelado").length;
    const active = filteredTrips.filter(t => ["pendiente", "asignado", "en_curso", "revision_gestor"].includes(t.status)).length;
    
    const totalExclCanceled = total - canceled;
    const completionRate = totalExclCanceled > 0 ? Math.round((completed / totalExclCanceled) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((canceled / total) * 100) : 0;
    
    const totalKms = filteredTrips
      .filter(t => t.status === "completado")
      .reduce((sum, t) => sum + (t.total_mileage || 0), 0);

    // Calcular motivo de cancelación más común
    const cancelReasons = filteredTrips
      .map(t => t.cancel_reason)
      .filter(reason => reason && reason.trim() !== "");
    
    let topReason = "Ninguno";
    if (cancelReasons.length > 0) {
      const counts = {};
      cancelReasons.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      topReason = sorted[0][0];
    }

    return {
      total,
      completed,
      canceled,
      active,
      completionRate,
      cancellationRate,
      totalKms,
      topReason
    };
  }, [filteredTrips]);

  // --- DATOS PARA GRÁFICOS ---
  
  // 1. Evolución Temporal (Día a Día)
  const temporalChartData = useMemo(() => {
    const datesMap = {};
    
    // Inicializar rango completo de fechas para rellenar vacíos
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      // Formato legible DD/MM
      const parts = dateStr.split("-");
      const label = `${parts[2]}/${parts[1]}`;
      datesMap[dateStr] = { dateStr, label, creados: 0, completados: 0 };
    }

    filteredTrips.forEach(trip => {
      const tripDate = trip.scheduled_date || (trip.created_at ? trip.created_at.split("T")[0] : null);
      if (tripDate && datesMap[tripDate]) {
        datesMap[tripDate].creados += 1;
        if (trip.status === "completado") {
          datesMap[tripDate].completados += 1;
        }
      }
    });

    return Object.values(datesMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [filteredTrips, filters.startDate, filters.endDate]);

  // 2. Distribución por Estado
  const statusChartData = useMemo(() => {
    const counts = {
      pendiente: 0,
      asignado: 0,
      en_curso: 0,
      completado: 0,
      cancelado: 0,
      revision_gestor: 0
    };

    filteredTrips.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });

    const labelMap = {
      pendiente: "Pendiente",
      asignado: "Asignado",
      en_curso: "En Ruta",
      completado: "Completado",
      cancelado: "Cancelado",
      revision_gestor: "En Revisión"
    };

    const colorMap = {
      pendiente: "#f59e0b", // Amber
      asignado: "#6366f1",  // Indigo
      en_curso: "#3b82f6",  // Blue
      completado: "#10b981",  // Emerald
      cancelado: "#ef4444",   // Red
      revision_gestor: "#8b5cf6" // Purple
    };

    return Object.keys(counts).map(key => ({
      name: labelMap[key],
      value: counts[key],
      color: colorMap[key]
    })).filter(item => item.value > 0);
  }, [filteredTrips]);

  // 3. Distribución por Prioridad
  const priorityChartData = useMemo(() => {
    const counts = { baja: 0, normal: 0, alta: 0, urgente: 0 };
    filteredTrips.forEach(t => {
      const prio = t.priority || "normal";
      if (counts[prio] !== undefined) counts[prio]++;
    });

    const labelMap = { baja: "Baja", normal: "Normal", alta: "Alta", urgente: "Urgente" };
    const colorMap = {
      baja: "#94a3b8",   // Slate 400
      normal: "#10b981", // Emerald
      alta: "#f97316",   // Orange
      urgente: "#ef4444"  // Red
    };

    return Object.keys(counts).map(key => ({
      name: labelMap[key],
      value: counts[key],
      color: colorMap[key]
    }));
  }, [filteredTrips]);

  // 4. Top Conductores con más Traslados Completados
  const topDriversData = useMemo(() => {
    const counts = {};
    filteredTrips
      .filter(t => t.status === "completado" && t.driver_name)
      .forEach(t => {
        counts[t.driver_name] = (counts[t.driver_name] || 0) + 1;
      });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, viajes: count }))
      .sort((a, b) => b.viajes - a.viajes)
      .slice(0, 5);
  }, [filteredTrips]);

  // 5. Top Vehículos por Kilómetros Recorridos
  const topVehiclesData = useMemo(() => {
    const kmsMap = {};
    filteredTrips
      .filter(t => t.status === "completado" && t.vehicle_plate)
      .forEach(t => {
        kmsMap[t.vehicle_plate] = (kmsMap[t.vehicle_plate] || 0) + (t.total_mileage || 0);
      });

    return Object.entries(kmsMap)
      .map(([plate, kms]) => ({ plate, kilometros: parseFloat(kms.toFixed(1)) }))
      .sort((a, b) => b.kilometros - a.kilometros)
      .slice(0, 5);
  }, [filteredTrips]);

  // 6. Top 5 Destinos más Recurrentes
  const topDestinations = useMemo(() => {
    const counts = {};
    filteredTrips.forEach(t => {
      if (t.destination) counts[t.destination] = (counts[t.destination] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredTrips]);

  // --- EXPORTAR EXCEL ---
  const handleExportExcel = () => {
    if (filteredTrips.length === 0) return;
    
    const dataToExport = filteredTrips.map(t => ({
      Folio: t.tracking_number,
      "Tipo Traslado": t.trip_type === "clinico" ? "Clínico" : "No Clínico",
      "Detalle / Paciente": t.trip_type === "clinico" ? t.patient_name : t.task_details,
      Prioridad: t.priority?.toUpperCase(),
      Estado: t.status?.toUpperCase(),
      Origen: t.origin,
      Destino: t.destination,
      Conductor: t.driver_name || "Sin Asignar",
      Patente: t.vehicle_plate || "Sin Asignar",
      "Kms Recorridos": t.total_mileage || 0,
      "Fecha Programada": t.scheduled_date || "N/A",
      "Hora Cita": t.appointment_time || "N/A",
      "Fecha Creación": new Date(t.created_at).toLocaleString("es-CL"),
      "Motivo Cancelación": t.cancel_reason || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Traslados");
    XLSX.writeFile(workbook, `reporte_analitico_traslados_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // --- EXPORTAR PDF ---
  const handleExportPDF = () => {
    if (filteredTrips.length === 0) return;

    const doc = new jsPDF();
    
    // Encabezado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(13, 148, 136); // Teal 600
    doc.text("HOSPITAL DE CURICÓ", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text("Reporte Estadístico de Traslados y Movilización", 14, 28);
    
    // Info del Reporte
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${filters.startDate} al ${filters.endDate}`, 14, 34);
    doc.text(`Fecha Emisión: ${new Date().toLocaleString("es-CL")}`, 14, 39);
    doc.text(`Filtros: Tipo: ${filters.tripType}, Prioridad: ${filters.priority}, Conductor: ${filters.driver}`, 14, 44);
    
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(14, 47, 196, 47);
    
    // Sección de Métricas KPI
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("Resumen de Indicadores Clave (KPIs):", 14, 55);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`* Total Traslados Solicitados: ${metrics.total}`, 16, 62);
    doc.text(`* Traslados Completados Exitosamente: ${metrics.completed} (${metrics.completionRate}% de tasa de éxito)`, 16, 68);
    doc.text(`* Traslados Cancelados: ${metrics.canceled} (${metrics.cancellationRate}% de tasa de cancelación)`, 16, 74);
    doc.text(`* Principal causa de cancelación: ${metrics.topReason}`, 16, 80);
    doc.text(`* Kilometraje Total Recorrido por Flota: ${metrics.totalKms.toFixed(1)} km`, 16, 86);
    
    doc.line(14, 92, 196, 92);

    // Tabla de Detalle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Detalle de Traslados:", 14, 100);

    const tableColumn = ["Folio", "Tipo", "Paciente/Detalle", "Prioridad", "Estado", "Origen", "Destino", "Conductor", "Kms"];
    const tableRows = filteredTrips.map(t => [
      t.tracking_number,
      t.trip_type === "clinico" ? "Clín." : "Log.",
      (t.trip_type === "clinico" ? t.patient_name : t.task_details) || "N/A",
      t.priority?.toUpperCase(),
      t.status?.toUpperCase(),
      t.origin,
      t.destination,
      t.driver_name ? t.driver_name.split(" ")[0] : "Sin asig.",
      t.total_mileage || 0
    ]);

    doc.autoTable({
      startY: 104,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: [13, 148, 136] }, // Teal 600
    });

    doc.save(`reporte_traslados_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones de Descarga */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-teal-600 animate-pulse" />
            Dashboard de Gestión de Traslados
          </h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
            Analítica de móviles, tiempos y productividad de la sala de control
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={fetchTrips}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          
          <button 
            onClick={handleExportExcel}
            disabled={loading || filteredTrips.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Excel
          </button>
          
          <button 
            onClick={handleExportPDF}
            disabled={loading || filteredTrips.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            Reporte PDF
          </button>
        </div>
      </div>

      {/* PANEL DE FILTROS INTERACTIVOS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest border-b border-slate-50 pb-2">
          <Filter className="w-4 h-4 text-teal-600" />
          Filtros de Búsqueda y Rango Temporal
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Rango de Fechas */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desde</label>
            <input 
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full text-xs p-2 border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hasta</label>
            <input 
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full text-xs p-2 border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>

          {/* Tipo de Traslado */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo Traslado</label>
            <select 
              value={filters.tripType}
              onChange={(e) => setFilters(prev => ({ ...prev, tripType: e.target.value }))}
              className="w-full text-xs p-2 border border-slate-200 bg-white rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            >
              <option value="all">Todos</option>
              <option value="clinico">Clínico</option>
              <option value="no_clinico">No Clínico / Logístico</option>
            </select>
          </div>

          {/* Prioridad */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prioridad</label>
            <select 
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full text-xs p-2 border border-slate-200 bg-white rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            >
              <option value="all">Todas</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="normal">Normal</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          {/* Conductor */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conductor</label>
            <select 
              value={filters.driver}
              onChange={(e) => setFilters(prev => ({ ...prev, driver: e.target.value }))}
              className="w-full text-xs p-2 border border-slate-200 bg-white rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            >
              {driversList.map(d => (
                <option key={d} value={d}>{d === "all" ? "Todos" : d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Accesos rápidos de rango temporal */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-50 pt-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Rangos Rápidos:</span>
          {[
            { label: "Últimos 7 días", val: 7 },
            { label: "Últimos 15 días", val: 15 },
            { label: "Último Mes", val: 30 },
            { label: "Últimos 3 Meses", val: 90 },
            { label: "Último Año", val: 365 }
          ].map(btn => (
            <button
              key={btn.val}
              onClick={() => setQuickDateRange(btn.val)}
              className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition-colors border border-slate-200/50"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-3 animate-pulse">
            Procesando estadísticas analíticas...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 border border-red-100 rounded-2xl shadow-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide">Error en Analíticas</h3>
            <p className="text-xs mt-1 font-medium">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPIs CARDS CONTAINER */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Solicitudes Totales */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl p-4 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Total Solicitudes</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{metrics.total}</h3>
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded uppercase mt-2 inline-block">
                  En el Período
                </span>
              </div>
              <div className="bg-indigo-600 text-white p-2 rounded-xl">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 2: Tasa de Éxito */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-2xl p-4 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Tasa de Éxito</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{metrics.completionRate}%</h3>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded uppercase mt-2 inline-block">
                  {metrics.completed} Completados
                </span>
              </div>
              <div className="bg-emerald-600 text-white p-2 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 3: Kilometraje Flota */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-100 rounded-2xl p-4 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-teal-500 tracking-wider">Kilómetros Flota</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{metrics.totalKms.toLocaleString("es-CL", {maximumFractionDigits: 1})} <span className="text-sm font-bold">km</span></h3>
                <span className="text-[9px] font-bold text-teal-600 bg-teal-100/70 px-1.5 py-0.5 rounded uppercase mt-2 inline-block">
                  Recorrido Real
                </span>
              </div>
              <div className="bg-teal-600 text-white p-2 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 4: Cancelaciones */}
            <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-100 rounded-2xl p-4 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Cancelaciones</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{metrics.cancellationRate}%</h3>
                <span className="text-[9px] font-bold text-rose-600 bg-rose-100/70 px-1.5 py-0.5 rounded uppercase mt-2 inline-block truncate max-w-[140px]" title={metrics.topReason}>
                  Moda: {metrics.topReason}
                </span>
              </div>
              <div className="bg-rose-600 text-white p-2 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* GRID DE GRÁFICOS */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* GRÁFICO 1: Evolución Temporal */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm xl:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  Evolución Temporal de Traslados (Demanda vs Cierre)
                </h3>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={temporalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCreados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCompletados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                    <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "12px", color: "#f8fafc" }}
                      itemStyle={{ color: "#f8fafc" }}
                      labelStyle={{ fontWeight: "black", textTransform: "uppercase", fontSize: "10px", color: "#38bdf8" }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                    <Area type="monotone" name="Solicitados" dataKey="creados" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCreados)" />
                    <Area type="monotone" name="Completados" dataKey="completados" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompletados)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRÁFICO 2: Distribución por Estado (Donut) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <Clock className="w-4 h-4 text-teal-600" />
                Distribución por Estado Actual
              </h3>
              
              <div className="h-44 w-full relative flex items-center justify-center">
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "12px", color: "#f8fafc" }}
                        itemStyle={{ color: "#f8fafc" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Sin datos en el período</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                {statusChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 truncate">{item.name}</span>
                    <span className="text-slate-400 font-mono ml-auto">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* GRÁFICO 3: Prioridad de Viajes */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <AlertTriangle className="w-4 h-4 text-teal-600" />
                Traslados por Nivel de Prioridad
              </h3>
              
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                    <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "12px", color: "#f8fafc" }}
                      cursor={{ fill: "rgba(148, 163, 184, 0.05)" }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRÁFICO 4: Productividad de Conductores */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <Users className="w-4 h-4 text-teal-600" />
                Productividad: Top 5 Conductores
              </h3>
              
              <div className="h-56 w-full">
                {topDriversData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={topDriversData} 
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={8} fontWeight="bold" width={70} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "12px" }} />
                      <Bar dataKey="viajes" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic text-[10px]">
                    Sin viajes completados en este rango.
                  </div>
                )}
              </div>
            </div>

            {/* GRÁFICO 5: Kilometraje de Vehículos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <Truck className="w-4 h-4 text-teal-600" />
                Flota: Kms Recorridos Top 5 Vehículos
              </h3>
              
              <div className="h-56 w-full">
                {topVehiclesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={topVehiclesData}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                      <YAxis type="category" dataKey="plate" stroke="#94a3b8" fontSize={8} fontWeight="bold" width={70} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "12px" }} />
                      <Bar dataKey="kilometros" fill="#0d9488" radius={[0, 6, 6, 0]} maxBarSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic text-[10px]">
                    Sin kilometraje registrado en este rango.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* TABLA DE TOP DESTINOS Y RESUMEN GENERAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top 5 Destinos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <MapPin className="w-4 h-4 text-teal-600" />
                Destinos con Mayor Tráfico
              </h3>
              
              <div className="space-y-2">
                {topDestinations.map((dest, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100/70 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-black">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-black text-slate-700 uppercase">{dest.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-lg font-mono">
                      {dest.count} viajes
                    </span>
                  </div>
                ))}

                {topDestinations.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">No hay datos de destinos.</p>
                )}
              </div>
            </div>

            {/* Resumen Clínico vs Logístico */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
                  <Navigation className="w-4 h-4 text-teal-600" />
                  Clasificación Operativa del Servicio
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clínicos</span>
                    <h4 className="text-2xl font-black text-indigo-600 mt-1">
                      {filteredTrips.filter(t => t.trip_type === "clinico").length}
                    </h4>
                    <span className="text-[9px] text-slate-500 font-bold block mt-1">Traslado de Pacientes</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logísticos</span>
                    <h4 className="text-2xl font-black text-teal-600 mt-1">
                      {filteredTrips.filter(t => t.trip_type === "no_clinico").length}
                    </h4>
                    <span className="text-[9px] text-slate-500 font-bold block mt-1">Equipos / Insumos / Administrativo</span>
                  </div>
                </div>
              </div>

              <div className="bg-teal-950 text-teal-400 border border-teal-900 rounded-xl p-3 text-[10px] font-medium leading-relaxed mt-4">
                💡 **Consejo de Monitoreo:** Un alto porcentaje de traslados clínicos versus logísticos exige priorizar vehículos acondicionados (Ambulancias) y coordinar adecuadamente los tiempos con las enfermeras de cada unidad.
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
