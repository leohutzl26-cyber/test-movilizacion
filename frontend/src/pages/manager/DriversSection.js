import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

export default function DriversSection() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchDrivers = useCallback(async () => { 
        try { 
            const r = await api.get("/drivers"); 
            setDrivers(r.data || []); 
        } catch { } 
        finally { setLoading(false); } 
    }, []);
    useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

    return (
        <div className="animate-slide-up space-y-4">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Gestión de Conductores</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {drivers.map(d => (
                    <Card key={d.id} className="shadow-sm border-slate-200">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                                    <User className="w-3.5 h-3.5 text-indigo-600" />
                                </div>
                                <div className="truncate">
                                    <p className="font-black text-slate-900 text-[11px] leading-none mb-0.5 uppercase truncate">
                                        {d.name.split(' ')[0]}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase truncate leading-none">
                                        Móvil: {d.vehicle_plate || "N/A"}
                                    </p>
                                </div>
                            </div>
                            {d.extra_available && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-none w-full text-[8px] font-black uppercase py-0.5 tracking-tighter">
                                    Extra Activa
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
