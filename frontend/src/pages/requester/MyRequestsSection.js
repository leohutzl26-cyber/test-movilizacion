import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, MapPin, ArrowRight, Ambulance, Clock, Truck, Trash2, Filter, Map } from "lucide-react";
import api from "@/lib/api";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import { statusColorsSolid, statusBorders, statusHeaderStyles } from "@/lib/tripUtils";

export default function MyRequestsSection({ onEdit }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const fetchReqs = useCallback(async () => {
    try {
      const r = await api.get("/trips");
      setRequests(r.data || []);
    } catch (e) {
      toast.error("Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReqs();
  }, [fetchReqs]);

  const statusColors = {
    pendiente: "bg-amber-100 text-amber-800 border-amber-200",
    asignado: "bg-indigo-100 text-indigo-800 border-indigo-200",
    en_curso: "bg-blue-100 text-blue-800 border-blue-200",
    completado: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cancelado: "bg-rose-100 text-rose-800 border-rose-200",
    revision_gestor: "bg-purple-100 text-purple-800 border-purple-200",
  };

  const handleCancel = async (reqId) => {
    if (!confirm("¿Está seguro de que desea cancelar esta solicitud?")) return;
    try {
      await api.put(`/trips/${reqId}/status`, { status: "cancelado", cancel_reason: "Cancelada por el solicitante" });
      toast.success("Solicitud cancelada exitosamente");
      setSelectedReq(null);
      fetchReqs();
    } catch (e) {
      toast.error("Error al cancelar la solicitud");
    }
  };

  const filteredRequests = requests.filter((req) => {
    let statusMatch = statusFilter === "all" ? true : req.status === statusFilter;
    let dateMatch = true;

    if (dateFilter !== "all" && req.created_at) {
      const reqDate = new Date(req.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - reqDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === "7days") dateMatch = diffDays <= 7;
      if (dateFilter === "30days") dateMatch = diffDays <= 30;
    }

    return statusMatch && dateMatch;
  });

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const datePart = isoString.split('T')[0];
    const [y, m, d] = datePart.split('-');
    return `${d}-${m}-${y}`;
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Mis Solicitudes (Histórico)</h1>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-0 shadow-none h-8 w-full sm:w-[160px] focus:ring-0">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="revision_gestor">Revisión Gestor</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="asignado">Asignadas</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="completado">Completadas</SelectItem>
                <SelectItem value="cancelado">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
            <Clock className="w-4 h-4 text-slate-400" />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="border-0 shadow-none h-8 w-full sm:w-[160px] focus:ring-0">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="7days">Últimos 7 días</SelectItem>
                <SelectItem value="30days">Últimos 30 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Desktop View: Table */}
      <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Folio</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 min-w-[200px]">Detalle / Paciente</th>
                <th className="px-6 py-4 min-w-[200px]">Ruta</th>
                <th className="px-6 py-4">Fecha Solicitud</th>
                <th className="px-6 py-4">Fecha Programada</th>
                <th className="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedReq(req)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="bg-slate-800 text-white font-mono px-2 py-1 rounded text-[10px] font-bold shadow-sm">
                      {req.tracking_number || req.id.substring(0, 6).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit border ${
                        req.trip_type === "clinico" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {req.trip_type === "clinico" ? <Ambulance className="w-3 h-3" /> : <ClipboardList className="w-3 h-3" />}
                      {req.trip_type === "clinico" ? "Clínico" : "No Clínico"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p
                      className="font-bold text-slate-900 text-sm line-clamp-2"
                      title={req.trip_type === "clinico" ? req.patient_name : req.task_details}
                    >
                      {req.trip_type === "clinico" ? req.patient_name : req.task_details}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="font-medium truncate max-w-[120px]" title={req.origin}>
                        {req.origin}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-medium truncate max-w-[120px]" title={req.destination}>
                        {req.destination}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium text-xs">{formatDateTime(req.created_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                      {formatDate(req.scheduled_date)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        statusColors[req.status] || "bg-slate-100 border-slate-200"
                      }`}
                    >
                      {(req.status || "").replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet View: Cards */}
      <div className="lg:hidden space-y-4 mb-8">
        {filteredRequests.map((req) => (
          <Card key={req.id} className={`card-hover cursor-pointer border-l-4 ${statusBorders[req.status] || "border-l-slate-400"}`} onClick={() => setSelectedReq(req)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">
                    {req.tracking_number || req.id.substring(0, 6).toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border-none ${
                      statusColorsSolid[req.status] || "bg-slate-100 border-slate-200"
                    }`}
                  >
                    {(req.status || "").replace(/_/g, " ")}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                    req.trip_type === "clinico" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {req.trip_type === "clinico" ? <Ambulance className="w-3 h-3" /> : <ClipboardList className="w-3 h-3" />}
                  {req.trip_type === "clinico" ? "Clínico" : "No Clínico"}
                </div>
              </div>

              <p className="font-bold text-lg text-slate-900 mb-2">{req.trip_type === "clinico" ? req.patient_name : req.task_details}</p>

              <div className="flex flex-col gap-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <MapPin className="w-4 h-4 text-teal-500 shrink-0" />
                  <span className="font-medium truncate">{req.origin}</span>
                  <ArrowRight className="w-3 h-3 mx-1 text-slate-400 shrink-0" />
                  <span className="font-medium truncate">{req.destination}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">F. Solicitud</span>
                  <span className="font-medium text-slate-600">{formatDateTime(req.created_at)}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-bold text-teal-600 uppercase">F. Programada</span>
                  <span className="font-bold text-teal-700">{formatDate(req.scheduled_date)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {requests.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center mt-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">Sin Solicitudes</h3>
          <p className="text-slate-500">Aún no has registrado ninguna solicitud de traslado.</p>
        </div>
      )}

      {requests.length > 0 && filteredRequests.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center mt-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">Sin Resultados</h3>
          <p className="text-slate-500">No se encontraron solicitudes con los filtros aplicados.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setStatusFilter("all");
              setDateFilter("all");
            }}
          >
            Limpiar Filtros
          </Button>
        </div>
      )}

      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0">
          {selectedReq && (
            <>
              <div className={`${statusHeaderStyles[selectedReq.status]?.bg || "bg-slate-900"} p-8 pb-10 relative transition-colors duration-300 rounded-t-[2rem]`}>
                <div className="absolute top-6 right-14">
                  <Badge className={`${statusHeaderStyles[selectedReq.status]?.badge || "bg-slate-800 text-white"} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                    {(selectedReq.status || "").replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 ${statusHeaderStyles[selectedReq.status]?.iconBg || "bg-white/10"} rounded-2xl flex items-center justify-center border border-white/10`}>
                    {selectedReq.trip_type === "clinico" ? <Ambulance className={`w-8 h-8 ${statusHeaderStyles[selectedReq.status]?.iconText || "text-teal-400"}`} /> : <ClipboardList className={`w-8 h-8 ${statusHeaderStyles[selectedReq.status]?.iconText || "text-blue-400"}`} />}
                  </div>
                  <div>
                    <p className={`${statusHeaderStyles[selectedReq.status]?.iconText || "text-teal-400"} text-[10px] uppercase tracking-[0.2em] font-black mb-1`}>
                      Folio #{selectedReq.tracking_number} — Consulta de Solicitud
                    </p>
                    <h2 className={`text-3xl font-black ${statusHeaderStyles[selectedReq.status]?.text || "text-white"} leading-tight uppercase tracking-tight`}>
                      {selectedReq.trip_type === "clinico" ? "Traslado Clínico" : "Cometido No Clínico"}
                    </h2>
                  </div>
                </div>
              </div>
              <div className="p-8 pt-4 space-y-5 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border-none ${statusColorsSolid[selectedReq.status] || "bg-slate-500 text-white"}`}>
                    {(selectedReq.status || "").replace(/_/g, " ")}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      selectedReq.trip_type === "clinico" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {(selectedReq.trip_type || "").replace(/_/g, " ")}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-auto">{formatDateTime(selectedReq.created_at)}</span>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{selectedReq.trip_type === "clinico" ? "Paciente" : "Cometido"}</p>
                  <p className="font-black text-3xl text-slate-900 leading-tight">{selectedReq.trip_type === "clinico" ? selectedReq.patient_name : selectedReq.task_details}</p>

                  {selectedReq.trip_type === "clinico" && (
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200">
                      <p className="text-sm">
                        <span className="font-bold text-slate-500">RUT:</span> {selectedReq.rut || "-"}
                      </p>
                      <p className="text-sm">
                        <span className="font-bold text-slate-500">Servicio/Unidad:</span> {selectedReq.patient_unit}
                      </p>
                      <p className="text-sm">
                        <span className="font-bold text-slate-500">Fecha Traslado:</span> <span className="text-teal-700 font-bold">{formatDate(selectedReq.scheduled_date)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-bold text-slate-500">Horarios:</span> <span className="text-red-600 font-bold">{selectedReq.appointment_time || "-"}</span> (Cit) |{" "}
                        <span className="text-amber-600 font-bold">{selectedReq.departure_time || "-"}</span> (Sal)
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <MapPin className="w-6 h-6 text-teal-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Origen</p>
                      <p className="font-black text-slate-800 text-base truncate uppercase">{selectedReq.origin}</p>
                      {selectedReq.origin_address && <p className="text-[10px] text-slate-500 font-bold leading-tight mt-0.5 truncate uppercase">{selectedReq.origin_address}</p>}
                      {(selectedReq.origin_maps_url || selectedReq.origin) && (
                        <a
                          href={
                            selectedReq.origin_maps_url ||
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedReq.origin_address || selectedReq.origin)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                        >
                          <Map className="w-3 h-3" /> Ver en Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <ArrowRight className="w-6 h-6 text-blue-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Destino</p>
                      <p className="font-black text-slate-800 text-base truncate uppercase">{selectedReq.destination}</p>
                      {selectedReq.destination_address && (
                        <p className="text-[10px] text-slate-500 font-bold leading-tight mt-0.5 truncate uppercase">{selectedReq.destination_address}</p>
                      )}
                      {(selectedReq.destination_maps_url || selectedReq.destination) && (
                        <a
                          href={
                            selectedReq.destination_maps_url ||
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedReq.destination_address || selectedReq.destination)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        >
                          <Map className="w-3 h-3" /> Ver en Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {(selectedReq.driver_name || selectedReq.vehicle_plate) && (
                  <div className="bg-gradient-to-r from-teal-50/50 to-emerald-50/50 p-5 rounded-2xl border border-teal-100/60 space-y-3 shadow-sm">
                    <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-teal-100/50 pb-1.5">
                      <Truck className="w-4 h-4 text-teal-600" /> Asignación de Transporte
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                      {selectedReq.driver_name && (
                        <div>
                          <span className="text-teal-600/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Conductor:</span>
                          <p className="font-black text-slate-900 text-sm">{selectedReq.driver_name}</p>
                        </div>
                      )}
                      {selectedReq.vehicle_plate && (
                        <div>
                          <span className="text-teal-600/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Vehículo / Patente:</span>
                          <p className="font-black text-teal-900 text-sm flex items-center gap-1">
                            <span className="bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-800 font-mono text-xs">{selectedReq.vehicle_plate}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedReq.trip_type === "clinico" && (
                  <div className="bg-teal-50 p-5 rounded-2xl border border-teal-100">
                    {selectedReq.assigned_clinical_staff?.length > 0 ? (
                      <div className="mb-3">
                        <p className="text-xs text-teal-800 font-bold uppercase tracking-widest mb-2">Personal Clínico Asignado</p>
                        {selectedReq.assigned_clinical_staff.map((s, i) => (
                          <p key={i} className="text-base font-medium text-teal-900">
                            {s.type}: <span className="font-black">{s.staff_name}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      selectedReq.required_personnel?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-teal-800 font-bold uppercase tracking-widest mb-2">Personal Requerido</p>
                          <p className="text-base font-black text-teal-900">{selectedReq.required_personnel.join(", ")}</p>
                        </div>
                      )
                    )}
                    {selectedReq.patient_requirements?.length > 0 && (
                      <div>
                        <p className="text-xs text-teal-800 font-bold uppercase tracking-widest mb-2 mt-4">Requerimientos</p>
                        <p className="text-sm font-black text-teal-900 bg-white inline-block px-3 py-1.5 rounded-lg shadow-sm border border-teal-100">
                          {selectedReq.patient_requirements.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedReq.trip_type === "no_clinico" && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                    <p className="font-bold text-slate-500 text-xs uppercase">Cantidad de Funcionarios</p>
                    <p className="font-black text-lg text-slate-900 bg-white w-8 h-8 flex items-center justify-center rounded-md shadow-sm border border-slate-200">
                      {selectedReq.staff_count || "0"}
                    </p>
                  </div>
                )}

                {selectedReq.notes && (
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2">Notas Adicionales</p>
                    <p className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-slate-800">{selectedReq.notes}</p>
                  </div>
                )}

                {selectedReq.driver_notes && (
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-[10px] font-bold text-amber-800 tracking-widest uppercase mb-2">Observaciones del Conductor</p>
                    <p className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-amber-900 whitespace-pre-line">{selectedReq.driver_notes}</p>
                  </div>
                )}

                {(selectedReq.status === "revision_gestor" || selectedReq.status === "pendiente") && (
                  <div className="border-t border-slate-200 pt-4 flex gap-3 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1 border-teal-200 text-teal-700 hover:bg-teal-50"
                      onClick={() => {
                        onEdit(selectedReq);
                        setSelectedReq(null);
                      }}
                    >
                      Editar Solicitud
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleCancel(selectedReq.id)}>
                      Cancelar Solicitud
                    </Button>
                  </div>
                )}

                <TripEvolutionLog tripId={selectedReq.id} />
              </div>
            </>
          )}
        </Dialog>
      </Dialog>
    </div>
  );
}
