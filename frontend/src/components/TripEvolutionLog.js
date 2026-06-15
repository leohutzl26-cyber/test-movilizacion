import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Clock, User, CheckCircle, Activity, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TripEvolutionLog({ tripId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tripId) return;
    
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/trips/${tripId}/logs`);
        const filteredLogs = (response.data || []).filter(log => 
          log.action !== 'INSERT' && log.action !== 'UPDATE' && log.action !== 'registro' && log.action !== 'aprobar_usuario'
        );
        setLogs(filteredLogs);
        setError(null);
      } catch (error) {
        console.error("Error fetching trip logs:", error);
        setError(error.message || "Error de conexión o permisos con Supabase");
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [tripId]);

  if (loading) {
    return <div className="animate-pulse flex space-x-4 mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="h-4 bg-slate-200 rounded w-3/4"></div></div>;
  }

  if (error) {
    return (
      <div className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-red-400" /> Evolución del Traslado
        </h3>
        <div className="bg-red-50 border border-red-200 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <FileText className="w-6 h-6 text-red-300 mb-2" />
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Error al cargar evolución</p>
          <p className="text-[10px] text-red-500 mt-1 max-w-sm">
            No se pudo obtener el historial. Esto ocurre si las políticas RLS en tu consola de Supabase bloquean la lectura (SELECT) de la tabla <strong>audit_logs</strong>.
          </p>
          <p className="text-[9px] text-slate-500 mt-2 font-mono bg-white px-2 py-1 rounded border">
            Detalle: {error}
          </p>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-slate-400" /> Evolución del Traslado
        </h3>
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <FileText className="w-6 h-6 text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No hay historial registrado</p>
          <p className="text-[10px] text-slate-400 mt-1">Los traslados antiguos podrían no tener registro de evolución.</p>
        </div>
      </div>
    );
  }

  const formatAction = (log) => {
    if (!log) return "Acción desconocida";
    const { action } = log;
    if (action === 'create_trip') return "Traslado creado";
    if (action === 'asignar_conductor') return "Conductor asignado";
    if (action === 'auto_asignar') return "Conductor auto-asignado";
    if (action === 'desasignar_conductor') return "Conductor desasignado";
    if (action === 'guardar_observaciones_conductor') return "Observaciones guardadas por el conductor";
    if (action === 'editar_traslado') return log.new_values?.detalle || "Traslado modificado";
    if (action.startsWith('cambiar_estado_')) {
      const status = action.replace('cambiar_estado_', '').replace(/_/g, " ");
      return `Estado actualizado a: ${status.toUpperCase()}`;
    }
    return action.replace(/_/g, " ");
  };

  const getActionIcon = (action) => {
    if (action === 'create_trip') return <FileText className="w-4 h-4 text-emerald-600" />;
    if (action.includes('asignar')) return <User className="w-4 h-4 text-blue-600" />;
    if (action.includes('desasignar')) return <User className="w-4 h-4 text-rose-600" />;
    if (action.includes('observaciones')) return <FileText className="w-4 h-4 text-amber-600" />;
    if (action.includes('estado')) return <CheckCircle className="w-4 h-4 text-teal-600" />;
    return <Activity className="w-4 h-4 text-slate-500" />;
  };

  const getActionColor = (action) => {
    if (action === 'create_trip') return "bg-emerald-100 border-emerald-200 text-emerald-800";
    if (action.includes('asignar')) return "bg-blue-100 border-blue-200 text-blue-800";
    if (action.includes('desasignar')) return "bg-rose-100 border-rose-200 text-rose-800";
    if (action.includes('observaciones')) return "bg-amber-100 border-amber-200 text-amber-800";
    if (action.includes('estado')) return "bg-teal-100 border-teal-200 text-teal-800";
    return "bg-slate-100 border-slate-200 text-slate-800";
  };

  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return format(date, "d 'de' MMMM, yyyy - HH:mm", { locale: es });
    } catch (e) {
      return isoString;
    }
  };

  const displayLogs = expanded ? logs : logs.slice(0, 2);

  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" /> Evolución del Traslado
        </h3>
        {logs.length > 2 && (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors"
          >
            {expanded ? "Ver menos" : `Ver todos (${logs.length})`}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="relative pl-3 border-l-2 border-slate-200 space-y-4 ml-2">
        {displayLogs.map((log) => (
          <div key={log.id} className="relative">
            <div className={`absolute -left-[1.1rem] top-1 rounded-full p-1 border ${getActionColor(log.action)} bg-white shadow-sm`}>
              {getActionIcon(log.action)}
            </div>
            
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg ml-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-slate-800 text-sm">{formatAction(log)}</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                  <Clock className="w-3 h-3" /> {formatDateTime(log.timestamp)}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 mt-2">
                <div className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-200">
                  {log.user_role === 'gestor_camas' ? 'Gestor de Camas' : log.user_role === 'jefe_turno' ? 'Jefe de Turno' : log.user_role}
                </div>
                <span className="text-xs text-slate-600 font-medium">{log.user_name}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
