'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import { SearchIcon, MapPinIcon } from '@/components/Icons';

interface AgencyLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  availableDistritos?: string[];
  onChange: (coords: { lat: number; lng: number }) => void;
  onAddressFound?: (address: string, detectedDistrict?: string) => void;
}

interface SuggestionItem {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  rawAddress?: any;
  detectedDistrict?: string;
  isInSelectedDistrict?: boolean;
  distanceKm?: number;
}

interface DistrictNotice {
  searchedDistrict: string;
  foundDistrict: string;
  distanceKm?: number;
  placeName: string;
}

// Cálculo de distancia geográfica en km (Fórmula de Haversine)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio medio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Extraer y normalizar distrito a partir de datos de OpenStreetMap o lista UBIGEO
function matchOrExtractDistrict(address: any, availableDistricts: string[] = []): string {
  if (!address) return '';

  // 1. Priorizar coincidencia con la lista oficial de distritos de la provincia
  if (availableDistricts.length > 0) {
    const candidateFields = [
      address.suburb,
      address.city_district,
      address.district,
      address.town,
      address.municipality,
      address.borough,
      address.neighbourhood,
      address.quarter,
      address.city,
    ]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase().trim());

    for (const field of candidateFields) {
      for (const dist of availableDistricts) {
        const dClean = dist.toLowerCase().trim();
        if (field === dClean || field.includes(dClean) || dClean.includes(field)) {
          return dist;
        }
      }
    }
  }

  // 2. Fallback con propiedades territoriales estándar de OSM
  return (
    address.suburb ||
    address.city_district ||
    address.district ||
    address.town ||
    address.municipality ||
    address.borough ||
    address.city ||
    ''
  );
}

