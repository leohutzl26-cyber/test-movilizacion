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
  const [coordinates, setCoordinates] = useState({ lat: -34.9828, lon: -71.2394 }); // Centrado en Curicó
  const [loading, setLoading] = useState(false);
  
  // Estados de carga de librerías
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Leer la API Key
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
  // Validar si la API key es válida (no vacía y no el placeholder por defecto)
  const isGoogleMapsEnabled = googleMapsApiKey && 
                              googleMapsApiKey.trim() !== "" && 
                              !googleMapsApiKey.includes("your-") && 
                              !googleMapsApiKey.includes("tu_clave");

  // EFECTO 1: Carga de librerías dinámicas
  useEffect(() => {
    if (!open) return;

    if (isGoogleMapsEnabled) {
      // CARGAR GOOGLE MAPS
      if (window.google && window.google.maps) {
        setGoogleLoaded(true);
        return;
      }

      if (document.getElementById("google-maps-js")) {
        const interval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(interval);
            setGoogleLoaded(true);
          }
        }, 100);
        return;
      }

      const script = document.createElement("script");
      script.id = "google-maps-js";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&language=es&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleLoaded(true);
      script.onerror = () => {
        console.error("Error cargando Google Maps API. Usando Leaflet como fallback.");
        setGoogleLoaded(false);
      };
      document.head.appendChild(script);
    } else {
      // CARGAR LEAFLET (FALLBACK GRATUITO)
      if (window.L) {
        setLeafletLoaded(true);
        return;
      }

      if (document.getElementById("leaflet-js")) {
        const interval = setInterval(() => {
          if (window.L) {
            clearInterval(interval);
            setLeafletLoaded(true);
          }
        }, 100);
        return;
      }

      // Inyectar CSS de Leaflet
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.id = "leaflet-css";
      document.head.appendChild(link);

      // Inyectar JS de Leaflet
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    }
  }, [open, isGoogleMapsEnabled, googleMapsApiKey]);

  // EFECTO 2: Inicialización de Mapa e interacción según el motor seleccionado
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      if (isGoogleMapsEnabled && googleLoaded && window.google && window.google.maps) {
        // --- INICIALIZAR GOOGLE MAPS ---
        const google = window.google;
        const container = document.getElementById("google-map-container");
        if (!container) return;

        const map = new google.maps.Map(container, {
          center: { lat: coordinates.lat, lng: coordinates.lon },
          zoom: 16,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const marker = new google.maps.Marker({
          position: { lat: coordinates.lat, lng: coordinates.lon },
          map: map,
          draggable: true,
          animation: google.maps.Animation.DROP
        });
        markerRef.current = marker;

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (pos) {
            setCoordinates({ lat: pos.lat(), lon: pos.lng() });
            googleReverseGeocode(pos.lat(), pos.lng());
          }
        });

        map.addListener("click", (e) => {
          const latLng = e.latLng;
          if (latLng) {
            marker.setPosition(latLng);
            setCoordinates({ lat: latLng.lat(), lon: latLng.lng() });
            googleReverseGeocode(latLng.lat(), latLng.lng());
          }
        });

        // Configurar Autocomplete de Places
        if (inputRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            types: ["geocode", "establishment"],
            componentRestrictions: { country: "cl" }
          });
          autocompleteRef.current = autocomplete;

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            const loc = place.geometry.location;
            setCoordinates({ lat: loc.lat(), lon: loc.lng() });
            const cleanAddr = place.formatted_address || place.name || "";
            setSelectedAddress(cleanAddr);
            setSearchQuery(cleanAddr);

            map.setCenter(loc);
            map.setZoom(16);
            marker.setPosition(loc);
          });
        }

        if (!initialAddress) {
          googleReverseGeocode(coordinates.lat, coordinates.lon);
        }

      } else if (!isGoogleMapsEnabled && leafletLoaded && window.L) {
        // --- INICIALIZAR LEAFLET ---
        const L = window.L;
        const container = document.getElementById("leaflet-map-container");
        if (!container) return;

        const map = L.map("leaflet-map-container").setView([coordinates.lat, coordinates.lon], 15);
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        const customIcon = L.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const marker = L.marker([coordinates.lat, coordinates.lon], {
          icon: customIcon,
          draggable: true
        }).addTo(map);
        markerRef.current = marker;

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setCoordinates({ lat: pos.lat, lon: pos.lng });
          osmReverseGeocode(pos.lat, pos.lng);
        });

        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setCoordinates({ lat, lon: lng });
          osmReverseGeocode(lat, lng);
        });

        if (!initialAddress) {
          osmReverseGeocode(coordinates.lat, coordinates.lon);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leafletLoaded, googleLoaded, isGoogleMapsEnabled]);

  // EFECTO 3: Geocodificar la dirección de entrada inicial
  useEffect(() => {
    if (!open) return;

    if (initialAddress && initialAddress.trim()) {
      setSearchQuery(initialAddress);
      setSelectedAddress(initialAddress);

      const geocodeInitial = async () => {
        if (isGoogleMapsEnabled && googleLoaded && window.google && window.google.maps) {
          // Geocoder de Google
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: initialAddress, componentRestrictions: { country: "cl" } }, (results, status) => {
            if (status === "OK" && results && results.length > 0) {
              const loc = results[0].geometry.location;
              updateMapPosition(loc.lat(), loc.lng(), results[0].formatted_address);
            } else {
              const queryWithCtx = `${initialAddress}, Curicó, Chile`;
              geocoder.geocode({ address: queryWithCtx, componentRestrictions: { country: "cl" } }, (results2, status2) => {
                if (status2 === "OK" && results2 && results2.length > 0) {
                  const loc2 = results2[0].geometry.location;
                  updateMapPosition(loc2.lat(), loc2.lng(), results2[0].formatted_address);
                } else {
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
        } else if (!isGoogleMapsEnabled && leafletLoaded && window.L) {
          // Geocoder de OpenStreetMap (Nominatim) con reintentos
          try {
            let query = initialAddress;
            let results = await fetchOsmGeocode(query);

            if ((!results || results.length === 0) && !query.toLowerCase().includes("curicó") && !query.toLowerCase().includes("chile") && !query.toLowerCase().includes("curico")) {
              query = `${initialAddress}, Curicó, Chile`;
              results = await fetchOsmGeocode(query);
            }

            if (!results || results.length === 0) {
              query = "Hospital de Curicó, Chile";
              results = await fetchOsmGeocode(query);
            }

            if (results && results.length > 0) {
              const res = results[0];
              updateMapPosition(parseFloat(res.lat), parseFloat(res.lon), res.display_name.split(",").slice(0, 4).join(",").trim());
            }
          } catch (e) {
            console.error("Error geocodificando OSM inicial:", e);
          }
        }
      };

      geocodeInitial();
    } else {
      setSearchQuery("");
      setSelectedAddress("");
      setCoordinates({ lat: -34.9828, lon: -71.2394 }); // Curicó por defecto
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialAddress, leafletLoaded, googleLoaded, isGoogleMapsEnabled]);

  // Auxiliar para mover marcador y centrar
  const updateMapPosition = (lat, lon, formattedAddress) => {
    setCoordinates({ lat, lon });
    setSelectedAddress(formattedAddress);
    setSearchQuery(formattedAddress);

    if (mapRef.current && markerRef.current) {
      if (isGoogleMapsEnabled && window.google) {
        const pos = new window.google.maps.LatLng(lat, lon);
        mapRef.current.setCenter(pos);
        mapRef.current.setZoom(16);
        markerRef.current.setPosition(pos);
      } else if (!isGoogleMapsEnabled && window.L) {
        mapRef.current.setView([lat, lon], 16);
        markerRef.current.setLatLng([lat, lon]);
      }
    }
  };

  // --- MÉTODOS DE GEOCODIFICACIÓN INVERSA (COORDENADAS -> DIRECCIÓN) ---
  const googleReverseGeocode = (lat, lng) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results.length > 0) {
        const clean = results[0].formatted_address || "";
        setSelectedAddress(clean);
        setSearchQuery(clean);
      }
    });
  };

  const osmReverseGeocode = async (lat, lon) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`, {
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'HospitalCuricoMovilizacionApp/1.0'
        }
      });
      const data = await response.json();
      if (data && data.display_name) {
        const clean = data.display_name.split(",").slice(0, 4).join(",").trim();
        setSelectedAddress(clean);
        setSearchQuery(clean);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- MÉTODOS DE BÚSQUEDA DIRECTA (SUBMIT) ---
  const fetchOsmGeocode = async (query) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`, {
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'HospitalCuricoMovilizacionApp/1.0'
        }
      });
      return await response.json();
    } catch (e) {
      return null;
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    if (isGoogleMapsEnabled && window.google) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery, componentRestrictions: { country: "cl" } }, (results, status) => {
        setLoading(false);
        if (status === "OK" && results && results.length > 0) {
          const loc = results[0].geometry.location;
          updateMapPosition(loc.lat(), loc.lng(), results[0].formatted_address);
        } else {
          const queryWithCtx = `${searchQuery}, Curicó, Chile`;
          geocoder.geocode({ address: queryWithCtx, componentRestrictions: { country: "cl" } }, (results2, status2) => {
            if (status2 === "OK" && results2 && results2.length > 0) {
              const loc2 = results2[0].geometry.location;
              updateMapPosition(loc2.lat(), loc2.lng(), results2[0].formatted_address);
            } else {
              toast.error("No se encontraron resultados.");
            }
          });
        }
      });
    } else {
      // Búsqueda OSM
      try {
        let query = searchQuery;
        let results = await fetchOsmGeocode(query);

        if ((!results || results.length === 0) && !query.toLowerCase().includes("curicó") && !query.toLowerCase().includes("chile") && !query.toLowerCase().includes("curico")) {
          query = `${searchQuery}, Curicó, Chile`;
          results = await fetchOsmGeocode(query);
        }

        if (!results || results.length === 0) {
          query = "Hospital de Curicó, Chile";
          results = await fetchOsmGeocode(query);
        }

        setLoading(false);
        if (results && results.length > 0) {
          const res = results[0];
          updateMapPosition(parseFloat(res.lat), parseFloat(res.lon), res.display_name.split(",").slice(0, 4).join(",").trim());
        } else {
          toast.error("No se encontraron resultados.");
        }
      } catch (e) {
        setLoading(false);
        toast.error("Error al buscar.");
      }
    }
  };

  const handleConfirm = () => {
    if (!selectedAddress) {
      toast.error("Seleccione una ubicación en el mapa antes de confirmar.");
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
      <DialogContent className="max-w-2xl bg-white rounded-[2rem] border-none shadow-2xl p-6 overflow-hidden">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-black uppercase text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600 animate-bounce" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
            Busca la dirección o haz clic directo en el mapa para ubicar el marcador exacto
          </DialogDescription>
        </DialogHeader>

        {/* Buscador */}
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
          <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
            {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Search className="w-4.5 h-4.5" />}
            Buscar
          </Button>
        </form>

        {/* Contenedor del Mapa (Híbrido) */}
        {isGoogleMapsEnabled ? (
          <div 
            id="google-map-container" 
            className="w-full h-[320px] rounded-[1.5rem] border border-slate-100 shadow-inner overflow-hidden mb-5 bg-slate-50 relative"
            style={{ minHeight: "320px" }}
          >
            {!googleLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50">
                <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Cargando Google Maps...</span>
              </div>
            )}
          </div>
        ) : (
          <div 
            id="leaflet-map-container" 
            className="w-full h-[320px] rounded-[1.5rem] border border-slate-100 shadow-inner overflow-hidden mb-5 bg-slate-50 relative"
            style={{ minHeight: "320px" }}
          >
            {!leafletLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50">
                <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Cargando Mapa...</span>
              </div>
            )}
          </div>
        )}

        {/* Dirección Seleccionada */}
        {selectedAddress && (
          <div className="bg-teal-50/50 border border-teal-100 rounded-[1.25rem] p-4 mb-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Ubicación Seleccionada</p>
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
            className="bg-teal-600 hover:bg-teal-700 text-white h-11 px-8 rounded-xl text-xs font-black uppercase tracking-wider shadow-md"
          >
            Confirmar Ubicación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
