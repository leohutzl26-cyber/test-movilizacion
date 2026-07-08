import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, ArrowRight, ClipboardList, Ambulance, RotateCcw, Search, User, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import TripDetailDialog from "./TripDetailDialog";
import {
  sColors,
  pColors,
  statusBorders as statusBorderColors,
  VEHICLE_ICONS,
  formatScheduledDate
} from "@/lib/tripUtils";

export default function AssignSection() {
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [assignDialog, setAssignDialog] = useState(null);
  const [driverSearch, setDriverSearch] = useState("");
  const [detailTrip, setDetailTrip] = useState(null);

  // Estados de ordenamiento multi-criterio
  const [sortPrimary, setSortPrimary] = useState("scheduled_date");
  const [sortPrimaryDir, setSortPrimaryDir] = useState("desc");
  const [sortSecondary, setSortSecondary] = useState("appointment_time");
  const [sortSecondaryDir, setSortSecondaryDir] = useState("asc");

  const fetchAll = useCallback(async () => {
    try {
      const [t, d] = await Promise.all([api.get("/trips/active"), api.get("/drivers")]);
      setTrips(t.data || []);
      setDrivers(d.data || []);
    } catch (e) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAssign = async (tripId, driverId) => {
    try {
      const trip = trips.find(t => t.id === tripId);
      if (trip && trip.status === "completado") {
        toast.error("No se puede asignar un traslado completado");
        return;
      }
      await api.put(`/trips/${tripId}/manager-assign`, { driver_id: driverId });
      toast.success("Viaje asignado exitosamente");
      setAssignDialog(null);
      fetchAll();
    } catch (e) {
      toast.error("Error al asignar");
    }
  };

  const handleUnassign = async (tripId) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip && trip.status === "completado") {
      toast.error("No se puede desasignar un traslado completado");
      return;
    }
    if (!window.confirm("¿Seguro que deseas desasignar el conductor? El viaje volverá a estado pendiente.")) return;
    try {
      await api.put(`/trips/${tripId}/unassign`);
      toast.success("Conductor desasignado");
      fetchAll();
    } catch (e) {
      toast.error("Error al desasignar");
    }
  };

  const filteredTrips = filter === "all" ? trips : trips.filter((t) => t.status === filter);

  const getPriorityWeight = (p) => {
    if (!p) return 0;
    const clean = p.toLowerCase();
    if (clean === "urgente") return 3;
    if (clean === "alta") return 2;
    return 1;
  };

  const compareTripsBy = (a, b, field, direction) => {
    let valA, valB;
    if (field === "priority") {
      valA = getPriorityWeight(a.priority);
      valB = getPriorityWeight(b.priority);
    } else if (field === "appointment_time") {
      const timeA = a.appointment_time || "";
      const timeB = b.appointment_time || "";
      if (timeA === "" && timeB !== "") return 1;
      if (timeA !== "" && timeB === "") return -1;
      if (timeA === "" && timeB === "") return 0;
      valA = timeA;
      valB = timeB;
    } else if (field === "scheduled_date") {
      valA = a.scheduled_date || "";
      valB = b.scheduled_date || "";
    } else if (field === "origin") {
      valA = (a.origin || "").toLowerCase();
      valB = (b.origin || "").toLowerCase();
    } else if (field === "destination") {
      valA = (a.destination || "").toLowerCase();
      valB = (b.destination || "").toLowerCase();
    } else if (field === "tracking_number") {
      valA = a.tracking_number || "";
      valB = b.tracking_number || "";
    } else {
      return 0;
    }

    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  };

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    const primaryRes = compareTripsBy(a, b, sortPrimary, sortPrimaryDir);
    if (primaryRes !== 0) return primaryRes;
    if (sortSecondary && sortSecondary !== "none" && sortSecondary !== sortPrimary) {
      return compareTripsBy(a, b, sortSecondary, sortSecondaryDir);
    }
    return 0;
  });

  const clinicalTrips = sortedTrips.filter((t) => t.trip_type === "clinico");
  const nonClinicalTrips = sortedTrips.filter((t) => t.trip_type !== "clinico");

  if (loading) return <div className="flex justify-center py-20 text-teal-600"><RotateCcw className="w-10 h-10 animate-spin" /></div>;

  const renderTripCard = (t) => (
    <Card key={t.id} className={`card-hover border-l-4 shadow-md bg-white transition-all duration-300 ${t.trip_type === "clinico" ? "border-l-teal-500" : "border-l-indigo-400"}`}>
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 min-w-0" onClick={() => setDetailTrip(t)}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="bg-teal-50 text-teal-700 border border-teal-100/50 font-mono px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">#{t.tracking_number}</span>
            <Badge className={`${sColors[t.status] || "bg-slate-100"} border-none text-[10px] uppercase font-black px-2.5 py-1 rounded-full shadow-sm`}>{(t.status || "").replace(/_/g, " ")}</Badge>
            <Badge className={`${pColors[t.priority] || pColors.normal} border-none text-[10px] uppercase font-black px-2.5 py-1 rounded-full shadow-sm`}>{t.priority}</Badge>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{formatScheduledDate(t.scheduled_date) || "Hoy"}</span>
          </div>
          <h4 className="text-sm font-black text-slate-900 uppercase truncate mb-2">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</h4>
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" /> <span className="truncate">{t.origin}</span></div>
            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">{t.destination}</span></div>
          </div>
        </div>

        <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-[140px]">
          {t.driver_name ? (
            <div className="flex flex-col gap-0.5 w-full bg-teal-50/50 p-2 rounded-xl border border-teal-100 mb-1 text-[10px]">
              <p className="text-[8px] font-black text-teal-800 uppercase tracking-widest leading-none">Asignado:</p>
              <p className="font-black text-teal-900 leading-tight truncate">{t.driver_name}</p>
              <p className="text-[8px] font-bold text-teal-600/70 font-mono uppercase leading-none mt-0.5">{t.vehicle_plate || "Sin Móvil"}</p>
            </div>
          ) : null}
          {["pendiente", "asignado"].includes(t.status) && (
            <Button onClick={() => setAssignDialog(t)} className={`h-9 w-full font-black uppercase text-[9px] shadow-md rounded-xl transition-all active:scale-95 ${t.driver_id ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"}`}>
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />{t.driver_id ? "Reasignar" : "Asignar"}
            </Button>
          )}
          {t.driver_id && t.status === "asignado" && (
            <Button onClick={() => handleUnassign(t.id)} variant="outline" className="h-8 w-full font-black uppercase text-[9px] text-red-600 border-red-100 hover:bg-red-50 rounded-xl transition-all">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Quitar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="animate-slide-up space-y-6">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Asignación de Traslados</h1>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          {[{ v: "all", l: "Todos" }, { v: "pendiente", l: "Pendientes" }, { v: "asignado", l: "Asignados" }, { v: "en_curso", l: "En Curso" }].map((f) => (
            <Button key={f.v} variant={filter === f.v ? "default" : "outline"} size="sm" onClick={() => setFilter(f.v)} className={`${filter === f.v ? "bg-teal-600 hover:bg-teal-700 text-white font-bold" : "font-bold shadow-sm"} h-10 px-6 rounded-xl`}>{f.l}</Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 shadow-sm text-xs font-bold text-slate-600 self-start lg:self-auto">
          <div className="flex items-center gap-1 pl-1 text-[11px] uppercase tracking-wider font-extrabold text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Ordenar por:</span>
          </div>
          
          {/* Criterio Primario */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-xs border border-slate-200/30">
            <Select value={sortPrimary} onValueChange={setSortPrimary}>
              <SelectTrigger className="h-7 border-none bg-transparent shadow-none text-xs font-black text-slate-800 rounded-lg w-[110px] hover:bg-slate-50 focus:ring-0">
                <SelectValue placeholder="Criterio 1" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                <SelectItem value="appointment_time" className="text-xs font-bold">Hora Cita</SelectItem>
                <SelectItem value="priority" className="text-xs font-bold">Prioridad</SelectItem>
                <SelectItem value="scheduled_date" className="text-xs font-bold">Fecha</SelectItem>
                <SelectItem value="origin" className="text-xs font-bold">Origen</SelectItem>
                <SelectItem value="destination" className="text-xs font-bold">Destino</SelectItem>
                <SelectItem value="tracking_number" className="text-xs font-bold">N° Seguimiento</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSortPrimaryDir(p => p === "asc" ? "desc" : "asc")}
              className="h-7 w-7 hover:bg-slate-100 rounded-lg text-slate-600"
              title={sortPrimaryDir === "asc" ? "Ascendente" : "Descendente"}
            >
              <ArrowUpDown className={`w-3 h-3 transition-transform duration-300 ${sortPrimaryDir === "desc" ? "rotate-180 text-teal-600" : "text-indigo-600"}`} />
            </Button>
          </div>

          <div className="text-[10px] font-black uppercase text-slate-400 px-1">y luego</div>

          {/* Criterio Secundario */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-xs border border-slate-200/30">
            <Select value={sortSecondary} onValueChange={setSortSecondary}>
              <SelectTrigger className="h-7 border-none bg-transparent shadow-none text-xs font-black text-slate-800 rounded-lg w-[110px] hover:bg-slate-50 focus:ring-0">
                <SelectValue placeholder="Criterio 2" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                <SelectItem value="none" className="text-xs font-bold text-slate-400 italic">Ninguno</SelectItem>
                <SelectItem value="appointment_time" className="text-xs font-bold">Hora Cita</SelectItem>
                <SelectItem value="priority" className="text-xs font-bold">Prioridad</SelectItem>
                <SelectItem value="scheduled_date" className="text-xs font-bold">Fecha</SelectItem>
                <SelectItem value="origin" className="text-xs font-bold">Origen</SelectItem>
                <SelectItem value="destination" className="text-xs font-bold">Destino</SelectItem>
                <SelectItem value="tracking_number" className="text-xs font-bold">N° Seguimiento</SelectItem>
              </SelectContent>
            </Select>
            {sortSecondary !== "none" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSortSecondaryDir(p => p === "asc" ? "desc" : "asc")}
                className="h-7 w-7 hover:bg-slate-100 rounded-lg text-slate-600"
                title={sortSecondaryDir === "asc" ? "Ascendente" : "Descendente"}
              >
                <ArrowUpDown className={`w-3 h-3 transition-transform duration-300 ${sortSecondaryDir === "desc" ? "rotate-180 text-teal-600" : "text-indigo-600"}`} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Traslados Clínicos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-teal-100 pb-2.5">
            <h2 className="text-sm font-black text-teal-800 flex items-center gap-2 uppercase tracking-widest">
              <Ambulance className="w-5 h-5 text-teal-600" /> Clínicos
            </h2>
            <Badge className="bg-teal-100 text-teal-800 border-none font-black px-3 py-1 rounded-full text-xs shadow-sm">
              {clinicalTrips.length} activos
            </Badge>
          </div>
          <div className="space-y-3">
            {clinicalTrips.map(renderTripCard)}
            {clinicalTrips.length === 0 && (
              <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Sin traslados clínicos activos
              </div>
            )}
          </div>
        </div>

        {/* Columna Traslados No Clínicos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-indigo-100 pb-2.5">
            <h2 className="text-sm font-black text-indigo-900 flex items-center gap-2 uppercase tracking-widest">
              <ClipboardList className="w-5 h-5 text-indigo-600" /> No Clínicos
            </h2>
            <Badge className="bg-indigo-100 text-indigo-800 border-none font-black px-3 py-1 rounded-full text-xs shadow-sm">
              {nonClinicalTrips.length} activos
            </Badge>
          </div>
          <div className="space-y-3">
            {nonClinicalTrips.map(renderTripCard)}
            {nonClinicalTrips.length === 0 && (
              <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Sin traslados no clínicos activos
              </div>
            )}
          </div>
        </div>
      </div>

      <TripDetailDialog trip={detailTrip} open={!!detailTrip} onOpenChange={() => setDetailTrip(null)} onRefresh={fetchAll} />

      <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setDriverSearch(""); } }}>
        <DialogContent className="max-w-3xl bg-slate-50 border-none shadow-2xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Asignación de Conductor</DialogTitle>
          <DialogDescription className="sr-only">Seleccione un conductor para el viaje.</DialogDescription>
          <div className="flex h-[500px]">
            {/* Lateral Izquierdo: Resumen del viaje */}
            <div className="w-1/3 bg-teal-50/70 border-r border-teal-100/50 p-6 text-slate-800 flex flex-col justify-between">
              <div>
                <Badge className="bg-teal-100 text-teal-800 border-none mb-4 uppercase text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-md">Detalle del Traslado</Badge>
                <h3 className="text-xl font-bold leading-tight mb-6 text-slate-900">{assignDialog?.trip_type === "clinico" ? assignDialog?.patient_name : assignDialog?.task_details}</h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-teal-600 shrink-0"></div>
                    <div><p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-1">Origen</p><p className="text-sm font-bold leading-tight text-slate-800">{assignDialog?.origin}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                    <div><p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-1">Destino</p><p className="text-sm font-bold leading-tight text-slate-800">{assignDialog?.destination}</p></div>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-teal-100/60">
                <p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-2 tracking-wider">Hora de Cita</p>
                <p className="text-3xl font-black text-teal-600 font-mono">{assignDialog?.appointment_time || "--:--"}</p>
              </div>
            </div>

            {/* Panel Derecho: Selector de Conductores */}
            <div className="flex-1 bg-white flex flex-col">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                  {assignDialog?.driver_id ? "Reasignar Móvil" : "Asignar Móvil Operativo"}
                </h2>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-slate-400" /></div>
                  <Input
                    placeholder="Buscar por nombre o patente..."
                    className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl text-sm focus:ring-teal-500"
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
                <div className="grid grid-cols-2 gap-3">
                  {drivers.filter((d) =>
                    (d.name || "").toLowerCase().includes(driverSearch.toLowerCase()) ||
                    (d.vehicle_plate && d.vehicle_plate.toLowerCase().includes(driverSearch.toLowerCase()))
                  ).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleAssign(assignDialog.id, d.id)}
                      className="group flex flex-col p-3 bg-white border border-slate-200 rounded-2xl hover:border-teal-500 hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-teal-50 flex items-center justify-center text-slate-400 group-hover:text-teal-600 font-black text-sm transition-colors border border-slate-100 group-hover:border-teal-200">
                          {d.vehicle_type && VEHICLE_ICONS[d.vehicle_type] ? VEHICLE_ICONS[d.vehicle_type] : (d.name || "U").split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-[11px] leading-tight uppercase group-hover:text-teal-700 truncate">{d.name}</p>
                          <Badge className="bg-slate-100 group-hover:bg-teal-100 text-slate-500 group-hover:text-teal-700 border-none font-mono text-[9px] px-1.5 py-0 mt-0.5">
                            {d.vehicle_plate || "S/M"}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Disponible Ahora</span>
                        <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                <Button variant="ghost" onClick={() => setAssignDialog(null)} className="text-xs font-black uppercase text-slate-500">Cerrar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