export default function AgencyLocationPicker({
  initialLat = -12.046374,
  initialLng = -77.042793,
  departamento = '',
  provincia = '',
  distrito = '',
  direccion = '',
  availableDistritos = [],
  onChange,
  onAddressFound,
}: AgencyLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Aviso de distrito no coincidente / más cercano encontrado
  const [districtNotice, setDistrictNotice] = useState<DistrictNotice | null>(null);

  // Sugerencias predictivas
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Geocodificación inversa (obtener dirección legible según coordenadas)
  const reverseGeocode = useCallback(
    async (targetLat: number, targetLng: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&addressdetails=1`
        );
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.pedestrian || addr.footway || addr.path || addr.amenity || '';
          const number = addr.house_number ? ` ${addr.house_number}` : '';
          const ref = addr.neighbourhood || addr.suburb || '';

          let cleanAddress = '';
          if (road) {
            cleanAddress = `${road}${number}${ref ? `, ${ref}` : ''}`.trim();
          } else {
            cleanAddress = data.display_name.split(',').slice(0, 2).join(',').trim();
          }

          const detectedDist = matchOrExtractDistrict(addr, availableDistritos);

          if (onAddressFound && cleanAddress) {
            onAddressFound(cleanAddress, detectedDist);
          }
        }
      } catch (err) {
        console.warn('Aviso geocodificación inversa:', err);
      }
    },
    [availableDistritos, onAddressFound]
  );

  // Inicializar Leaflet dinámicamente en el cliente
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const L = await import('leaflet');

      if (!isMounted || !mapContainerRef.current) return;

      // Limpiar contenedor si ya tenía un mapa previo
      if ((mapContainerRef.current as any)._leaflet_id) {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch {}
          mapInstanceRef.current = null;
        }
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }

      // Icono SVG institucional Banco de la Nación
      const redPinIcon = L.divIcon({
        className: 'custom-bn-pin',
        html: `
          <div style="
            background-color: #C8102E;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 10px;
              height: 10px;
              background-color: white;
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const map = L.map(mapContainerRef.current).setView([lat, lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: redPinIcon,
      }).addTo(map);

      // Al arrastrar el marcador: actualizar coordenadas y dirección física
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
        onChange({ lat: position.lat, lng: position.lng });
        reverseGeocode(position.lat, position.lng);
      });

      // Al hacer clic en cualquier lugar del mapa
      map.on('click', (e: any) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        marker.setLatLng([newLat, newLng]);
        setLat(newLat);
        setLng(newLng);
        onChange({ lat: newLat, lng: newLng });
        reverseGeocode(newLat, newLng);
      });

      if (isMounted) {
        mapInstanceRef.current = map;
        markerRef.current = marker;
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    };
  }, []);

  // Función para mover el mapa suavemente
  const flyToLocation = useCallback(
    async (queryText: string, zoomLevel: number, fallbackQuery?: string) => {
      if (!mapInstanceRef.current || !markerRef.current) return;
      setIsSearching(true);
      setSearchError(null);

      try {
        let response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            queryText
          )}&countrycodes=pe&limit=1`
        );
        let data = await response.json();

        // Si la búsqueda con distrito no responde, intentar con la provincia
        if ((!data || data.length === 0) && fallbackQuery) {
          response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              fallbackQuery
            )}&countrycodes=pe&limit=1`
          );
          data = await response.json();
          zoomLevel = 13;
        }

        if (data && data.length > 0) {
          const resultLat = parseFloat(data[0].lat);
          const resultLng = parseFloat(data[0].lon);

          setLat(resultLat);
          setLng(resultLng);
          onChange({ lat: resultLat, lng: resultLng });

          mapInstanceRef.current.flyTo([resultLat, resultLng], zoomLevel, {
            duration: 1.2,
          });
          markerRef.current.setLatLng([resultLat, resultLng]);
        }
      } catch {
        // Silencioso ante fallos de red esporádicos
      } finally {
        setIsSearching(false);
      }
    },
    [onChange]
  );

  // Auto-centrado al cambiar de Distrito, Provincia o Departamento
  const lastGeocodedRef = useRef<string>('');
  useEffect(() => {
    if (!provincia && !distrito) return;

    const targetKey = [distrito, provincia, departamento, 'Perú'].filter(Boolean).join(', ');
    if (targetKey === lastGeocodedRef.current) return;
    lastGeocodedRef.current = targetKey;

    const fallbackKey = [provincia, departamento, 'Perú'].filter(Boolean).join(', ');
    flyToLocation(targetKey, 14, fallbackKey);
  }, [distrito, provincia, departamento, flyToLocation]);

  // Buscador Elástico con variantes fonéticas, priorización distrital y sugerencias predictivas
  const searchPlacesElastic = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || clean.length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        setDistrictNotice(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      setDistrictNotice(null);

      // Variantes fonéticas (ej: Binocanchon <-> Vinocanchon)
      const variants = [clean];
      if (/b/i.test(clean)) variants.push(clean.replace(/b/gi, 'v'));
      if (/v/i.test(clean)) variants.push(clean.replace(/v/gi, 'b'));

      try {
        let results: any[] = [];
        let foundInSelectedDistrict = false;

        // ETAPA 1: Intentar buscar en el distrito seleccionado (si está definido)
        if (distrito) {
          for (const v of variants) {
            const q = [v, distrito, provincia, departamento, 'Perú'].filter(Boolean).join(', ');
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                q
              )}&countrycodes=pe&limit=5&addressdetails=1`
            );
            const data = await res.json();
            if (data && data.length > 0) {
              results = data;
              foundInSelectedDistrict = true;
              break;
            }
          }
        }

        // ETAPA 2: Si no se encontró en el distrito, ampliar búsqueda a la provincia
        if (results.length === 0) {
          for (const v of variants) {
            const q = [v, provincia, departamento, 'Perú'].filter(Boolean).join(', ');
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                q
              )}&countrycodes=pe&limit=6&addressdetails=1`
            );
            const data = await res.json();
            if (data && data.length > 0) {
              results = data;
              break;
            }
          }
        }

        // ETAPA 3: Fallback a nivel de Departamento o Perú si aún no hay resultados
        if (results.length === 0) {
          for (const v of variants) {
            const q = [v, departamento, 'Perú'].filter(Boolean).join(', ');
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                q
              )}&countrycodes=pe&limit=6&addressdetails=1`
            );
            const data = await res.json();
            if (data && data.length > 0) {
              results = data;
              break;
            }
          }
        }

        if (results.length > 0) {
          const parsed: SuggestionItem[] = results.map((item) => {
            const parts = item.display_name.split(',');
            const title = item.name || parts[0]?.trim() || clean;
            const subtitle = parts.slice(1, 4).join(',').trim();
            const itemLat = parseFloat(item.lat);
            const itemLng = parseFloat(item.lon);
            const distKm = calculateDistanceKm(lat, lng, itemLat, itemLng);
            const detectedDist = matchOrExtractDistrict(item.address, availableDistritos);

            const isSameDistrict =
              Boolean(distrito) &&
              Boolean(detectedDist) &&
              detectedDist.toLowerCase() === distrito.toLowerCase();

            return {
              id: item.place_id || String(Math.random()),
              name: title,
              subtitle,
              lat: itemLat,
              lng: itemLng,
              rawAddress: item.address,
              detectedDistrict: detectedDist,
              isInSelectedDistrict: isSameDistrict || foundInSelectedDistrict,
              distanceKm: distKm,
            };
          });

          // Ordenar sugerencias por distancia (las más cercanas a la posición actual primero)
          parsed.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

          // Notificar si no se encontró en el distrito seleccionado y se ubicó en otro
          if (distrito && !foundInSelectedDistrict) {
            const closest = parsed[0];
            const closestDistrict = closest.detectedDistrict || 'un distrito vecino';
            const isDifferent = closestDistrict.toLowerCase() !== distrito.toLowerCase();

            if (isDifferent) {
              setDistrictNotice({
                searchedDistrict: distrito,
                foundDistrict: closestDistrict,
                distanceKm: closest.distanceKm,
                placeName: closest.name,
              });
            }
          }

          setSuggestions(parsed);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
          setSearchError(
            `No se encontró "${clean}" en ${distrito ? distrito + ', ' : ''}${provincia || departamento}. Puedes ubicar o arrastrar el pin directamente en el mapa.`
          );
        }
      } catch {
        setSearchError('Error de conexión con el servicio de mapas.');
      } finally {
        setIsSearching(false);
      }
    },
    [distrito, provincia, departamento, availableDistritos, lat, lng]
  );

  // Debounce para sugerencias predictivas mientras se escribe
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        searchPlacesElastic(val);
      }, 350);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
      setDistrictNotice(null);
    }
  };

  // Al seleccionar una sugerencia del dropdown
  const handleSelectSuggestion = (item: SuggestionItem) => {
    setSearchQuery(item.name);
    setShowDropdown(false);
    setSearchError(null);
    setDistrictNotice(null);

    setLat(item.lat);
    setLng(item.lng);
    onChange({ lat: item.lat, lng: item.lng });

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([item.lat, item.lng], 16, { duration: 1.2 });
      markerRef.current.setLatLng([item.lat, item.lng]);
    }

    // Autollenar la dirección física y notificar distrito detectado
    if (item.rawAddress) {
      const road = item.rawAddress.road || item.rawAddress.pedestrian || item.name;
      const number = item.rawAddress.house_number ? ` ${item.rawAddress.house_number}` : '';
      const ref = item.rawAddress.neighbourhood || item.rawAddress.suburb || '';
      const clean = `${road}${number}${ref ? `, ${ref}` : ''}`.trim();
      const detectedDist =
        item.detectedDistrict || matchOrExtractDistrict(item.rawAddress, availableDistritos);

      if (onAddressFound) {
        onAddressFound(clean, detectedDist);
      }
    } else {
      reverseGeocode(item.lat, item.lng);
    }
  };

  return (
    <div className="space-y-2 relative">
      {/* Barra de búsqueda predictiva */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              placeholder={
                distrito
                  ? `Buscar en ${distrito}, ${provincia}...`
                  : provincia
                  ? `Buscar mercado, calle o referencia en ${provincia}...`
                  : 'Buscar mercado, avenida o lugar...'
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  searchPlacesElastic(searchQuery);
                }
              }}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 font-medium"
            />
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {isSearching && (
              <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin absolute right-3 top-2.5" />
            )}
          </div>
          <button
            type="button"
            onClick={() => searchPlacesElastic(searchQuery)}
            disabled={isSearching}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shrink-0 shadow-sm"
          >
            <span>Buscar</span>
          </button>
        </div>

        {/* Dropdown flotante de sugerencias predictivas con badges territoriales */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto animate-fadeIn">
            <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Lugares encontrados ({suggestions.length})</span>
              <span className="text-[9px] text-slate-400 font-normal">Ordenados por cercanía</span>
            </div>
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-red-50/70 transition flex items-start gap-2.5 text-xs group"
              >
                <MapPinIcon
                  className={`w-4 h-4 shrink-0 mt-0.5 group-hover:scale-110 transition-transform ${
                    item.isInSelectedDistrict ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-slate-900 group-hover:text-red-700">
                      {item.name}
                    </span>
                    {item.isInSelectedDistrict ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        ✓ En {distrito}
                      </span>
                    ) : item.detectedDistrict ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 shrink-0">
                        📍 En {item.detectedDistrict}
                        {item.distanceKm !== undefined ? ` (~${item.distanceKm} km)` : ''}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate font-normal mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Aviso interactivo si el lugar no está en el distrito actual pero se ubicó en el más cercano */}
      {districtNotice && (
        <div className="p-3 bg-amber-50/95 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start justify-between gap-3 animate-fadeIn shadow-sm">
          <div className="flex items-start gap-2.5">
            <span className="text-base shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="font-bold text-amber-900">
                No se encontró en el distrito de &ldquo;{districtNotice.searchedDistrict}&rdquo;
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                El lugar más cercano se ubicó en el distrito de{' '}
                <strong className="text-amber-950 font-black bg-amber-200/80 px-1.5 py-0.5 rounded-md">
                  {districtNotice.foundDistrict}
                </strong>
                {districtNotice.distanceKm !== undefined && (
                  <span> (a aprox. {districtNotice.distanceKm} km de tu ubicación)</span>
                )}
                . Puedes seleccionarlo en la lista para mover el mapa y actualizar el distrito.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDistrictNotice(null)}
            className="text-amber-500 hover:text-amber-800 font-bold text-xs p-1 shrink-0"
            title="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {searchError && (
        <p className="text-[11px] text-amber-800 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 font-medium">
          {searchError}
        </p>
      )}

      {/* Contenedor del Mapa */}
      <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-slate-300 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Coordenadas en vivo */}
        <div className="absolute bottom-2 left-2 z-10 bg-slate-900/85 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-mono border border-slate-700 flex items-center gap-1.5 shadow-md">
          <MapPinIcon className="w-3.5 h-3.5 text-red-500" />
          <span>
            Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
          </span>
        </div>

        <div className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium shadow-sm pointer-events-none">
          Haz clic o arrastra el pin para ajustar
        </div>
      </div>
    </div>
  );
}
