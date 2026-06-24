import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Ambulance, ClipboardList, User, MapPin, Map, Truck } from "lucide-react";
import api from "@/lib/api";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import { formatScheduledDate } from "@/lib/tripUtils";

export default function TripDetailDialog({ trip, open, onOpenChange, onRefresh }) {
  if (!trip) return null;

  const handleUnassign = async () => {
    try {
      await api.put(`/trips/${trip.id}/unassign`);
      toast.success("Traslado desasignado correctamente");
      onOpenChange(false);
      if (onRefresh) onRefresh();
    } catch (e) {
      toast.error("Error al desasignar traslado");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-50 rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Detalle del Traslado</DialogTitle>
        <DialogDescription className="sr-only">Detalles completos y evolución del traslado seleccionado</DialogDescription>
        {/* Cabecera Estilizada */}
        {(() => {
          const headerBgColors = {
            pendiente: "bg-amber-600",
            revision_gestor: "bg-purple-600",
            asignado: "bg-indigo-600",
            en_curso: "bg-blue-600",
            completado: "bg-emerald-600",
            cancelado: "bg-rose-600",
            devuelto: "bg-rose-600"
          };
          const headerBadgeColors = {
            pendiente: "bg-amber-800 text-white",
            revision_gestor: "bg-purple-800 text-white",
            asignado: "bg-indigo-800 text-white",
            en_curso: "bg-blue-800 text-white",
            completado: "bg-emerald-800 text-white",
            cancelado: "bg-rose-800 text-white",
            devuelto: "bg-rose-800 text-white"
          };
          const iconTextColors = {
            pendiente: "text-amber-100",
            revision_gestor: "text-purple-100",
            asignado: "text-indigo-100",
            en_curso: "text-blue-100",
            completado: "text-emerald-100",
            cancelado: "text-rose-100",
            devuelto: "text-rose-100"
          };
          const iconBgColors = {
            pendiente: "bg-amber-700/40",
            revision_gestor: "bg-purple-700/40",
            asignado: "bg-indigo-700/40",
            en_curso: "bg-blue-700/40",
            completado: "bg-emerald-700/40",
            cancelado: "bg-rose-700/40",
            devuelto: "bg-rose-700/40"
          };
          const headerBg = headerBgColors[trip.status] || "bg-slate-900";
          const badgeBg = headerBadgeColors[trip.status] || "bg-slate-800 text-white";
          const iconText = iconTextColors[trip.status] || "text-teal-400";
          const iconBg = iconBgColors[trip.status] || "bg-white/10";
          return (
            <div className={`${headerBg} p-8 pb-10 relative transition-colors duration-300 rounded-t-[2rem]`}>
              <div className="absolute top-6 right-14">
                <Badge className={`${badgeBg} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                  {(trip.status || "").replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 ${iconBg} rounded-2xl flex items-center justify-center border border-white/10`}>
                  {trip.trip_type === "clinico" ? <Ambulance className={`w-8 h-8 ${iconText}`} /> : <ClipboardList className={`w-8 h-8 ${iconText}`} />}
                </div>
                <div>
                  <p className={`${iconText} text-[10px] uppercase tracking-[0.2em] font-black mb-1`}>
                    Folio #{trip.tracking_number || trip.id.substring(0, 8).toUpperCase()}
                  </p>
                  <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                    {trip.trip_type === "clinico" ? "Traslado Clínico" : "Cometido General"}
                  </h2>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Contenido Principal */}
        <div className="p-8 -mt-6 bg-slate-50 rounded-t-[2rem] relative space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Izquierda */}
            <div className="space-y-6">
              {/* Información General */}
              <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4 h-4 text-teal-600" /> Información General
                </h3>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Paciente / Tarea</p>
                  <p className="text-sm font-black text-slate-900">{trip.patient_name || trip.task_details || "-"}</p>
                </div>
                {trip.trip_type === "clinico" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">RUT</p>
                      <p className="text-sm font-bold text-slate-800">{trip.rut || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cama/Unidad</p>
                      <p className="text-sm font-bold text-slate-800">
                        {trip.bed || "-"} ({trip.patient_unit || "-"})
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Motivo / Diagnóstico</p>
                  <p className="text-sm font-bold text-slate-800">{trip.diagnosis || trip.transfer_reason || "-"}</p>
                </div>
                {trip.notes && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100/50 mt-2">
                    <p className="text-[10px] uppercase font-black text-amber-600 tracking-wider mb-1">Notas Adicionales</p>
                    <p className="text-xs font-bold text-amber-900 leading-relaxed">{trip.notes}</p>
                  </div>
                )}
                {trip.driver_notes && (
                  <div className="bg-teal-50 p-3 rounded-xl border border-teal-100/50 mt-2">
                    <p className="text-[10px] uppercase font-black text-teal-600 tracking-wider mb-1">Observaciones del Conductor</p>
                    <p className="text-xs font-bold text-teal-900 leading-relaxed">{trip.driver_notes}</p>
                  </div>
                )}
              </div>

              {/* Ruta y Tiempos */}
              <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <MapPin className="w-4 h-4 text-teal-600" /> Ruta y Tiempos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Origen</p>
                    <p className="text-sm font-black text-slate-900">{trip.origin}</p>
                    {trip.origin_address && <p className="text-xs font-bold text-slate-500 mt-0.5">{trip.origin_address}</p>}
                    {(trip.origin_maps_url || trip.origin) && (
                      <a
                        href={
                          trip.origin_maps_url ||
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.origin_address || trip.origin)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                      >
                        <Map className="w-3 h-3" /> Ver en Google Maps
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Destino</p>
                    <p className="text-sm font-black text-slate-900">{trip.destination}</p>
                    {trip.destination_address && <p className="text-xs font-bold text-slate-500 mt-0.5">{trip.destination_address}</p>}
                    {(trip.destination_maps_url || trip.destination) && (
                      <a
                        href={
                          trip.destination_maps_url ||
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination_address || trip.destination)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                      >
                        <Map className="w-3 h-3" /> Ver en Google Maps
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fecha Prog.</p>
                    <p className="text-sm font-bold text-slate-800">{formatScheduledDate(trip.scheduled_date) || "Hoy"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Citación</p>
                    <p className="text-sm font-black text-teal-600">{trip.appointment_time || "--:--"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-6">
              {/* Asignación Operativa */}
              <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Truck className="w-4 h-4 text-teal-600" /> Asignación Operativa
                </h3>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-3">Conductor y Móvil</p>
                  {trip.driver_name ? (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-teal-700 border border-slate-200 shadow-sm">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{trip.driver_name}</p>
                          <Badge className="bg-teal-50 text-teal-800 border border-teal-200/50 font-mono text-[10px] shadow-sm mt-0.5">
                            {trip.vehicle_plate || "Sin patente"}
                          </Badge>
                        </div>
                      </div>
                      {trip.driver_id && trip.status === "asignado" && (
                        <Button onClick={handleUnassign} variant="destructive" size="sm" className="h-8 px-4 text-xs font-bold shadow-md rounded-xl">
                          Desasignar
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-slate-400 italic">No se ha asignado conductor</p>
                  )}
                </div>

                {trip.trip_type === "clinico" && (
                  <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100/50">
                    <p className="text-[10px] uppercase font-black text-teal-700 tracking-wider mb-3">Equipo Clínico</p>
                    {trip.assigned_clinical_staff && trip.assigned_clinical_staff.length > 0 ? (
                      <div className="space-y-2">
                        {trip.assigned_clinical_staff.map((s, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-teal-600/80 font-bold uppercase tracking-wide text-[10px]">{s.type}</span>
                            <span className="font-black text-teal-900">{s.staff_name || "PDTE."}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-teal-900">
                        {trip.required_personnel?.join(", ") || trip.clinical_team || "No especificado"}
                      </p>
                    )}
                  </div>
                )}

                {trip.patient_requirements && trip.patient_requirements.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 mt-4">Requerimientos</p>
                    <div className="flex flex-wrap gap-2">
                      {trip.patient_requirements.map((req, i) => (
                        <span
                          key={i}
                          className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase border border-slate-200"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <TripEvolutionLog tripId={trip.id} />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200/60 mt-6 pb-6 px-8">
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-slate-900 text-white rounded-2xl px-10 h-12 text-xs font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
