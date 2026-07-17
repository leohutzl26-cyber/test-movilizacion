import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DriversManager() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [licenseDate, setLicenseDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.rut && d.rut.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.username && d.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.email && d.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.vehicle_plate && d.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const fetchDrivers = useCallback(async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'conductor').order('name');
      if (data) setDrivers(data || []);
    } catch (e) {
      toast.error("Error al cargar conductores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleEdit = (d) => {
    setSelectedDriver(d);
    setLicenseDate(d.license_expiry || "");
    setIsDialogOpen(true);
  };

  const saveLicense = async () => {
    try {
      await supabase.from('profiles').update({ license_expiry: licenseDate }).eq('id', selectedDriver.id);
      toast.success("Fecha de licencia actualizada");
      setIsDialogOpen(false);
      fetchDrivers();
    } catch (e) {
      toast.error("Error al actualizar fecha");
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Conductores Registrados</h1>
      
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Total: {filteredDrivers.length} {filteredDrivers.length === 1 ? 'conductor' : 'conductores'}
        </span>
        <div className="w-full sm:max-w-xs">
          <Input
            type="text"
            placeholder="Buscar por nombre, rut, patente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 text-xs font-semibold rounded-xl border-slate-200 shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Nombre / Email</th>
                  <th className="p-4 text-center">Estado de Cuenta</th>
                  <th className="p-4 text-center">Vencimiento Licencia</th>
                  <th className="p-4 text-center">Disp. Horas Extra</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{d.name}</p>
                      <p className="text-xs text-slate-500">{d.email}</p>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className="bg-emerald-100 text-emerald-800">{d.status}</Badge>
                    </td>
                    <td className="p-4 text-center text-slate-600 font-medium">
                      {d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : "No registrada"}
                    </td>
                    <td className="p-4 text-center">
                      {d.extra_available ? (
                        <CheckCircle className="w-5 h-5 text-teal-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(d)} className="text-slate-400 hover:text-teal-600 h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {drivers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      No hay conductores registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Fecha de Licencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <p className="font-bold text-slate-900">{selectedDriver?.name}</p>
              <p className="text-xs text-slate-500">{selectedDriver?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Nueva Fecha de Vencimiento</Label>
              <Input type="date" value={licenseDate} onChange={(e) => setLicenseDate(e.target.value)} className="h-11" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveLicense} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
