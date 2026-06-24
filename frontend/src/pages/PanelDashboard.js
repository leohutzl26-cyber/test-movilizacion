import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw, Clock, User, Car, Siren, Compass, CheckCircle2 } from "lucide-react";
import { formatZonalNumber } from "@/lib/tripUtils";

export default function PanelDashboard() {
    const { logout } = useAuth();
    const [trips, setTrips] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Reloj en tiempo real
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [tRes, dRes, vRes] = await Promise.all([
                api.get("/trips/active"),
                api.get("/drivers"),
                api.get("/vehicles")
            ]);
            setTrips(tRes.data || []);
            setDrivers(dRes.data || []);
            setVehicles(vRes.data || []);
            setLastUpdated(new Date());
        } catch (e) {
            console.error("Error al refrescar panel de control", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Polling cada 10 segundos
        return () => clearInterval(interval);
    }, [fetchData]);

    const formatTime = (time) => {
        return time.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    const formatDateString = (time) => {
        return time.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    };

    // Clasificación de Viajes
    const pendingTrips = trips.filter(t => t.status === "pendiente" || t.status === "revision_gestor");
    const activeTrips = trips.filter(t => t.status === "en_curso" || t.status === "asignado");

    // Clasificación de Conductores
    const mappedDrivers = drivers.map(d => {
        const matchingTrip = trips.find(t => t.driver_id === d.id && t.status === "en_curso");
        return {
            ...d,
            status: matchingTrip ? "ocupado" : "disponible",
            current_trip: matchingTrip
        };
    });
    const availableDrivers = mappedDrivers.filter(d => d.status === "disponible");
    const busyDrivers = mappedDrivers.filter(d => d.status === "ocupado");

    // Clasificación de Vehículos
    const mappedVehicles = vehicles.map(v => {
        const matchingTrip = trips.find(t => t.vehicle_plate === v.plate && t.status === "en_curso");
        const effectiveStatus = matchingTrip ? "en_viaje" : v.status;
        return {
            ...v,
            status: effectiveStatus,
            current_trip: matchingTrip
        };
    });

    const activeAmbulances = mappedVehicles.filter(v => v.type === "Ambulancia");
    const activeOtherVehicles = mappedVehicles.filter(v => v.type !== "Ambulancia");

    const getVehicleStatusDetails = (status) => {
        switch (status) {
            case "disponible":
                return { label: "Disponible", color: "text-emerald-400 bg-emerald-950/30 border-emerald-900/50" };
            case "en_viaje":
            case "en_curso":
                return { label: "En Ruta", color: "text-blue-400 bg-blue-950/30 border-blue-900/50" };
            case "en_mantenimiento":
                return { label: "Mantención", color: "text-amber-400 bg-amber-950/30 border-amber-900/50" };
            default:
                return { label: "Fuera de Serv.", color: "text-rose-400 bg-rose-950/30 border-rose-900/50" };
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden max-w-[100vw]">
            {/* Encabezado Principal Compacto */}
            <header className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo Hospital" className="w-9 h-9 object-contain" />
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2 leading-none">
                            Sala de Control Flota
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Hospital Curicó &bull; Panel de Monitoreo
                        </p>
                    </div>
                </div>

                {/* Reloj y Fecha */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xl font-black font-mono text-teal-400 leading-none">{formatTime(currentTime)}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{formatDateString(currentTime)}</p>
                    </div>

                    <div className="flex gap-1.5">
                        <Button 
                            onClick={fetchData} 
                            variant="outline" 
                            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300 rounded-lg h-8 w-8 p-0 flex items-center justify-center"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button 
                            onClick={logout} 
                            variant="destructive" 
                            className="bg-red-950/80 border border-red-900 text-red-300 hover:bg-red-900 hover:text-white rounded-lg h-8 px-3 flex items-center gap-1.5"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-wider">Salir</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Grid Principal - Columnas más ajustadas */}
            <main className="flex-1 p-4 grid grid-cols-1 xl:grid-cols-4 gap-4 min-h-0 overflow-y-auto xl:overflow-hidden">
                {/* COLUMNA 1: Viajes Pendientes (Compactado) */}
                <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col min-h-[300px] xl:h-full">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 shrink-0">
                        <h2 className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-500" /> Traslados Pendientes
                        </h2>
                        <Badge className="bg-amber-950/80 text-amber-400 border border-amber-900/50 font-black px-2 py-0.5 text-[10px]">
                            {pendingTrips.length}
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {pendingTrips.map(t => (
                            <div 
                                key={t.id} 
                                className={`p-2.5 bg-slate-900 border rounded-lg shadow-sm transition-all duration-300 ${t.priority === 'urgente' ? 'border-red-500/80 ring-1 ring-red-500/30 bg-red-950/10' : 'border-slate-800 hover:border-slate-700'}`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="bg-slate-800 text-slate-300 border border-slate-700/50 font-mono px-1.5 py-0.2 rounded text-[8px] font-black">
                                        #{t.tracking_number}
                                    </span>
                                    <Badge className={`text-[8px] font-black px-1.5 py-0.2 uppercase border-none rounded-full ${t.priority === 'urgente' ? 'bg-red-600 text-white animate-pulse' : t.priority === 'alta' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        {t.priority}
                                    </Badge>
                                </div>

                                <h3 className="text-xs font-black text-white leading-tight uppercase mb-1.5 truncate">
                                    {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                                </h3>

                                <div className="flex items-center gap-2 text-[9px] text-slate-400 bg-slate-950/40 p-1.5 rounded border border-slate-900">
                                    <span className="truncate max-w-[80px] font-bold text-slate-300 uppercase">{t.origin}</span>
                                    <span className="text-slate-600 font-black">&rarr;</span>
                                    <span className="truncate max-w-[80px] font-bold text-slate-300 uppercase">{t.destination}</span>
                                </div>

                                <div className="flex items-center justify-between mt-2 text-[9px] font-bold text-slate-400 border-t border-slate-800/40 pt-1.5">
                                    <span>Cita: <span className="text-amber-500 font-black">{t.appointment_time || "--:--"}</span></span>
                                    <span className="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono uppercase">{t.trip_type}</span>
                                </div>
                            </div>
                        ))}

                        {pendingTrips.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-800 rounded-lg p-6 py-12 bg-slate-950/20">
                                <CheckCircle2 className="w-8 h-8 text-slate-700 mb-1.5" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Bandeja despejada</p>
                                <p className="text-[8px] text-slate-500 font-bold mt-0.5">No hay solicitudes pendientes.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* COLUMNA 2: Viajes En Curso (Compactado) */}
                <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col min-h-[300px] xl:h-full">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 shrink-0">
                        <h2 className="text-xs font-black text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Compass className="w-4 h-4 text-blue-500" /> Traslados En Curso
                        </h2>
                        <Badge className="bg-blue-950/80 text-blue-400 border border-blue-900/50 font-black px-2 py-0.5 text-[10px]">
                            {activeTrips.filter(t => t.status === 'en_curso').length}
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {activeTrips.map(t => (
                            <div key={t.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="bg-slate-800 text-slate-300 border border-slate-700/50 font-mono px-1.5 py-0.2 rounded text-[8px] font-black">
                                        #{t.tracking_number}
                                    </span>
                                    <span className="text-[8px] font-black px-1.5 py-0.2 uppercase rounded-full border border-blue-900 text-blue-400 bg-blue-950/40">
                                        {t.status}
                                    </span>
                                </div>

                                <h3 className="text-xs font-black text-white leading-tight uppercase mb-1.5 truncate">
                                    {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                                </h3>

                                <div className="flex items-center gap-2 text-[9px] text-slate-400 bg-slate-950/40 p-1.5 rounded border border-slate-900">
                                    <span className="truncate max-w-[80px] font-bold text-slate-300 uppercase">{t.origin}</span>
                                    <span className="text-slate-600 font-black">&rarr;</span>
                                    <span className="truncate max-w-[80px] font-bold text-slate-300 uppercase">{t.destination}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-slate-800/40 text-[9px] font-bold">
                                    <div className="flex items-center gap-1 text-slate-300">
                                        <User className="w-3 h-3 text-slate-500 shrink-0" />
                                        <span className="truncate uppercase font-black">{t.driver_name ? t.driver_name.split(' ')[0] : 'Conductor'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 justify-end text-teal-400 font-mono">
                                        <Car className="w-3 h-3 text-slate-500 shrink-0" />
                                        <span>{t.vehicle_plate || 'Sin Placa'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {activeTrips.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-800 rounded-lg p-6 py-12 bg-slate-950/20">
                                <Compass className="w-8 h-8 text-slate-700 mb-1.5" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Tránsito pasivo</p>
                                <p className="text-[8px] text-slate-500 font-bold mt-0.5">No hay móviles en viaje actualmente.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* COLUMNA 3: Estatus Conductores (Compactado) */}
                <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col min-h-[300px] xl:h-full">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 shrink-0">
                        <h2 className="text-xs font-black text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                            <User className="w-4 h-4 text-teal-400" /> Conductores en Turno
                        </h2>
                        <Badge className="bg-teal-950/80 text-teal-400 border border-teal-900/50 font-black px-2 py-0.5 text-[10px]">
                            {drivers.length}
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {/* Subsección 1: Disponibles */}
                        <div>
                            <h3 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1 border-b border-emerald-950 pb-0.5">
                                Disponibles ({availableDrivers.length})
                            </h3>
                            <div className="space-y-1.5">
                                {availableDrivers.map(d => (
                                    <div key={d.id} className="p-1.5 bg-slate-950/40 border border-emerald-950/50 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-5 h-5 rounded bg-emerald-950 text-emerald-400 flex items-center justify-center text-[9px] font-black uppercase shrink-0">
                                                {d.name.substring(0, 2)}
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-slate-300 truncate">{d.name}</span>
                                        </div>
                                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-950/50 border border-emerald-900/40 px-1.5 py-0.2 rounded uppercase font-mono shrink-0">
                                            {d.vehicle_plate || 'Sin Móvil'}
                                        </span>
                                    </div>
                                ))}
                                {availableDrivers.length === 0 && (
                                    <p className="text-[8px] text-slate-600 italic">Ninguno disponible.</p>
                                )}
                            </div>
                        </div>

                        {/* Subsección 2: En Ruta */}
                        <div>
                            <h3 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1 border-b border-blue-950 pb-0.5">
                                En Ruta ({busyDrivers.length})
                            </h3>
                            <div className="space-y-1.5">
                                {busyDrivers.map(d => (
                                    <div key={d.id} className="p-1.5 bg-slate-900 border border-blue-950/40 rounded-lg">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-5 h-5 rounded bg-blue-950 text-blue-400 flex items-center justify-center text-[9px] font-black uppercase shrink-0">
                                                    {d.name.substring(0, 2)}
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-slate-300 truncate">{d.name}</span>
                                            </div>
                                            <span className="text-[8px] font-black text-blue-400 bg-blue-950 border border-blue-900/30 px-1.5 py-0.2 rounded font-mono shrink-0">
                                                {d.vehicle_plate}
                                            </span>
                                        </div>
                                        {d.current_trip && (
                                            <p className="text-[8px] font-bold text-slate-500 truncate pl-6 uppercase">
                                                A: {d.current_trip.destination}
                                            </p>
                                        )}
                                    </div>
                                ))}
                                {busyDrivers.length === 0 && (
                                    <p className="text-[8px] text-slate-600 italic">Ninguno en ruta.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* COLUMNA 4: Estatus Flota de Vehículos (Compactado) */}
                <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col min-h-[300px] xl:h-full">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 shrink-0">
                        <h2 className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Car className="w-4 h-4 text-purple-400" /> Flota Vehículos
                        </h2>
                        <Badge className="bg-purple-950/80 text-purple-400 border border-purple-900/50 font-black px-2 py-0.5 text-[10px]">
                            {vehicles.length}
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {/* Ambulancias */}
                        {activeAmbulances.length > 0 && (
                            <div>
                                <h3 className="text-[9px] font-black text-teal-400 uppercase tracking-widest mb-1.5 flex items-center gap-1 border-b border-teal-950 pb-0.5">
                                    Ambulancias ({activeAmbulances.length})
                                </h3>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {activeAmbulances.map(v => {
                                        const details = getVehicleStatusDetails(v.status);
                                        return (
                                            <div key={v.id} className="p-1.5 bg-slate-950/40 border border-slate-800/60 rounded-lg flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className="w-6 h-6 rounded bg-teal-950/40 border border-teal-900/60 flex items-center justify-center shrink-0">
                                                        <Siren className="w-3 h-3 text-teal-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-black uppercase text-slate-300 block truncate leading-none">
                                                            {v.zonal_number ? `N° ${formatZonalNumber(v.zonal_number)}` : v.plate}
                                                        </span>
                                                        <span className="text-[7px] font-bold text-slate-500 block leading-none font-mono uppercase mt-0.5">{v.plate}</span>
                                                    </div>
                                                </div>
                                                <Badge className={`text-[7px] font-black border uppercase px-1.5 py-0.1 ${details.color} shrink-0`}>
                                                    {details.label}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Otros Vehículos */}
                        {activeOtherVehicles.length > 0 && (
                            <div>
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1 border-b border-slate-800 pb-0.5">
                                    Generales ({activeOtherVehicles.length})
                                </h3>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {activeOtherVehicles.map(v => {
                                        const details = getVehicleStatusDetails(v.status);
                                        return (
                                            <div key={v.id} className="p-1.5 bg-slate-950/40 border border-slate-800/60 rounded-lg flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className="w-6 h-6 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                                                        <Car className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-black uppercase text-slate-300 block truncate leading-none">
                                                            {v.zonal_number ? `N° ${formatZonalNumber(v.zonal_number)}` : v.plate}
                                                        </span>
                                                        <span className="text-[7px] font-bold text-slate-500 block leading-none font-mono uppercase mt-0.5">{v.plate}</span>
                                                    </div>
                                                </div>
                                                <Badge className={`text-[7px] font-black border uppercase px-1.5 py-0.1 ${details.color} shrink-0`}>
                                                    {details.label}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Pie de Página Compacto */}
            <footer className="bg-slate-900 border-t border-slate-800 px-4 py-1 flex items-center justify-between text-[8px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                <span>Hospital Curicó &copy; {currentTime.getFullYear()}</span>
                <span className="flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-teal-500 animate-pulse"></span>
                    Actualizado: {lastUpdated.toLocaleTimeString("es-CL")}
                </span>
            </footer>
        </div>
    );
}
