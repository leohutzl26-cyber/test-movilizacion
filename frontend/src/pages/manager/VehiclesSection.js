import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Activity, Siren, Truck, User, Users, MapPin, RefreshCw } from "lucide-react";
import { formatZonalNumber } from "@/lib/tripUtils";
import TripDetailDialog from "./TripDetailDialog";

export default function VehiclesSection() {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const fetchVehicles = useCallback(async () => { 
        try { 
            const [vRes, tRes, dRes] = await Promise.all([
                api.get("/vehicles"),
                api.get("/trips/active"),
                api.get("/drivers/active")
            ]);
            const vehList = vRes.data || [];
            const activeTrips = tRes.data || [];
            const activeDriversData = dRes.data || {};
            const activeDriversVehicles = activeDriversData.vehicles || [];
            
            // Map active trip details and assigned driver directly onto vehicle objects
            const mapped = vehList.map(veh => {
                const matchingTrip = activeTrips.find(t => t.vehicle_plate === veh.plate && t.status === "en_curso");
                const driverInfo = activeDriversVehicles.find(v => v.id === veh.id)?.assigned_driver;
                if (matchingTrip) {
                    return {
                        ...veh,
                        current_driver: matchingTrip.driver_name,
                        current_destination: matchingTrip.destination,
                        current_clinical_team: matchingTrip.clinical_team,
                        current_trip: matchingTrip,
                        assigned_driver: driverInfo || null
                    };
                }
                return {
                    ...veh,
                    assigned_driver: driverInfo || null
                };
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

    const getVehicleConfig = (v) => {
        if (v.status === "en_curso") {
            return { 
                bg: "bg-blue-50/70", 
                border: "border-blue-300", 
                text: "text-blue-700", 
                badge: "bg-blue-100 text-blue-800 border-blue-200 font-bold",
                label: "En Ruta",
                dot: "bg-blue-500"
            };
        }
        if (v.status === "fuera_de_servicio" || v.status === "no_disponible") {
            return { 
                bg: "bg-rose-50", 
                border: "border-rose-200", 
                text: "text-rose-700", 
                badge: "bg-rose-100 text-rose-800 border-rose-200",
                label: "Fuera de Servicio",
                dot: "bg-rose-500"
            };
        }
        if (v.status === "en_mantenimiento") {
            return { 
                bg: "bg-orange-50", 
                border: "border-orange-200", 
                text: "text-orange-700", 
                badge: "bg-orange-100 text-orange-800 border-orange-200",
                label: "Mantenimiento",
                dot: "bg-orange-500"
            };
        }
        // Vehículo disponible con Conductor en turno asignado (Verde)
        if (v.assigned_driver) {
            return { 
                bg: "bg-emerald-50/90", 
                border: "border-emerald-300", 
                text: "text-emerald-800", 
                badge: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold shadow-2xs",
                label: "En Turno",
                dot: "bg-emerald-500"
            };
        }
        // Vehículo disponible en Reserva (Sin conductor asignado) (Amarillo)
        return { 
            bg: "bg-amber-50/70", 
            border: "border-amber-200", 
            text: "text-amber-800", 
            badge: "bg-amber-100 text-amber-800 border-amber-200 font-semibold",
            label: "En Reserva",
            dot: "bg-amber-400"
        };
    };

    if (loading && vehicles.length === 0) return <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-10 h-10 animate-spin" /></div>;

    const renderVehicleCard = (v) => {
        const cfg = getVehicleConfig(v);
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
                    {/* Cabecera compacta */}
                    <div className="p-2.5 flex items-center justify-between border-b border-inherit bg-white/40">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-sm border border-inherit`}>
                                {v.type === "Ambulancia" ? <Siren className={`w-3.5 h-3.5 ${cfg.text}`} /> : <Truck className={`w-3.5 h-3.5 ${cfg.text}`} />}
                            </div>
                            <div className="flex flex-col">
                                {v.zonal_number ? (
                                    <>
                                        <span className={`font-black text-sm tracking-tighter leading-tight ${cfg.text}`}>N° {formatZonalNumber(v.zonal_number)}</span>
                                        <span className={`font-bold text-[8px] opacity-70 leading-none ${cfg.text}`}>{v.plate}</span>
                                    </>
                                ) : (
                                    <span className={`font-black text-sm tracking-tighter ${cfg.text}`}>{v.plate}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${cfg.badge} select-none leading-none border shadow-2xs`}>
                                {cfg.label}
                            </span>
                            <div className="relative flex h-2 w-2">
                                {isEnCurso && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                )}
                                <div className={`w-2 h-2 rounded-full ${cfg.dot} shadow-sm`}></div>
                            </div>
                        </div>
                    </div>

                    {/* Cuerpo compacto */}
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
                        ) : v.assigned_driver ? (
                            <div className="bg-white/90 rounded-lg p-2 border border-emerald-200 shadow-3xs">
                                <div className="flex items-center gap-1.5 text-emerald-800">
                                    <User className="w-3 h-3 shrink-0 text-emerald-600" />
                                    <div className="min-w-0">
                                        <p className="text-[8px] font-extrabold text-emerald-600 uppercase tracking-widest leading-none mb-0.5">En Turno Con</p>
                                        <p className="text-[9px] font-black text-emerald-950 truncate uppercase leading-tight">{v.assigned_driver.name}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col justify-center h-[42px] text-center border border-dashed border-amber-200/80 rounded-lg bg-amber-100/40">
                                <p className="text-[8px] font-black uppercase text-amber-800 tracking-tighter">En reserva</p>
                                <p className="text-[7px] font-bold text-amber-600/90 leading-none mt-0.5">Sin conductor asignado</p>
                            </div>
                        )}

                        {/* Botón de Acción ultra compacto */}
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

    const ambulancias = vehicles.filter(v => v.type === "Ambulancia").sort((a,b) => a.plate.localeCompare(b.plate));
    const otrosVehiculos = vehicles.filter(v => v.type !== "Ambulancia").sort((a,b) => a.plate.localeCompare(b.plate));

    return (
        <div className="animate-slide-up space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Control de Flota Operativa</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase">Estado actual de todos los móviles del hospital.</p>
                </div>
                <Badge variant="outline" className="h-8 px-4 font-black border-slate-200 bg-white">
                    TOTAL: {vehicles.length} MÓVILES
                </Badge>
            </div>

            <div className="space-y-8">
                {ambulancias.length > 0 && (
                    <div>
                        <h2 className="text-xs font-black text-teal-600 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Siren className="w-5 h-5" /> Ambulancias Clínicas
                            <Badge className="ml-2 bg-teal-100 text-teal-800 hover:bg-teal-200 border-none">{ambulancias.length}</Badge>
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                            {ambulancias.map(renderVehicleCard)}
                        </div>
                    </div>
                )}

                {otrosVehiculos.length > 0 && (
                    <div>
                        <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Truck className="w-5 h-5" /> Vehículos Generales
                            <Badge className="ml-2 bg-slate-200 text-slate-800 hover:bg-slate-300 border-none">{otrosVehiculos.length}</Badge>
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                            {otrosVehiculos.map(renderVehicleCard)}
                        </div>
                    </div>
                )}
            </div>
            
            {vehicles.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Truck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest">No se encontraron vehículos registrados</p>
                </div>
            )}
            
            {/* Modal de Detalle de Traslado */}
            <TripDetailDialog trip={selectedTrip} open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)} onRefresh={fetchVehicles} />
        </div>
    );
}
