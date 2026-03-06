import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, Truck, MapPin, ArrowRight, CheckCircle, Navigation, Play, FileText, AlertTriangle, Activity } from "lucide-react";
import api from "@/lib/api";

export default function DriverDashboard() {
  const [section, setSection] = useState("pool");
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "pool" && <TripPoolSection onNavigate={setSection} />}
        {section === "trips" && <MyTripsSection />}
      </main>
    </div>
  );
}

function TripPoolSection({ onNavigate }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPool = useCallback(async () => {
    try { const r = await api.get("/trips/pool"); setTrips(r.data); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPool(); const interval = setInterval(fetchPool, 10000); return () => clearInterval(interval); }, [fetchPool]);

  const handleTakeTrip = async (id) => {
    try { await api.put(`/trips/${id}/assign`); toast.success("¡Viaje tomado!"); fetchPool(); onNavigate("trips"); } 
    catch (e) { toast.error("Error al tomar el viaje"); }
  };

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bolsa de Viajes Despachados</h1>
        <Badge variant="outline" className="bg-white text-teal-800 px-3 py-1">{trips.length} en espera</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {trips.map(t => (
          <Card key={t.id} className="shadow-md border-t-4 border-t-teal-500">
            <CardContent className="p-5">
              <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">{t.tracking_number}</span>
              <p className="font-black text-xl text-slate-900 mt-2 mb-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 p-2 rounded-lg mt-3 mb-4">
                <MapPin className="w-4 h-4 text-teal-600"/> {t.origin} <ArrowRight className="w-3 h-3"/> {t.destination}
              </div>
              <Button onClick={() => handleTakeTrip(t.id)} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-sm rounded-xl">Tomar este Viaje</Button>
            </CardContent>
          </Card>
        ))}
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

  const fetchAll = useCallback(async () => {
    try {
      const [t, v] = await Promise.all([api.get("/trips"), api.get("/vehicles")]);
      setTrips(t.data.filter(tr => tr.status === "asignado" || tr.status === "en_curso")); 
      setVehicles(v.data.filter(veh => veh.status === "disponible" || veh.status === "en_servicio"));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openActionDialog = (trip, type) => {
    setActionDialog(trip); setActionType(type);
    if (type === "start") {
      const vehId = trip.vehicle_id || "";
      setSelectedVehicle(vehId);
      if (vehId) { const veh = vehicles.find(v => v.id === vehId); setMileage(veh ? veh.mileage.toString() : ""); } 
      else { setMileage(""); }
    } else { setMileage(""); }
  };

  const handleAction = async () => {
    if (actionType === "start" && (!selectedVehicle || !mileage)) { toast.error("Complete vehículo y kilometraje"); return; }
    if (actionType === "end" && !mileage) { toast.error("Ingrese kilometraje final"); return; }

    try {
      if (actionType === "unassign") {
        await api.put(`/trips/${actionDialog.id}/unassign`);
        toast.success("Viaje devuelto a la bolsa");
      } else {
        let payload = actionType === "start" 
          ? { status: "en_curso", vehicle_id: selectedVehicle, mileage: parseFloat(mileage) }
          : { status: "completado", mileage: parseFloat(mileage) };
        await api.put(`/trips/${actionDialog.id}/status`, payload);
        toast.success(actionType === "start" ? "Viaje iniciado" : "Viaje finalizado");
      }
      setActionDialog(null); fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Error en la acción"); }
  };

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mis Viajes Actuales</h1>
      <div className="space-y-6">
        {trips.map(t => (
          <Card key={t.id} className="shadow-md border-slate-200 rounded-xl">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-slate-800 text-white font-mono px-3 py-1 rounded-md text-sm font-black tracking-widest">{t.tracking_number}</span>
                <Badge className={t.status === "en_curso" ? "bg-blue-100 text-blue-800" : "bg-teal-100 text-teal-800"}>{t.status.replace("_", " ")}</Badge>
              </div>
              <p className="font-black text-xl text-slate-900 leading-tight mb-4">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-teal-600"/></div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origen</p><p className="text-base font-bold text-slate-900 leading-tight">{t.origin}</p></div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Navigation className="w-5 h-5 text-blue-600"/></div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destino</p><p className="text-base font-bold text-slate-900 leading-tight">{t.destination}</p></div>
                </div>
              </div>

              {t.status === "asignado" && (
                <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-slate-100">
                  <Button onClick={() => openActionDialog(t, "start")} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg font-bold rounded-xl shadow-md"><Play className="w-6 h-6 mr-2 fill-current"/> Iniciar Viaje</Button>
                  <Button onClick={() => openActionDialog(t, "unassign")} variant="outline" className="h-14 text-amber-600 border-amber-200 hover:bg-amber-50 rounded-xl font-bold sm:w-auto w-full">Devolver a Bolsa</Button>
                </div>
              )}
              {t.status === "en_curso" && (
                <Button onClick={() => openActionDialog(t, "end")} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg font-bold rounded-xl shadow-md mt-4"><CheckCircle className="w-6 h-6 mr-2"/> Finalizar Viaje</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {actionType === "start" ? "Iniciar Viaje" : actionType === "end" ? "Finalizar Viaje" : "¿Devolver Viaje?"}
            </DialogTitle>
          </DialogHeader>
          {actionDialog && (
            <div className="space-y-6 pt-4">
              {actionType === "unassign" ? (
                <p className="text-slate-600">El viaje regresará a la bolsa de despacho y usted quedará libre para tomar otro. ¿Desea continuar?</p>
              ) : (
                <>
                  {actionType === "start" && (
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700 text-sm">1. Seleccione Vehículo (Ambulancia)</Label>
                      <Select value={selectedVehicle} onValueChange={(val) => {
                        setSelectedVehicle(val); const v = vehicles.find(x => x.id === val); if(v) setMileage(v.mileage.toString());
                      }}>
                        <SelectTrigger className="h-12 border-slate-300 font-medium"><SelectValue placeholder="Elige ambulancia" /></SelectTrigger>
                        <SelectContent>{vehicles.map(v => (<SelectItem key={v.id} value={v.id}>{v.plate} - {v.brand}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 text-sm">{actionType === "start" ? "2. Kilometraje Inicial" : "Kilometraje Final"}</Label>
                    <Input type="number" value={mileage} onChange={e => setMileage(e.target.value)} className="h-14 text-2xl font-black text-center" />
                  </div>
                </>
              )}
              <DialogFooter className="mt-6">
                <Button variant="outline" className="h-12" onClick={() => setActionDialog(null)}>Volver</Button>
                <Button className={`h-12 text-white font-bold ${actionType === "unassign" ? "bg-amber-600 hover:bg-amber-700" : "bg-teal-600 hover:bg-teal-700"}`} onClick={handleAction}>Confirmar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
