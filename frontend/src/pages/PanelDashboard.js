import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw, Clock, User, Car, Siren, Compass, ShieldAlert, CheckCircle2, AlertOctagon, HelpCircle } from "lucide-react";
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
    // Un conductor está ocupado si tiene un viaje activo en curso
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
        // Si tiene viaje activo, sobreescribimos estado a "en_viaje"
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
                return { label: "Disponible", color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/60" };
            case "en_viaje":
            case "en_curso":
                return { label: "En Ruta", color: "text-blue-400 bg-blue-950/40 border-blue-900/60" };
            case "en_mantenimiento":
                return { label: "Mantención", color: "text-amber-400 bg-amber-950/40 border-amber-900/60" };
            default:
                return { label: "Fuera de Serv.", color: "text-rose-400 bg-rose-950/40 border-rose-900/60" };
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden max-w-[100vw]">
            {/* Encabezado Principal */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Logo Hospital" className="w-12 h-12 object-contain" />
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            Sala de Control Flota
                            <span className="relative flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                            </span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Hospital Curicó &bull; Actualización automática
                        </p>
                    </div>
                </div>

                {/* Reloj y Fecha */}
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-3xl font-black font-mono text-teal-400 leading-none">{formatTime(currentTime)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{formatDateString(currentTime)}</p>
                    </div>

                    <div className="flex gap-2">
                        <Button 
                            onClick={fetchData} 
                            variant="outline" 
                            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl h-11 w-11 p-0 flex items-center justify-center"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button 
                            onClick={logout} 
                            variant="destructive" 
                            className="bg-red-950/80 border border-red-900 text-red-300 hover:bg-red-900 hover:text-white rounded-xl h-11 px-4 flex items-center gap-2"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Cerrar Sesión</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Grid Principal - 4 Columnas */}
            <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-0 overflow-y-auto xl:overflow-hidden">
                {/* COLUMNA 1: Viajes Pendientes */}
                <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col min-h-[400px] xl:h-full">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
                        <h2 className="text-base font-black text-amber-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" /> Traslados Pendientes
                        </h2>
                        <Badge className="bg-amber-950/80 text-amber-400 border border-amber-900/50 font-black px-2.5 py-1 text-xs">
                            {pendingTrips.length} en espera
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {pendingTrips.map(t => (
                            <div 
                                key={t.id} 
                                className={`p-4 bg-slate-900 border rounded-xl shadow-md transition-all duration-300 ${t.priority === 'urgente' ? 'border-red-500/80 ring-1 ring-red-500/50 bg-red-950/10' : 'border-slate-800 hover:border-slate-700'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="bg-slate-800 text-slate-300 border border-slate-700/50 font-mono px-2 py-0.5 rounded text-[10px] font-black">
                                        #{t.tracking_number}
                                    </span>
                                    <Badge className={`text-[9px] font-black px-2 py-0.5 uppercase border-none rounded-full ${t.priority === 'urgente' ? 'bg-red-600 text-white animate-pulse' : t.priority === 'alta' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        {t.priority}
                                    </Badge>
                                </div>

                                <h3 className="text-sm font-black text-white leading-snug uppercase mb-2 truncate">
                                    {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                                </h3>

                                <div className="flex items-center gap-3 text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                                    <span className="truncate max-w-[90px] font-bold text-slate-300 uppercase">{t.origin}</span>
                                    <span className="text-slate-600 font-black">&rarr;</span>
                                    <span className="truncate max-w-[90px] font-bold text-slate-300 uppercase">{t.destination}</span>
                                </div>

                                <div className="flex items-center justify-between mt-3 text-[10px] font-bold text-slate-400 border-t border-slate-800/40 pt-2.5">
                                    <span>Cita: <span className="text-amber-500 font-black">{t.appointment_time || "--:--"}</span></span>
                                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">{t.trip_type}</span>
                                </div>
                            </div>
                        ))}

                        {pendingTrips.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-800 rounded-xl p-8 py-20 bg-slate-950/20">
                                <CheckCircle2 className="w-12 h-12 text-slate-700 mb-2" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-600">Bandeja despejada</p>
                                <p className="text-[10px] text-slate-500 font-bold mt-1">No hay solicitudes pendientes.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* COLUMNA 2: Viajes En Curso */}
                <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col min-h-[400px] xl:h-full">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
                        <h2 className="text-base font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">
                            <Compass className="w-5 h-5 text-blue-500" /> Traslados En Curso
                        </h2>
                        <Badge className="bg-blue-950/80 text-blue-400 border border-blue-900/50 font-black px-2.5 py-1 text-xs">
                            {activeTrips.filter(t => t.status === 'en_curso').length} en tránsito
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {activeTrips.map(t => (
                            <div key={t.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-md">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="bg-slate-800 text-slate-300 border border-slate-700/50 font-mono px-2 py-0.5 rounded text-[10px] font-black">
                                        #{t.tracking_number}
                                    </span>
                                    <span className={`text-[8px] font-black px-2 py-0.5 uppercase rounded-full border border-blue-900 text-blue-400 bg-blue-950/40`}>
                                        {t.status}
                                    </span>
                                </div>

                                <h3 className="text-sm font-black text-white leading-snug uppercase mb-2 truncate">
                                    {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                                </h3>

                                <div className="flex items-center gap-3 text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                                    <span className="truncate max-w-[90px] font-bold text-slate-300 uppercase">{t.origin}</span>
                                    <span className="text-slate-600 font-black">&rarr;</span>
                                    <span className="truncate max-w-[90px] font-bold text-slate-300 uppercase">{t.destination}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/40 text-[10px] font-bold">
                                    <div className="flex items-center gap-1.5 text-slate-300">
                                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        <span className="truncate uppercase font-black">{t.driver_name ? t.driver_name.split(' ')[0] : 'Conductor'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 justify-end text-teal-400 font-mono">
                                        <Car className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        <span>{t.vehicle_plate || 'Sin Placa'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {activeTrips.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-800 rounded-xl p-8 py-20 bg-slate-950/20">
                                <Compass className="w-12 h-12 text-slate-700 mb-2" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-600">Tránsito pasivo</p>
                                <p className="text-[10px] text-slate-500 font-bold mt-1">No hay móviles en viaje actualmente.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* COLUMNA 3: Estatus Conductores */}
                <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col min-h-[400px] xl:h-full">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
                        <h2 className="text-base font-black text-teal-400 uppercase tracking-wider flex items-center gap-2">
                            <User className="w-5 h-5 text-teal-400" /> Conductores en Turno
                        </h2>
                        <Badge className="bg-teal-950/80 text-teal-400 border border-teal-900/50 font-black px-2.5 py-1 text-xs">
                            {drivers.length} activos
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                        {/* Subsección 1: Disponibles */}
                        <div>
                            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-emerald-950 pb-1">
                                Disponibles ({availableDrivers.length})
                            </h3>
                            <div className="space-y-2">
                                {availableDrivers.map(d => (
                                    <div key={d.id} className="p-2.5 bg-slate-950/50 border border-emerald-950/80 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-emerald-950 text-emerald-400 flex items-center justify-center text-[10px] font-black uppercase">
                                                {d.name.substring(0, 2)}
                                            </div>
                                            <span className="text-xs font-black uppercase text-slate-200">{d.name}</span>
                                        </div>
                                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-950/50 border border-emerald-900/60 px-2 py-0.5 rounded uppercase font-mono">
                                            {d.vehicle_plate || 'Sin Móvil'}
                                        </span>
                                    </div>
                                ))}
                                {availableDrivers.length === 0 && (
                                    <p className="text-[10px] text-slate-600 italic">No hay conductores disponibles.</p>
                                )}
                            </div>
                        </div>

                        {/* Subsección 2: En Ruta */}
                        <div>
                            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-blue-950 pb-1">
                                En Ruta ({busyDrivers.length})
                            </h3>
                            <div className="space-y-2">
                                {busyDrivers.map(d => (
                                    <div key={d.id} className="p-2.5 bg-slate-900 border border-blue-950/60 rounded-xl">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-blue-950 text-blue-400 flex items-center justify-center text-[10px] font-black uppercase">
                                                    {d.name.substring(0, 2)}
                                                </div>
                                                <span className="text-xs font-black uppercase text-slate-200">{d.name}</span>
                                            </div>
                                            <span className="text-[9px] font-black text-blue-400 bg-blue-950 border border-blue-900/40 px-2 py-0.5 rounded font-mono">
                                                {d.vehicle_plate}
                                            </span>
                                        </div>
                                        {d.current_trip && (
                                            <p className="text-[9px] font-bold text-slate-400 truncate pl-8 uppercase">
                                                A: {d.current_trip.destination}
                                            </p>
                                        )}
                                    </div>
                                ))}
                                {busyDrivers.length === 0 && (
                                    <p className="text-[10px] text-slate-600 italic">No hay conductores en ruta.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* COLUMNA 4: Estatus Flota de Vehículos */}
                <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col min-h-[400px] xl:h-full">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
                        <h2 className="text-base font-black text-purple-400 uppercase tracking-wider flex items-center gap-2">
                            <Car className="w-5 h-5 text-purple-400" /> Flota Vehículos
                        </h2>
                        <Badge className="bg-purple-950/80 text-purple-400 border border-purple-900/50 font-black px-2.5 py-1 text-xs">
                            {vehicles.length} móviles
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                        {/* Ambulancias */}
                        {activeAmbulances.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-teal-950 pb-1">
                                    Ambulancias ({activeAmbulances.length})
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {activeAmbulances.map(v => {
                                        const details = getVehicleStatusDetails(v.status);
                                        return (
                                            <div key={v.id} className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-7 h-7 rounded bg-teal-950/60 border border-teal-900 flex items-center justify-center shrink-0">
                                                        <Siren className="w-3.5 h-3.5 text-teal-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-black uppercase text-slate-200 block truncate">
                                                            {v.zonal_number ? `N° ${formatZonalNumber(v.zonal_number)}` : v.plate}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-slate-500 block leading-none font-mono uppercase">{v.plate}</span>
                                                    </div>
                                                </div>
                                                <Badge className={`text-[8px] font-black border uppercase px-2 py-0.5 ${details.color}`}>
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
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                                    Generales ({activeOtherVehicles.length})
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {activeOtherVehicles.map(v => {
                                        const details = getVehicleStatusDetails(v.status);
                                        return (
                                            <div key={v.id} className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-7 h-7 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                                                        <Car className="w-3.5 h-3.5 text-slate-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-black uppercase text-slate-200 block truncate">
                                                            {v.zonal_number ? `N° ${formatZonalNumber(v.zonal_number)}` : v.plate}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-slate-500 block leading-none font-mono uppercase">{v.plate}</span>
                                                    </div>
                                                </div>
                                                <Badge className={`text-[8px] font-black border uppercase px-2 py-0.5 ${details.color}`}>
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

            {/* Pie de Página con indicación de actualización */}
            <footer className="bg-slate-900 border-t border-slate-800 px-6 py-2 flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                <span>Hospital Curicó &copy; {currentTime.getFullYear()}</span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                    Última actualización: {lastUpdated.toLocaleTimeString("es-CL")}
                </span>
            </footer>
        </div>
    );
}
