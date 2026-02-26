import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Truck, MapPin, ClipboardList, Plus, Check, X, Trash2, Edit, AlertTriangle, Shield, Search, TrendingUp, Activity } from "lucide-react";
import api from "@/lib/api";

// Importamos Recharts para los gráficos
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function AdminDashboard() {
  const [section, setSection] = useState("dashboard");
  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-dashboard">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-8">
          {section === "dashboard" && <DashboardSection />}
          {section === "users" && <UsersSection />}
          {section === "vehicles" && <VehiclesSection />}
          {section === "destinations" && <DestinationsSection />}
          {section === "drivers" && <DriversSection />}
          {section === "audit" && <AuditSection />}
        </div>
      </main>
    </div>
  );
}

function DashboardSection() {
  const [stats, setStats] = useState(null);
  const [tripsTrend, setTripsTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Obtenemos estadísticas generales y el historial de viajes al mismo tiempo
        const [statsRes, tripsRes] = await Promise.all([
          api.get("/stats"),
          api.get("/trips/history")
        ]);
        
        setStats(statsRes.data);

        // Procesar datos para el gráfico de los últimos 7 días
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse(); // Del más antiguo al más reciente

        const trendData = last7Days.map(date => {
          // Formatear fecha para el gráfico (ej: "15 Feb")
          const dateObj = new Date(date + "T00:00:00");
          const label = `${dateObj.getDate()} ${dateObj.toLocaleString('es-ES', { month: 'short' })}`;
          
          // Contar viajes de ese día
          const count = tripsRes.data.filter(t => 
            (t.scheduled_date === date) || 
            (t.created_at && t.created_at.startsWith(date))
          ).length;

          return { name: label, traslados: count };
        });

        setTripsTrend(trendData);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-500 flex flex-col items-center"><Activity className="w-8 h-8 animate-spin text-teal-600 mb-2"/> Cargando panel analítico...</div>;

  const cards = [
    { label: "Viajes Pendientes", value: stats.pending_trips, icon: ClipboardList, color: "text-amber-600 bg-amber-50" },
    { label: "Viajes Activos", value: stats.active_trips, icon: Truck, color: "text-blue-600 bg-blue-50" },
    { label: "Completados", value: stats.completed_trips, icon: Check, color: "text-emerald-600 bg-emerald-50" },
    { label: "Vehiculos Disp.", value: `${stats.vehicles_available}/${stats.total_vehicles}`, icon: Truck, color: "text-teal-600 bg-teal-50" },
    { label: "Conductores", value: stats.total_drivers, icon: Users, color: "text-indigo-600 bg-indigo-50" },
    { label: "Usuarios Pendientes", value: stats.pending_users, icon: Shield, color: stats.pending_users > 0 ? "text-red-600 bg-red-50" : "text-slate-600 bg-slate-50" },
  ];

  // Datos para el gráfico circular
  const pieData = [
    { name: 'Pendientes', value: stats.pending_trips, color: '#f59e0b' }, // amber-500
    { name: 'Activos', value: stats.active_trips, color: '#3b82f6' }, // blue-500
    { name: 'Completados', value: stats.completed_trips, color: '#10b981' }, // emerald-500
  ].filter(item => item.value > 0); // Ocultar si está en 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900" data-testid="dashboard-title">Panel Analítico</h1>
      
      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="stat-card card-hover animate-slide-up" data-testid={`stat-${c.label.toLowerCase().replace(/ /g,'-')}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}><c.icon className="w-5 h-5" /></div>
            <p className="text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        
        {/* Gráfico de Barras: Traslados de la Semana */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              Traslados últimos 7 días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tripsTrend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="traslados" fill="#0d9488" radius={[4, 4, 0, 0]} name="Cantidad de Viajes" />
