import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { History, FileDown, Search, User, Filter, Ambulance, CalendarDays, RotateCcw, ArrowUp, ArrowDown, ArrowUpDown, ArrowRight, Siren, Bus, Car, Eye, ClipboardList, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { formatScheduledDate } from "@/lib/tripUtils";
import TripAuditDetailDialog from "./TripAuditDetailDialog";

export default function HistorySection() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [auditOpen, setAuditOpen] = useState(false);
    const [sortField, setSortField] = useState("scheduled_date");
    const [sortDirection, setSortDirection] = useState("desc");
    
    const [filters, setFilters] = useState({
        folio: "",
        patient: "",
        status: "all",
        trip_type: "all",
        start_date: "",
        end_date: ""
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.folio) params.append("folio", filters.folio);
            if (filters.patient) params.append("patient_name", filters.patient);
            if (filters.status !== "all") params.append("status", filters.status);
            if (filters.trip_type !== "all") params.append("trip_type", filters.trip_type);
            if (filters.start_date) params.append("start_date", filters.start_date);
            if (filters.end_date) params.append("end_date", filters.end_date);
            
            params.append("page", currentPage);
            params.append("limit", pageSize);

            const res = await api.get(`/trips/history?${params.toString()}`);
            setTrips(res.data.trips || []);
            setTotalCount(res.data.total || 0);
        } catch (e) { 
            toast.error("Error al cargar historial"); 
        } finally { 
            setLoading(false); 
        }
    }, [filters, currentPage, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const sortedTrips = [...trips].sort((a, b) => {
        let valA, valB;
        if (sortField === "scheduled_date") {
            valA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
            valB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
            return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        if (sortField === "tracking_number") {
            valA = a.tracking_number || "";
            valB = b.tracking_number || "";
        } else if (sortField === "patient_name") {
            valA = (a.trip_type === "clinico" ? a.patient_name : a.task_details) || "";
            valB = (b.trip_type === "clinico" ? b.patient_name : b.task_details) || "";
        } else if (sortField === "origin") {
            valA = a.origin || "";
            valB = b.origin || "";
        } else if (sortField === "driver_name") {
            valA = a.driver_name || "";
            valB = b.driver_name || "";
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
        const toastId = toast.loading("Preparando exportación de todos los registros coincidentes...");
        try {
            const params = new URLSearchParams();
            if (filters.folio) params.append("folio", filters.folio);
            if (filters.patient) params.append("patient_name", filters.patient);
            if (filters.status !== "all") params.append("status", filters.status);
            if (filters.trip_type !== "all") params.append("trip_type", filters.trip_type);
            if (filters.start_date) params.append("start_date", filters.start_date);
            if (filters.end_date) params.append("end_date", filters.end_date);

            const res = await api.get(`/trips/history?${params.toString()}`);
            const allTrips = res.data || [];

            if (allTrips.length === 0) {
                toast.dismiss(toastId);
                toast.error("No hay datos para exportar");
                return;
            }

            // Ordenar todos los datos igual que la tabla
            const sortedAll = [...allTrips].sort((a, b) => {
                let valA, valB;
                if (sortField === "scheduled_date") {
                    valA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
                    valB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
                    return sortDirection === "asc" ? valA - valB : valB - valA;
                }

                if (sortField === "tracking_number") {
                    valA = a.tracking_number || "";
                    valB = b.tracking_number || "";
                } else if (sortField === "patient_name") {
                    valA = (a.trip_type === "clinico" ? a.patient_name : a.task_details) || "";
                    valB = (b.trip_type === "clinico" ? b.patient_name : b.task_details) || "";
                } else if (sortField === "origin") {
                    valA = a.origin || "";
                    valB = b.origin || "";
                } else if (sortField === "driver_name") {
                    valA = a.driver_name || "";
                    valB = b.driver_name || "";
                } else if (sortField === "status") {
                    valA = a.status || "";
                    valB = b.status || "";
                } else {
                    return 0;
                }

                const comp = valA.localeCompare(valB, "es", { sensitivity: "base" });
                return sortDirection === "asc" ? comp : -comp;
            });

            const dataToExport = sortedAll.map(t => ({
                "Folio": t.tracking_number,
                "Tipo": t.trip_type === "clinico" ? "Clínico" : "No Clínico",
                "Paciente/Cometido": t.trip_type === "clinico" ? t.patient_name : t.task_details,
                "RUT": t.rut || "N/A",
                "Origen": t.origin,
                "Destino": t.destination,
                "Servicio Solicitante": t.patient_unit || "N/A",
                "Estado": (t.status || "").replace(/_/g, " ").toUpperCase(),
                "Conductor": t.driver_name || "No asignado",
                "Móvil": t.vehicle_plate || "N/A",
                "Fecha Programada": t.scheduled_date,
                "KM Inicial": t.start_mileage || 0,
                "KM Final": t.end_mileage || 0,
                "Distancia (KM)": (t.end_mileage && t.start_mileage) ? (t.end_mileage - t.start_mileage) : 0,
                "Creado el": new Date(t.created_at).toLocaleString(),
                "Finalizado el": t.completed_at ? new Date(t.completed_at).toLocaleString() : "N/A"
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Historial Traslados");
            XLSX.writeFile(wb, `Historial_Traslados_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.dismiss(toastId);
            toast.success("Excel generado con éxito");
        } catch (error) {
            console.error("Export error", error);
            toast.dismiss(toastId);
            toast.error("Error al exportar a Excel");
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFilters({ folio: "", patient: "", status: "all", trip_type: "all", start_date: "", end_date: "" });
    };

    const sColorsLocal = { 
        pendiente: "bg-amber-100 text-amber-800 border border-amber-200", 
        asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200", 
        en_curso: "bg-cyan-100 text-cyan-800 border border-cyan-200", 
        completado: "bg-emerald-100 text-emerald-800 border border-emerald-200", 
        cancelado: "bg-rose-100 text-rose-800 border border-rose-200", 
        revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200" 
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
        <div className="animate-slide-up space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <History className="w-8 h-8 text-teal-600" />
                        Historial de Traslados
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 ml-11">Consulta y Control Central de Movilizaciones</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 h-12 font-black uppercase tracking-widest shadow-lg flex items-center gap-2 flex-1 md:flex-none">
                        <FileDown className="w-5 h-5" />
                        Descargar .XLSX
                    </Button>
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registros Encontrados</p>
                        <p className="text-lg font-black text-slate-900">{totalCount}</p>
                    </div>
                </div>
            </div>

            {/* Panel de Filtros */}
            <Card className="shadow-sm border-slate-200 bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Search className="w-3 h-3" /> Folio</Label>
                            <Input placeholder="Ej: TR-2603..." className="h-10 text-xs font-bold uppercase rounded-xl border-slate-200" value={filters.folio} onChange={e => setFilters({...filters, folio: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><User className="w-3 h-3" /> Paciente</Label>
                            <Input placeholder="Buscar por nombre..." className="h-10 text-xs font-bold rounded-xl border-slate-200" value={filters.patient} onChange={e => setFilters({...filters, patient: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Filter className="w-3 h-3" /> Estado</Label>
                            <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
                                <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 uppercase"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">TODOS LOS ESTADOS</SelectItem>
                                    <SelectItem value="revision_gestor">POR VISAR</SelectItem>
                                    <SelectItem value="pendiente">PENDIENTE</SelectItem>
                                    <SelectItem value="asignado">ASIGNADO</SelectItem>
                                    <SelectItem value="en_curso">RECORRIENDO</SelectItem>
                                    <SelectItem value="completado">COMPLETADO</SelectItem>
                                    <SelectItem value="cancelado">CANCELADO</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Ambulance className="w-3 h-3" /> Tipo</Label>
                            <Select value={filters.trip_type} onValueChange={v => setFilters({...filters, trip_type: v})}>
                                <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 uppercase"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">TODOS LOS TIPOS</SelectItem>
                                    <SelectItem value="clinico">CLÍNICO</SelectItem>
                                    <SelectItem value="no_clinico">NO CLÍNICO</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Desde</Label>
                            <Input type="date" className="h-10 text-xs font-bold rounded-xl border-slate-200" value={filters.start_date} onChange={e => setFilters({...filters, start_date: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Hasta</Label>
                            <div className="flex gap-2">
                                <Input type="date" className="h-10 text-xs font-bold rounded-xl border-slate-200 flex-1" value={filters.end_date} onChange={e => setFilters({...filters, end_date: e.target.value})} />
                                <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10 text-slate-400 hover:text-rose-500 transition-colors bg-white rounded-xl border border-slate-200 shrink-0"><RotateCcw className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200/60">
                                {renderSortHeader("tracking_number", "Folio", "w-[140px]")}
                                {renderSortHeader("patient_name", "Detalle Solicitud")}
                                {renderSortHeader("origin", "Trayecto Centralizado")}
                                {renderSortHeader("driver_name", "Responsable Operativo")}
                                {renderSortHeader("scheduled_date", "Estado / Fecha")}
                                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <RefreshCw className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-4" />
                                        <p className="text-xs font-black text-teal-800 uppercase tracking-[0.3em]">Actualizando Historial...</p>
                                    </td>
                                </tr>
                            ) : sortedTrips.length > 0 ? (
                                sortedTrips.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/80 transition-all cursor-default group">
                                        <td className="px-6 py-5">
                                            <span className="bg-teal-50 text-teal-700 border border-teal-100/50 font-mono px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all group-hover:bg-white">#{t.tracking_number}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-slate-900 text-sm leading-tight uppercase line-clamp-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                                            <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wide flex items-center gap-1.5">
                                                {t.trip_type === "clinico" ? <Ambulance className="w-3 h-3 text-teal-600" /> : <ClipboardList className="w-3 h-3 text-teal-600" />}
                                                {t.transfer_reason || "Gral."} 
                                                <span className="opacity-40 px-1.5">|</span> 
                                                RUT: {t.rut || "S/R"}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-semibold text-slate-700 flex items-center gap-2 max-w-[200px] truncate"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></div> {t.origin}</p>
                                                <p className="text-xs font-semibold text-slate-400 flex items-center gap-2 max-w-[200px] truncate"><ArrowRight className="w-3 h-3 shrink-0" /> {t.destination}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {t.driver_name ? (
                                                <div className="bg-teal-50/30 p-2 rounded-xl border border-teal-100/50 w-fit min-w-[140px] flex items-center gap-3 group-hover:bg-white transition-colors">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-teal-100 shadow-sm shrink-0 text-teal-600">
                                                        {t.vehicle_type === "Ambulancia" ? <Siren className="w-4 h-4" /> : 
                                                         t.vehicle_type === "Van" ? <Bus className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-xs font-bold text-teal-800 uppercase leading-none mb-1 truncate">{t.driver_name}</p>
                                                        <p className="text-xs text-teal-600/70 font-semibold font-mono uppercase italic leading-none">{t.vehicle_plate || "Sin Móvil"}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-300 italic font-bold">No asignado</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <Badge className={`text-xs font-bold uppercase border-none px-2.5 py-1 rounded-full shadow-sm mb-2 ${sColorsLocal[t.status] || "bg-slate-100 text-slate-600"}`}>{(t.status || "").replace(/_/g, " ")}</Badge>
                                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 leading-none">
                                                <CalendarDays className="w-3.5 h-3.5" />
                                                {t.scheduled_date ? formatScheduledDate(t.scheduled_date) : new Date(t.created_at).toLocaleDateString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="w-10 h-10 rounded-xl border-slate-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-600 transition-all shadow-sm"
                                                    onClick={() => {
                                                        setSelectedTrip(t);
                                                        setAuditOpen(true);
                                                    }}
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-32 text-center bg-slate-50/30">
                                        <ClipboardList className="w-20 h-20 text-slate-200 mx-auto mb-4" />
                                        <p className="text-xl font-black text-slate-300 uppercase tracking-[0.3em]">Bóveda de Datos Vacía</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Intente ajustando los filtros de búsqueda</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TripAuditDetailDialog 
                trip={selectedTrip} 
                open={auditOpen} 
                onOpenChange={setAuditOpen} 
            />

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
        </div>
    );
}
