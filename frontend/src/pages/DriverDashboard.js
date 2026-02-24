import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // <--- ¡AGREGA ESTA LÍNEA!
import { toast } from "sonner";
import { HandMetal, Play, CheckCircle, Camera, Truck, MapPin, ArrowRight, Clock, Upload, AlertTriangle, Zap } from "lucide-react";
import api from "@/lib/api";

export default function DriverDashboard() {
  const [section, setSection] = useState("pool");
  return (
    <div className="min-h-screen bg-slate-50" data-testid="driver-dashboard">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6">
          {section === "pool" && <PoolSection />}
          {section === "trips" && <MyTripsSection />}
          {section === "vehicle" && <VehicleSection />}
        </div>
      </main>
    </div>
  );
}

function PoolSection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchPool = useCallback(async () => { try { const r = await api.get("/trips/pool"); setTrips(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchPool(); const i = setInterval(fetchPool, 10000); return () => clearInterval(i); }, [fetchPool]);

  const handleAssign = async (tripId) => {
    try { await api.put(`/trips/${tripId}/assign`); toast.success("Viaje asignado. Revise 'Mis Viajes'."); fetchPool(); }
    catch (e) { toast.error(e.response?.data?.detail || "Error al asignar"); }
  };

  const priorityColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-4" data-testid="pool-title">Viajes Disponibles</h1>
      <div className="space-y-4">
        {trips.map((t, i) => (
          <Card key={t.id} className="card-hover animate-slide-up shadow-md" style={{ animationDelay: `${i * 80}ms` }} data-testid={`pool-trip-${t.id}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(t.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="font-semibold text-lg text-slate-900 mb-1">{t.patient_name}</p>
              {t.patient_unit && <p className="text-sm text-slate-500 mb-2">Unidad: {t.patient_unit}</p>}
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                <MapPin className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <span>{t.origin}</span>
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                <span>{t.destination}</span>
              </div>
              {t.notes && <p className="text-xs text-slate-400 mb-3 bg-slate-50 p-2 rounded">{t.notes}</p>}
              <Button onClick={() => handleAssign(t.id)} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 text-base touch-target active:scale-95 transition-transform" data-testid={`assign-trip-${t.id}`}>
                <HandMetal className="w-5 h-5 mr-2" />Tomar Viaje
              </Button>
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && !loading && (
          <div className="text-center py-16">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-lg">Sin viajes disponibles</p>
            <p className="text-slate-300 text-sm mt-1">Los nuevos viajes apareceran aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MyTripsSection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [mileageDialog, setMileageDialog] = useState(null); 
  const [mileageValue, setMileageValue] = useState("");
  const [mileageLoading, setMileageLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const fileInputRef = useRef(null);
  const [unassignDialog, setUnassignDialog] = useState(null);

  const handleConfirmUnassign = async () => {
    if (!unassignDialog) return;
    try {
      await api.put(`/trips/${unassignDialog}/unassign`);
      toast.success("Viaje desasignado y devuelto a la bolsa");
      setUnassignDialog(null);
      fetchTrips();
    } catch (e) { toast.error("Error al desasignar"); }
  };
  
  const fetchTrips = useCallback(async () => { try { const r = await api.get("/trips"); setTrips(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchTrips(); api.get("/vehicles").then(r => setVehicles(r.data)).catch(() => {}); }, [fetchTrips]);

  const handleMileageAction = (tripId, action) => {
    const trip = trips.find(t => t.id === tripId);
    setMileageDialog({ tripId, action });
    setMileageValue("");
    setSelectedVehicleId(trip?.vehicle_id || "");
  };

  const handleOcrForMileage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMileageLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const targetVehicleId = selectedVehicleId || (vehicles.length > 0 ? vehicles[0].id : null);
      if (!targetVehicleId) { toast.error("No hay vehiculos registrados"); setMileageLoading(false); return; }
      const res = await api.post(`/vehicles/${targetVehicleId}/ocr`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.mileage) {
        setMileageValue(String(res.data.mileage));
        toast.success(`Kilometraje detectado: ${res.data.mileage.toLocaleString()} km`);
      } else { toast.error("No se pudo leer. Ingrese manualmente."); }
    } catch (e) { toast.error("Error en OCR"); }
    finally { setMileageLoading(false); }
  };

  const handleConfirmMileage = async () => {
    if (!mileageDialog || !mileageValue) { toast.error("Ingrese el kilometraje"); return; }
    if (mileageDialog.action === "start" && !selectedVehicleId) { toast.error("Debe seleccionar un vehiculo"); return; }
    const status = mileageDialog.action === "start" ? "en_curso" : "completado";
    try {
      await api.put(`/trips/${mileageDialog.tripId}/status`, {
        status,
        mileage: parseFloat(mileageValue),
        vehicle_id: mileageDialog.action === "start" ? selectedVehicleId : undefined
      });
      toast.success(status === "en_curso" ? "Viaje iniciado" : "Viaje completado");
      setMileageDialog(null); setMileageValue(""); setSelectedVehicleId(""); fetchTrips();
    } catch (e) { toast.error(e.response?.data?.detail || "Error al actualizar"); }
  };

  

  const statusColors = {
    asignado: "bg-teal-100 text-teal-800 border-teal-200",
    en_curso: "bg-blue-100 text-blue-800 border-blue-200",
    completado: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cancelado: "bg-red-100 text-red-800 border-red-200",
  };
  const tripTypeLabels = { clinico: "Clinico", no_clinico: "No Clinico" };

  const today = new Date().toISOString().split("T")[0];

  const activeTrips = trips.filter(t => ["asignado", "en_curso"].includes(t.status));
  const pastTrips = trips.filter(t => ["completado", "cancelado"].includes(t.status));

  // Separamos los viajes en "Hoy" y "Próximos"
  const todayTrips = activeTrips.filter(t => !t.scheduled_date || t.scheduled_date <= today);
  const upcomingTrips = activeTrips.filter(t => t.scheduled_date && t.scheduled_date > today);

  // Componente interno para no repetir el código de la tarjeta de viaje
  const TripCard = ({ t }) => (
    <Card key={t.id} className="shadow-md border-l-4 border-l-teal-500 animate-slide-up" data-testid={`active-trip-${t.id}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
          <Button variant="ghost" size="sm" className="text-xs text-teal-600" onClick={() => setSelectedTrip(t)} data-testid={`detail-trip-${t.id}`}>Ver detalle</Button>
        </div>
        <p className="font-semibold text-lg text-slate-900">{t.patient_name || "Sin nombre"}</p>
        <div className="flex items-center gap-2 text-sm text-slate-600 mt-1 mb-1">
          <MapPin className="w-4 h-4 text-teal-500" />{t.origin} <ArrowRight className="w-3 h-3" /> {t.destination}
        </div>
        {t.scheduled_date && <p className="text-xs text-slate-400 mb-3 font-medium bg-slate-100 inline-block px-2 py-1 rounded">Fecha prog: {t.scheduled_date}</p>}
        {t.start_mileage && <p className="text-xs text-slate-500 mb-2 mt-2">KM inicio: {t.start_mileage.toLocaleString()}</p>}
        <div className="flex gap-2 mt-3">
          {t.status === "asignado" && (
            <Button onClick={() => handleMileageAction(t.id, "start")} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 touch-target active:scale-95" data-testid={`start-trip-${t.id}`}>
              <Play className="w-5 h-5 mr-2" />Iniciar (registrar KM)
            </Button>
          )}
          {t.status === "en_curso" && (
            <Button onClick={() => handleMileageAction(t.id, "complete")} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 touch-target active:scale-95" data-testid={`complete-trip-${t.id}`}>
              <CheckCircle className="w-5 h-5 mr-2" />Completar (registrar KM)
            </Button>
          )}
          {["asignado", "en_curso"].includes(t.status) && (
            <Button onClick={() => setUnassignDialog(t.id)} variant="outline" className="h-12 text-orange-500 border-orange-200 hover:bg-orange-50 touch-target" data-testid={`unassign-trip-${t.id}`}>
              <AlertTriangle className="w-4 h-4 mr-2" />Desasignar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-4" data-testid="my-trips-title">Mis Viajes</h1>

      {activeTrips.length > 0 && (
        <Tabs defaultValue="today" className="w-full mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-200/60 p-1 h-12">
            <TabsTrigger value="today" className="text-sm data-[state=active]:bg-teal-600 data-[state=active]:text-white font-semibold">
              Hoy ({todayTrips.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-sm data-[state=active]:bg-teal-600 data-[state=active]:text-white font-semibold">
              Próximos ({upcomingTrips.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="today" className="space-y-4 outline-none">
            {todayTrips.map(t => <TripCard key={t.id} t={t} />)}
            {todayTrips.length === 0 && (
              <div className="text-center py-10 bg-white rounded-lg border border-dashed border-slate-300">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-slate-500 font-medium">No tienes viajes programados para hoy</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upcoming" className="space-y-4 outline-none">
            {upcomingTrips.map(t => <TripCard key={t.id} t={t} />)}
            {upcomingTrips.length === 0 && (
              <div className="text-center py-10 bg-white rounded-lg border border-dashed border-slate-300">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 font-medium">No hay viajes futuros programados</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {pastTrips.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-700 mb-3">Historial</h2>
          <div className="space-y-3">
            {pastTrips.slice(0, 10).map(t => (
              <Card key={t.id} className="opacity-80 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => setSelectedTrip(t)} data-testid={`past-trip-${t.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-700">{t.patient_name || "Sin nombre"}</p>
                      <p className="text-sm text-slate-500">{t.origin} - {t.destination}</p>
                      {t.start_mileage && t.end_mileage && <p className="text-xs text-slate-400">KM: {t.start_mileage.toLocaleString()} - {t.end_mileage.toLocaleString()} ({(t.end_mileage - t.start_mileage).toLocaleString()} km)</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[t.status]}`}>{t.status}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {trips.length === 0 && !loading && <p className="text-center py-16 text-slate-400">Sin viajes asignados</p>}

      {/* Trip Detail Dialog */}
      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-sm" data-testid="trip-detail-driver-dialog">
          <DialogHeader><DialogTitle>Detalle del Viaje</DialogTitle></DialogHeader>
          {selectedTrip && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[selectedTrip.status] || "bg-slate-100"}`}>{selectedTrip.status?.replace(/_/g, " ")}</span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{tripTypeLabels[selectedTrip.trip_type] || "General"}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-slate-500">Origen</p><p className="font-medium text-sm">{selectedTrip.origin}</p></div>
                <div><p className="text-xs text-slate-500">Destino</p><p className="font-medium text-sm">{selectedTrip.destination}</p></div>
              </div>
              {selectedTrip.patient_name && <div><p className="text-xs text-slate-500">Paciente</p><p className="font-medium text-sm">{selectedTrip.patient_name}</p></div>}
              {selectedTrip.clinical_team && <div><p className="text-xs text-slate-500">Equipo Clinico</p><p className="font-medium text-sm">{selectedTrip.clinical_team}</p></div>}
              {selectedTrip.contact_person && <div><p className="text-xs text-slate-500">Contacto</p><p className="font-medium text-sm">{selectedTrip.contact_person}</p></div>}
              {selectedTrip.scheduled_date && <div><p className="text-xs text-slate-500">Fecha Programada</p><p className="font-medium text-sm bg-teal-50 text-teal-700 px-2 py-1 rounded inline-block">{selectedTrip.scheduled_date}</p></div>}
              {selectedTrip.notes && <div><p className="text-xs text-slate-500">Notas</p><p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{selectedTrip.notes}</p></div>}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                {selectedTrip.start_mileage != null && <div><p className="text-xs text-slate-500">KM Inicio</p><p className="font-medium">{selectedTrip.start_mileage.toLocaleString()}</p></div>}
                {selectedTrip.end_mileage != null && <div><p className="text-xs text-slate-500">KM Final</p><p className="font-medium">{selectedTrip.end_mileage.toLocaleString()}</p></div>}
              </div>
              <p className="text-xs text-slate-400">Solicitante: {selectedTrip.requester_name}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mileage Dialog */}
      <Dialog open={!!mileageDialog} onOpenChange={() => { setMileageDialog(null); setMileageValue(""); setSelectedVehicleId(""); }}>
        <DialogContent className="max-w-sm" data-testid="mileage-dialog">
          <DialogHeader><DialogTitle>{mileageDialog?.action === "start" ? "Iniciar Viaje" : "Completar Viaje"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {mileageDialog?.action === "start" && (
              <div className="space-y-2">
                <Label className="font-semibold">Vehiculo a utilizar *</Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger data-testid="trip-vehicle-select"><SelectValue placeholder="Seleccione vehiculo" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.status === "disponible" || v.status === "en_servicio").map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedVehicleId && <p className="text-xs text-red-500">Debe seleccionar un vehiculo para iniciar</p>}
              </div>
            )}
            <p className="text-sm text-slate-500">Registre el kilometraje actual del vehiculo.</p>
            <div className="border-2 border-dashed border-teal-200 rounded-xl p-6 text-center hover:border-teal-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleOcrForMileage} className="hidden" data-testid="mileage-ocr-input" />
              {mileageLoading ? (
                <div className="flex flex-col items-center gap-2"><div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" /><p className="text-sm text-teal-600">Procesando...</p></div>
              ) : (
                <div className="flex flex-col items-center gap-2"><Camera className="w-8 h-8 text-teal-400" /><p className="text-sm text-slate-600 font-medium">Foto del odometro</p></div>
              )}
            </div>
            <div className="border-t pt-3">
              <Label className="text-xs text-slate-500">O ingrese manualmente:</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" placeholder="Ej: 45230" value={mileageValue} onChange={e => setMileageValue(e.target.value)} data-testid="mileage-manual-input" className="flex-1" />
              </div>
            </div>
            <Button onClick={handleConfirmMileage} className="w-full bg-teal-600 hover:bg-teal-700 h-11"
              disabled={!mileageValue || (mileageDialog?.action === "start" && !selectedVehicleId)} data-testid="confirm-mileage-btn">
              {mileageDialog?.action === "start" ? "Iniciar Viaje" : "Completar Viaje"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

{/* --- AQUÍ PEGAS LA NUEVA VENTANA DE CONFIRMACIÓN --- */}
      <Dialog open={!!unassignDialog} onOpenChange={() => setUnassignDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-orange-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5"/> ¿Desasignar Viaje?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Al desasignar este viaje, volverá a la bolsa de pendientes y otro conductor tendrá que tomarlo. ¿Desea continuar?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnassignDialog(null)}>Volver</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleConfirmUnassign}>Sí, desasignar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ---------------------------------------------------- */}
              
    </div>
  );
}

function VehicleSection() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showOcr, setShowOcr] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [manualMileage, setManualMileage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => { api.get("/vehicles").then(r => setVehicles(r.data)).catch(() => {}); }, []);

  const handleToggleAvailability = async () => {
    try {
      const res = await api.put(`/drivers/${user.id}/extra-availability`);
      toast.success(res.data.extra_available ? "Disponibilidad extra activada" : "Disponibilidad extra desactivada");
    } catch (e) { toast.error("Error"); }
  };

  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedVehicle) return;
    setOcrLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post(`/vehicles/${selectedVehicle.id}/ocr`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.mileage) {
        toast.success(`Kilometraje detectado: ${res.data.mileage.toLocaleString()} km`);
        setShowOcr(false);
        const r = await api.get("/vehicles"); setVehicles(r.data);
      } else {
        toast.error("No se pudo leer el odometro. Ingrese manualmente.");
      }
    } catch (e) { toast.error("Error en OCR"); }
    finally { setOcrLoading(false); }
  };

  const handleManualMileage = async () => {
    if (!selectedVehicle || !manualMileage) return;
    try {
      await api.put(`/vehicles/${selectedVehicle.id}/mileage`, { mileage: parseFloat(manualMileage) });
      toast.success("Kilometraje actualizado");
      setShowOcr(false);
      setManualMileage("");
      const r = await api.get("/vehicles"); setVehicles(r.data);
    } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
  };

  const handleStatusChange = async (vehicleId, status) => {
    try { await api.put(`/vehicles/${vehicleId}/status`, { status }); toast.success("Estado actualizado"); const r = await api.get("/vehicles"); setVehicles(r.data); }
    catch (e) { toast.error("Error"); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-4" data-testid="vehicle-title">Mi Vehiculo</h1>

      <Card className="mb-6 bg-teal-50 border-teal-200">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-teal-900">Disponibilidad Extra</p>
            <p className="text-sm text-teal-700">Activar fuera de horario</p>
          </div>
          <Button onClick={handleToggleAvailability} variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-100 touch-target" data-testid="toggle-availability-btn">
            <Zap className="w-4 h-4 mr-2" />Alternar
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {vehicles.map(v => (
          <Card key={v.id} className={`card-hover ${v.maintenance_alert === "rojo" ? "border-red-300 border-2 bg-red-50" : v.maintenance_alert === "amarillo" ? "border-amber-300 border-2 bg-amber-50" : ""}`} data-testid={`vehicle-card-${v.id}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-teal-600" />
                  <span className="font-bold text-lg text-slate-900">{v.plate}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold status-${v.status}`}>{v.status.replace(/_/g, " ")}</span>
              </div>
              <p className="text-sm text-slate-600 mb-2">{v.brand} {v.model} ({v.year})</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">Kilometraje</p>
                  <p className="font-bold text-slate-900">{(v.mileage || 0).toLocaleString()} km</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">Prox. Mant.</p>
                  <p className="font-bold text-slate-900">{(v.next_maintenance_km || 0).toLocaleString()} km</p>
                </div>
              </div>
              {v.maintenance_alert && (
                <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 ${v.maintenance_alert === "rojo" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-medium">{v.maintenance_alert === "rojo" ? "Mantencion excedida!" : "Prox. a mantencion (< 1000 km)"}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => { setSelectedVehicle(v); setShowOcr(true); }} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-11 touch-target active:scale-95" data-testid={`ocr-btn-${v.id}`}>
                  <Camera className="w-5 h-5 mr-2" />Registrar KM
                </Button>
                <Select value={v.status} onValueChange={val => handleStatusChange(v.id, val)}>
                  <SelectTrigger className="w-auto h-11 touch-target" data-testid={`driver-vehicle-status-${v.id}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="en_servicio">En Servicio</SelectItem>
                    <SelectItem value="en_limpieza">En Limpieza</SelectItem>
                    <SelectItem value="en_taller">En Taller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        {vehicles.length === 0 && <p className="text-center py-12 text-slate-400">Sin vehiculos en el sistema</p>}
      </div>

      <Dialog open={showOcr} onOpenChange={setShowOcr}>
        <DialogContent className="max-w-sm" data-testid="ocr-dialog">
          <DialogHeader><DialogTitle>Registrar Kilometraje</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Vehiculo: <strong>{selectedVehicle?.plate}</strong></p>
            <div className="border-2 border-dashed border-teal-200 rounded-xl p-8 text-center hover:border-teal-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleOcrUpload} className="hidden" data-testid="ocr-file-input" />
              {ocrLoading ? (
                <div className="flex flex-col items-center gap-2"><div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" /><p className="text-sm text-teal-600">Procesando imagen...</p></div>
              ) : (
                <div className="flex flex-col items-center gap-2"><Camera className="w-10 h-10 text-teal-400" /><p className="text-sm text-slate-600 font-medium">Tomar foto del odometro</p><p className="text-xs text-slate-400">La IA extraera el kilometraje</p></div>
              )}
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500 mb-2">O ingrese manualmente:</p>
              <div className="flex gap-2">
                <Input type="number" placeholder="Ej: 45230" value={manualMileage} onChange={e => setManualMileage(e.target.value)} data-testid="manual-mileage-input" className="flex-1" />
                <Button onClick={handleManualMileage} className="bg-teal-600 hover:bg-teal-700 touch-target" data-testid="manual-mileage-btn">Guardar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
