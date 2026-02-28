import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, Truck, MapPin, ArrowRight, CheckCircle, Navigation, Play, FileText, ShieldAlert, AlertTriangle, Activity, User } from "lucide-react";
import api from "@/lib/api";

export default function DriverDashboard() {
  const [section, setSection] = useState("pool");
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "pool" && <TripPoolSection onNavigate={setSection} />}
        {section === "trips" && <MyTripsSection />}
        {section === "vehicle" && <MyVehicleSection />}
      </main>
    </div>
  );
}

function TripPoolSection({ onNavigate }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const fetchPool = useCallback(async () => {
    try { const r = await api.get("/trips/pool"); setTrips(r.data); } 
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPool(); const interval = setInterval(fetchPool, 10000); return () => clearInterval(interval); }, [fetchPool]);

  const handleTakeTrip = async (id) => {
    try { await api.put(`/trips/${id}/assign`); toast.success("¡Viaje tomado exitosamente!"); fetchPool(); onNavigate("trips"); } 
    catch (e) { toast.error("Error al tomar el viaje"); }
  };

  const priorityColors = { urgente: "bg-red-500 text-white shadow-red-200", alta: "bg-orange-400 text-white shadow-orange-200", normal: "bg-slate-200 text-slate-700 shadow-slate-200" };
  const sLabels = { pendiente: "Pendiente", asignado: "Asignado", en_curso: "En Curso", completado: "Completado", cancelado: "Cancelado" };
  const sColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

  if (loading) return <div className="flex flex-col items-center justify-center py-20 text-slate-400"><Clock className="w-10 h-10 animate-spin text-teal-600 mb-4"/><p>Buscando viajes disponibles...</p></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bolsa de Viajes</h1>
        <Badge variant="outline" className="text-sm bg-white shadow-sm border-teal-200 text-teal-800 px-3 py-1">{trips.length} en espera</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {trips.map(t => (
          <Card key={t.id} className={`shadow-md transition-all hover:shadow-lg border-t-4 ${t.priority === "urgente" ? "border-t-red-500" : t.priority === "alta" ? "border-t-orange-400" : "border-t-teal-500"}`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <span className="bg-slate-800 text-white font-mono px-3 py-1 rounded-md text-sm font-black self-start shadow-sm tracking-widest">{t.tracking_number || t.id.substring(0,6).toUpperCase()}</span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider self-start shadow-sm ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                </div>
                <span className="text-sm font-bold text-slate-700 bg-slate-200 px-3 py-1.5 rounded-md border border-slate-300 shadow-sm">{t.scheduled_date || new Date(t.created_at).toLocaleDateString()}</span>
              </div>
              
              <div className="mb-4">
                <p className="font-black text-xl text-slate-900 leading-tight mb-2">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-slate-200">{t.trip_type === "clinico" ? "Traslado Clínico" : "Cometido No Clínico"}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origen</p><p className="text-base font-bold text-slate-900 leading-snug">{t.origin}</p><p className="text-xs text-slate-500 font-medium">{t.patient_unit || ""}</p></div>
                </div>
                <div className="ml-2.5 pl-3.5 border-l-2 border-dashed border-slate-300 py-1"></div>
                <div className="flex items-start gap-3">
                  <Navigation className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destino</p><p className="text-base font-bold text-slate-900 leading-snug">{t.destination}</p></div>
                </div>
              </div>

              {t.trip_type === "clinico" && t.patient_requirements?.length > 0 && (
                <div className="mb-4 bg-amber-50 p-3 rounded-lg border border-amber-200 shadow-sm">
                  <p className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1.5 mb-1"><ShieldAlert className="w-4 h-4"/>Requerimientos Especiales</p>
                  <p className="text-xs text-amber-900 font-bold">{t.patient_requirements.join(", ")}</p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setSelectedTrip(t)} className="flex-1 border-teal-200 text-teal-700 hover:bg-teal-50 font-bold h-12 rounded-xl text-xs sm:text-sm">
                  <FileText className="w-5 h-5 mr-1.5"/>Detalles
                </Button>
                <Button onClick={() => handleTakeTrip(t.id)} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-sm rounded-xl text-xs sm:text-sm">
                  <Truck className="w-5 h-5 mr-1.5"/>Tomar Viaje
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
            <CheckCircle className="w-16 h-16 mb-4 text-teal-100" />
            <p className="text-xl font-bold text-slate-500">No hay viajes pendientes</p>
            <p className="text-sm font-medium mt-1">Buen trabajo, la bolsa está vacía.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl text-slate-900 border-b pb-2 flex items-center justify-between">Detalle Completo <Badge className="bg-slate-800 text-white font-mono text-base px-3 py-1 tracking-widest">{selectedTrip?.tracking_number}</Badge></DialogTitle></DialogHeader>
          {selectedTrip && (
            <div className="space-y-5 text-sm pt-2">
              
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                <p className="text-sm text-red-600 font-black mb-1 flex items-center gap-1.5 uppercase tracking-wider"><Clock className="w-5 h-5"/> Horarios de Traslado</p>
                <p className="font-black text-red-900 text-xl md:text-2xl mt-1">Citación: {selectedTrip.appointment_time||"-"} <span className="text-slate-400 mx-2">|</span> Salida: {selectedTrip.departure_time||"-"}</p>
                <p className="text-base font-bold text-red-800 mt-2 bg-red-100 inline-block px-3 py-1 rounded-lg">Fecha: {selectedTrip.scheduled_date}</p>
              </div>

              <div className="flex gap-2 mb-2 mt-4">
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${sColors[selectedTrip.status]}`}>{sLabels[selectedTrip.status]}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">{selectedTrip.trip_type==="clinico"?"Traslado Clínico":"Traslado No Clínico"}</span>
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${selectedTrip.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>{selectedTrip.priority}</span>
              </div>
              
              {selectedTrip.trip_type === "clinico" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="col-span-2 md:col-span-4 border-b border-slate-200 pb-2 mb-2"><p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Paciente</p><p className="font-black text-xl text-slate-900">{selectedTrip.patient_name}</p></div>
                    <div><p className="text-xs text-slate-500 font-bold">RUT</p><p className="font-bold text-base text-slate-800">{selectedTrip.rut || "-"}</p></div>
                    <div><p className="text-xs text-slate-500 font-bold">Edad / Peso</p><p className="font-bold text-base text-slate-800">{selectedTrip.age || "-"} / {selectedTrip.weight || "-"}</p></div>
                    <div className="col-span-2"><p className="text-xs text-slate-500 font-bold">Diagnóstico</p><p className="font-bold text-base text-slate-800">{selectedTrip.diagnosis || "-"}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div><p className="text-xs text-slate-500 font-bold">Motivo Clínico</p><p className="font-medium text-slate-800">{selectedTrip.transfer_reason}</p></div>
                    <div><p className="text-xs text-slate-500 font-bold">Médico Tratante</p><p className="font-medium text-slate-800">{selectedTrip.attending_physician || "-"}</p></div>
                    <div className="col-span-2"><p className="text-xs text-slate-500 font-bold">Solicitante</p><p className="font-medium text-slate-800">{selectedTrip.requester_person}</p></div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 shadow-sm">
                    {selectedTrip.required_personnel?.length > 0 && <div className="mb-3"><p className="text-xs text-teal-800 uppercase tracking-wider font-black mb-1">Personal Requerido</p><p className="text-teal-900 font-bold text-base">{selectedTrip.required_personnel.join(", ")}</p></div>}
                    {selectedTrip.patient_requirements?.length > 0 && <div><p className="text-xs text-teal-800 uppercase tracking-wider font-black mb-1">Requerimientos Paciente</p><p className="text-teal-900 font-bold text-base bg-white inline-block px-3 py-1 rounded-lg border border-teal-100">{selectedTrip.patient_requirements.join(", ")}</p></div>}
                    {selectedTrip.accompaniment && selectedTrip.accompaniment !== "ninguno" && <div className="mt-3 pt-3 border-t border-teal-200"><p className="text-sm text-teal-800 font-bold">Acompañamiento: <span className="text-teal-900 font-black">{selectedTrip.accompaniment}</span></p></div>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="col-span-1 md:col-span-2"><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cometido</p><p className="font-black text-lg text-slate-900">{selectedTrip.task_details}</p></div>
                  <div><p className="text-xs text-slate-500 font-bold">Cantidad de Funcionarios</p><p className="font-medium text-slate-800">{selectedTrip.staff_count}</p></div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest"><MapPin className="w-4 h-4 text-teal-600"/> Origen</p><p className="font-black text-lg text-slate-900">{selectedTrip.origin}</p><p className="text-sm font-medium text-slate-500 mt-1">{selectedTrip.patient_unit||""} {selectedTrip.bed?`(Cama ${selectedTrip.bed})`:""}</p></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest"><Navigation className="w-4 h-4 text-blue-600"/> Destino</p><p className="font-black text-lg text-slate-900">{selectedTrip.destination}</p></div>
              </div>

              {selectedTrip.notes && (<div className="border-t border-slate-200 pt-5"><p className="text-xs text-slate-500 font-bold mb-2 uppercase tracking-widest">Notas Adicionales</p><p className="bg-amber-50 p-4 rounded-xl text-slate-800 font-medium border border-amber-200">{selectedTrip.notes}</p></div>)}

              <Button onClick={() => { handleTakeTrip(selectedTrip.id); setSelectedTrip(null); }} className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold h-14 text-lg rounded-xl shadow-md">
                <Truck className="w-6 h-6 mr-2"/> Tomar este Viaje
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MyTripsSection() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState(null);
  const [actionType, setActionType] = useState(""); 
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [mileage, setMileage] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [detailsDialog, setDetailsDialog] = useState(null);

  // Nuevo estado para la advertencia "Anti-Dedo Gordo" (>700km)
  const [showWarning, setShowWarning] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [t, v] = await Promise.all([api.get("/trips"), api.get("/vehicles")]);
      setTrips(t.data.filter(tr => tr.status !== "cancelado")); 
      setVehicles(v.data.filter(veh => veh.status === "disponible" || veh.status === "en_servicio"));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Autocompletado Mágico de Kilometraje Inicial
  useEffect(() => {
    if (actionType === "start" && selectedVehicle) {
      const veh = vehicles.find(v => v.id === selectedVehicle);
      if (veh) setMileage(veh.mileage.toString());
    }
  }, [selectedVehicle, actionType, vehicles]);

  const handleAction = async () => {
    if (actionType === "start" && !selectedVehicle) { toast.error("Seleccione un vehículo"); return; }
    if (actionType === "start" && !mileage) { toast.error("Ingrese kilometraje inicial"); return; }
    if (actionType === "end" && !mileage) { toast.error("Ingrese kilometraje final"); return; }
    if (actionType === "cancel" && !cancelReason) { toast.error("Debe ingresar un motivo"); return; }
    
    // Alerta Anti-Dedo Gordo (>700km)
    if (actionType === "end" && actionDialog?.start_mileage) {
      const distance = parseFloat(mileage) - actionDialog.start_mileage;
      if (distance > 700 && !showWarning) {
        setShowWarning(true);
        return; // Detiene el guardado y muestra la advertencia
      }
    }

    try {
      let payload = {};
      if (actionType === "start") payload = { status: "en_curso", vehicle_id: selectedVehicle, mileage: parseFloat(mileage) };
      if (actionType === "end") payload = { status: "completado", mileage: parseFloat(mileage) };
      if (actionType === "cancel") payload = { status: "cancelado", cancel_reason: cancelReason };
      
      await api.put(`/trips/${actionDialog.id}/status`, payload);
      toast.success(actionType === "start" ? "Viaje iniciado" : actionType === "end" ? "Viaje finalizado" : "Viaje devuelto");
      setActionDialog(null); setSelectedVehicle(""); setMileage(""); setCancelReason(""); setShowWarning(false); fetchAll();
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Error al procesar la acción"); 
      setShowWarning(false);
    }
  };

  const statusColors = { asignado: "bg-teal-100 text-teal-800 border-teal-200", en_curso: "bg-blue-100 text-blue-800 border-blue-200", completado: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  const sLabels = { asignado: "Asignado", en_curso: "En Curso", completado: "Completado" };
  
  if (loading) return <div className="flex justify-center py-20"><Clock className="w-10 h-10 animate-spin text-teal-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mis Viajes Asignados</h1>
      <div className="space-y-6">
        {trips.map(t => (
          <Card key={t.id} className="shadow-md border-slate-200 overflow-hidden rounded-xl">
            <CardContent className="p-0">
              <div className="p-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-slate-100 pb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-800 text-white font-mono px-3 py-1 rounded-md text-sm font-black shadow-sm tracking-widest">{t.tracking_number || t.id.substring(0,6).toUpperCase()}</span>
                    <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${statusColors[t.status]}`}>{sLabels[t.status] || t.status.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className="text-sm font-bold text-slate-700 bg-slate-200 px-3 py-1.5 rounded-md border border-slate-300 shadow-sm flex-1 text-center md:flex-none">{t.scheduled_date || new Date(t.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" size="sm" onClick={() => setDetailsDialog(t)} className="h-10 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200"><FileText className="w-4 h-4 mr-1.5"/>Info Completa</Button>
                  </div>
                </div>
                
                <p className="font-black text-xl text-slate-900 leading-tight mb-4">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0 border border-teal-100"><MapPin className="w-5 h-5 text-teal-600"/></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origen</p><p className="text-base font-bold text-slate-900 leading-tight">{t.origin}</p></div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100"><Navigation className="w-5 h-5 text-blue-600"/></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destino</p><p className="text-base font-bold text-slate-900 leading-tight">{t.destination}</p></div>
                  </div>
                </div>

                {t.status === "asignado" && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-slate-100">
                    <Button onClick={() => { setActionDialog(t); setActionType("start"); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg font-bold rounded-xl shadow-md transition-transform active:scale-95"><Play className="w-6 h-6 mr-2 fill-current"/> Iniciar Viaje</Button>
                    <Button onClick={() => { setActionDialog(t); setActionType("cancel"); }} variant="outline" className="h-14 text-red-600 border-red-200 hover:bg-red-50 rounded-xl px-6 font-bold sm:w-auto w-full transition-colors">Devolver</Button>
                  </div>
                )}
                
                {t.status === "en_curso" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button onClick={() => { setActionDialog(t); setActionType("end"); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg font-bold rounded-xl shadow-md transition-transform active:scale-95"><CheckCircle className="w-6 h-6 mr-2"/> Finalizar Viaje</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm"><p className="text-xl font-bold text-slate-500">No tienes viajes asignados</p><p className="text-sm font-medium mt-2">Revisa la bolsa de viajes disponibles para tomar uno.</p></div>}
      </div>

      {/* Modal de Acción (Iniciar, Finalizar, Cancelar) */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setSelectedVehicle(""); setMileage(""); setCancelReason(""); setShowWarning(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {actionType === "start" ? <><Play className="w-6 h-6 text-blue-600 fill-current"/> Iniciar Viaje</> : actionType === "end" ? <><CheckCircle className="w-6 h-6 text-emerald-600"/> Finalizar Viaje</> : <><AlertTriangle className="w-6 h-6 text-red-600"/> Devolver Viaje</>}
            </DialogTitle>
          </DialogHeader>
          {actionDialog && (
            <div className="space-y-6 pt-4">
              
              {showWarning && (
                <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded-r-lg">
                  <p className="font-bold text-red-800 text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> ¡Alerta de Distancia!</p>
                  <p className="text-red-700 font-medium text-sm mt-1">El kilometraje ingresado indica que recorrió más de 700km en este viaje. ¿Está seguro de que el kilometraje final ({mileage}) es correcto?</p>
                </div>
              )}

              {actionType === "start" && (
                <>
                  <div className="space-y-2"><Label className="font-bold text-slate-700 text-sm">1. Seleccione Vehículo</Label><Select value={selectedVehicle} onValueChange={setSelectedVehicle}><SelectTrigger className="h-12 text-base border-slate-300 font-medium"><SelectValue placeholder="Seleccione patente" /></SelectTrigger><SelectContent>{vehicles.map(v => (<SelectItem key={v.id} value={v.id} className="py-2.5 font-bold">{v.plate} - {v.brand}</SelectItem>))}</SelectContent></Select></div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 text-sm">2. Kilometraje Inicial</Label>
                    <Input type="number" placeholder="Ej: 120500" value={mileage} onChange={e => setMileage(e.target.value)} className="h-14 text-2xl font-black text-center border-slate-300 shadow-inner text-blue-800" />
                    <p className="text-xs text-slate-500 font-medium mt-1">Sugerido automáticamente de la última lectura.</p>
                  </div>
                </>
              )}

              {actionType === "end" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 mb-2">
                    <span className="text-xs font-bold text-slate-500">KM INICIAL:</span>
                    <span className="font-mono font-bold text-slate-700">{actionDialog.start_mileage} km</span>
                  </div>
                  <Label className="font-bold text-slate-700 text-sm">Kilometraje Final</Label>
                  <Input type="number" placeholder="Ej: 120545" value={mileage} onChange={e => {setMileage(e.target.value); setShowWarning(false);}} className={`h-14 text-2xl font-black text-center border-slate-300 shadow-inner ${showWarning ? 'border-red-400 text-red-700 bg-red-50' : 'text-emerald-800'}`} />
                </div>
              )}

              {actionType === "cancel" && (
                <div className="space-y-2"><Label className="font-bold text-red-700 text-sm">Motivo de la devolución</Label><textarea className="w-full min-h-[100px] p-3 rounded-xl border border-red-200 text-sm font-medium focus:ring-2 focus:ring-red-400 outline-none shadow-sm" placeholder="Indique el motivo por el cual no puede realizar este viaje..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></div>
              )}
              
              <DialogFooter className="mt-6">
                <Button variant="outline" className="h-12 w-full sm:w-auto font-bold" onClick={() => {setActionDialog(null); setShowWarning(false);}}>Volver</Button>
                <Button className={`h-12 w-full sm:w-auto text-base font-bold text-white shadow-md ${showWarning ? "bg-red-600 hover:bg-red-700 animate-pulse" : actionType === "start" ? "bg-blue-600 hover:bg-blue-700" : actionType === "end" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`} onClick={handleAction}>
                  {showWarning ? "SÍ, CONFIRMO EL KILOMETRAJE" : "Confirmar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalles del Viaje Asignado */}
      <Dialog open={!!detailsDialog} onOpenChange={() => setDetailsDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl text-slate-900 border-b pb-2 flex items-center justify-between">Detalle Completo <Badge className="bg-slate-800 text-white font-mono text-base px-3 py-1 tracking-widest">{detailsDialog?.tracking_number}</Badge></DialogTitle></DialogHeader>
          {detailsDialog && (
            <div className="space-y-5 text-sm pt-2">

              <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                <p className="text-sm text-red-600 font-black mb-1 flex items-center gap-1.5 uppercase tracking-wider"><Clock className="w-5 h-5"/> Horarios de Traslado</p>
                <p className="font-black text-red-900 text-xl md:text-2xl mt-1">Citación: {detailsDialog.appointment_time||"-"} <span className="text-slate-400 mx-2">|</span> Salida: {detailsDialog.departure_time||"-"}</p>
                <p className="text-base font-bold text-red-800 mt-2 bg-red-100 inline-block px-3 py-1 rounded-lg">Fecha: {detailsDialog.scheduled_date}</p>
              </div>

              <div className="flex gap-2 mb-2 mt-4">
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${statusColors[detailsDialog.status]}`}>{sLabels[detailsDialog.status] || detailsDialog.status}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">{detailsDialog.trip_type==="clinico"?"Traslado Clínico":"Traslado No Clínico"}</span>
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${detailsDialog.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>{detailsDialog.priority}</span>
              </div>
              
              {detailsDialog.trip_type === "clinico" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="col-span-2 md:col-span-4 border-b border-slate-200 pb-2 mb-2"><p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Paciente</p><p className="font-black text-xl text-slate-900">{detailsDialog.patient_name}</p></div>
                    <div><p className="text-xs text-slate-500 font-bold">RUT</p><p className="font-bold text-base text-slate-800">{detailsDialog.rut || "-"}</p></div>
                    <div><p className="text-xs text-slate-500 font-bold">Edad / Peso</p><p className="font-bold text-base text-slate-800">{detailsDialog.age || "-"} / {detailsDialog.weight || "-"}</p></div>
                    <div className="col-span-2"><p className="text-xs text-slate-500 font-bold">Diagnóstico</p><p className="font-bold text-base text-slate-800">{detailsDialog.diagnosis || "-"}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div><p className="text-xs text-slate-500 font-bold">Motivo Clínico</p><p className="font-medium text-slate-800">{detailsDialog.transfer_reason}</p></div>
                    <div><p className="text-xs text-slate-500 font-bold">Médico Tratante</p><p className="font-medium text-slate-800">{detailsDialog.attending_physician || "-"}</p></div>
                    <div className="col-span-2"><p className="text-xs text-slate-500 font-bold">Solicitante</p><p className="font-medium text-slate-800">{detailsDialog.requester_person}</p></div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 shadow-sm">
                    {detailsDialog.required_personnel?.length > 0 && <div className="mb-3"><p className="text-xs text-teal-800 uppercase tracking-wider font-black mb-1">Personal Requerido</p><p className="text-teal-900 font-bold text-base">{detailsDialog.required_personnel.join(", ")}</p></div>}
                    {detailsDialog.patient_requirements?.length > 0 && <div><p className="text-xs text-teal-800 uppercase tracking-wider font-black mb-1">Requerimientos Paciente</p><p className="text-teal-900 font-bold text-base bg-white inline-block px-3 py-1 rounded-lg border border-teal-100">{detailsDialog.patient_requirements.join(", ")}</p></div>}
                    {detailsDialog.accompaniment && detailsDialog.accompaniment !== "ninguno" && <div className="mt-3 pt-3 border-t border-teal-200"><p className="text-sm text-teal-800 font-bold">Acompañamiento: <span className="text-teal-900 font-black">{detailsDialog.accompaniment}</span></p></div>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="col-span-1 md:col-span-2"><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cometido</p><p className="font-black text-lg text-slate-900">{detailsDialog.task_details}</p></div>
                  <div><p className="text-xs text-slate-500 font-bold">Cantidad de Funcionarios</p><p className="font-medium text-slate-800">{detailsDialog.staff_count}</p></div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest"><MapPin className="w-4 h-4 text-teal-600"/> Origen</p><p className="font-black text-lg text-slate-900">{detailsDialog.origin}</p><p className="text-sm font-medium text-slate-500 mt-1">{detailsDialog.patient_unit||""} {detailsDialog.bed?`(Cama ${detailsDialog.bed})`:""}</p></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest"><Navigation className="w-4 h-4 text-blue-600"/> Destino</p><p className="font-black text-lg text-slate-900">{detailsDialog.destination}</p></div>
              </div>

              {detailsDialog.notes && (<div className="border-t border-slate-200 pt-5"><p className="text-xs text-slate-500 font-bold mb-2 uppercase tracking-widest">Notas Adicionales</p><p className="bg-amber-50 p-4 rounded-xl text-slate-800 font-medium border border-amber-200">{detailsDialog.notes}</p></div>)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MyVehicleSection() {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/vehicles").then(r => {
      const v = r.data.find(veh => veh.status === "en_servicio" || veh.status === "disponible");
      if(v) setVehicle(v);
    }).catch(()=>{}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Clock className="w-10 h-10 animate-spin text-teal-600"/></div>;
  if (!vehicle) return <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 max-w-lg mx-auto shadow-sm"><Truck className="w-16 h-16 mx-auto mb-4 text-slate-300" /><p className="text-xl font-bold text-slate-500">No tiene vehículo asignado</p><p className="text-sm mt-1 font-medium">Contacte al coordinador de turno.</p></div>;

  return (
    <div className="max-w-lg mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mi Vehículo Asignado</h1>
      <Card className="shadow-xl border-t-4 border-t-indigo-500 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 border-b border-slate-100 bg-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Patente</p>
                <h2 className="text-5xl font-black text-slate-900 font-mono tracking-tighter">{vehicle.plate}</h2>
              </div>
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm"><Truck className="w-8 h-8 text-indigo-600" /></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100">
            <div className="bg-white p-5"><p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Marca / Modelo</p><p className="font-black text-slate-800 text-lg">{vehicle.brand} {vehicle.model}</p></div>
            <div className="bg-white p-5"><p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Año</p><p className="font-black text-slate-800 text-lg">{vehicle.year}</p></div>
          </div>
          <div className="bg-indigo-50 p-6 flex justify-between items-center border-t border-indigo-100">
            <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Kilometraje Actual</p><p className="text-3xl font-black text-indigo-900">{(vehicle.mileage || 0).toLocaleString()} <span className="text-base font-bold text-indigo-500">km</span></p></div>
            <Activity className="w-10 h-10 text-indigo-300 opacity-50"/>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
