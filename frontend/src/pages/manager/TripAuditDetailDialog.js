import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Plus, CheckCircle, Trash2, Activity, RefreshCw, ShieldAlert } from "lucide-react";

export default function TripAuditDetailDialog({ trip, open, onOpenChange }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && trip?.id) {
            setLoading(true);
            api.get(`/trips/${trip.id}/audit`)
                .then(res => setLogs(res.data || []))
                .catch(() => toast.error("Error al cargar auditoría"))
                .finally(() => setLoading(false));
        }
    }, [open, trip]);

    if (!trip) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0 max-h-[95vh] overflow-y-auto">
                <DialogHeader className="p-8 pb-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-teal-50 border border-teal-100/50 rounded-2xl flex items-center justify-center shadow-sm">
                            <History className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">Registro de Acciones</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Folio: <span className="text-teal-600 font-mono">#{trip.tracking_number}</span> — Historial de cambios
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 pt-4 space-y-4">
                    {/* Comentarios y Observaciones */}
                    {trip.notes && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-3xs">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Notas del Traslado</p>
                            <p className="text-sm font-bold text-slate-700 whitespace-pre-line">{trip.notes}</p>
                        </div>
                    )}

                    {trip.driver_notes && (
                        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-3xs">
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none mb-1">Observaciones del Conductor</p>
                            <p className="text-sm font-bold text-amber-900 whitespace-pre-line">{trip.driver_notes}</p>
                        </div>
                    )}

                    {trip.cancel_reason && (
                        <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 shadow-3xs">
                            <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest leading-none mb-1">Motivo de Cancelación / Rechazo</p>
                            <p className="text-sm font-bold text-rose-900 whitespace-pre-line">{trip.cancel_reason}</p>
                        </div>
                    )}

                    <div 
                        className="bg-slate-50 rounded-3xl border border-slate-100 p-6 custom-scrollbar"
                        style={{ 
                            height: '350px', 
                            overflowY: 'scroll', 
                            WebkitOverflowScrolling: 'touch',
                            display: 'block'
                        }}
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <RefreshCw className="w-10 h-10 text-teal-500 animate-spin" />
                                <p className="text-xs font-black text-teal-800 uppercase tracking-widest animate-pulse">Consultando Bóveda de Auditoría...</p>
                            </div>
                        ) : logs.length > 0 ? (
                            <div className="space-y-6 relative pb-10">
                                <div className="absolute left-[19px] top-2 bottom-10 w-0.5 bg-slate-200"></div>
                                {logs.map((log, idx) => (
                                    <div key={log.id || idx} className="relative pl-12">
                                        <div className="absolute left-0 top-1 w-10 h-10 bg-white rounded-xl border-2 border-slate-200 flex items-center justify-center z-10 shadow-sm">
                                            {log.action === "crear_traslado" ? <Plus className="w-4 h-4 text-emerald-500" /> :
                                             log.action === "aprobar" ? <CheckCircle className="w-4 h-4 text-purple-500" /> :
                                             log.action === "eliminar" ? <Trash2 className="w-4 h-4 text-rose-500" /> :
                                             <Activity className="w-4 h-4 text-blue-500" />}
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-200 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Usuario / Rol</p>
                                                    <p className="text-xs font-black text-slate-900 uppercase">{log.user_name} <span className="text-slate-400 ml-1 opacity-60">[{log.user_role}]</span></p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fecha y Hora</p>
                                                    <p className="text-[11px] font-mono font-black text-slate-600">{new Date(log.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-50">
                                                <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest mb-1 italic">Acción: {log.action.replace(/_/g, " ")}</p>
                                                <p className="text-sm font-bold text-slate-700 leading-relaxed">{log.details || "Sin detalles adicionales"}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="h-4 w-full"></div> {/* Espacio extra al final */}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                <ShieldAlert className="w-16 h-16 opacity-20 mb-4" />
                                <p className="text-sm font-black uppercase tracking-[0.2em]">No se registran acciones auditables</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 flex justify-end">
                        <Button onClick={() => onOpenChange(false)} className="bg-teal-600 text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest shadow-md hover:bg-teal-700 transition-all">Cerrar Detalle</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
