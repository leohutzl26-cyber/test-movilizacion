import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Clock, CheckCircle2, HeartPulse, User, Calendar } from "lucide-react";
import api from "@/lib/api";

export default function ClinicalStatsSection() {
  const [stats, setStats] = useState({
    assignedToday: 0,
    inProgress: 0,
    completedTotal: 0,
    clinicalAssistsMonth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/trips/clinical");
        const trips = res.data || [];
        const today = new Date().toISOString().split("T")[0];
        
        const assignedToday = trips.filter(t => t.scheduled_date === today || t.status === "en_curso").length;
        const inProgress = trips.filter(t => t.status === "en_curso").length;
        const completedTotal = trips.filter(t => t.status === "completado").length;
        const clinicalAssistsMonth = trips.filter(t => t.status === "completado" || t.status === "en_curso").length;

        setStats({
          assignedToday,
          inProgress,
          completedTotal,
          clinicalAssistsMonth
        });
      } catch (e) {
        console.error("Error fetching clinical stats:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-slate-200 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="border border-teal-100 bg-gradient-to-br from-teal-50 to-white shadow-sm rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest block">Asignados Hoy</span>
            <p className="text-2xl font-black text-teal-900 mt-1">{stats.assignedToday}</p>
            <span className="text-[10px] text-teal-600 font-bold">Traslados programados</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
            <ClipboardList className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest block">En Curso</span>
            <p className="text-2xl font-black text-blue-900 mt-1">{stats.inProgress}</p>
            <span className="text-[10px] text-blue-600 font-bold">En ruta asistida</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
            <Clock className="w-5 h-5 animate-spin" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-sm rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">Completados</span>
            <p className="text-2xl font-black text-emerald-900 mt-1">{stats.completedTotal}</p>
            <span className="text-[10px] text-emerald-600 font-bold">Asistencias finalizadas</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-purple-100 bg-gradient-to-br from-purple-50 to-white shadow-sm rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest block">Total Acompañamientos</span>
            <p className="text-2xl font-black text-purple-900 mt-1">{stats.clinicalAssistsMonth}</p>
            <span className="text-[10px] text-purple-600 font-bold">Registro de historial</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
            <HeartPulse className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
