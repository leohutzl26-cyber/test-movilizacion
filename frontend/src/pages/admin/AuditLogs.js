import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

const replaceIsoDates = (text) => {
  if (!text) return "";
  const isoDateRegex = /(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/g;
  return text.replace(isoDateRegex, (match, year, monthStr, dayStr) => {
    const day = parseInt(dayStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const shortMonths = [
      "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
      "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
    ];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day}-${shortMonths[monthIndex]}-${year}`;
    }
    return match;
  });
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .then(({ data }) => {
        if (data) setLogs(data || []);
      });
  }, []);

  const filtered = logs.filter((l) =>
    (l.user_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.action || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.details || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Registro de Auditoría</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Buscar por usuario, acción o detalles..."
          className="pl-11 h-12 bg-white border-slate-300 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0 max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0">
              <tr>
                <th className="p-4">Fecha/Hora</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Acción</th>
                <th className="p-4">Detalle del Sistema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{l.user_name || "Sistema"}</p>
                    <p className="text-[10px] uppercase font-bold text-teal-600">
                      {(l.user_role || "").replace(/_/g, " ")}
                    </p>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="bg-white">
                      {l.action}
                    </Badge>
                  </td>
                  <td className="p-4 text-slate-600 max-w-md truncate">
                    {replaceIsoDates(l.details)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
