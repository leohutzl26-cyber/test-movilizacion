import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, Activity, Stethoscope, HeartPulse, ShieldAlert, Clock, MapPin, CheckCircle2, AlertTriangle, Truck, Phone, FileText, Send, Calendar, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import { formatScheduledDate } from "@/lib/tripUtils";

export default function ClinicalDetailDialog({ trip, open, onOpenChange, onRefresh }) {
  const [clinicalNotes, setClinicalNotes] = useState(trip?.clinical_notes || trip?.driver_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [incidentReason, setIncidentReason] = useState("");
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!trip) return null;

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.put(`/trips/${trip.id}/status`, {
        clinical_notes: clinicalNotes
      });
      toast.success("Observaciones clínicas guardadas exitosamente");
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Error saving clinical notes:", e);
      toast.error("Error al guardar observaciones clínicas");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleConfirmEscort = async () => {
    setActionLoading(true);
    try {
      await api.put(`/trips/${trip.id}/status`, {
        clinical_escort_confirmed: true,
        clinical_notes: clinicalNotes ? `${clinicalNotes}\n[Confirmación]: Acompañamiento verificado por personal de salud.` : "[Confirmación]: Acompañamiento verificado por personal de salud."
      });
      toast.success("Acompañamiento clínico verificado y verificado");
      if (onRefresh) onRefresh();
    } catch (e) {
      toast.error("Error al confirmar acompañamiento");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportIncident = async () => {
    if (!incidentReason.trim()) {
      toast.error("Ingrese el motivo de la incidencia o retraso");
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/trips/${trip.id}/status`, {
        notes: `${trip.notes || ''}\n[INCIDENCIA CLÍNICA]: ${incidentReason}`,
        clinical_notes: `${clinicalNotes || ''}\n[RETRASO/INCIDENCIA]: ${incidentReason}`
      });
      toast.success("Incidencia clínica reportada a Coordinación y Gestor de Camas");
      setShowIncidentForm(false);
      setIncidentReason("");
      if (onRefresh) onRefresh();
    } catch (e) {
      toast.error("Error al registrar incidencia");
    } finally {
      setActionLoading(false);
    }
  };

  const appendTemplate = (text) => {
    setClinicalNotes(prev => (prev ? `${prev}\n- ${text}` : `- ${text}`));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-slate-200">
        {/* Header Clínico */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-5 rounded-t-2xl">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-white/30 text-xs font-mono font-black">
                #{trip.tracking_number}
              </Badge>
              <Badge className={`text-xs font-black uppercase ${
                trip.priority === 'urgente' ? 'bg-red-500 text-white' :
                trip.priority === 'alta' ? 'bg-orange-500 text-white' : 'bg-teal-500 text-white'
              }`}>
                Prioridad: {trip.priority || 'Normal'}
              </Badge>
            </div>
            <span className="text-xs text-teal-100 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {trip.scheduled_date ? formatScheduledDate(trip.scheduled_date) : 'Hoy'}
            </span>
          </div>

          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-300" /> Ficha Clínica de Traslado
          </h2>
          <p className="text-xs text-teal-100/90 mt-1">
            Información del paciente, indicación médica y bitácora de acompañamiento.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Ficha Principal del Paciente */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" /> Datos del Paciente
              </h3>
              {trip.patient_unit && (
                <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Unidad: {trip.patient_unit} {trip.bed ? `— Cama ${trip.bed}` : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Nombre Paciente</span>
                <p className="font-black text-slate-900 text-sm">{trip.patient_name || "No especificado"}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">RUT / Identificación</span>
                <p className="font-bold text-slate-700">{trip.rut || "Sin RUT"}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Edad / Peso</span>
                <p className="font-bold text-slate-700">{trip.age ? `${trip.age} años` : 'N/A'} {trip.weight ? `(${trip.weight} kg)` : ''}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Diagnóstico Clínico</span>
                <p className="font-bold text-slate-800 bg-white p-2 rounded border border-slate-200 mt-0.5">
                  {trip.diagnosis || "Sin diagnóstico especificado"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Médico Tratante</span>
                <p className="font-bold text-slate-700 mt-0.5">{trip.attending_physician || "No asignado"}</p>
              </div>
            </div>
          </div>

          {/* Ruta y Tiempos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 p-3.5 rounded-xl bg-white space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Ruta del Traslado</span>
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Origen</span>
                  <span className="font-bold text-slate-800">{trip.origin}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs pt-1 border-t border-slate-100">
                <ArrowRight className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Destino</span>
                  <span className="font-bold text-slate-800">{trip.destination}</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 p-3.5 rounded-xl bg-white space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Horarios e Integrantes</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Hora Citación/Salida:</span>
                <span className="font-black text-slate-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  {trip.appointment_time || trip.departure_time || "Por confirmar"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <span className="text-slate-500">Conductor & Móvil:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  {trip.driver_name || "Sin conductor"} ({trip.vehicle_plate || "S/M"})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <span className="text-slate-500">Solicitante:</span>
                <span className="font-bold text-slate-700">{trip.requester_name || "Gestión de Camas"}</span>
              </div>
            </div>
          </div>

          {/* Requerimientos y Equipo de Acompañamiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 p-3.5 rounded-xl bg-white space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Requerimientos del Paciente</span>
              <div className="flex flex-wrap gap-1.5">
                {(trip.patient_requirements || []).length > 0 ? (
                  trip.patient_requirements.map((req, i) => (
                    <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">
                      {typeof req === 'object' ? req.name || req.label : req}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Sin requerimientos especiales</span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 p-3.5 rounded-xl bg-white space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Equipo Clínico Asignado</span>
              <div className="space-y-1">
                {(trip.assigned_clinical_staff || []).length > 0 ? (
                  trip.assigned_clinical_staff.map((st, i) => {
                    let item = st;
                    if (typeof st === 'string') {
                      try { item = JSON.parse(st); } catch(e) {}
                    }
                    const name = item.staff_name || item.name || item.nombre || 'Personal asignado';
                    const type = item.type || item.cargo || 'Acompañante';
                    return (
                      <div key={i} className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-100 flex items-center justify-between">
                        <span>{name}</span>
                        <span className="text-[9px] font-black uppercase text-teal-600">{type}</span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-400 italic">No se ha registrado personal de acompañamiento</span>
                )}
              </div>
            </div>
          </div>

          {/* Observaciones Clínicas y Bitácora de Transporte */}
          <div className="border border-teal-200 bg-teal-50/30 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-teal-900 uppercase flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-teal-600" /> Bitácora de Observaciones Clínicas del Traslado
              </h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => appendTemplate("Signos vitales estables")}
                  className="text-[9px] font-bold bg-white text-teal-700 border border-teal-200 px-2 py-0.5 rounded hover:bg-teal-100"
                >
                  + Signos estables
                </button>
                <button
                  type="button"
                  onClick={() => appendTemplate("Vía venosa permeable y O2 continuo")}
                  className="text-[9px] font-bold bg-white text-teal-700 border border-teal-200 px-2 py-0.5 rounded hover:bg-teal-100"
                >
                  + Vía/O2 ok
                </button>
              </div>
            </div>

            <Textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Ingrese estado clínico del paciente al inicio, durante la ruta o al momento de la entrega en destino..."
              className="bg-white border-slate-200 text-xs rounded-xl min-h-[90px]"
            />

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                size="sm"
                className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-8"
              >
                {savingNotes ? "Guardando..." : "Guardar Notas Clínicas"}
              </Button>
            </div>
          </div>

          {/* Formulario de Incidencia / Retraso */}
          {showIncidentForm ? (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-3 animate-fadeIn">
              <h4 className="text-xs font-black text-red-800 uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" /> Reportar Retraso o Incidencia Clínica
              </h4>
              <Input
                value={incidentReason}
                onChange={(e) => setIncidentReason(e.target.value)}
                placeholder="Describa el motivo del retraso o problema clínico (ej. descompensación, retraso en ambulancia...)"
                className="bg-white border-red-200 text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowIncidentForm(false)} className="text-xs h-8">
                  Cancelar
                </Button>
                <Button onClick={handleReportIncident} disabled={actionLoading} size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8">
                  Enviar Reporte
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIncidentForm(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-8 font-bold flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Reportar Retraso / Incidencia
              </Button>

              <Button
                onClick={handleConfirmEscort}
                disabled={actionLoading}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar Acompañamiento
              </Button>
            </div>
          )}

          {/* Historial de Auditoría / Evolución del Traslado */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-black text-slate-700 uppercase mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" /> Evolución Registrada del Traslado
            </h4>
            <TripEvolutionLog tripId={trip.id} />
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-4 border-t border-slate-200 rounded-b-2xl">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs font-bold">
            Cerrar Ficha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
