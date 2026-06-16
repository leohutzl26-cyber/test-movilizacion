import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, Truck, MapPin, ArrowRight, CheckCircle, Navigation, Play, FileText, ShieldAlert, AlertTriangle, Activity, User, CalendarDays, RotateCcw, Siren, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import TripEvolutionLog from "@/components/TripEvolutionLog";

const formatScheduledDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const cleanDateStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = cleanDateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const year = date.getFullYear();
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      return `${day} ${months[date.getMonth()]} ${year}`;
    }
  } catch (e) {}
  return dateStr;
};

const statusColorsSolid = {
  pendiente: "bg-amber-500 text-white shadow-amber-100",
  revision_gestor: "bg-purple-600 text-white shadow-purple-100",
  asignado: "bg-indigo-600 text-white shadow-indigo-100",
  en_curso: "bg-blue-600 text-white shadow-blue-100",
  completado: "bg-emerald-600 text-white shadow-emerald-100",
  cancelado: "bg-rose-600 text-white shadow-rose-100",
  devuelto: "bg-rose-600 text-white shadow-rose-100"
};

const statusBorders = {
  pendiente: "border-l-amber-500",
  revision_gestor: "border-l-purple-500",
  asignado: "border-l-indigo-500",
  en_curso: "border-l-blue-500",
  completado: "border-l-emerald-500",
  cancelado: "border-l-rose-500",
  devuelto: "border-l-rose-500"
};

const statusHeaderStyles = {
  pendiente: { bg: "bg-amber-600", text: "text-white", iconBg: "bg-amber-700/40", iconText: "text-amber-100", badge: "bg-amber-800 text-white" },
  revision_gestor: { bg: "bg-purple-600", text: "text-white", iconBg: "bg-purple-700/40", iconText: "text-purple-100", badge: "bg-purple-800 text-white" },
  asignado: { bg: "bg-indigo-600", text: "text-white", iconBg: "bg-indigo-700/40", iconText: "text-indigo-100", badge: "bg-indigo-800 text-white" },
  en_curso: { bg: "bg-blue-600", text: "text-white", iconBg: "bg-blue-700/40", iconText: "text-blue-100", badge: "bg-blue-800 text-white" },
  completado: { bg: "bg-emerald-600", text: "text-white", iconBg: "bg-emerald-700/40", iconText: "text-emerald-100", badge: "bg-emerald-800 text-white" },
  cancelado: { bg: "bg-rose-600", text: "text-white", iconBg: "bg-rose-700/40", iconText: "text-rose-100", badge: "bg-rose-800 text-white" },
  devuelto: { bg: "bg-rose-600", text: "text-white", iconBg: "bg-rose-700/40", iconText: "text-rose-100", badge: "bg-rose-800 text-white" }
};

export default function DriverDashboard() {
  const [section, setSection] = useState(() => {
    return localStorage.getItem("movilizacion.conductor.section") || "trips";
  });
  const [licenseExpired, setLicenseExpired] = useState(false);

  useEffect(() => {
    localStorage.setItem("movilizacion.conductor.section", section);
  }, [section]);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const r = await api.get("/auth/me");
        if (r.data?.license_expired) setLicenseExpired(true);
      } catch {}
    };
    checkLicense();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {licenseExpired && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <p className="font-bold text-red-800 text-sm">Licencia de conducir vencida</p>
              <p className="text-xs text-red-600">Su licencia ha expirado. Contacte al coordinador para actualizar sus datos. Puede seguir operando mientras se regulariza.</p>
            </div>
          </div>
        )}
        {section === "pool" && <TripPoolSection onNavigate={setSection} />}
        {section === "trips" && <MyTripsSection />}
        {section === "calendar" && <DriverCalendarSection />}
        {section === "logbook" && <LogbookSection />}
        {section === "history" && <DriverHistorySection />}
      </main>
    </div>
  );
}

