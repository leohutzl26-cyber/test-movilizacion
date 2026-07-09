import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Truck, MapPin, Milestone, CheckCircle2, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import api from "@/lib/api";

export default function DriverStatsSection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("");

  // Obtener historial de viajes
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const r = await api.get("/trips/v2/history");
        if (r.data && Array.isArray(r.data.trips)) {
          // Filtrar solo viajes completados para las estadísticas
          const completedTrips = r.data.trips.filter(t => t.status === "completado");
          setTrips(completedTrips);
        }
      } catch (err) {
        console.error("Error fetching stats history:", err);
        toast.error("Error al cargar datos del resumen");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Generar dinámicamente los últimos 6 meses para el selector
  const periods = useMemo(() => {
    const list = [];
    const now = new Date();
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const label = `${months[monthIndex]} ${year}`;
      const value = `${year}-${String(monthIndex + 1).padStart(2, "0")}`; // "2026-07"
      list.push({ value, label });
    }

    // Setear el periodo actual por defecto una vez generado
    if (list.length > 0 && !selectedPeriod) {
      setSelectedPeriod(list[0].value);
    }

    return list;
  }, [selectedPeriod]);

  // Filtrar viajes por el periodo seleccionado
  const filteredTrips = useMemo(() => {
    if (!selectedPeriod) return [];
    return trips.filter(t => {
      if (!t.scheduled_date) return false;
      return t.scheduled_date.startsWith(selectedPeriod);
    });
  }, [trips, selectedPeriod]);

  // KPIs
  const stats = useMemo(() => {
    let totalKm = 0;
    const vehiclesSet = new Set();

    filteredTrips.forEach(t => {
      const km = t.total_mileage || 0;
      totalKm += km;
      if (t.vehicle_plate) {
        vehiclesSet.add(t.vehicle_plate);
      }
    });

    return {
      totalKm: Math.round(totalKm * 10) / 10,
      tripCount: filteredTrips.length,
      vehicleCount: vehiclesSet.size,
      vehiclesList: Array.from(vehiclesSet)
    };
  }, [filteredTrips]);

  // Destinos más frecuentes (Top 3)
  const topDestinations = useMemo(() => {
    const counts = {};
    filteredTrips.forEach(t => {
      if (t.destination) {
        counts[t.destination] = (counts[t.destination] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [filteredTrips]);

  // Proporción Clínico vs No Clínico
  const tripTypes = useMemo(() => {
    let clinico = 0;
    let noClinico = 0;

    filteredTrips.forEach(t => {
      if (t.trip_type === "clinico") clinico++;
      else noClinico++;
    });

    const total = filteredTrips.length || 1;
    return {
      clinico,
      noClinico,
      clinicoPct: Math.round((clinico / total) * 100),
      noClinicoPct: Math.round((noClinico / total) * 100)
    };
  }, [filteredTrips]);

  // Datos para el gráfico diario (Km por día del mes)
  const chartData = useMemo(() => {
    if (!selectedPeriod) return [];

    // Determinar cantidad de días del mes seleccionado
    const [year, month] = selectedPeriod.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Inicializar mapa de días
    const dailyData = {};
    for (let day = 1; day <= daysInMonth; day++) {
      dailyData[day] = 0;
    }

    // Acumular kilómetros por día
    filteredTrips.forEach(t => {
      if (t.scheduled_date) {
        const day = parseInt(t.scheduled_date.split("-")[2], 10);
        if (day >= 1 && day <= daysInMonth) {
          dailyData[day] += t.total_mileage || 0;
        }
      }
    });

    // Convertir a array para Recharts
    return Object.entries(dailyData).map(([day, km]) => ({
      name: day,
      km: Math.round(km * 10) / 10
    }));
  }, [filteredTrips, selectedPeriod]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <TrendingUp className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-10">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" /> Mi Resumen
          </h1>
          <p className="text-xs text-slate-500 font-medium">Estadísticas de mi actividad mensual</p>
        </div>

        {/* Selector de periodo */}
        {periods.length > 0 && (
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px] h-9 text-xs font-bold border-slate-200 shadow-sm bg-white rounded-lg">
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p.value} value={p.value} className="text-xs font-semibold">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grid de KPIs - Diseño optimizado para Teléfono (1 columna o 2 columnas compactas) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Km Recorridos */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 bg-gradient-to-br from-indigo-50/50 to-white">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Kilómetros</span>
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <Milestone className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 tracking-tight">{stats.totalKm}</p>
              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Km recorridos en ruta</p>
            </div>
          </CardContent>
        </Card>

        {/* Viajes Realizados */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Viajes</span>
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 tracking-tight">{stats.tripCount}</p>
              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Traslados completados</p>
            </div>
          </CardContent>
        </Card>

        {/* Vehículos Usados */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 col-span-2 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-extrabold text-slate-400">Flota Utilizada</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  {stats.vehicleCount === 0 
                    ? "Ningún vehículo" 
                    : stats.vehicleCount === 1 
                      ? "1 vehículo utilizado" 
                      : `${stats.vehicleCount} vehículos utilizados`
                  }
                </p>
              </div>
            </div>
            {stats.vehiclesList.length > 0 && (
              <div className="flex flex-wrap gap-1 max-w-[120px] justify-end">
                {stats.vehiclesList.map(plate => (
                  <Badge key={plate} variant="secondary" className="text-[9px] font-black tracking-wider bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-slate-700">
                    {plate}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Kilómetros por Día */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 bg-white">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-500" /> Distancia por Día (Km)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {stats.tripCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
              <AlertCircle className="w-6 h-6 text-slate-300" />
              <p className="text-xs font-semibold">Sin datos para este mes</p>
            </div>
          ) : (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", padding: "6px 10px" }}
                    labelStyle={{ color: "#94a3b8", fontSize: "9px", fontWeight: 800 }}
                    itemStyle={{ color: "#fff", fontSize: "11px", fontWeight: 900 }}
                    formatter={(value) => [`${value} Km`, "Distancia"]}
                    labelFormatter={(label) => `Día ${label}`}
                  />
                  <Bar dataKey="km" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.km > 0 ? "#4f46e5" : "#e2e8f0"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proporción de Servicios y Destinos Frecuentes */}
      <div className="space-y-4">
        {/* Destinos Más Frecuentes */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 bg-white">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-500" /> Destinos Más Frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {topDestinations.length === 0 ? (
              <div className="text-center py-4 text-xs font-semibold text-slate-400">Sin destinos registrados</div>
            ) : (
              topDestinations.map((dest, idx) => {
                const maxCount = topDestinations[0].count || 1;
                const pct = Math.round((dest.count / maxCount) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[200px]">{dest.name}</span>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">{dest.count} {dest.count === 1 ? 'viaje' : 'viajes'}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : idx === 1 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-slate-400 to-slate-500'
                        }`} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Proporción Clínico vs No Clínico */}
        {stats.tripCount > 0 && (
          <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 bg-white">
            <CardContent className="p-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Distribución de Traslados</p>
              <div className="flex items-center h-5 w-full rounded-full overflow-hidden bg-slate-100">
                {tripTypes.clinico > 0 && (
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all flex items-center justify-center text-[9px] font-black text-white" 
                    style={{ width: `${tripTypes.clinicoPct}%` }}
                    title={`Clínicos: ${tripTypes.clinico}`}
                  >
                    {tripTypes.clinicoPct >= 15 && `${tripTypes.clinicoPct}%`}
                  </div>
                )}
                {tripTypes.noClinico > 0 && (
                  <div 
                    className="h-full bg-gradient-to-r from-slate-600 to-slate-700 transition-all flex items-center justify-center text-[9px] font-black text-white" 
                    style={{ width: `${tripTypes.noClinicoPct}%` }}
                    title={`No Clínicos: ${tripTypes.noClinico}`}
                  >
                    {tripTypes.noClinicoPct >= 15 && `${tripTypes.noClinicoPct}%`}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-3 text-[10px] font-bold">
                <div className="flex items-center gap-1.5 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Clínicos ({tripTypes.clinico})</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  <span>No Clínicos ({tripTypes.noClinico})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
