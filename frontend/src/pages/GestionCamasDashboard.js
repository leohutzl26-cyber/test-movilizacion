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
import { MapPin, ArrowRight, ShieldAlert, CheckCircle, Activity, CalendarDays, Truck, User, AlertTriangle, RefreshCw } from "lucide-react";
import api from "@/lib/api";

export default function GestionCamasDashboard() {
  const [section, setSection] = useState("assign");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "assign" && <AssignPersonnelSection />}
        {section === "byvehicle" && <ByVehicleSection />}
      </main>
    </div>
  );
}

function AssignPersonnelSection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(null);
  const [clinicalTeam, setClinicalTeam] = useState("");

  const fetchTrips = useCallback(async () => {
    try {
      const [pool, active] = await Promise.all([api.get("/trips/pool"), api.get("/trips/active")]);
      const allTrips = [...pool.data, ...active.data];
      // FILTRO: Solo vemos los traslados clínicos
      setTrips(allTrips.filter(t => t.trip_type === "clinico"));
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

  const pendingTrips = trips.filter(t => !t.clinical_team || t.clinical_team.trim() === "");
  const assignedTrips = trips.filter(t => t.clinical_team && t.clinical_team.trim() !== "");

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600"/></div>;

  const TripCard = ({ t, isPending }) => (
    <Card className={`shadow-sm border-l-4 ${isPending ? "border-l-amber-500" : "border-l-teal-500"}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[11px] font-bold shadow-sm">{t.tracking_number}</span>
          <span className="text-xs font-bold text-slate-500">{t.scheduled_date || new Date(t.created_at).toLocaleDateString()}</span>
        </div>
        <p className="font-black text-xl text-slate-900 mb-1">{t.patient_name}</p>
        <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-wider">Motivo: {t.transfer_reason}</p>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 space-y-2">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-600"/> <span className="text-sm font-bold text-slate-800">{t.origin} <span className="font-medium text-slate-500 text-xs">({t.patient_unit})</span></span></div>
          <div className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-blue-600"/> <span className="text-sm font-bold text-slate-800">{t.destination}</span></div>
        </div>

        {t.required_personnel?.length > 0 && (
          <div className="mb-4 bg-amber-50 p-2.5 rounded-lg border border-amber-200 shadow-sm">
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1 flex items-center"><ShieldAlert className="w-3 h-3 mr-1"/> Roles Requeridos:</p>
            <p className="text-sm font-bold text-amber-900">{t.required_personnel.join(", ")}</p>
          </div>
        )}

        {isPending ? (
          <Button onClick={() => { setAssignDialog(t); setClinicalTeam(""); }} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 text-sm shadow-sm rounded-xl">
            Asignar Nombres del Equipo
          </Button>
        ) : (
          <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 shadow-sm">
            <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest mb-1">Personal Asignado:</p>
            <p className="text-sm font-black text-teal-900">{t.clinical_team}</p>
            <Button variant="ghost" onClick={() => { setAssignDialog(t); setClinicalTeam(t.clinical_team); }} className="w-full mt-3 h-9 text-xs font-bold border border-teal-300 text-teal-700 hover:bg-teal-100">
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
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Gestión de Camas y Pacientes</h1>
        <p className="text-slate-500 font-medium mt-1">Asignación de personal clínico acompañante para traslados en ambulancia.</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-slate-200/60 p-1">
          <TabsTrigger value="pending" className="text-sm font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-white">Falta Asignar ({pendingTrips.length})</TabsTrigger>
          <TabsTrigger value="assigned" className="text-sm font-bold data-[state=active]:bg-teal-600 data-[state=active]:text-white">Ya Asignados ({assignedTrips.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pendingTrips.map(t => <TripCard key={t.id} t={t} isPending={true} />)}
            {pendingTrips.length === 0 && <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200"><CheckCircle className="w-16 h-16 mx-auto mb-4 text-teal-200"/><p className="text-xl font-bold">Excelente, estás al día.</p><p className="text-sm mt-1">Todos los traslados clínicos tienen personal asignado.</p></div>}
          </div>
        </TabsContent>
        
        <TabsContent value="assigned" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assignedTrips.map(t => <TripCard key={t.id} t={t} isPending={false} />)}
            {assignedTrips.length === 0 && <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200"><p className="text-lg font-bold">No hay traslados con personal asignado actualmente.</p></div>}
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
                <p className="text-xl font-black text-slate-900">{assignDialog.patient_name}</p>
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-600">Roles Solicitados:</p>
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">{assignDialog.required_personnel?.join(", ") || "No especificado"}</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-sm">Nombres Completos del Personal Acompañante *</Label>
                <Input placeholder="Ej: Ana María Rojas (Tens), Dr. Juan Pérez..." value={clinicalTeam} onChange={e => setClinicalTeam(e.target.value)} className="h-14 text-base border-slate-300 font-medium shadow-inner"/>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Este dato será visible para el conductor de la ambulancia.</p>
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
      
      // FILTRO CLÍNICO: Gestión de camas solo ve la pizarra con traslados clínicos
      const filteredVehicleData = rData.data.map(item => ({
        ...item,
        trips: item.trips.filter(t => t.trip_type === "clinico")
      }));
      setData(filteredVehicleData);
      
      const filteredPendingTrips = rTrips.data.filter(t => t.trip_type === "clinico");
      setPendingTrips(filteredPendingTrips);
      
      setDrivers(rDrivers.data.filter(d => d.status === "aprobado"));
    } catch {} finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async () => {
    if (!selectedTripId || !selectedDriverId) { toast.error("Seleccione un viaje y un conductor"); return; }
    try {
      await api.put(`/trips/${selectedTripId}`, { scheduled_date: selectedDate });
      await api.put(`/trips/${selectedTripId}/manager-assign`, {
        driver_id: selectedDriverId,
        vehicle_id: assignModal.vehicle_id !== "unassigned" ? assignModal.vehicle_id : null
      });
      toast.success("Viaje clínico programado exitosamente");
      setAssignModal(null); setSelectedTripId(""); setSelectedDriverId("");
      fetchData(); 
    } catch (e) { toast.error("Error al programar el viaje"); }
  };

  const handleDrop = async (vehicleId, dropIndex) => {
    if (!draggedItem || draggedItem.vehicleId !== vehicleId) { setDraggedItem(null); return; }
    const newData = [...data];
    const vehicleIndex = newData.findIndex(v => v.vehicle.id === vehicleId);
    const vehicleTrips = [...newData[vehicleIndex].trips];
    const [movedTrip] = vehicleTrips.splice(draggedItem.tripIndex, 1);
    vehicleTrips.splice(dropIndex, 0, movedTrip);
    newData[vehicleIndex].trips = vehicleTrips;
    setData(newData);
    setDraggedItem(null);
    const newOrderIds = vehicleTrips.map(t => t.id);
    try { await api.put('/trips/reorder', { trip_ids: newOrderIds }); } catch (e) { toast.error("Error al guardar orden."); }
  };
  
  const confirmUnassignAction = async () => {
    if (!tripToUnassign) return;
    try { await api.put(`/trips/${tripToUnassign}/unassign`); toast.success("Viaje clínico devuelto a la bolsa"); fetchData(); } 
    catch (e) { toast.error("Error al desasignar"); } finally { setTripToUnassign(null); }
  };
  
  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800" };
  const vehicleStatusColors = { disponible: "bg-emerald-100 text-emerald-800 border-emerald-200", en_servicio: "bg-blue-100 text-blue-800 border-blue-200", en_limpieza: "bg-violet-100 text-violet-800 border-violet-200", en_taller: "bg-orange-100 text-orange-800 border-orange-200" };

  const totalTrips = data.reduce((acc, d) => acc + d.trips.length, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-slide-up">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pizarra Clínica</h1>
          <p className="text-sm text-slate-500 font-medium">{totalTrips} traslados clínicos asignados para el {selectedDate}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
          <CalendarDays className="w-5 h-5 text-teal-600 ml-1" />
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto h-9 border-0 bg-transparent focus-visible:ring-0 p-0 font-bold text-slate-700" />
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])} className="h-8">Ver Hoy</Button>
        </div>
      </div>

      {loading ? <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><RefreshCw className="w-8 h-8 animate-spin mb-3 text-teal-500"/>Cargando estado de la flota...</div> : (
        <div className="flex-1 flex gap-5 overflow-x-auto pb-4 snap-x custom-scrollbar">
          {data.map(item => (
            <div key={item.vehicle.id} className="min-w-[340px] max-w-[340px] bg-slate-200/50 rounded-2xl p-3 flex flex-col snap-start border border-slate-200 shadow-inner">
              <div className="flex items-center justify-between mb-3 bg-white p-3.5 rounded-xl shadow-sm shrink-0 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-100"><Truck className="w-6 h-6 text-teal-600" /></div>
                  <div><h3 className="font-black text-slate-900 text-lg leading-none">{item.vehicle.plate}</h3>{item.vehicle.brand && <p className="text-xs text-slate-500 font-medium mt-1">{item.vehicle.brand} {item.vehicle.model}</p>}</div>
                </div>
                <div className="text-right flex flex-col items-end">
                  {item.vehicle.status && <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider block mb-1.5 border ${vehicleStatusColors[item.vehicle.status] || "bg-slate-100"}`}>{item.vehicle.status.replace(/_/g, " ")}</span>}
                  <span className="text-[11px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-full">{item.trips.length} viajes clínicos</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {item.trips.map((t, index) => (
                  <div key={t.id} draggable onDragStart={() => setDraggedItem({ vehicleId: item.vehicle.id, tripIndex: index, tripId: t.id })} onDragOver={(e) => { e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); handleDrop(item.vehicle.id, index); }} 
                    className={`p-3.5 bg-white rounded-xl border shadow-sm transition-all cursor-grab active:cursor-grabbing hover:shadow-md
                      ${draggedItem?.tripId === t.id ? 'opacity-50 scale-[0.98] border-dashed border-teal-500 border-2' : 'border-slate-200 hover:border-teal-300'}`}>
                    
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold">{t.tracking_number || t.id.substring(0,6).toUpperCase()}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                      </div>
                      {t.status !== "completado" && t.status !== "pendiente" && (<Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setTripToUnassign(t.id); }} className="h-6 px-2 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200">Retirar</Button>)}
                    </div>
                    
                    <p className="font-bold text-sm text-slate-900 mb-1.5 leading-tight">{t.patient_name}</p>
                    
                    <div className="flex items-center gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                      <p className="text-xs text-slate-600 font-medium truncate">{t.origin} <ArrowRight className="w-3 h-3 inline text-slate-400 mx-0.5" /> {t.destination}</p>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-teal-700 font-bold flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-md"><User className="w-3.5 h-3.5"/> {t.driver_name || "Sin asignar"}</span>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${t.priority === "urgente" ? "bg-red-100 text-red-700" : t.priority === "alta" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>{t.priority}</span>
                    </div>

                    {/* VISTA EXCLUSIVA DEL EQUIPO CLÍNICO EN LA PIZARRA */}
                    {t.clinical_team && (
                      <div className="mt-2 bg-teal-50 p-2 rounded-md border border-teal-100 text-[11px] text-teal-800 font-bold flex flex-col gap-0.5">
                        <span className="uppercase tracking-wider text-[9px] text-teal-600">Personal Acompañante:</span>
                        <span>{t.clinical_team}</span>
                      </div>
                    )}
                  </div>
                ))}
                {item.trips.length === 0 && (<div onDragOver={(e) => e.preventDefault()} className="h-full min-h-[150px] flex flex-col items-center justify-center text-slate-400 py-8 border-2 border-dashed border-slate-300 rounded-xl bg-white/40"><p className="text-sm font-medium">Arrastra un viaje aquí</p></div>)}
              </div>
              
              <Button variant="outline" className="w-full mt-3 bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border-dashed border-2 shrink-0 transition-all text-sm font-bold h-12 shadow-sm" onClick={() => setAssignModal({ vehicle_id: item.vehicle.id, plate: item.vehicle.plate })}>+ Programar Clínico Aquí</Button>
            </div>
          ))}
          {data.length === 0 && <p className="w-full text-center py-12 text-slate-400 text-lg">No hay vehículos registrados en la flota</p>}
        </div>
      )}

      {/* Dialogs Pizarra */}
      <Dialog open={!!assignModal} onOpenChange={() => { setAssignModal(null); setSelectedTripId(""); setSelectedDriverId(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-xl">Programar Viaje Clínico</DialogTitle></DialogHeader>
          {assignModal && (
            <div className="space-y-5 pt-2">
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center justify-between"><span className="text-sm text-teal-800 font-bold">Vehículo seleccionado:</span><Badge className="bg-teal-600 text-sm py-1 px-3 shadow-sm">{assignModal.plate}</Badge></div>
              <div className="space-y-2"><Label className="font-bold text-slate-700">1. Seleccionar Viaje de la Bolsa</Label><Select value={selectedTripId} onValueChange={setSelectedTripId}><SelectTrigger className="h-12 border-slate-300"><SelectValue placeholder="Elija un viaje clínico pendiente" /></SelectTrigger><SelectContent>{pendingTrips.length === 0 ? (<SelectItem value="none" disabled>No hay viajes clínicos pendientes</SelectItem>) : (pendingTrips.map(t => (<SelectItem key={t.id} value={t.id} className="py-2 font-medium"><span className="font-mono text-teal-600 mr-2">[{t.tracking_number || t.id.substring(0,4).toUpperCase()}]</span>{t.patient_name} | {t.origin} → {t.destination}</SelectItem>)))}</SelectContent></Select></div>
              <div className="space-y-2"><Label className="font-bold text-slate-700">2. Asignar Conductor</Label><Select value={selectedDriverId} onValueChange={setSelectedDriverId}><SelectTrigger className="h-12 border-slate-300"><SelectValue placeholder="Elija un conductor" /></SelectTrigger><SelectContent>{drivers.map(d => (<SelectItem key={d.id} value={d.id} className="py-2 font-medium">{d.name} {d.extra_available ? "(Extra)" : ""}</SelectItem>))}</SelectContent></Select></div>
              <DialogFooter className="mt-6"><Button variant="outline" className="h-11" onClick={() => setAssignModal(null)}>Cancelar</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white h-11 font-bold" onClick={handleAssign}>Guardar Programación</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!tripToUnassign} onOpenChange={() => setTripToUnassign(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2 text-xl"><AlertTriangle className="w-6 h-6" /> ¿Desasignar este viaje?</DialogTitle></DialogHeader>
          <p className="text-base text-slate-600 py-2">El traslado clínico será removido de este vehículo y volverá a la bolsa de pendientes. ¿Desea continuar?</p>
          <DialogFooter className="mt-4"><Button variant="outline" className="h-11" onClick={() => setTripToUnassign(null)}>Cancelar</Button><Button className="bg-red-600 hover:bg-red-700 text-white h-11 font-bold" onClick={confirmUnassignAction}>Sí, retirar viaje</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
