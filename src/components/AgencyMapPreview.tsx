'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { Agency } from '@/domain/entities/agency';
import { MapPinIcon, BuildingIcon, ClockIcon } from '@/components/Icons';

interface MapProps {
  agency: Agency | null;
  allAgencies?: Agency[];
  userLocation?: { lat: number; lng: number } | null;
  distanceKm?: number | null;
  onLocateMe?: () => void;
  onSelectAgency?: (agency: Agency) => void;
  isLocating?: boolean;
}

export function AgencyMapPreview({
  agency,
  allAgencies = [],
  userLocation,
  distanceKm,
  onLocateMe,
  onSelectAgency,
  isLocating,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);

  // Coordenadas por defecto (Cusco / Plaza de Armas si no hay coordenadas)
  const defaultCenter = { lat: -13.518333, lng: -71.978056 };

  // Inicializar Leaflet y mapa interactivo OpenStreetMap
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const L = await import('leaflet');

      if (!isMounted || !mapContainerRef.current) return;

      // Limpiar instancia previa si existe
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      if ((mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      const initialLat = agency?.latitud || userLocation?.lat || defaultCenter.lat;
      const initialLng = agency?.longitud || userLocation?.lng || defaultCenter.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: false, // Añadiremos control en la esquina superior derecha
      });

      // Añadir controles de zoom limpios
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Capa de mosaicos OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Capa para marcadores
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      setMapLoaded(true);
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
    };
  }, []);

  // Actualizar marcadores en el mapa cuando cambian las agencias o la selección
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !markersLayerRef.current) return;

    async function updateMarkers() {
      const L = await import('leaflet');
      const markersLayer = markersLayerRef.current;
      markersLayer.clearLayers();

      // 1. Icono Destacado Banco de la Nación (Rojo Institucional)
      const primaryPinIcon = L.divIcon({
        className: 'bn-pin-primary',
        html: `
          <div style="
            background: linear-gradient(135deg, #B50D26 0%, #C8102E 100%);
            width: 38px;
            height: 38px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #FFFFFF;
            box-shadow: 0 6px 14px rgba(200, 16, 46, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="
              transform: rotate(45deg);
              color: white;
              font-weight: 900;
              font-size: 11px;
              font-family: sans-serif;
            ">BN</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38],
      });

      // 2. Icono Secundario para demás agencias
      const secondaryPinIcon = L.divIcon({
        className: 'bn-pin-secondary',
        html: `
          <div style="
            background: #1E252D;
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid #FFFFFF;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background-color: #C8102E;
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });

      // 3. Renderizar todas las agencias
      const listToRender = allAgencies.length > 0 ? allAgencies : (agency ? [agency] : []);

      listToRender.forEach((ag) => {
        const isSelected = agency && agency.id_agencia === ag.id_agencia;
        const agLat = ag.latitud ?? defaultCenter.lat;
        const agLng = ag.longitud ?? defaultCenter.lng;

        const marker = L.marker([agLat, agLng], {
          icon: isSelected ? primaryPinIcon : secondaryPinIcon,
          zIndexOffset: isSelected ? 1000 : 100,
        });

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 170px;">
            <div style="font-size: 10px; font-weight: 800; color: #C8102E; text-transform: uppercase; letter-spacing: 0.5px;">
              ${ag.distrito || 'Agencia BN'}
            </div>
            <strong style="font-size: 13px; color: #1E252D; display: block; margin: 2px 0 4px 0;">
              ${ag.nombre_agencia}
            </strong>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">
              📍 ${ag.direccion}
            </div>
            <div style="font-size: 10px; background: #F1F5F9; padding: 4px 6px; border-radius: 6px; color: #334155; font-weight: 600;">
              🕒 Lun a Vie: 8:00 am - 5:00 pm
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onSelectAgency) {
            onSelectAgency(ag);
          }
        });

        markersLayer.addLayer(marker);

        if (isSelected) {
          marker.openPopup();
        }
      });

      // 4. Marcador de usuario con radar pulsante
      if (userLocation) {
        if (userMarkerRef.current) {
          markersLayer.removeLayer(userMarkerRef.current);
        }

        const userPinIcon = L.divIcon({
          className: 'user-location-pin',
          html: `
            <div style="position: relative; width: 24px; height: 24px;">
              <div style="
                position: absolute;
                inset: -6px;
                border-radius: 50%;
                background: rgba(37, 99, 235, 0.35);
                animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
              <div style="
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: #2563EB;
                border: 3px solid #FFFFFF;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 11px;
                font-weight: bold;
              ">👤</div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const userMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: userPinIcon,
          zIndexOffset: 2000,
        }).bindPopup('<b>Tu ubicación actual</b><br>Calculando distancia a agencias BN');

        markersLayer.addLayer(userMarker);
        userMarkerRef.current = userMarker;
      }
    }

    updateMarkers();
  }, [mapLoaded, agency, allAgencies, userLocation]);

  // Centrar y volar suavemente a la agencia seleccionada
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !agency) return;

    const targetLat = agency.latitud ?? defaultCenter.lat;
    const targetLng = agency.longitud ?? defaultCenter.lng;

    mapInstanceRef.current.flyTo([targetLat, targetLng], 15, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [agency, mapLoaded]);

  const googleMapsUrl = userLocation && agency
    ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${agency.latitud || defaultCenter.lat},${agency.longitud || defaultCenter.lng}`
    : agency
    ? `https://www.google.com/maps/search/?api=1&query=${agency.latitud || defaultCenter.lat},${agency.longitud || defaultCenter.lng}`
    : '#';

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between h-full">
      {/* Contenedor del Mapa Funcional Leaflet */}
      <div className="relative w-full h-80 sm:h-[380px] bg-slate-100 z-10">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Badges Superpuestos en el Mapa */}
        {distanceKm !== undefined && distanceKm !== null && (
          <div className="absolute top-3 left-3 z-[1000] bg-[#C8102E] text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-lg border border-white/40 flex items-center gap-1.5">
            <span>📍 Distancia estimada:</span>
            <strong className="text-amber-200 font-mono text-sm">
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
            </strong>
          </div>
        )}

        {/* Botón Flotante para Centrar Ubicación */}
        {onLocateMe && (
          <button
            type="button"
            onClick={onLocateMe}
            disabled={isLocating}
            className="absolute bottom-3 left-3 z-[1000] bg-white/95 hover:bg-white text-[#1E252D] text-xs font-bold px-3 py-2 rounded-xl shadow-md border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
            title="Centrar en mi ubicación GPS"
          >
            <span className="text-blue-600">📍</span>
            <span>{isLocating ? 'Detectando...' : userLocation ? 'Mi Ubicación GPS' : 'Activar GPS'}</span>
          </button>
        )}

        {/* Botón Abrir Ruta en Google Maps */}
        {agency && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 z-[1000] bg-[#1E252D] hover:bg-[#C8102E] text-white text-[11px] font-bold px-3 py-2 rounded-xl shadow-md transition flex items-center gap-1"
          >
            <span>Cómo llegar ↗</span>
          </a>
        )}
      </div>

      {/* Detalle Informativo de la Agencia Seleccionada */}
      {agency ? (
        <div className="p-5 sm:p-6 space-y-4 bg-white border-t border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-black text-[#C8102E] uppercase tracking-wider block">
                {agency.distrito}
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-[#1E252D] leading-tight mt-0.5">
                {agency.nombre_agencia}
              </h3>
            </div>
            {distanceKm !== undefined && distanceKm !== null && distanceKm <= 5 && (
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                ⭐ AGENCIA CERCANA
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs sm:text-sm text-slate-600 pt-3 border-t border-slate-100 font-medium">
            <p className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-[#C8102E] shrink-0" />
              <strong className="text-[#1E252D]">Dirección:</strong> {agency.direccion}
            </p>
            <p className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-amber-600 shrink-0" />
              <strong className="text-[#1E252D]">Horario de Atención:</strong> Lunes a Viernes: 8:00 am - 5:00 pm
            </p>
            {agency.telefono && (
              <p className="flex items-center gap-2">
                <BuildingIcon className="w-4 h-4 text-slate-500 shrink-0" />
                <strong className="text-[#1E252D]">Teléfono:</strong> {agency.telefono}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-slate-500 font-medium text-xs">
          Selecciona una agencia del directorio para visualizar sus detalles.
        </div>
      )}

    </div>
  );
}