function TripPoolSection({ onNavigate }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeTab, setActiveTab] = useState("ambulance");

  const ambulanceTrips = trips.filter(t => t.trip_type === "clinico");
  const otherTrips = trips.filter(t => t.trip_type !== "clinico");
  const displayTrips = activeTab === "ambulance" ? ambulanceTrips : otherTrips;

  const fetchPool = useCallback(async () => {
    try { const r = await api.get("/trips/pool"); console.log("Pool data:", r.data); setTrips(r.data || []); }
    catch (err) { console.error("Error fetching pool:", err.response?.status, err.response?.data, err.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPool(); const interval = setInterval(fetchPool, 10000); return () => clearInterval(interval); }, [fetchPool]);

  const handleTakeTrip = async (id) => {
    try { await api.put(`/trips/${id}/assign`); toast.success("¡Viaje tomado exitosamente!"); fetchPool(); onNavigate("trips"); }
    catch (e) { toast.error("Error al tomar el viaje"); }
  };

  const priorityColors = { urgente: "bg-red-500 text-white shadow-red-200", alta: "bg-orange-400 text-white shadow-orange-200", normal: "bg-slate-200 text-slate-700 shadow-slate-200" };
  const sLabels = { pendiente: "Pendiente", asignado: "Asignado", en_curso: "En Curso", completado: "Completado", cancelado: "Cancelado" };
  const sColors = { pendiente: "bg-amber-100 text-amber-800 border border-amber-200", revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200", asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200", en_curso: "bg-blue-100 text-blue-800 border border-blue-200", completado: "bg-emerald-100 text-emerald-800 border border-emerald-200", cancelado: "bg-rose-100 text-rose-800 border border-rose-200" };

  if (loading) return <div className="flex flex-col items-center justify-center py-20 text-slate-400"><Clock className="w-10 h-10 animate-spin text-teal-600 mb-4" /><p>Buscando viajes disponibles...</p></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bolsa de Viajes</h1>
        <Badge variant="outline" className="text-sm bg-white shadow-sm border-teal-200 text-teal-800 px-3 py-1">{trips.length} en espera</Badge>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab("ambulance")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${activeTab === "ambulance" ? "border-red-600 bg-red-50 text-red-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-red-200"}`}>
          <Siren className="w-4 h-4" /> Ambulancias ({ambulanceTrips.length})
        </button>
        <button onClick={() => setActiveTab("others")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${activeTab === "others" ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-teal-200"}`}>
          <Truck className="w-4 h-4" /> Otros ({otherTrips.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {displayTrips.map(t => (
          <Card key={t.id} className={`shadow-md transition-all hover:shadow-lg border-t-4 ${t.priority === "urgente" ? "border-t-red-500" : t.priority === "alta" ? "border-t-orange-400" : "border-t-teal-500"}`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <span className="bg-slate-800 text-white font-mono px-3 py-1 rounded-md text-sm font-black self-start shadow-sm tracking-widest">{t.tracking_number || t.id.substring(0, 6).toUpperCase()}</span>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider self-start shadow-sm ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                </div>
                <span className="text-sm font-bold text-slate-700 bg-slate-200 px-3 py-1.5 rounded-md border border-slate-300 shadow-sm">{t.scheduled_date ? formatScheduledDate(t.scheduled_date) : new Date(t.created_at).toLocaleDateString()}</span>
              </div>

              <div className="mb-4">
                <p className="font-black text-xl text-slate-900 leading-tight mb-2">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-slate-200">{t.trip_type === "clinico" ? "Traslado Clínico" : "Cometido No Clínico"}</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origen</p>
                    <p className="text-base font-bold text-slate-900 leading-snug">{t.origin}</p>
                    {t.origin_address && <p className="text-xs font-bold text-slate-600 mt-0.5">{t.origin_address}</p>}
                    <p className="text-xs text-slate-500 font-medium">{t.patient_unit || ""}</p>
                    {(t.origin_maps_url || t.origin) && (
                      <a href={t.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.origin_address || t.origin)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        <Navigation className="w-3 h-3 rotate-45" /> Ver en Mapa
                      </a>
                    )}
                  </div>
                </div>
                <div className="ml-2.5 pl-3.5 border-l-2 border-dashed border-slate-300 py-1"></div>
                <div className="flex items-start gap-3">
                  <Navigation className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destino</p>
                    <p className="text-base font-bold text-slate-900 leading-snug">{t.destination}</p>
                    {t.destination_address && <p className="text-xs font-bold text-slate-600 mt-0.5">{t.destination_address}</p>}
                    {(t.destination_maps_url || t.destination) && (
                      <a href={t.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.destination_address || t.destination)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        <Navigation className="w-3 h-3 rotate-45" /> Ver en Mapa
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {t.trip_type === "clinico" && t.patient_requirements?.length > 0 && (
                <div className="mb-4 bg-amber-50 p-3 rounded-lg border border-amber-200 shadow-sm">
                  <p className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1.5 mb-1"><ShieldAlert className="w-4 h-4" />Requerimientos Especiales</p>
                  <p className="text-xs text-amber-900 font-bold">{t.patient_requirements.join(", ")}</p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setSelectedTrip(t)} className="flex-1 border-teal-200 text-teal-700 hover:bg-teal-50 font-bold h-12 rounded-xl text-xs sm:text-sm">
                  <FileText className="w-5 h-5 mr-1.5" />Detalles
                </Button>
                <Button onClick={() => handleTakeTrip(t.id)} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-sm rounded-xl text-xs sm:text-sm">
                  <Truck className="w-5 h-5 mr-1.5" />Tomar Viaje
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {displayTrips.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
            <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-slate-50">
                {activeTab === "ambulance" ? <Siren className="w-10 h-10 text-slate-200" /> : <Truck className="w-10 h-10 text-slate-200" />}
            </div>
            <p className="text-xl font-bold text-slate-500">No hay {activeTab === "ambulance" ? "ambulancias" : "otros viajes"} disponibles</p>
            <p className="text-sm font-medium mt-1">La bolsa de {activeTab === "ambulance" ? "ambulancias" : "otros traslados"} está vacía.</p>
          </div>
        )}
      </div>

      {selectedTrip && (
        <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-2xl text-slate-900 border-b pb-2 flex items-center justify-between">Detalle Completo <Badge className="bg-slate-800 text-white font-mono text-base px-3 py-1 tracking-widest">{selectedTrip.tracking_number}</Badge></DialogTitle></DialogHeader>
            <div className="space-y-5 text-sm pt-2">
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                <p className="text-sm text-red-600 font-black mb-1 flex items-center gap-1.5 uppercase tracking-wider"><Clock className="w-5 h-5" /> Horarios de Traslado</p>
                <p className="font-black text-red-900 text-xl md:text-2xl mt-1">Citación: {selectedTrip.appointment_time || "-"} <span className="text-slate-400 mx-2">|</span> Salida: {selectedTrip.departure_time || "-"}</p>
                <p className="text-base font-bold text-red-800 mt-2 bg-red-100 inline-block px-3 py-1 rounded-lg">Fecha: {formatScheduledDate(selectedTrip.scheduled_date)}</p>
              </div>
              <div className="flex gap-2 mb-2 mt-4">
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${sColors[selectedTrip.status]}`}>{sLabels[selectedTrip.status]}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">{selectedTrip.trip_type === "clinico" ? "Traslado Clínico" : "Traslado No Clínico"}</span>
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
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest"><MapPin className="w-4 h-4 text-teal-600" /> Origen</p>
                  <p className="font-black text-lg text-slate-900">{selectedTrip.origin}</p>
                  {selectedTrip.origin_address && <p className="text-sm font-bold text-slate-700 mt-1">{selectedTrip.origin_address}</p>}
                  <p className="text-sm font-medium text-slate-500 mt-1">{selectedTrip.patient_unit || ""} {selectedTrip.bed ? `(Cama ${selectedTrip.bed})` : ""}</p>
                  {(selectedTrip.origin_maps_url || selectedTrip.origin) && (
                    <a href={selectedTrip.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTrip.origin_address || selectedTrip.origin)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 shadow-sm mt-3 w-full sm:w-auto justify-center">
                      <Navigation className="w-3.5 h-3.5 rotate-45" /> Ver en Google Maps
                    </a>
                  )}
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest"><Navigation className="w-4 h-4 text-blue-600" /> Destino</p>
                  <p className="font-black text-lg text-slate-900">{selectedTrip.destination}</p>
                  {selectedTrip.destination_address && <p className="text-sm font-bold text-slate-700 mt-1">{selectedTrip.destination_address}</p>}
                  {(selectedTrip.destination_maps_url || selectedTrip.destination) && (
                    <a href={selectedTrip.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTrip.destination_address || selectedTrip.destination)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm mt-3 w-full sm:w-auto justify-center">
                      <Navigation className="w-3.5 h-3.5 rotate-45" /> Ver en Google Maps
                    </a>
                  )}
                </div>
              </div>
              {selectedTrip.notes && (<div className="border-t border-slate-200 pt-5"><p className="text-xs text-slate-500 font-bold mb-2 uppercase tracking-widest">Notas Adicionales</p><p className="bg-amber-50 p-4 rounded-xl text-slate-800 font-medium border border-amber-200">{selectedTrip.notes}</p></div>)}
              <Button onClick={() => { handleTakeTrip(selectedTrip.id); setSelectedTrip(null); }} className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold h-14 text-lg rounded-xl shadow-md">
                <Truck className="w-6 h-6 mr-2" /> Tomar este Viaje
              </Button>
              <TripEvolutionLog tripId={selectedTrip.id} />
            </div>
          </DialogContent>
        </Dialog>
      )}
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
  const [showWarning, setShowWarning] = useState(false);
  const [activeTab, setActiveTab] = useState("hoy");
  const [driverNotes, setDriverNotes] = useState("");
  const [driverNotesEdit, setDriverNotesEdit] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const handleOpenDetails = (trip) => {
    setDetailsDialog(trip);
    setDriverNotesEdit(trip.driver_notes || "");
  };

  const handleSaveDriverNotes = async (tripId) => {
    setSavingNotes(true);
    try {
      await api.put(`/trips/${tripId}/status`, {
        driver_notes: driverNotesEdit
      });
      toast.success("Observaciones guardadas correctamente");
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, driver_notes: driverNotesEdit } : t));
      setDetailsDialog(prev => prev ? { ...prev, driver_notes: driverNotesEdit } : null);
    } catch (err) {
      console.error("Error saving notes:", err);
      toast.error("Error al guardar observaciones");
    } finally {
      setSavingNotes(false);
    }
  };

  const today = new Date().toLocaleDateString("en-CA");

  const fetchAll = useCallback(async () => {
    try {
      const [t, v] = await Promise.all([api.get("/trips/driver"), api.get("/vehicles")]);
      console.log("My trips data:", t.data);
      console.log("Filtered trips:", (t.data || []).filter(tr => ["asignado", "en_curso"].includes(tr.status)));
      setTrips((t.data || []).filter(tr => ["asignado", "en_curso"].includes(tr.status)));
      setVehicles((v.data || []).filter(veh => veh.status === "disponible"));
    } catch (err) { console.error("Error fetching my trips:", err.response?.status, err.response?.data, err.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { 
    fetchAll(); 
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const cleanDateStr = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  };

  const tripsHoy = trips.filter(t => 
    t.status === "en_curso" || 
    cleanDateStr(t.scheduled_date) <= today
  );
  const tripsProgramados = trips.filter(t => 
    t.status !== "en_curso" && 
    cleanDateStr(t.scheduled_date) > today
  );
  const displayTrips = activeTab === "hoy" ? tripsHoy : tripsProgramados;

  // FUNCIÓN PARA ABRIR VENTANAS Y LIMPIAR LA MEMORIA SUCIA
  const openActionDialog = (trip, type) => {
    setActionDialog(trip);
    setActionType(type);
    setCancelReason("");
    setShowWarning(false);

    if (type === "start") {
      const vehId = trip.vehicle_id || "";
      setSelectedVehicle(vehId);
      if (vehId) {
        const veh = vehicles.find(v => v.id === vehId);
        setMileage(veh ? veh.mileage.toString() : "");
      } else {
        setMileage("");
      }
    } else if (type === "end") {
      setSelectedVehicle(trip.vehicle_id || "");
      setMileage("");
      setDriverNotes(trip.driver_notes || "");
    } else {
      setSelectedVehicle(trip.vehicle_id || "");
      setMileage("");
    }
  };

  const closeActionDialog = () => {
    setActionDialog(null);
    setSelectedVehicle("");
    setMileage("");
    setCancelReason("");
    setDriverNotes("");
    setShowWarning(false);
  };

  const handleVehicleChange = (vehId) => {
    setSelectedVehicle(vehId);
    if (actionType === "start") {
      const veh = vehicles.find(v => v.id === vehId);
      if (veh) setMileage(veh.mileage.toString());
    }
  };

  const handleAction = async () => {
    if (actionType === "start" && !selectedVehicle) { toast.error("Seleccione un vehículo"); return; }
    if (actionType === "start" && !mileage) { toast.error("Ingrese kilometraje inicial"); return; }
    if (actionType === "end" && !mileage) { toast.error("Ingrese kilometraje final"); return; }
    if (actionType === "cancel" && !cancelReason) { toast.error("Debe ingresar un motivo"); return; }

    if (actionType === "end" && actionDialog?.start_mileage) {
      const distance = parseFloat(mileage) - actionDialog.start_mileage;
      if (distance > 700 && !showWarning) {
        setShowWarning(true);
        return;
      }
    }

    try {
      if (actionType === "cancel") {
        // DEVOLVER A BOLSA: usar unassign en vez de cancelar
        await api.put(`/trips/${actionDialog.id}/unassign`);
        toast.success("Viaje devuelto a la bolsa");
        closeActionDialog();
        fetchAll();
        return;
      }
      let payload = {};
      if (actionType === "start") payload = { status: "en_curso", vehicle_id: selectedVehicle, mileage: parseFloat(mileage) };
      if (actionType === "end") payload = { status: "completado", mileage: parseFloat(mileage), driver_notes: driverNotes };

      await api.put(`/trips/${actionDialog.id}/status`, payload);
      toast.success(actionType === "start" ? "Viaje iniciado" : actionType === "end" ? "Viaje finalizado" : "Viaje devuelto");
      closeActionDialog();
      fetchAll();
    } catch (e) {
      console.error("Error in handleAction:", e.response?.status, e.response?.data);
      toast.error(e.response?.data?.detail || "Error al procesar la acción");
      setShowWarning(false);
    }
  };

  const statusColors = { pendiente: "bg-amber-100 text-amber-800 border border-amber-200", revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200", asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200", en_curso: "bg-blue-100 text-blue-800 border border-blue-200", completado: "bg-emerald-100 text-emerald-800 border border-emerald-200", cancelado: "bg-rose-100 text-rose-800 border border-rose-200" };
  const sLabels = { asignado: "Asignado", en_curso: "En Curso", completado: "Completado" };

  if (loading) return <div className="flex justify-center py-20"><Clock className="w-10 h-10 animate-spin text-teal-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Mis Viajes Asignados</h1>

      {/* Pestañas Hoy / Programados */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab("hoy")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${activeTab === "hoy" ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-teal-200"}`}>
          <Play className="w-4 h-4" /> Hoy ({tripsHoy.length})
        </button>
        <button onClick={() => setActiveTab("programados")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${activeTab === "programados" ? "border-indigo-600 bg-indigo-50 text-indigo-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-indigo-200"}`}>
          <CalendarDays className="w-4 h-4" /> Programados ({tripsProgramados.length})
        </button>
      </div>

      <div className="space-y-6">
        {displayTrips.map(t => {
          const isToday = cleanDateStr(t.scheduled_date) === today || t.status === "en_curso";
          return (
          <Card key={t.id} className={`shadow-md border-l-4 ${statusBorders[t.status] || "border-l-slate-200"} overflow-hidden rounded-xl ${!isToday ? "opacity-80" : ""}`}>
            <CardContent className="p-0">
              <div className="p-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-slate-100 pb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-800 text-white font-mono px-3 py-1 rounded-md text-sm font-black shadow-sm tracking-widest">{t.tracking_number || t.id.substring(0, 6).toUpperCase()}</span>
                    <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border-none ${statusColorsSolid[t.status]}`}>{sLabels[t.status] || t.status.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-md border shadow-sm flex-1 text-center md:flex-none ${isToday ? "text-teal-700 bg-teal-100 border-teal-200" : "text-indigo-700 bg-indigo-100 border-indigo-200"}`}>{t.scheduled_date ? formatScheduledDate(t.scheduled_date) : new Date(t.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetails(t)} className="h-10 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200"><FileText className="w-4 h-4 mr-1.5" />Info Completa</Button>
                  </div>
                </div>

                <p className="font-black text-xl text-slate-900 leading-tight mb-4">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0 border border-teal-100 mt-0.5"><MapPin className="w-5 h-5 text-teal-600" /></div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origen</p>
                      <p className="text-base font-bold text-slate-900 leading-tight">{t.origin}</p>
                      {t.origin_address && <p className="text-xs font-bold text-slate-600 mt-0.5">{t.origin_address}</p>}
                      {(t.origin_maps_url || t.origin) && (
                        <a href={t.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.origin_address || t.origin)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1.5 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          <Navigation className="w-3 h-3 rotate-45" /> Ver en Mapa
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 mt-0.5"><Navigation className="w-5 h-5 text-blue-600" /></div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destino</p>
                      <p className="text-base font-bold text-slate-900 leading-tight">{t.destination}</p>
                      {t.destination_address && <p className="text-xs font-bold text-slate-600 mt-0.5">{t.destination_address}</p>}
                      {(t.destination_maps_url || t.destination) && (
                        <a href={t.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.destination_address || t.destination)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1.5 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <Navigation className="w-3 h-3 rotate-45" /> Ver en Mapa
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {t.status === "asignado" && isToday && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-slate-100">
                    <Button onClick={() => openActionDialog(t, "start")} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg font-bold rounded-xl shadow-md transition-transform active:scale-95"><Play className="w-6 h-6 mr-2 fill-current" /> Iniciar Viaje</Button>
                    <Button onClick={() => openActionDialog(t, "cancel")} variant="outline" className="h-14 text-red-600 border-red-200 hover:bg-red-50 rounded-xl px-6 font-bold sm:w-auto w-full transition-colors">Devolver</Button>
                  </div>
                )}

                {t.status === "asignado" && !isToday && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-xs text-indigo-600 font-bold flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> Programado para {formatScheduledDate(t.scheduled_date)}</p>
                    <Button onClick={() => openActionDialog(t, "cancel")} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 font-bold">Devolver</Button>
                  </div>
                )}

                {t.status === "en_curso" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Button onClick={() => openActionDialog(t, "end")} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg font-bold rounded-xl shadow-md transition-transform active:scale-95"><CheckCircle className="w-6 h-6 mr-2" /> Finalizar Viaje</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
        {displayTrips.length === 0 && <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm"><p className="text-xl font-bold text-slate-500">{activeTab === "hoy" ? "No tienes viajes para hoy" : "No tienes viajes programados"}</p><p className="text-sm font-medium mt-2">{activeTab === "hoy" ? "Revisa la bolsa de viajes disponibles para tomar uno." : "Los viajes futuros aparecerán aquí."}</p></div>}
      </div>

      {actionDialog && (
        <Dialog open={!!actionDialog} onOpenChange={closeActionDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {actionType === "start" ? <><Play className="w-6 h-6 text-blue-600 fill-current" /> Iniciar Viaje</> : actionType === "end" ? <><CheckCircle className="w-6 h-6 text-emerald-600" /> Finalizar Viaje</> : <><AlertTriangle className="w-6 h-6 text-red-600" /> Devolver Viaje</>}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">

              {showWarning && (
                <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded-r-lg">
                  <p className="font-bold text-red-800 text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> ¡Alerta de Distancia!</p>
                  <p className="text-red-700 font-medium text-sm mt-1">El kilometraje ingresado indica que recorrió más de 700km en este viaje. ¿Está seguro de que el kilometraje final ({mileage}) es correcto?</p>
                </div>
              )}

              {actionType === "start" && (
                <>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 text-sm">1. Seleccione Vehículo</Label>
                    <Select value={selectedVehicle} onValueChange={handleVehicleChange}>
                      <SelectTrigger className="h-12 text-base border-slate-300 font-medium"><SelectValue placeholder="Seleccione patente" /></SelectTrigger>
                      <SelectContent>{vehicles.map(v => (<SelectItem key={v.id} value={v.id} className="py-2.5 font-bold">{v.plate} - {v.brand}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 text-sm">2. Kilometraje Inicial</Label>
                    <Input type="number" placeholder="Ej: 120500" value={mileage} onChange={e => setMileage(e.target.value)} className="h-14 text-2xl font-black text-center border-slate-300 shadow-inner text-blue-800" />
                    <p className="text-xs text-slate-500 font-medium mt-1">Sugerido automáticamente del vehículo seleccionado.</p>
                  </div>
                </>
              )}

              {actionType === "end" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 mb-2">
                    <span className="text-xs font-bold text-slate-500">KM INICIAL:</span>
                    <span className="font-mono font-bold text-slate-700">{actionDialog.start_mileage} km</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 text-sm">Kilometraje Final</Label>
                    <Input type="number" placeholder="Ej: 120545" value={mileage} onChange={e => { setMileage(e.target.value); setShowWarning(false); }} className={`h-14 text-2xl font-black text-center border-slate-300 shadow-inner ${showWarning ? 'border-red-400 text-red-700 bg-red-50' : 'text-emerald-800'}`} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 text-sm">Observaciones / Comentarios del Viaje</Label>
                    <textarea 
                      className="w-full min-h-[80px] p-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm bg-white" 
                      placeholder="Ej: Paciente estable, tráfico pesado, retraso en entrega de insumos..." 
                      value={driverNotes} 
                      onChange={e => setDriverNotes(e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {actionType === "cancel" && (
                <div className="space-y-2"><Label className="font-bold text-red-700 text-sm">Motivo de la devolución</Label><textarea className="w-full min-h-[100px] p-3 rounded-xl border border-red-200 text-sm font-medium focus:ring-2 focus:ring-red-400 outline-none shadow-sm" placeholder="Indique el motivo por el cual no puede realizar este viaje..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></div>
              )}

              <DialogFooter className="mt-6">
                <Button variant="outline" className="h-12 w-full sm:w-auto font-bold" onClick={closeActionDialog}>Volver</Button>
                <Button className={`h-12 w-full sm:w-auto text-base font-bold text-white shadow-md ${showWarning ? "bg-red-600 hover:bg-red-700 animate-pulse" : actionType === "start" ? "bg-blue-600 hover:bg-blue-700" : actionType === "end" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`} onClick={handleAction}>
                  {showWarning ? "SÍ, CONFIRMO EL KILOMETRAJE" : "Confirmar"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {detailsDialog && (
        <Dialog open={!!detailsDialog} onOpenChange={() => setDetailsDialog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0">
            <div className={`${statusHeaderStyles[detailsDialog.status]?.bg || "bg-slate-900"} p-8 pb-10 relative transition-colors duration-300 rounded-t-[2rem]`}>
              <div className="absolute top-6 right-14">
                <Badge className={`${statusHeaderStyles[detailsDialog.status]?.badge || "bg-slate-800 text-white"} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                  {(detailsDialog.status || "").replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 ${statusHeaderStyles[detailsDialog.status]?.iconBg || "bg-white/10"} rounded-2xl flex items-center justify-center border border-white/10`}>
                  {detailsDialog.trip_type === "clinico" ? <Activity className={`w-8 h-8 ${statusHeaderStyles[detailsDialog.status]?.iconText || "text-teal-400"}`} /> : <Truck className={`w-8 h-8 ${statusHeaderStyles[detailsDialog.status]?.iconText || "text-blue-400"}`} />}
                </div>
                <div>
                  <p className={`${statusHeaderStyles[detailsDialog.status]?.iconText || "text-teal-400"} text-[10px] uppercase tracking-[0.2em] font-black mb-1`}>
                    Folio #{detailsDialog.tracking_number} — Detalle Completo
                  </p>
                  <h2 className={`text-3xl font-black ${statusHeaderStyles[detailsDialog.status]?.text || "text-white"} leading-tight uppercase tracking-tight`}>
                    {detailsDialog.trip_type === "clinico" ? "Traslado Clínico" : "Cometido No Clínico"}
                  </h2>
                </div>
              </div>
            </div>
            <div className="p-8 pt-4 space-y-5 text-sm">

              <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                <p className="text-sm text-red-600 font-black mb-1 flex items-center gap-1.5 uppercase tracking-wider"><Clock className="w-5 h-5" /> Horarios de Traslado</p>
                <p className="font-black text-red-900 text-xl md:text-2xl mt-1">Citación: {detailsDialog.appointment_time || "-"} <span className="text-slate-400 mx-2">|</span> Salida: {detailsDialog.departure_time || "-"}</p>
                <p className="text-base font-bold text-red-800 mt-2 bg-red-100 inline-block px-3 py-1 rounded-lg">Fecha: {formatScheduledDate(detailsDialog.scheduled_date)}</p>
              </div>

              <div className="flex gap-2 mb-2 mt-4">
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${statusColorsSolid[detailsDialog.status] || "bg-slate-500 text-white"}`}>{sLabels[detailsDialog.status] || detailsDialog.status}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">{detailsDialog.trip_type === "clinico" ? "Traslado Clínico" : "Traslado No Clínico"}</span>
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
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest"><MapPin className="w-4 h-4 text-teal-600" /> Origen</p>
                  <p className="font-black text-lg text-slate-900">{detailsDialog.origin}</p>
                  {detailsDialog.origin_address && <p className="text-sm font-bold text-slate-700 mt-1">{detailsDialog.origin_address}</p>}
                  <p className="text-sm font-medium text-slate-500 mt-1">{detailsDialog.patient_unit || ""} {detailsDialog.bed ? `(Cama ${detailsDialog.bed})` : ""}</p>
                  {(detailsDialog.origin_maps_url || detailsDialog.origin) && (
                    <a href={detailsDialog.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailsDialog.origin_address || detailsDialog.origin)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 shadow-sm mt-3 w-full sm:w-auto justify-center">
                      <Navigation className="w-3.5 h-3.5 rotate-45" /> Ver en Google Maps
                    </a>
                  )}
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest"><Navigation className="w-4 h-4 text-blue-600" /> Destino</p>
                  <p className="font-black text-lg text-slate-900">{detailsDialog.destination}</p>
                  {detailsDialog.destination_address && <p className="text-sm font-bold text-slate-700 mt-1">{detailsDialog.destination_address}</p>}
                  {(detailsDialog.destination_maps_url || detailsDialog.destination) && (
                    <a href={detailsDialog.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailsDialog.destination_address || detailsDialog.destination)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm mt-3 w-full sm:w-auto justify-center">
                      <Navigation className="w-3.5 h-3.5 rotate-45" /> Ver en Google Maps
                    </a>
                  )}
                </div>
              </div>

              {detailsDialog.notes && (<div className="border-t border-slate-200 pt-5"><p className="text-xs text-slate-500 font-bold mb-2 uppercase tracking-widest">Notas Adicionales</p><p className="bg-amber-50 p-4 rounded-xl text-slate-800 font-medium border border-amber-200">{detailsDialog.notes}</p></div>)}
              
              <div className="border-t border-slate-200 pt-5 space-y-2">
                <Label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Observaciones del Conductor</Label>
                <textarea 
                  className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm bg-white" 
                  placeholder="Escriba aquí sus observaciones o comentarios sobre este traslado..." 
                  value={driverNotesEdit} 
                  onChange={e => setDriverNotesEdit(e.target.value)} 
                />
                <Button 
                  onClick={() => handleSaveDriverNotes(detailsDialog.id)} 
                  size="sm" 
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 text-xs rounded-lg shadow-sm"
                  disabled={savingNotes}
                >
                  {savingNotes ? "Guardando..." : "Guardar Observaciones"}
                </Button>
              </div>

              <TripEvolutionLog tripId={detailsDialog.id} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ==========================================
// SECCIÓN 3: HISTORIAL DEL CONDUCTOR
// ==========================================
function DriverHistorySection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [historyNotesEdit, setHistoryNotesEdit] = useState("");
  const [savingHistoryNotes, setSavingHistoryNotes] = useState(false);

  const handleOpenHistoryDetails = (trip) => {
    setSelectedTrip(trip);
    setHistoryNotesEdit(trip.driver_notes || "");
  };

  const handleSaveHistoryNotes = async (tripId) => {
    setSavingHistoryNotes(true);
    try {
      await api.put(`/trips/${tripId}/status`, {
        driver_notes: historyNotesEdit
      });
      toast.success("Observaciones guardadas correctamente");
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, driver_notes: historyNotesEdit } : t));
      setSelectedTrip(prev => prev ? { ...prev, driver_notes: historyNotesEdit } : null);
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar observaciones");
    } finally {
      setSavingHistoryNotes(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    try { 
      console.log("[DEBUG] Fetching History V2...");
      const r = await api.get("/trips/v2/history"); 
      console.log("[DEBUG] History r.data:", r.data);
      if (r.data && Array.isArray(r.data.trips)) {
        setTrips(r.data.trips);
      } else {
        console.warn("[DEBUG] Unrecognized history format or null:", r.data);
        setTrips([]);
      }
    }
    catch (err) { 
      console.error("Error fetching history:", err.response?.status, err.response?.data);
      toast.error("Error al cargar el historial");
    } finally { 
      setLoading(false); 
    }
  }, []);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const statusColors = { completado: "bg-emerald-100 text-emerald-800 border border-emerald-200", cancelado: "bg-rose-100 text-rose-800 border border-rose-200", devuelto: "bg-amber-100 text-amber-800 border border-amber-200", revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200", asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200", en_curso: "bg-blue-100 text-blue-800 border border-blue-200" };

  if (loading) return <div className="flex justify-center py-20"><Clock className="w-10 h-10 animate-spin text-teal-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Historial de Viajes</h1>
        <Badge variant="outline" className="text-sm bg-white shadow-sm border-slate-200 text-slate-600 px-3 py-1">{trips.length} viajes</Badge>
      </div>
      <div className="space-y-4">
        {trips.map(t => (
          <Card key={t.id} className={`shadow-sm cursor-pointer hover:shadow-md transition-all border-l-4 ${t._history_status === "devuelto" ? "border-l-amber-400" : t.status === "completado" ? "border-l-emerald-500" : "border-l-red-400"}`} onClick={() => handleOpenHistoryDetails(t)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">{t.tracking_number}</span>
                  {t._history_status === "devuelto" ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Devuelto</span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusColors[t.status] || "bg-slate-100"}`}>{t.status === "completado" ? "Completado" : "Cancelado"}</span>
                  )}
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{t.trip_type === "clinico" ? "Clínico" : "No Clínico"}</span>
                </div>
                <span className="text-xs font-medium text-slate-500">{t.scheduled_date ? t.scheduled_date.split('T')[0] : ""}</span>
              </div>
              <p className="font-bold text-lg text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                <MapPin className="w-3 h-3 text-teal-500" /> <span>{t.origin}</span> <ArrowRight className="w-3 h-3" /> <span>{t.destination}</span>
              </div>
              {t.start_mileage !== undefined && t.end_mileage !== undefined && t.start_mileage !== null && t.end_mileage !== null && (
                <div className="mt-2 flex gap-4 text-xs text-slate-400">
                  <span>Km inicio: <strong className="text-slate-600">{t.start_mileage}</strong></span>
                  <span>Km final: <strong className="text-slate-600">{t.end_mileage}</strong></span>
                  <span>Distancia: <strong className="text-teal-700">{(Number(t.end_mileage) - Number(t.start_mileage)).toFixed(1)} km</strong></span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200"><p className="text-lg font-bold text-slate-500">Aún no tiene viajes finalizados</p></div>}
      </div>

      {selectedTrip && (
        <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-xl border-b pb-3">Detalle del Viaje</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2 text-sm">
              <div className="flex gap-2">
                <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">{selectedTrip.tracking_number}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusColors[selectedTrip.status]}`}>{selectedTrip.status}</span>
              </div>
              {selectedTrip.requester_name && <div className="bg-purple-50 p-3 rounded-xl border border-purple-200"><p className="text-[10px] font-bold text-purple-600 uppercase">Solicitado por</p><p className="font-bold text-purple-900">{selectedTrip.requester_name}</p></div>}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-black text-lg text-slate-900">{selectedTrip.trip_type === "clinico" ? selectedTrip.patient_name : selectedTrip.task_details}</p>
                {selectedTrip.trip_type === "clinico" && (
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div><span className="font-bold text-slate-500">RUT:</span> {selectedTrip.rut || "-"}</div>
                    <div><span className="font-bold text-slate-500">Motivo:</span> {selectedTrip.transfer_reason || "-"}</div>
                    <div><span className="font-bold text-slate-500">Servicio:</span> {selectedTrip.patient_unit || "-"}</div>
                    <div><span className="font-bold text-slate-500">Médico:</span> {selectedTrip.attending_physician || "-"}</div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Origen</p>
                  <p className="font-bold text-slate-800">{selectedTrip.origin}</p>
                  {selectedTrip.origin_address && <p className="text-xs font-bold text-slate-600 mt-0.5">{selectedTrip.origin_address}</p>}
                  {(selectedTrip.origin_maps_url || selectedTrip.origin) && (
                    <a 
                      href={selectedTrip.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTrip.origin_address || selectedTrip.origin)}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                    >
                      <Navigation className="w-3 h-3 rotate-45" /> Ver en Mapa
                    </a>
                  )}
                </div>
                <div className="bg-white p-3 rounded-xl border shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Destino</p>
                  <p className="font-bold text-slate-800">{selectedTrip.destination}</p>
                  {selectedTrip.destination_address && <p className="text-xs font-bold text-slate-600 mt-0.5">{selectedTrip.destination_address}</p>}
                  {(selectedTrip.destination_maps_url || selectedTrip.destination) && (
                    <a 
                      href={selectedTrip.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTrip.destination_address || selectedTrip.destination)}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                    >
                      <Navigation className="w-3 h-3 rotate-45" /> Ver en Mapa
                    </a>
                  )}
                </div>
              </div>
              {selectedTrip.start_mileage && <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 flex justify-between"><div><p className="text-[10px] font-bold text-teal-600 uppercase">Km Inicio</p><p className="font-black text-teal-900">{selectedTrip.start_mileage}</p></div><div className="text-right"><p className="text-[10px] font-bold text-teal-600 uppercase">Km Final</p><p className="font-black text-teal-900">{selectedTrip.end_mileage || "-"}</p></div></div>}
              {selectedTrip.notes && <div className="bg-amber-50 p-3 rounded-xl border border-amber-200"><p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Notas</p><p className="text-slate-800">{selectedTrip.notes}</p></div>}
              
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Observaciones del Conductor</Label>
                <textarea 
                  className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm bg-white" 
                  placeholder="Escriba aquí sus observaciones o comentarios sobre este traslado..." 
                  value={historyNotesEdit} 
                  onChange={e => setHistoryNotesEdit(e.target.value)} 
                />
                <Button 
                  onClick={() => handleSaveHistoryNotes(selectedTrip.id)} 
                  size="sm" 
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 text-xs rounded-lg shadow-sm"
                  disabled={savingHistoryNotes}
                >
                  {savingHistoryNotes ? "Guardando..." : "Guardar Observaciones"}
                </Button>
              </div>

              <TripEvolutionLog tripId={selectedTrip.id} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LogbookSection() {
  const [activeTab, setActiveTab] = useState("incident");
  const [vehicles, setVehicles] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [incidentForm, setIncidentForm] = useState({ vehicle_id: "", incident_type: "mecanico", severity: "baja", description: "" });
  const [fuelForm, setFuelForm] = useState({ vehicle_id: "", mileage: "", liters: "", amount: "", receipt_number: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, tRes] = await Promise.all([
          api.get("/vehicles"),
          api.get("/trips/driver")
        ]);
        setVehicles(vRes.data || []);
        const currentTrip = (tRes.data || []).find(t => t.status === "en_curso");
        if (currentTrip) {
          setActiveTrip(currentTrip);
          setIncidentForm(prev => ({ ...prev, vehicle_id: currentTrip.vehicle_id }));
          setFuelForm(prev => ({ ...prev, vehicle_id: currentTrip.vehicle_id }));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    if (!incidentForm.vehicle_id || !incidentForm.description) return toast.error("Complete los campos obligatorios");
    setSubmitting(true);
    try {
      await api.post("/logbook/incident", incidentForm);
      toast.success("Incidente reportado correctamente");
      setIncidentForm({ ...incidentForm, description: "" });
    } catch (e) { toast.error("Error al reportar incidente"); }
    finally { setSubmitting(false); }
  };

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    if (!fuelForm.vehicle_id || !fuelForm.mileage || !fuelForm.liters) return toast.error("Complete los campos obligatorios");
    setSubmitting(true);
    try {
      await api.post("/logbook/fuel", {
        ...fuelForm,
        mileage: parseFloat(fuelForm.mileage),
        liters: parseFloat(fuelForm.liters),
        amount: parseFloat(fuelForm.amount || 0)
      });
      toast.success("Carga de combustible registrada");
      setFuelForm({ ...fuelForm, mileage: "", liters: "", amount: "", receipt_number: "" });
    } catch (e) { toast.error(e.response?.data?.detail || "Error al registrar carga"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up pb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bitácora del Móvil</h1>
          <p className="text-sm text-slate-500 font-medium italic">Control operativo y novedades técnicos</p>
        </div>
      </div>

      {activeTrip && (
        <div className="mb-6 bg-teal-50 border border-teal-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center animate-pulse"><Truck className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-[10px] font-black uppercase text-teal-600 tracking-widest">Viaje Activo Detectado</p>
              <p className="text-sm font-bold text-teal-900">Móvil: {vehicles.find(v => v.id === activeTrip.vehicle_id)?.plate || "Cargando..."}</p>
            </div>
          </div>
          <Badge className="bg-teal-600 text-white border-none font-black text-[10px] uppercase">Vehículo Fijo</Badge>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab("incident")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${activeTab === "incident" ? "border-amber-500 bg-amber-50 text-amber-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-amber-200"}`}>
          <AlertTriangle className="w-4 h-4" /> Incidentes
        </button>
        <button onClick={() => setActiveTab("fuel")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${activeTab === "fuel" ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-emerald-200"}`}>
          <Activity className="w-4 h-4" /> Combustible
        </button>
      </div>

      {activeTab === "incident" && (
        <Card className="shadow-sm border-slate-200 overflow-hidden rounded-3xl">
          <CardHeader className="bg-amber-500 text-white p-6">
            <CardTitle className="flex items-center gap-2 text-xl italic font-black uppercase tracking-tighter"><ShieldAlert className="w-6 h-6" /> Reportar Novedad o Incidente</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleIncidentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Móvil</Label>
                  <Select value={incidentForm.vehicle_id} onValueChange={v => setIncidentForm({...incidentForm, vehicle_id: v})} disabled={!!activeTrip}>
                    <SelectTrigger className="h-12 border-2 focus:ring-teal-500 rounded-xl"><SelectValue placeholder="Seleccione patente..." /></SelectTrigger>
                    <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate} - {v.brand}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Tipo de Incidente</Label>
                  <Select value={incidentForm.incident_type} onValueChange={v => setIncidentForm({...incidentForm, incident_type: v})}>
                    <SelectTrigger className="h-12 border-2 focus:ring-teal-500 rounded-xl"><SelectValue placeholder="Seleccione tipo..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mecanico">Mecánico / Motor</SelectItem>
                      <SelectItem value="neumaticos">Neumáticos</SelectItem>
                      <SelectItem value="limpieza">Aseo / Higiene</SelectItem>
                      <SelectItem value="material_clinico">Material Clínico</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Gravedad</Label>
                  <Select value={incidentForm.severity} onValueChange={v => setIncidentForm({...incidentForm, severity: v})}>
                    <SelectTrigger className="h-12 border-2 focus:ring-teal-500 rounded-xl"><SelectValue placeholder="Seleccione gravedad..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja" className="text-emerald-600 font-bold">Baja (Informativo)</SelectItem>
                      <SelectItem value="media" className="text-amber-600 font-bold">Media (Revisión pronto)</SelectItem>
                      <SelectItem value="alta" className="text-red-600 font-bold underline">Alta (Crítico / Desperfecto)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Descripción de lo ocurrido</Label>
                <textarea className="w-full min-h-[120px] p-4 rounded-xl border-2 border-slate-200 text-sm focus:border-amber-500 outline-none transition-all shadow-sm bg-slate-50/50 font-medium" value={incidentForm.description} onChange={e => setIncidentForm({...incidentForm, description: e.target.value})} placeholder="Detalle el problema o novedad detectada con el móvil..." />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-amber-600 hover:bg-amber-700 text-white h-14 text-lg font-black shadow-lg rounded-xl transition-transform active:scale-95">
                {submitting ? "Enviando..." : "Registrar Incidente"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "fuel" && (
        <Card className="shadow-sm border-slate-200 overflow-hidden rounded-3xl">
          <CardHeader className="bg-emerald-600 text-white p-6">
            <CardTitle className="flex items-center gap-2 text-xl italic font-black uppercase tracking-tighter"><Activity className="w-6 h-6" /> Registro de Carga de Combustible</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleFuelSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Móvil</Label>
                  <Select value={fuelForm.vehicle_id} onValueChange={v => setFuelForm({...fuelForm, vehicle_id: v})} disabled={!!activeTrip}>
                    <SelectTrigger className="h-12 border-2 focus:ring-teal-500 rounded-xl"><SelectValue placeholder="Seleccione patente..." /></SelectTrigger>
                    <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate} - {v.brand}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Kilometraje de la Carga</Label>
                  <Input type="number" className="h-12 font-bold border-2 rounded-xl" value={fuelForm.mileage} onChange={e => setFuelForm({...fuelForm, mileage: e.target.value})} placeholder="Ej: 125400" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Litros</Label>
                  <Input type="number" step="0.01" className="h-12 font-bold border-2 rounded-xl" value={fuelForm.liters} onChange={e => setFuelForm({...fuelForm, liters: e.target.value})} placeholder="Ej: 45.5" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Monto Total ($)</Label>
                  <Input type="number" className="h-12 font-bold border-2 rounded-xl" value={fuelForm.amount} onChange={e => setFuelForm({...fuelForm, amount: e.target.value})} placeholder="Ej: 55000" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">N° de Boleta / Documento</Label>
                  <Input className="h-12 font-bold border-2 rounded-xl" value={fuelForm.receipt_number} onChange={e => setFuelForm({...fuelForm, receipt_number: e.target.value})} placeholder="Ej: 001234" />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg font-black shadow-lg rounded-xl mt-4 transition-transform active:scale-95">
                {submitting ? "Registrando..." : "Confirmar Carga"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DriverCalendarSection() {
  const [viewMode, setViewMode] = useState("monthly"); // monthly o weekly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [driverNotesEdit, setDriverNotesEdit] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/trips/driver");
      setTrips(res.data || []);
    } catch (e) {
      toast.error("Error al cargar el calendario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handleOpenDetails = (trip) => {
    setSelectedTrip(trip);
    setDriverNotesEdit(trip.driver_notes || "");
  };

  const handleSaveDriverNotes = async (tripId) => {
    setSavingNotes(true);
    try {
      await api.put(`/trips/${tripId}/status`, {
        driver_notes: driverNotesEdit
      });
      toast.success("Observaciones guardadas correctamente");
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, driver_notes: driverNotesEdit } : t));
      setSelectedTrip(prev => prev ? { ...prev, driver_notes: driverNotesEdit } : null);
    } catch (err) {
      console.error("Error saving notes:", err);
      toast.error("Error al guardar observaciones");
    } finally {
      setSavingNotes(false);
    }
  };

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (viewMode === "weekly") {
      d.setDate(d.getDate() + dir * 7);
    } else {
      d.setMonth(d.getMonth() + dir);
    }
    setCurrentDate(d);
  };

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const getWeekDates = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const nd = new Date(monday);
      nd.setDate(monday.getDate() + i);
      return nd.toISOString().split("T")[0];
    });
  };

  const getMonthGrid = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < startDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(new Date(y, m, d).toISOString().split("T")[0]);
    }
    return grid;
  };

  const tripsByDate = (dateStr) => {
    return trips.filter(t => {
      const d = t.scheduled_date || t.created_at;
      return d && d.split("T")[0] === dateStr;
    });
  };

  const getTitle = () => {
    if (viewMode === "weekly") {
      const weekDates = getWeekDates();
      return `${formatScheduledDate(weekDates[0])} — ${formatScheduledDate(weekDates[6])}`;
    }
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const statusColors = {
    pendiente: "bg-amber-100 text-amber-800 border border-amber-200",
    revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200",
    asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200",
    en_curso: "bg-blue-100 text-blue-800 border border-blue-200",
    completado: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    cancelado: "bg-rose-100 text-rose-800 border border-rose-200",
    devuelto: "bg-rose-100 text-rose-800 border border-rose-200",
  };

  const sLabels = {
    pendiente: "Pendiente",
    revision_gestor: "En Revisión",
    asignado: "Asignado",
    en_curso: "En Curso",
    completado: "Completado",
    cancelado: "Cancelado",
    devuelto: "Devuelto",
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Mi Calendario de Viajes</h1>
          <p className="text-slate-500 font-bold text-sm mt-0.5 capitalize">{getTitle()}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-sm font-bold">
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-4 py-2 rounded-lg text-xs transition-all ${
                viewMode === "monthly" ? "bg-teal-600 text-white shadow-md font-bold" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-4 py-2 rounded-lg text-xs transition-all ${
                viewMode === "weekly" ? "bg-teal-600 text-white shadow-md font-bold" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Semana
            </button>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-black text-teal-700 hover:bg-teal-50 rounded-lg"
            >
              Hoy
            </button>
            <button onClick={() => navigate(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Clock className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : (
        <>
          {viewMode === "monthly" && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-bold">
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                {dayNames.map(d => (
                  <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-4 tracking-widest">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {getMonthGrid().map((dateStr, i) => {
                  if (!dateStr) return <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/30 border-r border-b border-slate-50" />;
                  const dayTrips = tripsByDate(dateStr);
                  const isToday = dateStr === new Date().toISOString().split("T")[0];
                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        setCurrentDate(new Date(dateStr + "T12:00:00"));
                        setViewMode("weekly");
                      }}
                      className={`min-h-[120px] p-2 cursor-pointer hover:bg-teal-50/20 transition-all border-r border-b border-slate-100 relative group flex flex-col justify-between ${
                        isToday ? "bg-teal-50/10" : ""
                      }`}
                    >
                      <span
                        className={`text-sm font-black mb-1 w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday ? "text-teal-700 bg-teal-100 shadow-xs" : "text-slate-600 group-hover:text-teal-600"
                        }`}
                      >
                        {parseInt(dateStr.split("-")[2])}
                      </span>
                      <div className="space-y-1 mt-1 flex-1 overflow-y-hidden flex flex-col justify-end">
                        {dayTrips.slice(0, 2).map(t => {
                          const colorClass = statusColors[t.status] || "bg-slate-100 text-slate-800 border-slate-200";
                          return (
                            <div
                              key={t.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentDate(new Date(dateStr + "T12:00:00"));
                                setViewMode("weekly");
                              }}
                              className={`text-[9px] px-1.5 py-0.5 rounded border truncate font-bold leading-tight ${colorClass}`}
                              title={t.trip_type === "clinico" ? t.patient_name : t.task_details}
                            >
                              <span className="font-mono mr-0.5">{t.appointment_time || "--:--"}</span>{" "}
                              {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                            </div>
                          );
                        })}
                        {dayTrips.length > 2 && (
                          <p className="text-[8px] font-black text-slate-400 pl-1">
                            +{dayTrips.length - 2} más
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "weekly" && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {getWeekDates().map((dateStr, i) => {
                const dayTrips = tripsByDate(dateStr);
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                return (
                  <div
                    key={dateStr}
                    className={`bg-white rounded-2xl border-2 p-3 min-h-[350px] transition-all duration-200 flex flex-col ${
                      isToday ? "border-teal-400 shadow-md shadow-teal-900/5 bg-teal-50/5" : "border-slate-150 shadow-sm"
                    }`}
                  >
                    <div className={`text-center mb-3 pb-2 border-b-2 rounded-xl py-1 ${isToday ? "border-teal-200 bg-teal-50/40" : "border-slate-50"}`}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dayNames[i]}</p>
                      <p className={`text-lg font-black ${isToday ? "text-teal-700" : "text-slate-800"}`}>{dateStr.split("-")[2]}</p>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                      {dayTrips.map(t => {
                        const colorClass = statusColors[t.status] || "bg-slate-100 text-slate-800 border-slate-200";
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleOpenDetails(t)}
                            className={`p-2.5 rounded-xl border-l-4 mb-2 text-left cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${colorClass} shadow-sm`}
                          >
                            <div className="flex justify-between items-start gap-1 mb-1">
                              <span className="font-mono text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded leading-none">
                                {t.appointment_time || "--:--"}
                              </span>
                              <span className="text-[8px] font-mono tracking-widest opacity-80 font-bold uppercase">
                                {t.tracking_number}
                              </span>
                            </div>
                            <p className="font-black text-xs text-slate-800 leading-tight truncate">
                              {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                            </p>
                            <p className="text-[9px] text-slate-500 font-semibold truncate mt-1">
                              {t.origin} ➔ {t.destination}
                            </p>
                          </div>
                        );
                      })}
                      {dayTrips.length === 0 && (
                        <p className="text-[10px] text-slate-300 text-center mt-12 italic font-bold uppercase tracking-wider">
                          Sin viajes
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedTrip && (
        <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0">
            <div className={`${statusHeaderStyles[selectedTrip.status]?.bg || "bg-slate-900"} p-8 pb-10 relative transition-colors duration-300 rounded-t-[2rem]`}>
              <div className="absolute top-6 right-14">
                <Badge className={`${statusHeaderStyles[selectedTrip.status]?.badge || "bg-slate-800 text-white"} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                  {(selectedTrip.status || "").replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 ${statusHeaderStyles[selectedTrip.status]?.iconBg || "bg-white/10"} rounded-2xl flex items-center justify-center border border-white/10`}>
                  {selectedTrip.trip_type === "clinico" ? <Activity className={`w-8 h-8 ${statusHeaderStyles[selectedTrip.status]?.iconText || "text-teal-400"}`} /> : <Truck className={`w-8 h-8 ${statusHeaderStyles[selectedTrip.status]?.iconText || "text-blue-400"}`} />}
                </div>
                <div>
                  <p className={`${statusHeaderStyles[selectedTrip.status]?.iconText || "text-teal-400"} text-[10px] uppercase tracking-[0.2em] font-black mb-1`}>
                    Folio #{selectedTrip.tracking_number} — Detalle Completo
                  </p>
                  <h2 className={`text-3xl font-black ${statusHeaderStyles[selectedTrip.status]?.text || "text-white"} leading-tight uppercase tracking-tight`}>
                    {selectedTrip.trip_type === "clinico" ? "Traslado Clínico" : "Cometido No Clínico"}
                  </h2>
                </div>
              </div>
            </div>
            <div className="p-8 pt-4 space-y-5 text-sm">
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                <p className="text-sm text-red-600 font-black mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-5 h-5" /> Horarios de Traslado
                </p>
                <p className="font-black text-red-900 text-xl md:text-2xl mt-1">
                  Citación: {selectedTrip.appointment_time || "-"} <span className="text-slate-400 mx-2">|</span> Salida:{" "}
                  {selectedTrip.departure_time || "-"}
                </p>
                <p className="text-base font-bold text-red-800 mt-2 bg-red-100 inline-block px-3 py-1 rounded-lg">
                  Fecha: {formatScheduledDate(selectedTrip.scheduled_date)}
                </p>
              </div>

              <div className="flex gap-2 mb-2 mt-4">
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${statusColorsSolid[selectedTrip.status] || "bg-slate-500 text-white"}`}>
                  {sLabels[selectedTrip.status] || selectedTrip.status}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">
                  {selectedTrip.trip_type === "clinico" ? "Traslado Clínico" : "Traslado No Clínico"}
                </span>
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${
                  selectedTrip.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                }`}>
                  {selectedTrip.priority}
                </span>
              </div>

              {selectedTrip.trip_type === "clinico" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="col-span-2 md:col-span-4 border-b border-slate-200 pb-2 mb-2">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Paciente</p>
                      <p className="font-black text-xl text-slate-900">{selectedTrip.patient_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">RUT</p>
                      <p className="font-bold text-base text-slate-800">{selectedTrip.rut || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Edad / Peso</p>
                      <p className="font-bold text-base text-slate-800">
                        {selectedTrip.age || "-"} / {selectedTrip.weight || "-"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 font-bold">Diagnóstico</p>
                      <p className="font-bold text-base text-slate-800">{selectedTrip.diagnosis || "-"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Motivo Clínico</p>
                      <p className="font-medium text-slate-800">{selectedTrip.transfer_reason}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Médico Tratante</p>
                      <p className="font-medium text-slate-800">{selectedTrip.attending_physician || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 font-bold">Solicitante</p>
                      <p className="font-medium text-slate-800">{selectedTrip.requester_person}</p>
                    </div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 shadow-sm">
                    {selectedTrip.required_personnel?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-teal-800 uppercase tracking-wider font-black mb-1">Personal Requerido</p>
                        <p className="text-teal-900 font-bold text-base">{selectedTrip.required_personnel.join(", ")}</p>
                      </div>
                    )}
                    {selectedTrip.patient_requirements?.length > 0 && (
                      <div>
                        <p className="text-xs text-teal-800 uppercase tracking-wider font-black mb-1">Requerimientos Paciente</p>
                        <p className="text-teal-900 font-bold text-base bg-white inline-block px-3 py-1 rounded-lg border border-teal-100">
                          {selectedTrip.patient_requirements.join(", ")}
                        </p>
                      </div>
                    )}
                    {selectedTrip.accompaniment && selectedTrip.accompaniment !== "ninguno" && (
                      <div className="mt-3 pt-3 border-t border-teal-200">
                        <p className="text-sm text-teal-800 font-bold">
                          Acompañamiento: <span className="text-teal-900 font-black">{selectedTrip.accompaniment}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cometido</p>
                    <p className="font-black text-lg text-slate-900">{selectedTrip.task_details}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Cantidad de Funcionarios</p>
                    <p className="font-medium text-slate-800">{selectedTrip.staff_count}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest">
                    <MapPin className="w-4 h-4 text-teal-600" /> Origen
                  </p>
                  <p className="font-black text-lg text-slate-900">{selectedTrip.origin}</p>
                  {selectedTrip.origin_address && <p className="text-sm font-bold text-slate-700 mt-1">{selectedTrip.origin_address}</p>}
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    {selectedTrip.patient_unit || ""} {selectedTrip.bed ? `(Cama ${selectedTrip.bed})` : ""}
                  </p>
                  {(selectedTrip.origin_maps_url || selectedTrip.origin) && (
                    <a
                      href={
                        selectedTrip.origin_maps_url ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          selectedTrip.origin_address || selectedTrip.origin
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 shadow-sm mt-3 w-full sm:w-auto justify-center"
                    >
                      <Navigation className="w-3.5 h-3.5 rotate-45" /> Ver en Google Maps
                    </a>
                  )}
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest">
                    <Navigation className="w-4 h-4 text-blue-600" /> Destino
                  </p>
                  <p className="font-black text-lg text-slate-900">{selectedTrip.destination}</p>
                  {selectedTrip.destination_address && <p className="text-sm font-bold text-slate-700 mt-1">{selectedTrip.destination_address}</p>}
                  {(selectedTrip.destination_maps_url || selectedTrip.destination) && (
                    <a
                      href={
                        selectedTrip.destination_maps_url ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          selectedTrip.destination_address || selectedTrip.destination
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm mt-3 w-full sm:w-auto justify-center"
                    >
                      <Navigation className="w-3.5 h-3.5 rotate-45" /> Ver en Google Maps
                    </a>
                  )}
                </div>
              </div>

              {selectedTrip.notes && (
                <div className="border-t border-slate-200 pt-5">
                  <p className="text-xs text-slate-500 font-bold mb-2 uppercase tracking-widest">Notas Adicionales</p>
                  <p className="bg-amber-50 p-4 rounded-xl text-slate-800 font-medium border border-amber-200">
                    {selectedTrip.notes}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-5 space-y-2">
                <Label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Observaciones del Conductor</Label>
                <textarea
                  className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm bg-white"
                  placeholder="Escriba aquí sus observaciones o comentarios sobre este traslado..."
                  value={driverNotesEdit}
                  onChange={e => setDriverNotesEdit(e.target.value)}
                />
                <Button
                  onClick={() => handleSaveDriverNotes(selectedTrip.id)}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 text-xs rounded-lg shadow-sm"
                  disabled={savingNotes}
                >
                  {savingNotes ? "Guardando..." : "Guardar Observaciones"}
                </Button>
              </div>

              <TripEvolutionLog tripId={selectedTrip.id} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

