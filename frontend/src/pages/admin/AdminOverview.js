import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ClipboardList, Navigation, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

function KPICard({ label, value, sub, icon, color, onClick }) {
  const colorMap = {
    teal: "from-teal-500 to-teal-600",
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    red: "from-red-500 to-red-600",
    indigo: "from-indigo-500 to-indigo-600",
    amber: "from-amber-500 to-amber-600",
  };

  return (
    <div onClick={onClick} className={`bg-gradient-to-br ${colorMap[color]} rounded-2xl p-4 text-white shadow-lg cursor-pointer transition-transform hover:scale-[1.02]`}>
      <div className="bg-white/20 p-2 rounded-lg w-fit mb-2">{icon}</div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[10px] uppercase font-bold opacity-80">{label}</p>
      <p className="text-[10px] opacity-60">{sub}</p>
    </div>
  );
}

export default function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: trips } = await supabase.from('trips').select('status');
        const { data: vehicles } = await supabase.from('vehicles').select('status');
        const { data: profiles } = await supabase.from('profiles').select('status');

        const activeTrips = trips?.filter(t => t.status === 'en_curso').length || 0;
        const pendingTrips = trips?.filter(t => t.status === 'pendiente').length || 0;
        const completedTrips = trips?.filter(t => t.status === 'completado').length || 0;
        const pendingUsers = profiles?.filter(p => p.status === 'pendiente').length || 0;

        setStats({
          total_trips: trips?.length || 0,
          active_trips: activeTrips,
          pending_trips: pendingTrips,
          completed_trips: completedTrips,
          pending_users: pendingUsers,
          vehicles_available: vehicles?.filter(v => v.status === 'disponible').length || 0,
          vehicles_en_uso: vehicles?.filter(v => v.status === 'en_uso').length || 0,
          vehicles_fuera_de_servicio: vehicles?.filter(v => v.status === 'fuera_de_servicio').length || 0,
        });
      } catch (e) {
        console.error("Error cargando estadísticas:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="animate-spin" /></div>;

  const completionRate = stats?.total_trips > 0 ? Math.round(stats.completed_trips / stats.total_trips * 100) : 0;

  return (
    <div className="animate-slide-up max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel Analítico</h1>
        <Badge className="bg-teal-50 text-teal-700">EN VIVO (SUPABASE)</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Traslados" value={stats?.total_trips} sub="Histórico" icon={<ClipboardList />} color="indigo" />
        <KPICard label="En Curso" value={stats?.active_trips} sub="Activos ahora" icon={<Navigation />} color="blue" />
        <KPICard label="Tasa de Éxito" value={`${completionRate}%`} sub="Completados" icon={<TrendingUp />} color="emerald" />
        <KPICard label="Usuarios Pend." value={stats?.pending_users} sub="Esperando" icon={<Users />} color="amber" onClick={() => onNavigate("users")} />
      </div>
      
      <p className="text-slate-400 text-sm">Estadísticas simplificadas para la migración inicial.</p>
    </div>
  );
}
