import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, Truck, MapPin, ArrowRight, CheckCircle, Navigation, Play, FileText, Camera, ShieldAlert } from "lucide-react";
import api from "@/lib/api";

export default function DriverDashboard() {
  const [section, setSection] = useState("pool");
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen">
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

  const fetchPool = useCallback(async () => {
    try { const r = await api.get("/trips/pool"); setTrips(r.data); } 
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPool(); const interval = setInterval(fetchPool, 10000); return () => clearInterval(interval); }, [fetchPool]);

  const handleTakeTrip = async (id) => {
    try { await api.put(`/trips/${id}/assign`); toast.success("¡Viaje tomado!"); fetchPool(); onNavigate("trips"); } 
    catch (e) { toast.error("Error al tomar viaje"); }
  };

  const priorityColors = { urgente: "bg-red-500 text-white shadow-red-200", alta: "bg-orange-400 text-white shadow-orange-200", normal: "bg-slate-200 text-slate-700 shadow-slate-200" };

  if (loading) return <div className="flex justify-center py-12"><Clock className="w-8 h-8 animate-spin text-teal-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Viajes Disponibles</h1>
        <Badge variant="outline" className="text-sm bg-white shadow-sm border-teal-100">{trips.length} en espera</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trips.map(t => (
          <Card key={t.id} className={`shadow-md transition-all hover:shadow-lg border-t-4 ${t.priority === "urgente" ? "border-t-red-500" : t.priority === "alta" ? "border-t-orange-400" : "border-t-teal-500"}`}>
            <CardContent className="p-4 md:p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1.5">
                  <span className="bg-slate-200 text-slate-800 font-mono px-2 py-0.5 rounded-md text-[10px] font-bold self-start">{t.tracking_number || t.id.substring(0,6).toUpperCase()}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider self-start shadow-sm ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{t.scheduled_date}</span>
              </div>
              
              <div className="mb-4">
                <p className="font-black text-lg text-slate-900 leading-tight mb-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{t.trip_type === "clinico" ? "Clínico" : "No Clínico"}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div><p className="text-xs font-bold text-slate-500 uppercase">Origen</p><p className="text-sm font-bold text-slate-900 leading-snug">{t.origin}</p><p className="text-xs text-slate-500">{t.patient_unit || ""}</p></div>
                </div>
                <div className="ml-2 pl-2 border-l-2 border-dashed border-slate-200 py-1"></div>
                <div className="flex items-start gap-2">
                  <Navigation className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div><p className="text-xs font-bold text-slate-500 uppercase">Destino</p><p className="text-sm font-bold text-slate-900 leading-snug">{t.destination}</p></div>
                </div>
              </div>

              {t.trip_type === "clinico" && t.patient_requirements?.length > 0 && (
                <div className="mb-4 bg-amber-50 p-2 rounded-lg border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1 mb-1"><ShieldAlert className="w-3 h-3"/>Req. Paciente</p>
                  <p className="text-xs text-amber-900 font-medium">{t.patient_requirements.join(", ")}</p>
                </div>
              )}

              <Button onClick={() => handleTakeTrip(t.id)} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-sm rounded-xl text-base">
                Tomar Viaje
              </Button>
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <CheckCircle className="w-16 h-16 mb-4 text-slate-200" />
            <p className="text-xl font-bold text-slate-500">No hay viajes pendientes</p>
            <p className="text-sm">Buen trabajo, la bolsa está vacía.</p>
          </div>
        )}
      </div>
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

  const fetchAll = useCallback(async () => {
    try {
      const [t, v] = await Promise.all([api.get("/trips"), api.get("/vehicles")]);
      setTrips(t.data.filter(tr => tr.status !== "cancelado")); 
      setVehicles(v.data.filter(veh => veh.status === "disponible" || veh.status === "en_servicio"));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async () => {
    if (actionType === "start" && !selectedVehicle) { toast.error("Seleccione un vehículo"); return; }
    if (actionType === "start" && !mileage) { toast.error("Ingrese kilometraje inicial"); return; }
    if (actionType === "end" && !mileage) { toast.error("Ingrese kilometraje final"); return; }
    if (actionType === "cancel" && !cancelReason) { toast.error("Debe ingresar un motivo"); return; }
    
    try {
      let payload = {};
      if (actionType === "start") payload = { status: "en_curso", vehicle_id: selectedVehicle, mileage: parseFloat(mileage) };
      if (actionType === "end") payload = { status: "completado", mileage: parseFloat(mileage) };
      if (actionType === "cancel") payload = { status: "cancelado", cancel_reason: cancelReason };
      
      await api.put(`/trips/${actionDialog.id}/status`, payload);
      toast.success(actionType === "start" ? "Viaje iniciado" : actionType === "end" ? "Viaje finalizado" : "Viaje cancelado");
      setActionDialog(null); setSelectedVehicle(""); setMileage(""); setCancelReason(""); fetchAll();
    } catch (e) { toast.error("Error al procesar la acción"); }
  };

  const statusColors = { asignado: "bg-teal-100 text-teal-800 border-teal-200", en_curso: "bg-blue-100 text-blue-800 border-blue-200", completado: "bg-emerald-100 text-emerald-800 border-emerald-200" };

  if (loading) return <div className="flex justify-center py-12"><Clock className="w-8 h-8 animate-spin text-teal-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mis Viajes</h1>
      <div className="space-y-4">
        {trips.map(t => (
          <Card key={t.id} className="shadow-sm border-slate-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 md:p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="bg-slate-200 text-slate-800 font-mono px-2 py-0.5 rounded-md text-[10px] font-bold self-start">{t.tracking_number || t.id.substring(0,6).toUpperCase()}</span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDetailsDialog(t)} className="h-8 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100"><FileText className="w-4 h-4 mr-1.5"/>Ver Detalle</Button>
                </div>
                
                <p className="font-black text-lg text-slate-900 leading-tight mb-4">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3"><MapPin className="w-5 h-5 text-teal-500 shrink-0"/><div><p className="text-[10px] font-bold text-slate-400 uppercase">Origen</p><p className="text-sm font-bold">{t.origin}</p></div></div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3"><Navigation className="w-5 h-5 text-blue-500 shrink-0"/><div><p className="text-[10px] font-bold text-slate-400 uppercase">Destino</p><p className="text-sm font-bold">{t.destination}</p></div></div>
                </div>

                {t.status === "asignado" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button onClick={() => { setActionDialog(t); setActionType("start"); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-bold rounded-xl shadow-sm"><Play className="w-5 h-5 mr-2 fill-current"/> Iniciar Viaje</Button>
                    <Button onClick={() => { setActionDialog(t); setActionType("cancel"); }} variant="outline" className="h-12 text-red-600 border-red-200 hover:bg-red-50 rounded-xl px-4 font-bold">Cancelar</Button>
                  </div>
                )}
                
                {t.status === "en_curso" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button onClick={() => { setActionDialog(t); setActionType("end"); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-bold rounded-xl shadow-sm"><CheckCircle className="w-5 h-5 mr-2"/> Finalizar Viaje</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300"><p className="text-lg font-bold">No tienes viajes asignados</p><p className="text-sm mt-1">Revisa la bolsa de viajes disponibles</p></div>}
      </div>

      {/* Modal de Acción (Iniciar, Finalizar, Cancelar) */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setSelectedVehicle(""); setMileage(""); setCancelReason(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {actionType === "start" ? <><Play className="w-5 h-5 text-blue-600"/> Iniciar Viaje</> : actionType === "end" ? <><CheckCircle className="w-5 h-5 text-emerald-600"/> Finalizar Viaje</> : <><AlertTriangle className="w-5 h-5 text-red-600"/> Cancelar Viaje</>}
            </DialogTitle>
          </DialogHeader>
          {actionDialog && (
            <div className="space-y-5 pt-4">
              {actionType === "start" && (
                <>
                  <div className="space-y-2"><Label className="font-bold text-slate-700">1. Seleccione Vehículo</Label><Select value={selectedVehicle} onValueChange={setSelectedVehicle}><SelectTrigger className="h-12 text-base border-slate-300"><SelectValue placeholder="Seleccione patente" /></SelectTrigger><SelectContent>{vehicles.map(v => (<SelectItem key={v.id} value={v.id} className="py-2.5 font-bold">{v.plate} - {v.brand}</SelectItem>))}</SelectContent></Select></div>
                  <div className="space-y-2"><Label className="font-bold text-slate-700">2. Kilometraje Inicial</Label><Input type="number" placeholder="Ej: 120500" value={mileage} onChange={e => setMileage(e.target.value)} className="h-12 text-lg font-bold text-center border-slate-300" /></div>
                </>
              )}
              {actionType === "end" && (
                <div className="space-y-2"><Label className="font-bold text-slate-700">Kilometraje Final</Label><Input type="number" placeholder="Ej: 120545" value={mileage} onChange={e => setMileage(e.target.value)} className="h-12 text-lg font-bold text-center border-slate-300" /></div>
              )}
              {actionType === "cancel" && (
                <div className="space-y-2"><Label className="font-bold text-red-700">Motivo de Cancelación</Label><textarea className="w-full min-h-[100px] p-3 rounded-lg border border-red-200 text-sm focus:ring-2 focus:ring-red-400 outline-none" placeholder="Indique el motivo por el cual no puede realizar el viaje..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></div>
              )}
              <DialogFooter className="mt-6">
                <Button variant="outline" className="h-12" onClick={() => setActionDialog(null)}>Volver</Button>
                <Button className={`h-12 text-base font-bold text-white shadow-md ${actionType === "start" ? "bg-blue-600 hover:bg-blue-700" : actionType === "end" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`} onClick={handleAction}>Confirmar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalles del Viaje */}
      <Dialog open={!!detailsDialog} onOpenChange={() => setDetailsDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl border-b pb-2 flex items-center justify-between">Detalles del Viaje <span className="bg-slate-800 text-white font-mono px-2 py-1 rounded text-sm">{detailsDialog?.tracking_number}</span></DialogTitle></DialogHeader>
          {detailsDialog && (
            <div className="space-y-4 text-sm pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{detailsDialog.trip_type === "clinico" ? "Paciente" : "Cometido"}</p>
                <p className="font-black text-xl text-slate-900">{detailsDialog.trip_type === "clinico" ? detailsDialog.patient_name : detailsDialog.task_details}</p>
                {detailsDialog.trip_type === "clinico" && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <p><span className="font-bold text-slate-500">RUT:</span> {detailsDialog.rut || "-"}</p>
                    <p><span className="font-bold text-slate-500">Edad:</span> {detailsDialog.age || "-"}</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> Origen</p><p className="font-bold text-slate-900 text-base">{detailsDialog.origin}</p><p className="text-xs text-slate-500 mt-0.5">{detailsDialog.patient_unit||""} {detailsDialog.bed?`(Cama ${detailsDialog.bed})`:""}</p></div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5"/> Destino</p><p className="font-bold text-slate-900 text-base">{detailsDialog.destination}</p></div>
              </div>

              {detailsDialog.trip_type === "clinico" && (
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                  {detailsDialog.required_personnel?.length > 0 && <div className="mb-2"><p className="text-xs text-teal-800 font-bold uppercase tracking-wider">Personal Acompañante</p><p className="font-medium text-teal-900">{detailsDialog.required_personnel.join(", ")}</p></div>}
                  {detailsDialog.patient_requirements?.length > 0 && <div className="mb-2"><p className="text-xs text-teal-800 font-bold uppercase tracking-wider mt-2">Requerimientos (Preparar)</p><p className="font-medium text-teal-900">{detailsDialog.patient_requirements.join(", ")}</p></div>}
                  {detailsDialog.accompaniment && detailsDialog.accompaniment !== "ninguno" && <p className="text-xs font-bold text-teal-800 mt-2">Acompañamiento: {detailsDialog.accompaniment}</p>}
                </div>
              )}

              {detailsDialog.notes && (
                <div className="border-t border-slate-200 pt-4"><p className="text-xs font-bold text-slate-500 mb-2 uppercase">Notas Adicionales</p><p className="bg-amber-50 p-4 rounded-xl text-slate-800 border border-amber-100">{detailsDialog.notes}</p></div>
              )}
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

  if (loading) return <div className="flex justify-center py-12"><Clock className="w-8 h-8 animate-spin text-teal-600"/></div>;
  if (!vehicle) return <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300 max-w-lg mx-auto"><Truck className="w-16 h-16 mx-auto mb-4 text-slate-200" /><p className="text-lg font-bold">No tiene vehículo asignado</p><p className="text-sm mt-1">Contacte al coordinador de turno.</p></div>;

  return (
    <div className="max-w-lg mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mi Vehículo Actual</h1>
      <Card className="shadow-lg border-t-4 border-t-indigo-500">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Patente</p>
              <h2 className="text-4xl font-black text-slate-900 font-mono tracking-tight">{vehicle.plate}</h2>
            </div>
            <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100"><Truck className="w-8 h-8 text-indigo-600" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-lg"><p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Marca / Modelo</p><p className="font-bold text-slate-800">{vehicle.brand} {vehicle.model}</p></div>
            <div className="bg-slate-50 p-3 rounded-lg"><p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Año</p><p className="font-bold text-slate-800">{vehicle.year}</p></div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
            <div><p className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Kilometraje Actual</p><p className="text-2xl font-black text-indigo-900">{(vehicle.mileage || 0).toLocaleString()} <span className="text-sm font-bold text-indigo-700">km</span></p></div>
            <Activity className="w-8 h-8 text-indigo-300"/>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
