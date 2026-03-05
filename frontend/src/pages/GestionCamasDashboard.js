import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MapPin, ArrowRight, ShieldAlert, CheckCircle, Activity, CalendarDays, Truck, User, AlertTriangle, RefreshCw, Home, BedDouble, Clock, Search, Download, Filter } from "lucide-react";
import api from "@/lib/api";

export default function GestionCamasDashboard() {
  const [section, setSection] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "dashboard" && <ClinicalOverviewSection onNavigate={setSection} />}
        {section === "assign" && <AssignPersonnelSection />}
        {section === "byvehicle" && <ByVehicleSection />}
        {section === "calendar" && <ClinicalCalendarSection />}
        {section === "history" && <ClinicalHistorySection />}
      </main>
    </div>
  );
}

// ==========================================
// SECCIÓN 1: TORRE DE CONTROL (RESUMEN)
// ==========================================
function ClinicalOverviewSection({ onNavigate }) {
  const [stats, setStats] = useState({ pendingDriver: 0, pendingStaff: 0, activeTrips: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [pool, active] = await Promise.all([api.get("/trips/pool"), api.get("/trips/active")]);
      const uniqueMap = new Map();
      pool.data.forEach(t => uniqueMap.set(t.id, t));
      active.data.forEach(t => uniqueMap.set(t.id, t));
      const allClinicos = Array.from(uniqueMap.values()).filter(t => t.trip_type === "clinico");

      const pendingDriver = allClinicos.filter(t => t.status === "pendiente").length;
      const pendingStaff = allClinicos.filter(t => !t.clinical_team || String(t.clinical_team).trim() === "").length;
      const activeTrips = allClinicos.filter(t => t.status === "en_curso" || t.status === "asignado").length;

      setStats({ pendingDriver, pendingStaff, activeTrips });
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); const interval = setInterval(fetchStats, 10000); return () => clearInterval(interval); }, [fetchStats]);

  return (
    <div className="animate-slide-up max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Resumen de Gestión de Camas</h1>
        <p className="text-slate-500 font-medium mt-1">Monitoreo en tiempo real de traslados de pacientes.</p>
      </div>

      {loading ? <div className="flex justify-center py-20"><RefreshCw className="w-10 h-10 animate-spin text-teal-600"/></div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className={`shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-all ${stats.pendingStaff > 0 ? "border-l-red-500 bg-red-50/30" : "border-l-emerald-500"}`} onClick={() => onNavigate("assign")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  {stats.pendingStaff > 0 ? <AlertTriangle className="w-3 h-3 text-red-500"/> : <CheckCircle className="w-3 h-3 text-emerald-500"/>} Pendiente Personal Apoyo
                </p>
                <p className={`text-5xl font-black ${stats.pendingStaff > 0 ? "text-red-600" : "text-emerald-600"}`}>{stats.pendingStaff}</p>
                <p className="text-xs font-medium text-slate-400 mt-2 hover:text-red-700">Ir a asignar →</p>
              </div>
              <BedDouble className={`w-14 h-14 ${stats.pendingStaff > 0 ? "text-red-200" : "text-emerald-100"}`} />
            </CardContent>
          </Card>

          <Card className={`shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-all ${stats.pendingDriver > 0 ? "border-l-amber-500 bg-amber-50/30" : "border-l-emerald-500"}`} onClick={() => onNavigate("byvehicle")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  {stats.pendingDriver > 0 ? <Clock className="w-3 h-3 text-amber-500"/> : <CheckCircle className="w-3 h-3 text-emerald-500"/>} Pendiente Vehículo
                </p>
                <p className={`text-5xl font-black ${stats.pendingDriver > 0 ? "text-amber-600" : "text-emerald-600"}`}>{stats.pendingDriver}</p>
                <p className="text-xs font-medium text-slate-400 mt-2 hover:text-amber-700">Ir a pizarra →</p>
              </div>
              <Truck className={`w-14 h-14 ${stats.pendingDriver > 0 ? "text-amber-200" : "text-emerald-100"}`} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate("byvehicle")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Traslados Activos</p>
                <p className="text-5xl font-black text-blue-600">{stats.activeTrips}</p>
                <p className="text-xs font-medium text-slate-400 mt-2 hover:text-blue-700">Ver en pizarra →</p>
              </div>
              <Activity className="w-14 h-14 text-blue-200" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SECCIÓN 2: ASIGNACIÓN DE PERSONAL
// ==========================================
function AssignPersonnelSection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(null);
  const [clinicalTeam, setClinicalTeam] = useState("");

  const fetchTrips = useCallback(async () => {
    try {
      const [pool, active] = await Promise.all([api.get("/trips/pool"), api.get("/trips/active")]);
      const uniqueMap = new Map();
      pool.data.forEach(t => uniqueMap.set(t.id, t));
      active.data.forEach(t => uniqueMap.set(t.id, t));
      setTrips(Array.from(uniqueMap.values()).filter(t => t.trip_type === "clinico"));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTrips(); const interval = setInterval(fetchTrips, 15000); return () => clearInterval(interval); }, [fetchTrips]);

  const handleAssign = async () => {
    if (!clinicalTeam.trim()) { toast.error("Debe ingresar el nombre del personal"); return; }
    try {
      await api.put(`/trips/${assignDialog.id}/clinical-team`, { clinical_team: clinicalTeam });
      toast.success("Personal clínico asignado correctamente");
      setAssignDialog(null); setClinicalTeam(""); fetchTrips();
    } catch (e) { toast.error("Error al asignar personal"); }
  };

  const pendingTrips = trips.filter(t => !t.clinical_team || String(t.clinical_team).trim() === "");
  const assignedTrips = trips.filter(t => t.clinical_team && String(t.clinical_team).trim() !== "");

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600"/></div>;

  const TripCard = ({ t, isPending }) => (
    <Card className={`shadow-sm border-l-4 ${isPending ? "border-l-red-500" : "border-l-teal-500"}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[11px] font-bold shadow-sm">{t.tracking_number || t.id?.substring(0,6)?.toUpperCase()}</span>
          <span className="text-xs font-bold text-slate-500">{t.scheduled_date || new Date(t.created_at || Date.now()).toLocaleDateString()}</span>
        </div>
        <p className="font-black text-xl text-slate-900 mb-1">{t.patient_name || "Paciente no especificado"}</p>
        <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-wider">Motivo: {t.transfer_reason || "Sin especificar"}</p>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 space-y-2">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-600"/> <span className="text-sm font-bold text-slate-800">{t.origin || "-"} <span className="font-medium text-slate-500 text-xs">({t.patient_unit || ""})</span></span></div>
          <div className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-blue-600"/> <span className="text-sm font-bold text-slate-800">{t.destination || "-"}</span></div>
        </div>

        {t.required_personnel?.length > 0 && (
          <div className="mb-4 bg-amber-50 p-2.5 rounded-lg border border-amber-200 shadow-sm">
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1 flex items-center"><ShieldAlert className="w-3 h-3 mr-1"/> Roles Requeridos:</p>
            <p className="text-sm font-bold text-amber-900">{t.required_personnel.join(", ")}</p>
          </div>
        )}

        {isPending ? (
          <Button onClick={() => { setAssignDialog(t); setClinicalTeam(t.clinical_team || ""); }} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold h-12 text-sm shadow-sm rounded-xl">
            Asignar Nombres del Equipo
          </Button>
        ) : (
          <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 shadow-sm">
            <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest mb-1">Personal Asignado:</p>
            <p className="text-sm font-black text-teal-900">{t.clinical_team}</p>
            <Button variant="ghost" onClick={() => { setAssignDialog(t); setClinicalTeam(t.clinical_team || ""); }} className="w-full mt-3 h-9 text-xs font-bold border border-teal-300 text-teal-700 hover:bg-teal-100">
              Editar Nombres
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Listado de Asignaciones Clínicas</h1>
      </div>
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-slate-200/60 p-1">
          <TabsTrigger value="pending" className="text-sm font-bold data-[state=active]:bg-red-500 data-[state=active]:text-white">Falta Asignar ({pendingTrips.length})</TabsTrigger>
          <TabsTrigger value="assigned" className="text-sm font-bold data-[state=active]:bg-teal-600 data-[state=active]:text-white">Ya Asignados ({assignedTrips.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pendingTrips.map(t => <TripCard key={t.id} t={t} isPending={true} />)}
            {pendingTrips.length === 0 && <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200"><p className="text-xl font-bold">Excelente, estás al día.</p></div>}
          </div>
        </TabsContent>
        <TabsContent value="assigned" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assignedTrips.map(t => <TripCard key={t.id} t={t} isPending={false} />)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-black">Asignar Personal Clínico</DialogTitle></DialogHeader>
          {assignDialog && (
            <div className="space-y-6 pt-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Paciente a Trasladar</p>
                <p className="text-xl font-black text-slate-900">{assignDialog.patient_name || "No especificado"}</p>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-sm">Nombres Completos del Personal Acompañante *</Label>
                <Input placeholder="Ej: Ana María Rojas (Tens)" value={clinicalTeam} onChange={e => setClinicalTeam(e.target.value)} className="h-14 text-base border-slate-300 shadow-inner"/>
              </div>
              <DialogFooter className="mt-8">
                <Button variant="outline" className="h-12 font-bold" onClick={() => setAssignDialog(null)}>Cancelar</Button>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-md" onClick={handleAssign}>Guardar Nombres</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// SECCIÓN 3: PIZARRA CLÍNICA
// ==========================================
function ByVehicleSection() {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  const [assignModal, setAssignModal] = useState(null);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  
  const [draggedItem, setDraggedItem] = useState(null);
  const [tripToUnassign, setTripToUnassign] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rData, rTrips, rDrivers] = await Promise.all([
        api.get(`/trips/by-vehicle?date=${selectedDate}`),
        api.get("/trips/pool"), 
        api.get("/drivers")
      ]);
      const filteredVehicleData = rData.data.map(item => ({ ...item, trips: item.trips.filter(t => t.trip_type === "clinico") }));
      setData(filteredVehicleData);
      setPendingTrips(rTrips.data.filter(t => t.trip_type === "clinico"));
      setDrivers(rDrivers.data.filter(d => d.status === "aprobado"));
    } catch {} finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async () => {
    if (!selectedTripId || !selectedDriverId) { toast.error("Seleccione un viaje y un conductor"); return; }
    try {
      await api.put(`/trips/${selectedTripId}`, { scheduled_date: selectedDate });
      await api.put(`/trips/${selectedTripId}/manager-assign`, { driver_id: selectedDriverId, vehicle_id: assignModal.vehicle_id !== "unassigned" ? assignModal.vehicle_id : null });
      toast.success("Programado exitosamente"); setAssignModal(null); setSelectedTripId(""); setSelectedDriverId(""); fetchData(); 
    } catch (e) {}
  };

  const handleDrop = async (vehicleId, dropIndex) => {
    if (!draggedItem || draggedItem.vehicleId !== vehicleId) { setDraggedItem(null); return; }
    const newData = [...data];
    const vehicleIndex = newData.findIndex(v => v.vehicle.id === vehicleId);
    const vehicleTrips = [...newData[vehicleIndex].trips];
    const [movedTrip] = vehicleTrips.splice(draggedItem.tripIndex, 1);
    vehicleTrips.splice(dropIndex, 0, movedTrip);
    newData[vehicleIndex].trips = vehicleTrips;
    setData(newData); setDraggedItem(null);
    try { await api.put('/trips/reorder', { trip_ids: vehicleTrips.map(t => t.id) }); } catch (e) {}
  };
  
  const confirmUnassignAction = async () => {
    if (!tripToUnassign) return;
    try { await api.put(`/trips/${tripToUnassign}/unassign`); fetchData(); } 
    catch (e) {} finally { setTripToUnassign(null); }
  };
  
  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800" };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-slide-up">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 shrink-0">
        <div><h1 className="text-2xl font-bold text-slate-900">Pizarra Clínica</h1></div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
          <CalendarDays className="w-5 h-5 text-teal-600 ml-1" />
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto h-9 border-0 bg-transparent focus-visible:ring-0 p-0 font-bold text-slate-700" />
        </div>
      </div>

      {loading ? <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><RefreshCw className="w-8 h-8 animate-spin mb-3 text-teal-500"/></div> : (
        <div className="flex-1 flex gap-5 overflow-x-auto pb-4 snap-x custom-scrollbar">
          {data.map(item => (
            <div key={item.vehicle.id} className="min-w-[340px] max-w-[340px] bg-slate-200/50 rounded-2xl p-3 flex flex-col snap-start border border-slate-200 shadow-inner">
              <div className="flex items-center justify-between mb-3 bg-white p-3.5 rounded-xl shadow-sm shrink-0 border border-slate-100">
                <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-100"><Truck className="w-6 h-6 text-teal-600" /></div><div><h3 className="font-black text-slate-900 text-lg leading-none">{item.vehicle.plate}</h3></div></div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {item.trips.map((t, index) => (
                  <div key={t.id} draggable onDragStart={() => setDraggedItem({ vehicleId: item.vehicle.id, tripIndex: index, tripId: t.id })} onDragOver={(e) => { e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); handleDrop(item.vehicle.id, index); }} 
                    className={`p-3.5 bg-white rounded-xl border shadow-sm transition-all cursor-grab active:cursor-grabbing hover:shadow-md ${draggedItem?.tripId === t.id ? 'opacity-50 scale-[0.98] border-dashed border-teal-500 border-2' : 'border-slate-200 hover:border-teal-300'}`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold">{t.tracking_number || t.id?.substring(0,6)?.toUpperCase()}</span>
                      {t.status !== "completado" && t.status !== "pendiente" && (<Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setTripToUnassign(t.id); }} className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-50">Retirar</Button>)}
                    </div>
                    <p className="font-bold text-sm text-slate-900 mb-1.5 leading-tight">{t.patient_name || "Sin Nombre"}</p>
                    <div className="flex items-center gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" /><p className="text-xs text-slate-600 font-medium truncate">{t.origin || "-"} <ArrowRight className="w-3 h-3 inline text-slate-400 mx-0.5" /> {t.destination || "-"}</p>
                    </div>
                    {t.clinical_team && (<div className="mt-2 bg-teal-50 p-2 rounded-md border border-teal-100 text-[11px] text-teal-800 font-bold flex flex-col gap-0.5"><span className="uppercase tracking-wider text-[9px] text-teal-600">Personal:</span><span>{t.clinical_team}</span></div>)}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-3 bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border-dashed border-2 shrink-0 transition-all text-sm font-bold h-12 shadow-sm" onClick={() => setAssignModal({ vehicle_id: item.vehicle.id, plate: item.vehicle.plate })}>+ Programar Clínico Aquí</Button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!tripToUnassign} onOpenChange={() => setTripToUnassign(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle className="text-red-600 text-xl">¿Desasignar?</DialogTitle></DialogHeader><DialogFooter><Button onClick={confirmUnassignAction} className="bg-red-600 text-white">Sí, retirar</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// SECCIÓN 4: CALENDARIO CLÍNICO
// ==========================================
function ClinicalCalendarSection() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/trips/calendar?start_date=${selectedDate}&end_date=${selectedDate}`);
      setTrips(res.data.filter(t => t.trip_type === "clinico"));
    } catch(e) {} finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

  return (
    <div className="max-w-5xl mx-auto animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Agenda Diaria de Traslados</h1>
          <p className="text-slate-500 font-medium mt-1">Busque una fecha para revisar los pacientes programados.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
          <CalendarDays className="w-5 h-5 text-teal-600 ml-1" />
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto h-9 border-0 bg-transparent focus-visible:ring-0 p-0 font-bold text-slate-700" />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><RefreshCw className="w-10 h-10 animate-spin text-teal-600"/></div> : (
        <div className="space-y-4">
          {trips.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-slate-500">No hay traslados clínicos para este día</p>
            </div>
          ) : (
            trips.map(t => (
              <Card key={t.id} className="shadow-sm border-l-4 border-l-teal-500">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-100 p-3 rounded-xl text-center min-w-[80px]">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Hora Cita</p>
                      <p className="text-lg font-black text-slate-900">{t.appointment_time || "--:--"}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">{t.tracking_number || t.id.substring(0,6).toUpperCase()}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusColors[t.status] || "bg-slate-100"}`}>{(t.status || "").replace(/_/g, " ")}</span>
                      </div>
                      <p className="font-bold text-lg text-slate-900">{t.patient_name || "Paciente no especificado"}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 font-medium"><MapPin className="w-4 h-4 text-teal-500" /> {t.origin || "-"} <ArrowRight className="w-3 h-3 text-slate-400" /> {t.destination || "-"}</div>
                    </div>
                  </div>
                  <div className="text-left md:text-right bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Personal Acompañante</p>
                    <p className="text-sm font-black text-teal-800">{t.clinical_team || "Falta asignar personal"}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// SECCIÓN 5: HISTÓRICO Y REPORTES EXCEL (NUEVO)
// ==========================================
function ClinicalHistorySection() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/trips/history");
      setHistory(res.data.filter(t => t.trip_type === "clinico"));
    } catch (e) {
      toast.error("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filteredHistory = history.filter(t => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (t.patient_name || "").toLowerCase().includes(term) ||
      (t.tracking_number || "").toLowerCase().includes(term) ||
      (t.origin || "").toLowerCase().includes(term) ||
      (t.destination || "").toLowerCase().includes(term);
    
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    
    const tripDate = new Date(t.scheduled_date || t.created_at);
    const matchesDateFrom = dateFrom ? tripDate >= new Date(dateFrom) : true;
    const matchesDateTo = dateTo ? tripDate <= new Date(dateTo + "T23:59:59") : true;

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const handleExportExcel = () => {
    if (filteredHistory.length === 0) {
      toast.error("No hay datos para exportar con estos filtros.");
      return;
    }

    const headers = ["Folio", "Fecha Programada", "Paciente", "RUT", "Origen", "Destino", "Motivo", "Personal Acompañante", "Conductor", "Patente Vehiculo", "Estado"];
    
    const csvRows = filteredHistory.map(t => [
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
    ].join(";")); // Usamos punto y coma para que Excel en español lo separe bien por columnas

    const csvContent = [headers.join(";"), ...csvRows].join("\n");
    // Añadimos BOM (\uFEFF) para que Excel lea perfectamente los tildes y acentos (UTF-8)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Traslados_Clinicos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

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
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Search className="w-3 h-3"/> Buscar Paciente</Label>
            <Input placeholder="Nombre, RUT o Folio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Filter className="w-3 h-3"/> Estado del Traslado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 bg-slate-50"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
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
            <div className="flex flex-col items-center justify-center py-20 text-slate-400"><RefreshCw className="w-8 h-8 animate-spin mb-4 text-teal-600"/>Cargando registros...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-4 whitespace-nowrap">Folio / Fecha</th>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Ruta</th>
                  <th className="p-4">Equipo Acompañante</th>
                  <th className="p-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-mono text-slate-700 font-bold text-xs bg-slate-200 px-1.5 py-0.5 rounded">{t.tracking_number}</span>
                      <p className="text-xs text-slate-500 mt-1">{t.scheduled_date}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{t.patient_name || "Sin nombre"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">RUT: {t.rut || "-"}</p>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-1 mb-1"><MapPin className="w-3 h-3 text-teal-500"/> {t.origin}</div>
                      <div className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-slate-400"/> {t.destination}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">
                        {t.clinical_team || "No asignado"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={`${statusColors[t.status]} text-[10px] uppercase font-bold tracking-wider`}>{(t.status || "").replace(/_/g, " ")}</Badge>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium">No se encontraron registros con los filtros actuales.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-4 text-right">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full">
          Mostrando {filteredHistory.length} registros
        </span>
      </div>
    </div>
  );
}
