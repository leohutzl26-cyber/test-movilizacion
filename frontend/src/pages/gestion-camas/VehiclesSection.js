import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, Activity, RefreshCw, Siren, Car, User, MapPin, Users, Truck, Map, Ambulance } from "lucide-react";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import { formatScheduledDate, statusColorsSolid, statusHeaderStyles } from "@/lib/tripUtils";

export default function VehiclesSection() {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const fetchVehicles = useCallback(async () => { 
        try { 
            const [vRes, tRes] = await Promise.all([
                api.get("/vehicles"),
                api.get("/trips/active")
            ]);
            const vehList = vRes.data || [];
            const activeTrips = tRes.data || [];
            
            // Map active trip details directly onto vehicle objects
            const mapped = vehList.map(veh => {
                const matchingTrip = activeTrips.find(t => t.vehicle_plate === veh.plate && t.status === "en_curso");
                if (matchingTrip) {
                    return {
                        ...veh,
                        current_driver: matchingTrip.driver_name,
                        current_destination: matchingTrip.destination,
                        current_clinical_team: matchingTrip.clinical_team,
                        current_trip: matchingTrip
                    };
                }
                return veh;
            });
            setVehicles(mapped); 
        } catch { } 
        finally { setLoading(false); } 
    }, []);
    
    useEffect(() => { 
        fetchVehicles(); 
        const interval = setInterval(fetchVehicles, 20000);
        return () => clearInterval(interval);
    }, [fetchVehicles]);

    const handleStatusToggle = async (v) => {
        const isInactive = v.status === "fuera_de_servicio" || v.status === "no_disponible";
        const newStatus = isInactive ? "disponible" : "fuera_de_servicio";
        try { 
            await api.put(`/vehicles/${v.id}/status`, { status: newStatus }); 
            toast.success(`Móvil ${v.plate} ${newStatus === "disponible" ? "habilitado" : "fuera de servicio"}`); 
            fetchVehicles(); 
        } catch (e) { toast.error("Error al actualizar estado"); }
    };

    const statusConfig = {
        disponible: { 
            bg: "bg-emerald-50", 
            border: "border-emerald-200", 
            text: "text-emerald-700", 
            badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
            label: "Disponible",
            icon: <CheckCircle className="w-4 h-4" />
        },
        fuera_de_servicio: { 
            bg: "bg-rose-50", 
            border: "border-rose-200", 
            text: "text-rose-700", 
            badge: "bg-rose-100 text-rose-800 border-rose-200",
            label: "Fuera de Servicio",
            icon: <AlertTriangle className="w-4 h-4" />
        },
        no_disponible: { 
            bg: "bg-rose-50", 
            border: "border-rose-200", 
            text: "text-rose-700", 
            badge: "bg-rose-100 text-rose-800 border-rose-200",
            label: "Fuera de Servicio",
            icon: <AlertTriangle className="w-4 h-4" />
        },
        en_mantenimiento: { 
            bg: "bg-amber-50", 
            border: "border-amber-200", 
            text: "text-amber-700", 
            badge: "bg-amber-100 text-amber-800 border-amber-200",
            label: "Mantenimiento",
            icon: <AlertTriangle className="w-4 h-4" />
        },
        en_curso: { 
            bg: "bg-blue-50/70", 
            border: "border-blue-300", 
            text: "text-blue-700", 
            badge: "bg-blue-100 text-blue-800 border-blue-200",
            label: "En Ruta",
            icon: <Activity className="w-4 h-4" />
        }
    };

    if (loading && vehicles.length === 0) return <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-10 h-10 animate-spin" /></div>;

    const ambulances = vehicles.filter(v => (v.type || "").toLowerCase() === "ambulancia");
    const supportVehicles = vehicles.filter(v => (v.type || "").toLowerCase() !== "ambulancia");

    const renderVehicleCard = (v) => {
        const cfg = statusConfig[v.status] || statusConfig.disponible;
        const isAmbulance = (v.type || "").toLowerCase() === "ambulancia";
        const isEnCurso = v.status === "en_curso";
        
        return (
            <Card 
                key={v.id} 
                onClick={() => {
                    if (isEnCurso && v.current_trip) {
                        setSelectedTrip(v.current_trip);
                    }
                }}
                className={`group overflow-hidden transition-all duration-300 border shadow-sm ${cfg.bg} ${cfg.border} hover:shadow-md ${isEnCurso ? "opacity-90 ring-1 ring-blue-300 shadow-blue-100/50 cursor-pointer hover:scale-[1.02]" : ""}`}
                style={isEnCurso ? {
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(239, 246, 255, 0.9), rgba(239, 246, 255, 0.9) 10px, rgba(219, 234, 254, 0.4) 10px, rgba(219, 234, 254, 0.4) 20px)'
                } : undefined}
            >
                <CardContent className="p-0">
                    <div className="p-2.5 flex items-center justify-between border-b border-inherit bg-white/40">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-sm border border-inherit`}>
                                {isAmbulance ? (
                                    <Siren className={`w-3.5 h-3.5 text-red-500 animate-pulse`} />
                                ) : (
                                    <Car className={`w-3.5 h-3.5 text-slate-500`} />
                                )}
                            </div>
                            <span className={`font-black text-sm tracking-tighter ${cfg.text}`}>{v.plate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {isAmbulance ? (
                                <Badge className="bg-red-500 text-white border-none font-black text-[7px] px-1 py-0.5 select-none tracking-tighter uppercase leading-none shadow-3xs">Ambulancia</Badge>
                            ) : (
                                <Badge className="bg-slate-500 text-white border-none font-black text-[7px] px-1 py-0.5 select-none tracking-tighter uppercase leading-none shadow-3xs">Apoyo</Badge>
                            )}
                            <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded ${cfg.badge} select-none leading-none border shadow-2xs`}>
                                {cfg.label}
                            </span>
                            <div className="relative flex h-1.5 w-1.5">
                                {isEnCurso && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                )}
                                <div className={`w-1.5 h-1.5 rounded-full ${v.status === 'disponible' ? 'bg-emerald-500' : isEnCurso ? 'bg-blue-500' : 'bg-rose-500'} shadow-sm`}></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-2.5 space-y-2 min-h-[110px] flex flex-col justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-black text-slate-700 uppercase truncate leading-tight">{v.brand} {v.model}</p>
                            <p className="text-[9px] font-bold text-slate-400 leading-none">{v.type}</p>
                        </div>

                        {isEnCurso ? (
                            <div className="bg-white/85 rounded-lg p-2 border border-blue-200/80 shadow-3xs">
                                <div className="flex items-center gap-1.5 mb-1 text-blue-700">
                                    <User className="w-2.5 h-2.5 shrink-0" />
                                    <p className="text-[9px] font-black uppercase truncate">{v.current_driver || "En traslado"}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-blue-600">
                                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                                    <p className="text-[9px] font-bold truncate">{v.current_destination || "Ruta"}</p>
                                </div>
                                {v.current_clinical_team && (
                                    <div className="flex items-center gap-1.5 text-purple-600 border-t border-blue-100/30 mt-1 pt-1">
                                        <Users className="w-2.5 h-2.5 shrink-0" />
                                        <p className="text-[8px] font-bold truncate italic leading-tight">{v.current_clinical_team}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col justify-center h-[42px] text-center border border-dashed border-inherit rounded-lg opacity-40 bg-white/20">
                                <p className="text-[8px] font-black uppercase text-inherit tracking-tighter">En reserva</p>
                            </div>
                        )}

                        {user?.role !== "gestion_camas" && (
                            <div className="pt-1">
                                <Button 
                                    onClick={() => handleStatusToggle(v)}
                                    disabled={isEnCurso}
                                    variant="outline" 
                                    className={`w-full h-7 text-[8px] font-black uppercase tracking-tighter transition-all bg-white hover:bg-white/80 ${v.status === "fuera_de_servicio" || v.status === "no_disponible" ? "text-emerald-700 border-emerald-200" : "text-rose-700 border-rose-200"}`}
                                >
                                    {v.status === "fuera_de_servicio" || v.status === "no_disponible" ? "Habilitar" : "Fuera Serv."}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="animate-slide-up space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Control de Flota Operativa</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase">Estado actual de todos los móviles del hospital.</p>
                </div>
                <div className="flex gap-2 self-start sm:self-center">
                    <Badge variant="outline" className="h-8 px-3 font-black border-red-200 bg-red-50 text-red-700 flex items-center gap-1.5 select-none">
                        <Siren className="w-3.5 h-3.5 text-red-500 animate-pulse" /> {ambulances.length} AMBULANCIAS
                    </Badge>
                    <Badge variant="outline" className="h-8 px-3 font-black border-slate-200 bg-white text-slate-700 flex items-center gap-1.5 select-none">
                        <Car className="w-3.5 h-3.5 text-slate-500" /> {supportVehicles.length} DE APOYO
                    </Badge>
                </div>
            </div>

            {/* SECCIÓN 1: AMBULANCIAS CLÍNICAS */}
            {ambulances.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-red-100 pb-2">
                        <Siren className="w-4 h-4 text-red-500 animate-pulse" />
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Ambulancias Clínicas ({ambulances.length})</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {ambulances.sort((a,b) => a.plate.localeCompare(b.plate)).map(renderVehicleCard)}
                    </div>
                </div>
            )}

            {/* SECCIÓN 2: VEHÍCULOS DE APOYO */}
            {supportVehicles.length > 0 && (
                <div className="space-y-3 pt-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <Car className="w-4 h-4 text-slate-500" />
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Vehículos de Apoyo y Administrativos ({supportVehicles.length})</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {supportVehicles.sort((a,b) => a.plate.localeCompare(b.plate)).map(renderVehicleCard)}
                    </div>
                </div>
            )}
            
            {vehicles.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Truck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest">No se encontraron vehículos registrados</p>
                </div>
            )}

            {/* DIÁLOGO DE DETALLE DEL TRASLADO ACTIVO */}
            <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
                <DialogContent className="max-w-2xl bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0 max-h-[90vh] overflow-y-auto">
                    {selectedTrip && (
                        <>
                            <div className={`${statusHeaderStyles[selectedTrip.status]?.bg || "bg-slate-900"} p-8 pb-10 relative transition-colors duration-300 rounded-t-[2rem]`}>
                                <div className="absolute top-6 right-14">
                                    <Badge className={`${statusHeaderStyles[selectedTrip.status]?.badge || "bg-slate-800 text-white"} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                                        {(selectedTrip.status || "").replace(/_/g, " ")}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className={`w-16 h-16 ${statusHeaderStyles[selectedTrip.status]?.iconBg || "bg-white/10"} rounded-2xl flex items-center justify-center border border-white/10`}>
                                        <Ambulance className={`w-8 h-8 ${statusHeaderStyles[selectedTrip.status]?.iconText || "text-teal-400"}`} />
                                    </div>
                                    <div>
                                        <p className={`${statusHeaderStyles[selectedTrip.status]?.iconText || "text-teal-400"} text-[10px] uppercase tracking-[0.2em] font-black mb-1`}>
                                            Folio #{selectedTrip.tracking_number} — Consulta Informativa
                                        </p>
                                        <h2 className={`text-3xl font-black ${statusHeaderStyles[selectedTrip.status]?.text || "text-white"} leading-tight uppercase tracking-tight`}>
                                            Detalle del Traslado Activo
                                        </h2>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 pt-4 space-y-5 text-sm">
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-6 rounded-[2rem] shadow-sm">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Folio de Seguimiento</p>
                                        <p className="text-2xl font-mono font-black text-slate-950">#{selectedTrip.tracking_number}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Estado</p>
                                        <Badge className={`font-black uppercase text-[10px] border-none tracking-widest px-3 py-1 rounded-full shadow-sm ${statusColorsSolid[selectedTrip.status] || "bg-slate-100 text-slate-600"}`}>
                                            {(selectedTrip.status || "").replace(/_/g, " ")}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                        <User className="w-4 h-4 text-teal-600" /> Información General
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                        <div className="col-span-2 md:col-span-1">
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Paciente:</span>
                                            <p className="font-black text-slate-900 text-sm">{selectedTrip.patient_name || "-"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Motivo:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.transfer_reason || "-"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">RUT:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.rut || "-"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Cama / Unidad:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.bed || "-"} ({selectedTrip.patient_unit || "-"})</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Diagnóstico:</span>
                                            <p className="font-black text-slate-800 leading-relaxed">{selectedTrip.diagnosis || "-"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                        <MapPin className="w-4 h-4 text-teal-600" /> Ruta y Tiempos
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Origen:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.origin}</p>
                                            {selectedTrip.origin_address && (
                                                <p className="text-[10px] text-slate-500 font-bold mt-0.5">{selectedTrip.origin_address}</p>
                                            )}
                                            {(selectedTrip.origin_maps_url || selectedTrip.origin) && (
                                                <a 
                                                    href={selectedTrip.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTrip.origin_address || selectedTrip.origin)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                                                >
                                                    <Map className="w-3 h-3" /> Ver en Google Maps
                                                </a>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Destino:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.destination}</p>
                                            {selectedTrip.destination_address && (
                                                <p className="text-[10px] text-slate-500 font-bold mt-0.5">{selectedTrip.destination_address}</p>
                                            )}
                                            {(selectedTrip.destination_maps_url || selectedTrip.destination) && (
                                                <a 
                                                    href={selectedTrip.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTrip.destination_address || selectedTrip.destination)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                                                >
                                                    <Map className="w-3 h-3" /> Ver en Google Maps
                                                </a>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Fecha Programada:</span>
                                            <p className="font-black text-slate-800">{formatScheduledDate(selectedTrip.scheduled_date)}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Citación:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.appointment_time || "--:--"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Salida:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.departure_time || "--:--"}</p>
                                        </div>
                                    </div>
                                </div>

                                {(selectedTrip.driver_name || selectedTrip.vehicle_plate) && (
                                    <div className="bg-gradient-to-r from-teal-50/50 to-emerald-50/50 p-5 rounded-2xl border border-teal-100/60 space-y-3 shadow-sm">
                                        <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-teal-100/50 pb-1.5">
                                            <Truck className="w-4 h-4 text-teal-600" /> Asignación de Transporte
                                        </p>
                                        <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                            {selectedTrip.driver_name && (
                                                <div>
                                                    <span className="text-teal-600/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Conductor:</span>
                                                    <p className="font-black text-slate-900 text-sm">{selectedTrip.driver_name}</p>
                                                </div>
                                            )}
                                            {selectedTrip.vehicle_plate && (
                                                <div>
                                                    <span className="text-teal-600/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Vehículo / Patente:</span>
                                                    <p className="font-black text-teal-900 text-sm flex items-center gap-1">
                                                        <span className="bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-800 font-mono text-xs">{selectedTrip.vehicle_plate}</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}


                                {selectedTrip.clinical_team && (
                                    <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 space-y-2">
                                        <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest leading-none">Equipo Clínico Asignado</p>
                                        <p className="text-xs font-black text-teal-900">{selectedTrip.clinical_team}</p>
                                    </div>
                                )}

                                {selectedTrip.notes && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Notas del Traslado</p>
                                        <p className="text-xs font-bold text-slate-800 whitespace-pre-line">{selectedTrip.notes}</p>
                                    </div>
                                )}

                                {selectedTrip.driver_notes && (
                                    <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-1">
                                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none">Observaciones del Conductor</p>
                                        <p className="text-xs font-bold text-amber-900 whitespace-pre-line">{selectedTrip.driver_notes}</p>
                                    </div>
                                )}

                                {/* EVOLUCIÓN CRONOLÓGICA DEL TRASLADO */}
                                <TripEvolutionLog tripId={selectedTrip.id} />

                                <div className="flex justify-end pt-2">
                                    <Button onClick={() => setSelectedTrip(null)} className="bg-teal-600 text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest shadow-md hover:bg-teal-700 transition-all">Volver</Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
