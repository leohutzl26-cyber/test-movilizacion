import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function MapAddressSelector({ 
  open, 
  onClose, 
  onSelect, 
  title = "Seleccionar Ubicación en Mapa",
  initialAddress = "" 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [coordinates, setCoordinates] = useState({ lat: -33.4489, lon: -70.6693 }); // Centrado por defecto en Santiago
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Geocodificar la dirección inicial cuando se abre el modal
  useEffect(() => {
    if (!open) return;

    if (initialAddress && initialAddress.trim()) {
      setSearchQuery(initialAddress);
      setSelectedAddress(initialAddress);

      const geocodeInitialAddress = async () => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(initialAddress)}&limit=1&addressdetails=1`, {
            headers: {
              'Accept-Language': 'es'
            }
          });
          const results = await response.json();
          if (results && results.length > 0) {
            const result = results[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            
            setCoordinates({ lat, lon });

            if (mapRef.current && markerRef.current) {
              mapRef.current.setView([lat, lon], 16);
              markerRef.current.setLatLng([lat, lon]);
            }
          }
        } catch (e) {
          console.error("Error geocodificando dirección inicial:", e);
        }
      };

      geocodeInitialAddress();
    } else {
      setSearchQuery("");
      setSelectedAddress("");
      setCoordinates({ lat: -33.4489, lon: -70.6693 });
    }
  }, [open, initialAddress]);

  // Inyectar Leaflet dinámicamente
  useEffect(() => {
    if (!open) return;

    const loadLeaflet = async () => {
      if (window.L) {
        setMapLoaded(true);
        return;
      }

      // Evitar múltiples inyecciones
      if (document.getElementById("leaflet-js")) {
        const interval = setInterval(() => {
          if (window.L) {
            clearInterval(interval);
            setMapLoaded(true);
          }
        }, 100);
        return;
      }

      // Inyectar CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.id = "leaflet-css";
      document.head.appendChild(link);

      // Inyectar JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.id = "leaflet-js";
      script.async = true;
      script.onload = () => {
        setMapLoaded(true);
      };
      document.head.appendChild(script);
    };

    loadLeaflet();
  }, [open]);

  // Inicializar o actualizar el mapa cuando Leaflet se ha cargado
  useEffect(() => {
    if (!open || !mapLoaded || !window.L) return;

    const timer = setTimeout(() => {
      const L = window.L;

      // Destruir mapa anterior si existiese
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }

      const mapContainer = document.getElementById("map-select-container");
      if (!mapContainer) return;

      const map = L.map("map-select-container").setView([coordinates.lat, coordinates.lon], 15);
      mapRef.current = map;

      // Tile Layer (OpenStreetMap)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Icono personalizado
      const customIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Añadir marcador
      const marker = L.marker([coordinates.lat, coordinates.lon], {
        icon: customIcon,
        draggable: true
      }).addTo(map);
      markerRef.current = marker;

      // Evento al arrastrar el marcador
      marker.on("dragend", async () => {
        const position = marker.getLatLng();
        setCoordinates({ lat: position.lat, lon: position.lng });
        await reverseGeocode(position.lat, position.lng);
      });

      // Evento al hacer clic en el mapa
      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCoordinates({ lat, lon: lng });
        await reverseGeocode(lat, lng);
      });

      // Geocodificación inversa inicial (solo si no se especificó una dirección inicial)
      if (!initialAddress) {
        reverseGeocode(coordinates.lat, coordinates.lon);
      }

    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mapLoaded]);

  // Geocodificación inversa
  const reverseGeocode = async (lat, lon) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`, {
        headers: {
          'Accept-Language': 'es'
        }
      });
      const data = await response.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(",");
        const cleanAddress = parts.slice(0, 4).join(",").trim();
        setSelectedAddress(cleanAddress);
      }
    } catch (e) {
      console.error("Reverse geocoding error:", e);
    }
  };

  // Buscar dirección
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`, {
        headers: {
          'Accept-Language': 'es'
        }
      });
      const results = await response.json();
      if (results && results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        setCoordinates({ lat, lon });
        
        const parts = result.display_name.split(",");
        const cleanAddress = parts.slice(0, 4).join(",").trim();
        setSelectedAddress(cleanAddress);

        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([lat, lon], 16);
          markerRef.current.setLatLng([lat, lon]);
        }
      } else {
        toast.error("No se encontraron resultados para la búsqueda.");
      }
    } catch (e) {
      toast.error("Error al buscar la dirección.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedAddress) {
      toast.error("Seleccione una dirección en el mapa antes de confirmar.");
      return;
    }

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lon}`;
    
    onSelect({
      address: selectedAddress,
      mapsUrl: mapsUrl
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-2xl bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-6 overflow-hidden">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-black uppercase text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Busca una dirección o haz clic directamente en el mapa para reubicar el marcador
          </DialogDescription>
        </DialogHeader>

        {/* Buscador */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar calle, número, comuna o ciudad..."
              className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold"
            />
          </div>
          <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
            {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Search className="w-4.5 h-4.5" />}
            Buscar
          </Button>
        </form>

        {/* Contenedor del Mapa */}
        <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 flex items-center justify-center">
          {!mapLoaded ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-10 h-10 text-teal-600 animate-spin" />
              <p className="text-xs font-black text-teal-800 uppercase tracking-widest animate-pulse">Cargando Cartografía Satelital...</p>
            </div>
          ) : (
            <div id="map-select-container" className="w-full h-full z-10" />
          )}
        </div>

        {/* Dirección seleccionada actualmente */}
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100/50 flex items-center justify-center text-teal-600 shrink-0">
            <MapPin className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Dirección Seleccionada</p>
            <p className="text-xs font-black text-slate-800 truncate uppercase">{selectedAddress || "Ninguna ubicación seleccionada"}</p>
            {selectedAddress && (
              <p className="text-[8px] font-bold text-teal-600 font-mono mt-0.5 leading-none">
                COORD: {coordinates.lat.toFixed(5)}, {coordinates.lon.toFixed(5)}
              </p>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 px-6 rounded-xl text-xs font-black uppercase tracking-wider">
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm}
            disabled={!selectedAddress}
            className="bg-teal-600 hover:bg-teal-700 text-white h-10 px-8 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-4.5 h-4.5" />
            Confirmar Ubicación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
