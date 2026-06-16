import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertTriangle, Clipboard, Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

/**
 * BulkUploader — Componente reutilizable para carga masiva desde Excel (copiar-pegar).
 *
 * Props:
 * - open: boolean — controla la visibilidad del modal
 * - onOpenChange: (open) => void
 * - title: string — título del modal (ej. "Carga Masiva de Vehículos")
 * - columns: Array<{ key: string, label: string, required?: boolean, validate?: (val) => boolean }>
 * - onImport: (rows: object[]) => Promise<void> — callback con los datos válidos
 * - exampleRows?: string[][] — filas de ejemplo para el placeholder
 */
export default function BulkUploader({ open, onOpenChange, title, columns, onImport, exampleRows }) {
  const [rawText, setRawText] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState("paste"); // "paste" | "preview"

  const reset = useCallback(() => {
    setRawText("");
    setParsedRows([]);
    setErrors([]);
    setStep("paste");
    setImporting(false);
  }, []);

  const handleOpenChange = (val) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const parseData = () => {
    if (!rawText.trim()) {
      toast.error("Pegue datos antes de continuar");
      return;
    }

    const lines = rawText.trim().split("\n").filter(l => l.trim());
    const rows = [];
    const errs = [];

    lines.forEach((line, idx) => {
      // Split by tab (Excel default) or semicolon
      let cells = line.split("\t");
      if (cells.length < columns.length) {
        cells = line.split(";");
      }
      if (cells.length < columns.length) {
        cells = line.split(",");
      }

      // If single column expected, treat entire line as the value
      if (columns.length === 1 && cells.length >= 1) {
        cells = [cells.join(",").trim()];
      }

      const row = {};
      const rowErrors = [];

      columns.forEach((col, colIdx) => {
        const val = (cells[colIdx] || "").trim();
        row[col.key] = val;

        if (col.required !== false && !val) {
          rowErrors.push(`"${col.label}" vacío`);
        }
        if (col.validate && val && !col.validate(val)) {
          rowErrors.push(`"${col.label}" inválido`);
        }
      });

      rows.push(row);
      errs.push(rowErrors);
    });

    setParsedRows(rows);
    setErrors(errs);
    setStep("preview");
  };

  const validCount = errors.filter(e => e.length === 0).length;
  const errorCount = errors.filter(e => e.length > 0).length;

  const handleImport = async () => {
    const validRows = parsedRows.filter((_, idx) => errors[idx].length === 0);
    if (validRows.length === 0) {
      toast.error("No hay registros válidos para importar");
      return;
    }

    setImporting(true);
    try {
      await onImport(validRows);
      toast.success(`${validRows.length} registros importados exitosamente`);
      handleOpenChange(false);
    } catch (e) {
      toast.error("Error al importar datos: " + (e.message || "Error desconocido"));
    } finally {
      setImporting(false);
    }
  };

  const placeholderText = columns.length === 1
    ? `Pegue un dato por línea:\n\n${(exampleRows || [["Urgencias"], ["UCI Adulto"], ["Pabellón"]]).map(r => r[0]).join("\n")}`
    : `Pegue datos copiados de Excel (una fila por línea, columnas separadas por tabulación):\n\n${columns.map(c => c.label).join("\t")}\n${(exampleRows || []).map(r => r.join("\t")).join("\n")}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl sm:rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-teal-700" />
            </div>
            {title || "Carga Masiva"}
          </DialogTitle>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-4 pt-2">
            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
              <Clipboard className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-900">¿Cómo funciona?</p>
                <ol className="text-sm text-blue-800 mt-1 space-y-1 list-decimal list-inside">
                  <li>Abra su archivo Excel o Google Sheets</li>
                  <li>Seleccione las filas con datos (sin encabezados)</li>
                  <li>Copie con <kbd className="bg-white px-1.5 py-0.5 rounded border border-blue-300 text-xs font-mono font-bold">Ctrl+C</kbd></li>
                  <li>Pegue aquí con <kbd className="bg-white px-1.5 py-0.5 rounded border border-blue-300 text-xs font-mono font-bold">Ctrl+V</kbd></li>
                </ol>
              </div>
            </div>

            {/* Columnas esperadas */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Columnas esperadas:</span>
              {columns.map((col, i) => (
                <Badge key={i} className="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs">
                  {i + 1}. {col.label} {col.required !== false && <span className="text-red-500 ml-0.5">*</span>}
                </Badge>
              ))}
            </div>

            {/* Área de texto */}
            <textarea
              className="w-full min-h-[250px] p-4 rounded-2xl border-2 border-slate-200 text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-y bg-slate-50"
              placeholder={placeholderText}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              autoFocus
            />

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="font-bold">Cancelar</Button>
              <Button onClick={parseData} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 shadow-md">
                <Upload className="w-4 h-4 mr-2" /> Procesar Datos
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 pt-2">
            {/* Resumen */}
            <div className="flex gap-3">
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xl font-black text-emerald-800">{validCount}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Válidos</p>
                </div>
              </div>
              {errorCount > 0 && (
                <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-xl font-black text-amber-800">{errorCount}</p>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Con Errores</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tabla de previsualización */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest w-10">#</th>
                    {columns.map((col, i) => (
                      <th key={i} className="p-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{col.label}</th>
                    ))}
                    <th className="p-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest w-20">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row, idx) => {
                    const hasError = errors[idx].length > 0;
                    return (
                      <tr key={idx} className={hasError ? "bg-red-50/50" : "hover:bg-slate-50"}>
                        <td className="p-3 text-xs text-slate-400 font-mono">{idx + 1}</td>
                        {columns.map((col, cIdx) => (
                          <td key={cIdx} className={`p-3 font-medium ${!row[col.key] && col.required !== false ? "text-red-400 italic" : "text-slate-800"}`}>
                            {row[col.key] || "(vacío)"}
                          </td>
                        ))}
                        <td className="p-3 text-center">
                          {hasError ? (
                            <span title={errors[idx].join(", ")}>
                              <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                            </span>
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {errorCount > 0 && (
              <p className="text-xs text-amber-700 font-bold bg-amber-50 p-3 rounded-xl border border-amber-200">
                ⚠️ Los {errorCount} registros con errores serán omitidos. Solo se importarán los {validCount} registros válidos.
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("paste")} className="font-bold">
                <Trash2 className="w-4 h-4 mr-2" /> Volver a Pegar
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 shadow-md"
              >
                {importing ? "Importando..." : `Importar ${validCount} Registros`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
