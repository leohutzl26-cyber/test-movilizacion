import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, Truck, MapPin, ArrowRight, CheckCircle, Navigation, Play, FileText, AlertTriangle, CalendarDays, Ambulance, ClipboardList } from "lucide-react";
import api from "@/lib/api";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import { formatScheduledDate, statusBorders, statusColorsSolid, statusHeaderStyles } from "@/lib/tripUtils";

export default function MyTripsSection() {
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
        driver_notes: driverNotesEdit,
      });
      toast.success("Observaciones guardadas correctamente");
      setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, driver_notes: driverNotesEdit } : t)));
      setDetailsDialog((prev) => (prev ? { ...prev, driver_notes: driverNotesEdit } : null));
    } catch (err) {
      console.error("Error saving notes:", err);
      toast.error("Error al guardar observaciones");
    } finally {
      setSavingNotes(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const fetchAll = useCallback(async () => {
    try {
      const [t, v] = await Promise.all([api.get("/trips/driver"), api.get("/vehicles")]);
      console.log("My trips data:", t.data);
      setTrips((t.data || []).filter((tr) => ["asignado", "en_curso"].includes(tr.status)));
      setVehicles((v.data || []).filter((veh) => veh.status === "disponible"));
    } catch (err) {
      console.error("Error fetching my trips:", err.response?.status, err.response?.data, err.message);
    } finally {
      setLoading(false);
    }
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

  const tripsHoy = trips.filter((t) => t.status === "en_curso" || cleanDateStr(t.scheduled_date) <= today);
  const tripsProgramados = trips.filter((t) => t.status !== "en_curso" && cleanDateStr(t.scheduled_date) > today);
  const displayTrips = activeTab === "hoy" ? tripsHoy : tripsProgramados;

  const openActionDialog = (trip, type) => {
    setActionDialog(trip);
    setActionType(type);
    setCancelReason("");
    setShowWarning(false);

    if (type === "start") {
      const vehId = trip.vehicle_id || "";
      setSelectedVehicle(vehId);
      if (vehId) {
        const veh = vehicles.find((v) => v.id === vehId);
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
      const veh = vehicles.find((v) => v.id === vehId);
      if (veh) setMileage(veh.mileage.toString());
    }
  };

  const handleAction = async () => {
    if (actionType === "start" && !selectedVehicle) {
      toast.error("Seleccione un vehículo");
      return;
    }
    if (actionType === "start" && !mileage) {
      toast.error("Ingrese kilometraje inicial");
      return;
    }
    if (actionType === "end" && !mileage) {
      toast.error("Ingrese kilometraje final");
      return;
    }
    if (actionType === "cancel" && !cancelReason) {
      toast.error("Debe ingresar un motivo");
      return;
    }

    if (actionType === "end" && actionDialog?.start_mileage) {
      const distance = parseFloat(mileage) - actionDialog.start_mileage;
      if (distance > 700 && !showWarning) {
        setShowWarning(true);
        return;
      }
    }

    try {
      if (actionType === "cancel") {
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

  const sLabels = { asignado: "Asignado", en_curso: "En Curso", completado: "Completado" };

  if (loading) return <div className="flex justify-center py-20"><Clock className="w-10 h-10 animate-spin text-teal-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Mis Viajes Asignados</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("hoy")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${
            activeTab === "hoy" ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-teal-200"
          }`}
        >
          <Play className="w-4 h-4" /> Hoy ({tripsHoy.length})
        </button>
        <button
          onClick={() => setActiveTab("programados")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${
            activeTab === "programados" ? "border-indigo-600 bg-indigo-50 text-indigo-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-indigo-200"
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Programados ({tripsProgramados.length})
        </button>
      </div>

      <div className="space-y-6">
        {displayTrips.map((t) => {
          const isToday = cleanDateStr(t.scheduled_date) === today || t.status === "en_curso";
          return (
            <Card key={t.id} className={`shadow-md border-l-4 ${statusBorders[t.status] || "border-l-slate-200"} overflow-hidden rounded-xl ${!isToday ? "opacity-80" : ""}`}>
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-slate-100 pb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-800 text-white font-mono px-3 py-1 rounded-md text-sm font-black shadow-sm tracking-widest">
                        {t.tracking_number || t.id.substring(0, 6).toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border-none ${statusColorsSolid[t.status]}`}>
                        {sLabels[t.status] || t.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <span className={`text-sm font-bold px-3 py-1.5 rounded-md border shadow-sm flex-1 text-center md:flex-none ${isToday ? "text-teal-700 bg-teal-100 border-teal-200" : "text-indigo-700 bg-indigo-100 border-indigo-200"}`}>
                        {t.scheduled_date ? formatScheduledDate(t.scheduled_date) : new Date(t.created_at).toLocaleDateString()}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDetails(t)} className="h-10 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200">
                        <FileText className="w-4 h-4 mr-1.5" />Info Completa
                      </Button>
                    </div>
                  </div>

                  <p className="font-black text-xl text-slate-900 leading-tight mb-4">
                    {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                  </p>

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
        {displayTrips.length === 0 && (
          <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
            <p className="text-xl font-bold text-slate-500">{activeTab === "hoy" ? "No tienes viajes para hoy" : "No tienes viajes programados"}</p>
            <p className="text-sm font-medium mt-2">{activeTab === "hoy" ? "Revisa la bolsa de viajes disponibles para tomar uno." : "Los viajes futuros aparecerán aquí."}</p>
          </div>
        )}
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
                  {detailsDialog.trip_type === "clinico" ? <Ambulance className={`w-8 h-8 ${statusHeaderStyles[detailsDialog.status]?.iconText || "text-teal-400"}`} /> : <ClipboardList className={`w-8 h-8 ${statusHeaderStyles[detailsDialog.status]?.iconText || "text-blue-400"}`} />}
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

              {detailsDialog.vehicle_plate && (
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-xl border border-teal-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black text-teal-600 tracking-wider">Vehículo Asignado</p>
                      <p className="font-black text-slate-900 text-lg leading-tight mt-0.5">{detailsDialog.vehicle_plate}</p>
                    </div>
                  </div>
                  {detailsDialog.status === 'en_curso' && (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-1 border-none shadow-sm animate-pulse">
                      En Traslado
                    </Badge>
                  )}
                </div>
              )}

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
