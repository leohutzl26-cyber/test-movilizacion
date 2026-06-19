import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, FileSpreadsheet, FileText, Truck, Download, Calendar } from "lucide-react";
import api from "@/lib/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function LogbookReport() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    api.get("/vehicles").then(r => setVehicles(r.data || [])).catch(() => {});
    // Set default dates: first and last of current month
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    setStartDate(first);
    setEndDate(last);
  }, []);

  const validate = () => {
    if (!vehicleId) { toast.error("Seleccione un vehículo"); return false; }
    if (!startDate || !endDate) { toast.error("Ingrese el rango de fechas"); return false; }
    if (startDate > endDate) { toast.error("La fecha de inicio no puede ser mayor a la fecha de término"); return false; }
    return true;
  };

  const handlePreview = async () => {
    if (!validate()) return;
    setLoadingPreview(true);
    try {
      const res = await api.get("/reports/logbook", { params: { vehicle_id: vehicleId, start_date: startDate, end_date: endDate } });
      setPreview(res.data);
    } catch (e) {
      toast.error("Error al generar vista previa");
    } finally { setLoadingPreview(false); }
  };

  const handleDownload = async (format) => {
    if (!validate()) return;
    if (!preview || !preview.trips) {
      toast.error("No hay datos disponibles para descargar");
      return;
    }
    const setLoading = format === "pdf" ? setLoadingPdf : setLoadingExcel;
    setLoading(true);
    try {
      if (format === "excel") {
        const data = preview.trips.map(t => {
          const startKm = t.start_mileage || 0;
          const endKm = t.end_mileage || 0;
          const kmRec = endKm > startKm ? Math.round((endKm - startKm) * 10) / 10 : 0;
          const motivo = t.transfer_reason || t.task_details || t.notes || t.diagnosis || "—";
          const pasajeros = t.clinical_team || t.patient_name || "";
          const horaSalida = t.departure_time || (t.created_at?.split("T")[1]?.slice(0, 5) || "—");
          const horaLlegada = t.completed_at ? t.completed_at.split("T")[1]?.slice(0, 5) : "—";

          return {
            "Fecha": t.scheduled_date || "",
            "H.Salida": horaSalida,
            "H.Llegada": horaLlegada,
            "Km Ini": startKm,
            "Km Fin": endKm,
            "Km Rec.": kmRec,
            "Origen": t.origin || "",
            "Destino": t.destination || "",
            "Motivo": motivo,
            "Conductor": t.driver_name || "—",
            "Pasajeros": pasajeros || "—",
            "Autorizado": t.authorized_by || "—",
            "Folio": t.tracking_number || ""
          };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Libro Recorrido");
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const plate = vehicle?.plate || "VEH";
        XLSX.writeFile(wb, `Libro_Recorrido_${plate}_${startDate}_${endDate}.xlsx`);
        toast.success("Libro de Recorrido descargado en EXCEL");
      } else if (format === "pdf") {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const plate = vehicle?.plate || "VEH";
        const vehicleStr = `${plate} — ${vehicle?.brand || ""} ${vehicle?.model || ""} (${vehicle?.year || ""})`;

        const doc = new jsPDF({ orientation: "landscape" });
        
        // Encabezado del reporte
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("LIBRO DE CONTROL DE RECORRIDO", 14, 15);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Vehículo: ${vehicleStr}`, 14, 22);
        doc.text(`Período: ${startDate} al ${endDate}`, 14, 27);
        doc.text(`Total viajes: ${preview.trips.length}`, 14, 32);

        const tableData = preview.trips.map(t => {
          const startKm = t.start_mileage || 0;
          const endKm = t.end_mileage || 0;
          const kmRec = endKm > startKm ? Math.round((endKm - startKm) * 10) / 10 : 0;
          const motivo = t.transfer_reason || t.task_details || t.notes || t.diagnosis || "—";
          const pasajeros = t.clinical_team || t.patient_name || "";
          const horaSalida = t.departure_time || (t.created_at?.split("T")[1]?.slice(0, 5) || "—");
          const horaLlegada = t.completed_at ? t.completed_at.split("T")[1]?.slice(0, 5) : "—";

          return [
            t.scheduled_date || "",
            horaSalida,
            horaLlegada,
            String(startKm),
            String(endKm),
            String(kmRec),
            t.origin || "",
            t.destination || "",
            motivo,
            t.driver_name || "—",
            pasajeros || "—",
            t.authorized_by || "—",
            t.tracking_number || ""
          ];
        });

        doc.autoTable({
          startY: 38,
          head: [["Fecha", "H.Salida", "H.Llegada", "Km Ini", "Km Fin", "Km Rec.", "Origen", "Destino", "Motivo", "Conductor", "Pasajeros", "Autorizado", "Folio"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [30, 41, 59], fontSize: 8 }, // matching slate-800
          styles: { fontSize: 7, cellPadding: 1.5 },
          columnStyles: {
            0: { cellWidth: 16 }, // Fecha
            1: { cellWidth: 12 }, // H.Salida
            2: { cellWidth: 12 }, // H.Llegada
            3: { cellWidth: 12, halign: "right" }, // Km Ini
            4: { cellWidth: 12, halign: "right" }, // Km Fin
            5: { cellWidth: 12, halign: "right" }, // Km Rec
            6: { cellWidth: 25 }, // Origen
            7: { cellWidth: 25 }, // Destino
            8: { cellWidth: 40 }, // Motivo
            9: { cellWidth: 25 }, // Conductor
            10: { cellWidth: 30 }, // Pasajeros
            11: { cellWidth: 20 }, // Autorizado
            12: { cellWidth: 18 } // Folio
          }
        });

        doc.save(`Libro_Recorrido_${plate}_${startDate}_${endDate}.pdf`);
        toast.success("Libro de Recorrido descargado en PDF");
      }
    } catch (e) {
      console.error(e);
      toast.error(`Error al generar ${format.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Libro de Control de Recorrido</h1>
          <p className="text-sm text-slate-500">Bitácora electrónica para auditoría de Contraloría</p>
        </div>
      </div>

      {/* Formulario */}
      <Card className="shadow-sm border-0 ring-1 ring-slate-200/60 mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-1"><Truck className="w-4 h-4" /> Vehículo</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Seleccione PPU..." /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate} — {v.brand} {v.model} ({v.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-1"><Calendar className="w-4 h-4" /> Desde</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-1"><Calendar className="w-4 h-4" /> Hasta</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-11" />
            </div>
            <Button onClick={handlePreview} disabled={loadingPreview} className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {loadingPreview ? "Consultando..." : "Consultar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vista Previa */}
      {preview && (
        <>
          {/* Botones de descarga */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={() => handleDownload("pdf")} disabled={loadingPdf}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 shadow-lg shadow-red-200/50">
              <FileText className="w-4 h-4 mr-2" />
              {loadingPdf ? "Generando..." : "Descargar PDF"}
            </Button>
            <Button onClick={() => handleDownload("excel")} disabled={loadingExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-lg shadow-emerald-200/50">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {loadingExcel ? "Generando..." : "Descargar Excel"}
            </Button>
            <div className="flex-1" />
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">{preview.trips.length} viajes encontrados</p>
              <p className="text-xs text-slate-500">{selectedVehicle?.plate} — {preview.period.start} al {preview.period.end}</p>
            </div>
          </div>

          {/* Tabla preview */}
          <Card className="shadow-sm border-0 ring-1 ring-slate-200/60 mb-6">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-white uppercase tracking-wider text-[9px]">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">H.Salida</th>
                    <th className="p-3">H.Llegada</th>
                    <th className="p-3">Km Ini</th>
                    <th className="p-3">Km Fin</th>
                    <th className="p-3 font-black">Km Rec.</th>
                    <th className="p-3">Origen</th>
                    <th className="p-3">Destino</th>
                    <th className="p-3">Motivo</th>
                    <th className="p-3">Conductor</th>
                    <th className="p-3">Pasajeros</th>
                    <th className="p-3">Autorizado</th>
                    <th className="p-3">Folio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.trips.map((t, i) => {
                    const startKm = t.start_mileage || 0;
                    const endKm = t.end_mileage || 0;
                    const kmRec = endKm > startKm ? Math.round((endKm - startKm) * 10) / 10 : 0;
                    const motivo = t.transfer_reason || t.task_details || t.notes || t.diagnosis || "—";
                    const pasajeros = t.clinical_team || t.patient_name || "";
                    const horaSalida = t.departure_time || (t.created_at?.split("T")[1]?.slice(0, 5) || "—");
                    const horaLlegada = t.completed_at ? t.completed_at.split("T")[1]?.slice(0, 5) : "—";

                    return (
                      <tr key={t.id || i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/80"} hover:bg-indigo-50/50 transition-colors`}>
                        <td className="p-2.5 font-medium">{t.scheduled_date}</td>
                        <td className="p-2.5">{horaSalida}</td>
                        <td className="p-2.5">{horaLlegada}</td>
                        <td className="p-2.5 text-right font-mono">{startKm}</td>
                        <td className="p-2.5 text-right font-mono">{endKm}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-indigo-700">{kmRec}</td>
                        <td className="p-2.5 max-w-[100px] truncate">{t.origin}</td>
                        <td className="p-2.5 max-w-[100px] truncate">{t.destination}</td>
                        <td className="p-2.5 max-w-[140px] truncate" title={motivo}>{motivo}</td>
                        <td className="p-2.5">{t.driver_name || "—"}</td>
                        <td className="p-2.5 max-w-[100px] truncate">{pasajeros || "—"}</td>
                        <td className="p-2.5">{t.authorized_by || "—"}</td>
                        <td className="p-2.5 font-bold text-teal-700">{t.tracking_number}</td>
                      </tr>
                    );
                  })}
                  {preview.trips.length === 0 && (
                    <tr><td colSpan={13} className="text-center py-16 text-slate-400 font-medium">No se encontraron viajes en el período seleccionado.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Combustible */}
          {preview.fuel_logs?.length > 0 && (
            <Card className="shadow-sm border-0 ring-1 ring-purple-200/60 mb-6">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-900 mb-3">🛢️ Registros de Combustible</h3>
                <table className="w-full text-xs">
                  <thead className="bg-purple-700 text-white uppercase tracking-wider text-[9px]">
                    <tr>
                      <th className="p-2">Fecha</th><th className="p-2">Km</th><th className="p-2">Litros</th>
                      <th className="p-2">Monto</th><th className="p-2">N° Boleta</th><th className="p-2">Conductor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.fuel_logs.map((f, i) => (
                      <tr key={i} className="border-b border-purple-50">
                        <td className="p-2">{f.timestamp?.slice(0, 10)}</td>
                        <td className="p-2 font-mono">{f.mileage}</td>
                        <td className="p-2">{f.liters}</td>
                        <td className="p-2">${f.amount?.toLocaleString()}</td>
                        <td className="p-2">{f.receipt_number || "—"}</td>
                        <td className="p-2">{f.driver_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Observaciones */}
          {preview.incident_logs?.length > 0 && (
            <Card className="shadow-sm border-0 ring-1 ring-amber-200/60">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-900 mb-3">⚠️ Observaciones y Novedades</h3>
                {preview.incident_logs.map((inc, i) => (
                  <div key={i} className="p-3 bg-amber-50 rounded-lg mb-2 text-xs">
                    <span className="font-bold text-amber-800">{inc.timestamp?.slice(0, 10)} — {inc.incident_type?.toUpperCase()} ({inc.severity}):</span>{" "}
                    <span className="text-slate-700">{inc.description}</span>
                    <span className="text-slate-400 ml-2">— {inc.driver_name || "N/A"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
