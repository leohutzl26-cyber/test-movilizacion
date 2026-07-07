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
  const [coordinates, setCoordinates] = useState({ lat: -34.9828, lon: -71.2394 }); // Centrado por defecto en Curicó, Chile
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Leer la API Key del archivo de entorno
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

  // Inyectar el script de Google Maps de forma dinámica
  useEffect(() => {
    if (!open) return;

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setMapLoaded(true);
        return;
      }

      // Evitar múltiples inyecciones del script
      if (document.getElementById("google-maps-js")) {
        const interval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(interval);
            setMapLoaded(true);
          }
        }, 100);
        return;
      }

      const script = document.createElement("script");
      script.id = "google-maps-js";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&language=es&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapLoaded(true);
      };
      script.onerror = () => {
        toast.error("Error al cargar Google Maps. Verifique la API Key.");
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [open, googleMapsApiKey]);

  // Inicializar o actualizar el mapa de Google Maps
  useEffect(() => {
    if (!open || !mapLoaded || !window.google || !window.google.maps) return;

    const timer = setTimeout(() => {
      const google = window.google;
      const mapContainer = document.getElementById("google-map-select-container");
      if (!mapContainer) return;

      // Crear instancia de Mapa de Google
      const map = new google.maps.Map(mapContainer, {
        center: { lat: coordinates.lat, lng: coordinates.lon },
        zoom: 16,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_RIGHT
        }
      });
      mapRef.current = map;

      // Crear Marcador en el mapa
      const marker = new google.maps.Marker({
        position: { lat: coordinates.lat, lng: coordinates.lon },
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP
      });
      markerRef.current = marker;

      // Escuchar evento de arrastrar el marcador
      marker.addListener("dragend", () => {
        const position = marker.getPosition();
        if (position) {
          const lat = position.lat();
          const lng = position.lng();
          setCoordinates({ lat, lon: lng });
          reverseGeocode(lat, lng);
        }
      });

      // Escuchar evento de hacer clic sobre el mapa
      map.addListener("click", (e) => {
        const latLng = e.latLng;
        if (latLng) {
          marker.setPosition(latLng);
          setCoordinates({ lat: latLng.lat(), lon: latLng.lng() });
          reverseGeocode(latLng.lat(), latLng.lng());
        }
      });

      // Geocodificación inicial inversa (solo si no hay una dirección de partida)
      if (!initialAddress) {
        reverseGeocode(coordinates.lat, coordinates.lon);
      }

      // Configurar el Autocomplete de Google Places en el Input de búsqueda
      if (inputRef.current) {
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["geocode", "establishment"],
          componentRestrictions: { country: "cl" } // Restringido a Chile
        });
        autocompleteRef.current = autocomplete;

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) {
            return;
          }

          const location = place.geometry.location;
          const lat = location.lat();
          const lng = location.lng();

          setCoordinates({ lat, lon: lng });
          const cleanAddr = place.formatted_address || place.name || "";
          setSelectedAddress(cleanAddr);
          setSearchQuery(cleanAddr);

          // Centrar mapa y mover marcador
          map.setCenter(location);
          map.setZoom(16);
          marker.setPosition(location);
        });
      }

    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mapLoaded]);

  // Geocodificar dirección inicial al abrir el modal
  useEffect(() => {
    if (!open || !mapLoaded || !window.google || !window.google.maps) return;

    if (initialAddress && initialAddress.trim()) {
      setSearchQuery(initialAddress);
      setSelectedAddress(initialAddress);

      const geocoder = new window.google.maps.Geocoder();
      
      const geocodeInitial = async () => {
        // Intento 1: buscar la dirección ingresada tal cual
        geocoder.geocode({ address: initialAddress, componentRestrictions: { country: "cl" } }, (results, status) => {
          if (status === "OK" && results && results.length > 0) {
            const loc = results[0].geometry.location;
            updateMapPosition(loc.lat(), loc.lng(), results[0].formatted_address);
          } else {
            // Intento 2: si falla, añadir el contexto local de Curicó, Chile
            const queryWithContext = `${initialAddress}, Curicó, Chile`;
            geocoder.geocode({ address: queryWithContext, componentRestrictions: { country: "cl" } }, (results2, status2) => {
              if (status2 === "OK" && results2 && results2.length > 0) {
                const loc2 = results2[0].geometry.location;
                updateMapPosition(loc2.lat(), loc2.lng(), results2[0].formatted_address);
              } else {
                // Intento 3: si sigue fallando, centrar en el Hospital de Curicó
                geocoder.geocode({ address: "Hospital de Curicó, Chile" }, (results3, status3) => {
                  if (status3 === "OK" && results3 && results3.length > 0) {
                    const loc3 = results3[0].geometry.location;
                    updateMapPosition(loc3.lat(), loc3.lng(), results3[0].formatted_address);
                  }
                });
              }
            });
          }
        });
      };

      geocodeInitial();
    } else {
      setSearchQuery("");
      setSelectedAddress("");
      // Por defecto Curicó
      setCoordinates({ lat: -34.9828, lon: -71.2394 });
    }
  }, [open, initialAddress, mapLoaded]);

  // Auxiliar para mover marcador y centrar
  const updateMapPosition = (lat, lon, formattedAddress) => {
    setCoordinates({ lat, lon });
    setSelectedAddress(formattedAddress);
    setSearchQuery(formattedAddress);

    if (mapRef.current && markerRef.current && window.google) {
      const pos = new window.google.maps.LatLng(lat, lon);
      mapRef.current.setCenter(pos);
      mapRef.current.setZoom(16);
      markerRef.current.setPosition(pos);
    }
  };

  // Geocodificación inversa con Google Geocoder
  const reverseGeocode = (lat, lng) => {
    if (!window.google || !window.google.maps) return;
    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results.length > 0) {
        const cleanAddr = results[0].formatted_address || "";
        setSelectedAddress(cleanAddr);
        setSearchQuery(cleanAddr);
      }
    });
  };

  // Buscar dirección manualmente (para el submit del formulario)
  const handleSearch = (e) => {
    e?.preventDefault();
    if (!searchQuery.trim() || !window.google || !window.google.maps) return;

    setLoading(true);
    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ address: searchQuery, componentRestrictions: { country: "cl" } }, (results, status) => {
      setLoading(false);
      if (status === "OK" && results && results.length > 0) {
        const loc = results[0].geometry.location;
        updateMapPosition(loc.lat(), loc.lng(), results[0].formatted_address);
      } else {
        // Reintentar con Curicó
        const queryWithContext = `${searchQuery}, Curicó, Chile`;
        geocoder.geocode({ address: queryWithContext, componentRestrictions: { country: "cl" } }, (results2, status2) => {
          if (status2 === "OK" && results2 && results2.length > 0) {
            const loc2 = results2[0].geometry.location;
            updateMapPosition(loc2.lat(), loc2.lng(), results2[0].formatted_address);
          } else {
            toast.error("No se encontraron resultados para la dirección buscada.");
          }
        });
      }
    });
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
          <DialogTitle className="text-lg font-black uppercase text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600 animate-bounce" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
            Busca la dirección o haz clic directo en el mapa para ubicar el marcador exacto
          </DialogDescription>
        </DialogHeader>

        {/* Buscador de Direcciones con Autocomplete de Google */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              ref={inputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Escribe la dirección, calle, número, hospital..."
              className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl text-xs font-semibold focus-visible:ring-teal-500 focus-visible:ring-2 transition-all outline-none"
            />
          </div>
          <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]">
            {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Search className="w-4.5 h-4.5" />}
            Buscar
          </Button>
        </form>

        {/* Contenedor del Mapa de Google */}
        <div 
          id="google-map-select-container" 
          className="w-full h-[320px] rounded-[1.5rem] border border-slate-100 shadow-inner overflow-hidden mb-5 bg-slate-50 relative"
          style={{ minHeight: "320px" }}
        >
          {!mapLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50">
              <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Cargando Mapa de Google...</span>
            </div>
          )}
        </div>

        {/* Dirección Seleccionada */}
        {selectedAddress && (
          <div className="bg-teal-50/50 border border-teal-100 rounded-[1.25rem] p-4 mb-5 flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Dirección Seleccionada</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 leading-tight">{selectedAddress}</p>
              <p className="text-[9px] text-slate-400 font-semibold mt-1">Coordenadas: {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}</p>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2.5">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            className="border-slate-200 hover:bg-slate-50 text-slate-700 h-11 px-6 rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm}
            className="bg-teal-600 hover:bg-teal-700 text-white h-11 px-8 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.98]"
          >
            Confirmar Ubicación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
