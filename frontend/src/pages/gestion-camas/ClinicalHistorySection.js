import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Search, Filter, MapPin, ArrowRight, ArrowUp, ArrowDown, ArrowUpDown, User, Map, Ambulance, Truck, Activity, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import { formatScheduledDate, sColors } from "@/lib/tripUtils";

export default function ClinicalHistorySection() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailTrip, setDetailTrip] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState("scheduled_date");
  const [sortDirection, setSortDirection] = useState("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("trip_type", "clinico");
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFrom) params.append("startDate", dateFrom);
      if (dateTo) params.append("endDate", dateTo);
      
      params.append("page", currentPage);
      params.append("limit", pageSize);

      const res = await api.get(`/trips/history?${params.toString()}`);
      setHistory(res.data.trips || []);
      setTotalCount(res.data.total || 0);
    } catch (e) {
      toast.error("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, dateFrom, dateTo, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedHistory = [...history].sort((a, b) => {
    let valA, valB;

    if (sortField === "scheduled_date") {
      valA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
      valB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
      return sortDirection === "asc" ? valA - valB : valB - valA;
    }

    if (sortField === "patient_name") {
      valA = a.patient_name || "";
      valB = b.patient_name || "";
    } else if (sortField === "origin") {
      valA = a.origin || "";
      valB = b.origin || "";
    } else if (sortField === "clinical_team") {
      valA = a.clinical_team || "";
      valB = b.clinical_team || "";
    } else if (sortField === "status") {
      valA = a.status || "";
      valB = b.status || "";
    } else {
      return 0;
    }

    const comp = valA.localeCompare(valB, "es", { sensitivity: "base" });
    return sortDirection === "asc" ? comp : -comp;
  });

  const handleExportExcel = async () => {
    setLoading(true);
    const toastId = toast.loading("Preparando exportación...");
    try {
      const params = new URLSearchParams();
      params.append("trip_type", "clinico");
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFrom) params.append("startDate", dateFrom);
      if (dateTo) params.append("endDate", dateTo);

      const res = await api.get(`/trips/history?${params.toString()}`);
      const allTrips = res.data || [];

      if (allTrips.length === 0) {
        toast.dismiss(toastId);
        toast.error("No hay datos para exportar con estos filtros.");
        return;
      }

      // Ordenar todos los datos igual que la tabla
      const sortedAll = [...allTrips].sort((a, b) => {
        let valA, valB;
        if (sortField === "scheduled_date") {
          valA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
          valB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        if (sortField === "patient_name") {
          valA = a.patient_name || "";
          valB = b.patient_name || "";
        } else if (sortField === "origin") {
          valA = a.origin || "";
          valB = b.origin || "";
        } else if (sortField === "clinical_team") {
          valA = a.clinical_team || "";
          valB = b.clinical_team || "";
        } else if (sortField === "status") {
          valA = a.status || "";
          valB = b.status || "";
        } else {
          return 0;
        }

        const comp = valA.localeCompare(valB, "es", { sensitivity: "base" });
        return sortDirection === "asc" ? comp : -comp;
      });

      const headers = ["Folio", "Fecha Programada", "Paciente", "RUT", "Origen", "Destino", "Motivo", "Personal Acompañante", "Conductor", "Patente Vehiculo", "Estado"];

      const csvRows = sortedAll.map(t => [
        t.tracking_number || "",
        t.scheduled_date || "",
        `"${(t.patient_name || "").replace(/"/g, '""')}"`,
        t.rut || "",
        `"${(t.origin || "").replace(/"/g, '""')}"`,
        `"${(t.destination || "").replace(/"/g, '""')}"`,
        `"${(t.transfer_reason || "").replace(/"/g, '""')}"`,
        `"${(t.clinical_team || "No asignado").replace(/"/g, '""')}"`,
        `"${(t.driver_name || "Sin conductor").replace(/"/g, '""')}"`,
        t.vehicle_plate || "Sin vehículo",
        t.status || ""
      ].join(";"));

      const csvContent = [headers.join(";"), ...csvRows].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Reporte_Traslados_Clinicos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(toastId);
      toast.success("CSV exportado con éxito");
    } catch (e) {
      console.error(e);
      toast.dismiss(toastId);
      toast.error("Error al exportar los datos");
    } finally {
      setLoading(false);
    }
  };

  const renderSortHeader = (field, label, className = "", centered = false) => {
    const isActive = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)} 
        className={`px-6 py-5 text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer select-none hover:bg-slate-200/50 hover:text-slate-900 transition-all duration-200 group ${className} ${centered ? "text-center" : ""}`}
      >
        <div className={`flex items-center gap-1.5 ${centered ? "justify-center" : ""}`}>
          <span className="text-slate-500 group-hover:text-slate-800 transition-colors">{label}</span>
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5 text-teal-600 transition-transform duration-200 shrink-0" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-teal-600 transition-transform duration-200 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-slate-600 transition-all shrink-0" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Histórico de Traslados Clínicos</h1>
          <p className="text-slate-500 font-medium mt-1">Busque pacientes pasados y exporte reportes a Excel.</p>
        </div>
        <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-md flex items-center gap-2">
          <Download className="w-4 h-4" /> Exportar a Excel
        </Button>
      </div>

      <Card className="mb-6 shadow-sm border-slate-200">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Search className="w-3 h-3" /> Buscar Paciente</Label>
            <Input placeholder="Nombre, RUT o Folio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Filter className="w-3 h-3" /> Estado del Traslado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 bg-slate-50"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="revision_gestor">Por Visar</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="asignado">Asignados</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="completado">Completados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Desde</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Hasta</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 bg-slate-50" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400"><RefreshCw className="w-8 h-8 animate-spin mb-4 text-teal-600" />Cargando registros...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-[0.1em] sticky top-0 shadow-sm z-10">
                <tr>
                  {renderSortHeader("scheduled_date", "Folio / Fecha")}
                  {renderSortHeader("patient_name", "Paciente")}
                  {renderSortHeader("origin", "Ruta")}
                  {renderSortHeader("clinical_team", "Equipo Acompañante")}
                  {renderSortHeader("status", "Estado", "", true)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedHistory.map(t => (
                  <tr 
                    key={t.id} 
                    onClick={() => setDetailTrip(t)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="p-4 whitespace-nowrap">
                      <span className="bg-teal-50 text-teal-700 border border-teal-100/50 font-mono px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">#{t.tracking_number}</span>
                      <p className="text-xs text-slate-500 mt-1.5">{formatScheduledDate(t.scheduled_date)}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-sm">{t.patient_name || "Sin nombre"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">RUT: {t.rut || "-"}</p>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-1 mb-1.5"><MapPin className="w-3 h-3 text-teal-500" /> {t.origin}</div>
                      <div className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-slate-400" /> {t.destination}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-100">
                        {t.clinical_team || "No asignado"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={`font-bold uppercase text-xs px-2.5 py-1 rounded-full border-none shadow-sm ${sColors[t.status] || "bg-slate-100 text-slate-600"}`}>{(t.status || "").replace(/_/g, " ")}</Badge>
                    </td>
                  </tr>
                ))}
                {sortedHistory.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium">No se encontraron registros con los filtros actuales.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Controles de Paginación */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 backdrop-blur-sm border border-slate-200/80 p-5 rounded-3xl shadow-sm mt-4">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <span>Mostrar:</span>
            <Select 
              value={String(pageSize)} 
              onValueChange={v => {
                setPageSize(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-20 text-xs font-black rounded-lg border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-slate-400">|</span>
            <span>
              Mostrando {Math.min(totalCount, (currentPage - 1) * pageSize + 1)} - {Math.min(totalCount, currentPage * pageSize)} de {totalCount} registros
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200/60">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Páginas numéricas */}
            {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
              const totalPages = Math.ceil(totalCount / pageSize);
              let pageNum = currentPage;
              if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              if (pageNum < 1 || pageNum > totalPages) return null;

              const isActive = pageNum === currentPage;
              return (
                <Button 
                  key={pageNum}
                  variant={isActive ? "default" : "ghost"}
                  className={`h-8 w-8 text-xs font-black rounded-lg ${
                    isActive 
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-sm" 
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
              disabled={currentPage === Math.ceil(totalCount / pageSize) || Math.ceil(totalCount / pageSize) === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
              disabled={currentPage === Math.ceil(totalCount / pageSize) || Math.ceil(totalCount / pageSize) === 0}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* DIÁLOGO DE DETALLE DEL TRASLADO */}
      <Dialog open={!!detailTrip} onOpenChange={() => setDetailTrip(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0 max-h-[90vh] overflow-y-auto">
          {detailTrip && (
            <>
              <DialogHeader className="p-8 pb-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-100/50 rounded-2xl flex items-center justify-center shadow-sm">
                    <Activity className="w-6 h-6 text-teal-600 animate-pulse" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">Detalle del Traslado</DialogTitle>
                    <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Folio: <span className="text-teal-600 font-mono font-black">#{detailTrip.tracking_number}</span> — Consulta Informativa
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-8 pt-4 space-y-5">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-6 rounded-[2rem] shadow-sm">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Folio de Seguimiento</p>
                    <p className="text-2xl font-mono font-black text-slate-950">#{detailTrip.tracking_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Estado</p>
                    <Badge className={`font-black uppercase text-[10px] border-none tracking-widest px-3 py-1 rounded-full shadow-sm ${sColors[detailTrip.status] || "bg-slate-100 text-slate-600"}`}>
                      {(detailTrip.status || "").replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <User className="w-4 h-4 text-teal-600" /> Información General
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Paciente:</span>
                      <p className="font-black text-slate-900 text-sm">{detailTrip.patient_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Motivo:</span>
                      <p className="font-black text-slate-800">{detailTrip.transfer_reason || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">RUT:</span>
                      <p className="font-black text-slate-800">{detailTrip.rut || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Cama / Unidad:</span>
                      <p className="font-black text-slate-800">{detailTrip.bed || "-"} ({detailTrip.patient_unit || "-"})</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Diagnóstico:</span>
                      <p className="font-black text-slate-800 leading-relaxed">{detailTrip.diagnosis || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <MapPin className="w-4 h-4 text-teal-600" /> Ruta y Tiempos
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Origen:</span>
                      <p className="font-black text-slate-800">{detailTrip.origin}</p>
                      {detailTrip.origin_address && (
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{detailTrip.origin_address}</p>
                      )}
                      {(detailTrip.origin_maps_url || detailTrip.origin) && (
                        <a 
                          href={detailTrip.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailTrip.origin_address || detailTrip.origin)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                        >
                          <Map className="w-3 h-3" /> Ver en Google Maps
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Destino:</span>
                      <p className="font-black text-slate-800">{detailTrip.destination}</p>
                      {detailTrip.destination_address && (
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{detailTrip.destination_address}</p>
                      )}
                      {(detailTrip.destination_maps_url || detailTrip.destination) && (
                        <a 
                          href={detailTrip.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailTrip.destination_address || detailTrip.destination)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        >
                          <Map className="w-3 h-3" /> Ver en Google Maps
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Fecha Programada:</span>
                      <p className="font-black text-slate-800">{formatScheduledDate(detailTrip.scheduled_date)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Citación:</span>
                      <p className="font-black text-slate-800">{detailTrip.appointment_time || "--:--"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Salida:</span>
                      <p className="font-black text-slate-800">{detailTrip.departure_time || "--:--"}</p>
                    </div>
                  </div>
                </div>

                {detailTrip.clinical_team && (
                  <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 space-y-2">
                    <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest leading-none">Equipo Clínico Asignado</p>
                    <p className="text-xs font-black text-teal-900">{detailTrip.clinical_team}</p>
                  </div>
                )}

                {detailTrip.notes && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Notas del Traslado</p>
                    <p className="text-xs font-bold text-slate-800 whitespace-pre-line">{detailTrip.notes}</p>
                  </div>
                )}

                {detailTrip.driver_notes && (
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-1">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none">Observaciones del Conductor</p>
                    <p className="text-xs font-bold text-amber-900 whitespace-pre-line">{detailTrip.driver_notes}</p>
                  </div>
                )}

                {detailTrip.cancel_reason && (
                  <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 space-y-1">
                    <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest leading-none">Motivo de Cancelación / Rechazo</p>
                    <p className="text-xs font-bold text-rose-900 whitespace-pre-line">{detailTrip.cancel_reason}</p>
                  </div>
                )}

                {/* EVOLUCIÓN CRONOLÓGICA DEL TRASLADO */}
                <TripEvolutionLog tripId={detailTrip.id} />

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setDetailTrip(null)} className="bg-teal-600 text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest shadow-md hover:bg-teal-700 transition-all">Volver</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
