'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogoBancoNacion } from '@/components/LogoBancoNacion';
import {
  MapPinIcon,
  FileTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  UserIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BuildingIcon,
  ClockIcon,
} from '@/components/Icons';
import dynamic from 'next/dynamic';
import { SupabaseAgencyRepository } from '@/infrastructure/repositories/supabase-agency-repository';
import { SupabaseProcedureRepository } from '@/infrastructure/repositories/supabase-procedure-repository';
import { Agency } from '@/domain/entities/agency';
import { Procedure } from '@/domain/entities/procedure';
import { LoginDrawer } from '@/components/auth/LoginDrawer';

const AgencyMapPreview = dynamic(
  () => import('@/components/AgencyMapPreview').then((mod) => mod.AgencyMapPreview),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 sm:h-96 bg-slate-100 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 font-bold text-xs gap-3">
        <div className="w-7 h-7 border-3 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
        <span>Cargando mapa interactivo de agencias BN...</span>
      </div>
    ),
  }
);

// Función Haversine para calcular distancia en km entre dos coordenadas GPS
function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function PublicLandingClient() {
  const router = useRouter();

  // Sesión del usuario en vivo
  const [userSession, setUserSession] = useState<any>(null);

  // Drawer modal
  const [isLoginDrawerOpen, setIsLoginDrawerOpen] = useState(false);
  const [drawerTramiteId, setDrawerTramiteId] = useState<number | null>(null);
  const [drawerAgenciaId, setDrawerAgenciaId] = useState<number | null>(null);

  // Datos de Supabase
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Estado del paso activo (1 al 4) y carrusel suave
  const [activeStep, setActiveStep] = useState(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Filtros y Paginación de Trámites
  const [procedureSearch, setProcedureSearch] = useState('');
  const [selectedProcedureForModal, setSelectedProcedureForModal] = useState<Procedure | null>(null);
  const [procedurePage, setProcedurePage] = useState(1);
  const proceduresPerPage = 6;

  // Filtros de Agencias
  const [districtFilter, setDistrictFilter] = useState('Todas las agencias');
  const [agencySearch, setAgencySearch] = useState('');

  // Geolocalización y mapa interactivo
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [nearestAgency, setNearestAgency] = useState<Agency | null>(null);
  const [selectedMapAgency, setSelectedMapAgency] = useState<Agency | null>(null);
  const [agencyDistances, setAgencyDistances] = useState<Record<number, number>>({});

  const agencyRepo = new SupabaseAgencyRepository();
  const procedureRepo = new SupabaseProcedureRepository();

  // Rotación automática suave de los 4 pasos cada 4.5 segundos
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 4500);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  // Sincronizar sesión con localStorage
  const syncSession = () => {
    try {
      const stored = localStorage.getItem('bn_user_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.authenticated) {
          setUserSession(parsed);
          return;
        }
      }
    } catch {
      // Ignorar errores
    }
    setUserSession(null);
  };

  useEffect(() => {
    syncSession();
    const handleStorageChange = () => syncSession();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bn_session_change', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bn_session_change', handleStorageChange);
    };
  }, []);

  // Consulta en tiempo real directa a Supabase al cargar la página
  useEffect(() => {
    async function fetchSupabaseData() {
      setLoading(true);
      setFetchError(null);
      try {
        const [agData, procData] = await Promise.all([
          agencyRepo.getAgencies(),
          procedureRepo.getProcedures(),
        ]);
        setAgencies(agData);
        setProcedures(procData);

        if (agData.length > 0) {
          setSelectedMapAgency(agData[0]);
        }
      } catch (err: any) {
        console.error('Error al conectar con Supabase:', err);
        setFetchError(err?.message || 'Error de conexión con la base de datos de Supabase.');
      } finally {
        setLoading(false);
      }
    }

    fetchSupabaseData();
  }, []);

  // Definición detallada de los 4 pasos oficiales para agendar cita
  const appointmentSteps = [
    {
      step: 1,
      badge: 'Paso 01 / 04',
      tag: 'Identificación Segura',
      title: 'Inicia Sesión con tu DNI',
      subtitle: 'Acceso y validación ciudadana',
      description: 'Ingresa con tu número de DNI para vincular tu turno a tu cuenta ciudadana. Podrás consultar el estado de tus citas y recibir avisos y recordatorios por SMS.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      actionText: 'Iniciar Sesión',
      actionType: 'login',
    },
    {
      step: 2,
      badge: 'Paso 02 / 04',
      tag: 'Geolocalización GPS',
      title: 'Localiza y Elige tu Agencia BN',
      subtitle: 'Encuentra la sede más cercana',
      description: 'El sistema calcula en tiempo real la distancia en kilómetros a la agencia del Banco de la Nación más cercana a tu ubicación para que ahorres tiempo en tu traslado.',
      image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80',
      actionText: 'Ver Agencias en Mapa',
      actionType: 'agencias',
    },
    {
      step: 3,
      badge: 'Paso 03 / 04',
      tag: 'Reserva de Ventanilla',
      title: 'Selecciona Trámite y Horario',
      subtitle: 'Elige tu operación bancaria y fecha',
      description: 'Selecciona la gestión que requieres (cuentas de ahorros, pagos de tasas, cobro de bonos o pensiones) y reserva el bloque horario de tu conveniencia.',
      image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
      actionText: 'Explorar Trámites',
      actionType: 'tramites',
    },
    {
      step: 4,
      badge: 'Paso 04 / 04',
      tag: 'Atención Prioritaria',
      title: 'Descarga tu Comprobante y Código QR',
      subtitle: 'Llega a la agencia y sé atendido sin colas',
      description: 'Obtén tu comprobante digital oficial con código QR descargable. Al acudir a la agencia, preséntalo en ventanilla para ingresar de forma preferencial en tu turno reservado.',
      image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
      actionText: 'Agendar Cita Ahora',
      actionType: 'agendar',
    },
  ];

  const currentStepData = appointmentSteps.find((s) => s.step === activeStep) || appointmentSteps[0];

  // Detectar ubicación del usuario y calcular agencia más cercana
  const handleDetectUserLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no cuenta con soporte para geolocalización.');
      return;
    }

    setIsLocating(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        applyUserCoordinates(coords);
      },
      (err) => {
        console.warn('Geolocalización navegador rechazada o timeout:', err.message);
        setIsLocating(false);
        const fallbackCoords = { lat: -13.5168, lng: -71.9788 };
        applyUserCoordinates(fallbackCoords, true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const applyUserCoordinates = (coords: { lat: number; lng: number }, isDemo = false) => {
    setUserLocation(coords);
    setIsLocating(false);

    if (agencies.length === 0) return;

    const distMap: Record<number, number> = {};
    let closestAgency: Agency = agencies[0];
    let minDistance = Infinity;

    agencies.forEach((ag) => {
      const agLat = ag.latitud ?? -13.518333;
      const agLng = ag.longitud ?? -71.978056;
      const dist = calculateHaversineDistanceKm(coords.lat, coords.lng, agLat, agLng);
      distMap[ag.id_agencia] = dist;

      if (dist < minDistance) {
        minDistance = dist;
        closestAgency = ag;
      }
    });

    setAgencyDistances(distMap);
    setNearestAgency(closestAgency);
    setSelectedMapAgency(closestAgency);

    const sorted = [...agencies].sort((a, b) => {
      const da = distMap[a.id_agencia] ?? 9999;
      const db = distMap[b.id_agencia] ?? 9999;
      return da - db;
    });
    setAgencies(sorted);

    const distText = minDistance < 1 ? `${Math.round(minDistance * 1000)} metros` : `${minDistance.toFixed(1)} km`;
    setLocationNotice(
      `📍 ${isDemo ? 'Ubicación simulada' : 'Ubicación detectada'}: La agencia más cercana es "${closestAgency.nombre_agencia}" (${closestAgency.distrito}) a aprox. ${distText}.`
    );

    const mapSection = document.getElementById('agencias');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Cerrar Sesión desde el encabezado
  const handleLogout = () => {
    localStorage.removeItem('bn_user_session');
    window.dispatchEvent(new Event('bn_session_change'));
    setUserSession(null);
    setIsLoginDrawerOpen(false);
    router.push('/');
  };

  // Búsquedas dinámicas
  const handleSearchProcedures = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setProcedurePage(1);
      const results = await procedureRepo.getProcedures(procedureSearch);
      setProcedures(results);
    } catch (err: any) {
      setFetchError(err?.message);
    }
  };

  const handleResetProcedureSearch = async () => {
    setProcedureSearch('');
    setProcedurePage(1);
    try {
      const results = await procedureRepo.getProcedures('');
      setProcedures(results);
    } catch (err: any) {
      setFetchError(err?.message);
    }
  };

  const handleSearchAgencies = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const results = await agencyRepo.getAgencies(districtFilter, agencySearch);
      setAgencies(results);
      if (results.length > 0) setSelectedMapAgency(results[0]);
    } catch (err: any) {
      setFetchError(err?.message);
    }
  };

  const handleResetAgencyFilters = async () => {
    setDistrictFilter('Todas las agencias');
    setAgencySearch('');
    setLocationNotice(null);
    setUserLocation(null);
    setAgencyDistances({});
    setNearestAgency(null);
    try {
      const results = await agencyRepo.getAgencies();
      setAgencies(results);
      if (results.length > 0) setSelectedMapAgency(results[0]);
    } catch (err: any) {
      setFetchError(err?.message);
    }
  };

  const availableDistricts = Array.from(
    new Set(agencies.map((a) => a.distrito).filter(Boolean))
  );

  const handleBookingAction = (e: React.MouseEvent, tramiteId?: number, agenciaId?: number) => {
    e.preventDefault();

    const tId = tramiteId;
    const aId = agenciaId;

    if (tId) sessionStorage.setItem('bn_selected_tramiteId', String(tId));
    if (aId) sessionStorage.setItem('bn_selected_agenciaId', String(aId));

    if (!userSession || !userSession.authenticated) {
      if (tId) setDrawerTramiteId(tId);
      if (aId) setDrawerAgenciaId(aId);
      setIsLoginDrawerOpen(true);
      return;
    }

    if (userSession.role === 'ADMIN_GENERAL' || userSession.role === 'admin-general' || userSession.id_rol === 4) {
      router.push('/admin-general?adminNotice=true');
      return;
    }
    if (userSession.role === 'ADMIN_AGENCIA' || userSession.role === 'admin-agencia' || userSession.id_rol === 3) {
      router.push('/admin-agencia?adminNotice=true');
      return;
    }
    if (userSession.role === 'AGENTE' || userSession.role === 'ventanilla' || userSession.id_rol === 2) {
      router.push('/ventanilla?adminNotice=true');
      return;
    }

    const params = new URLSearchParams();
    if (tId) params.set('tramiteId', String(tId));
    if (aId) params.set('agenciaId', String(aId));
    const targetUrl = params.toString() ? `/agendar?${params.toString()}` : '/agendar';
    router.push(targetUrl);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-[#1E252D] flex flex-col selection:bg-[#C8102E] selection:text-white">
      
      {/* ================= HEADER INSTITUCIONAL BANCO DE LA NACIÓN ================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-6 lg:gap-8">
            <Link href="/" className="hover:opacity-95 transition-opacity shrink-0">
              <LogoBancoNacion showSubtitle={true} />
            </Link>

            {/* Menú de Navegación Institucional */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-semibold text-[#1E252D]">
              <a href="#tramites" className="flex items-center gap-1 hover:text-[#C8102E] transition-colors py-2">
                Trámites y Servicios
              </a>
              <a href="#agencias" className="flex items-center gap-1 hover:text-[#C8102E] transition-colors py-2">
                Directorio de Agencias
              </a>
            </nav>
          </div>

          {/* Botones de Acción Derecha */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Buscador Rápido */}
            <a
              href="#tramites"
              className="hidden lg:flex items-center gap-2 text-[#1E252D] hover:text-[#C8102E] text-sm font-semibold px-3 py-1.5 rounded-full hover:bg-slate-100 transition"
            >
              <SearchIcon className="w-4 h-4 text-slate-500" />
              <span>Buscar</span>
            </a>

            {/* Usuario / Iniciar Sesión */}
            {userSession && userSession.authenticated ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoginDrawerOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-full transition cursor-pointer text-[#1E252D] shadow-xs"
                >
                  <div className="w-7 h-7 rounded-full bg-[#C8102E] text-white font-black text-xs flex items-center justify-center">
                    {userSession.nombre ? userSession.nombre.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline font-bold text-xs truncate max-w-[100px]">
                    {userSession.nombre}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-[#C8102E] hover:bg-red-50 border border-slate-200 rounded-lg font-bold transition"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDrawerTramiteId(null);
                  setDrawerAgenciaId(null);
                  setIsLoginDrawerOpen(true);
                }}
                className="px-4 py-2 border border-slate-300 hover:border-[#C8102E] hover:text-[#C8102E] rounded-full text-xs sm:text-sm font-bold text-[#1E252D] transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-[#C8102E]" />
                <span className="hidden sm:inline">Mi Cuenta</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* AVISO DE ERROR SI FALLA SUPABASE */}
      {fetchError && (
        <div className="max-w-7xl mx-auto mt-4 px-4 sm:px-6 lg:px-8 w-full">
          <div className="bg-red-50 border border-red-300 p-4 rounded-xl text-red-800 text-xs font-bold flex items-center justify-between shadow-xs">
            <span>⚠️ Aviso de sincronización: {fetchError}</span>
            <span className="text-[10px] text-red-600 font-normal">Reintentando conexión...</span>
          </div>
        </div>
      )}

      {/* ================= HERO SHOWCASE: LOS 4 PASOS PARA AGENDAR TU CITA ================= */}
      <section className="relative bg-[#FAF5F0] border-b border-slate-200/80 overflow-hidden py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* COLUMNA IZQUIERDA: Presentación Institucional y Selector de Pasos */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Badge Oficial BN */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-100/70 border border-red-200 text-[#C8102E] text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#C8102E] animate-pulse"></span>
                Sistema Oficial de Agendamiento Web
              </div>

              {/* Titular Principal */}
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#1E252D] leading-[1.18] tracking-tight">
                Tu turno en el Banco de la Nación, <span className="text-[#C8102E]">rápido y sin colas</span>
              </h1>

              {/* Descripción */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                Conoce el proceso de 4 pasos para reservar tu atención presencial en agencias autorizadas a nivel nacional y acceder de forma preferencial en tu horario asignado.
              </p>

              {/* Botones de Acción Directa */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={(e) => handleBookingAction(e)}
                  className="px-6 py-3.5 bg-[#C8102E] hover:bg-[#990B1B] text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <CalendarIcon className="w-4 h-4 text-white" />
                  <span>Agendar Cita en Línea</span>
                </button>
                <a
                  href="#agencias"
                  className="px-5 py-3.5 bg-white hover:bg-slate-100 text-[#1E252D] border border-slate-300 font-bold rounded-xl shadow-xs transition-all text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2"
                >
                  <MapPinIcon className="w-4 h-4 text-[#C8102E]" />
                  <span>Ubicar Agencias</span>
                </a>
              </div>

              {/* Selector de los 4 Pasos (Navegación Interactiva) */}
              <div className="pt-4 border-t border-slate-200/90 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  Pasos del proceso de agendamiento:
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {appointmentSteps.map((s) => {
                    const isCurrent = activeStep === s.step;
                    return (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => {
                          setActiveStep(s.step);
                          setIsAutoPlaying(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isCurrent
                            ? 'bg-white border-[#C8102E] shadow-sm ring-2 ring-red-100'
                            : 'bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {/* Barra indicadora superior */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-1 transition-all ${
                            isCurrent ? 'bg-[#C8102E]' : 'bg-transparent'
                          }`}
                        />
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center ${
                              isCurrent ? 'bg-[#C8102E] text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {s.step}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase text-slate-500 truncate">
                            Paso 0{s.step}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-[#1E252D] leading-tight truncate">
                          {s.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: Tarjeta Dinámica de Paso con Imagen que Cambia Poco a Poco */}
            <div
              className="lg:col-span-6"
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => setIsAutoPlaying(true)}
            >
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden flex flex-col transition-all duration-500 hover:shadow-2xl">
                
                {/* Cabecera de la Tarjeta con Badges y Controles */}
                <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#C8102E] text-white font-extrabold text-[11px] uppercase tracking-wider shadow-xs">
                      {currentStepData.badge}
                    </span>
                    <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                      {currentStepData.tag}
                    </span>
                  </div>

                  {/* Controles de Navegación Manual y Pausa */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStep((prev) => (prev <= 1 ? 4 : prev - 1));
                        setIsAutoPlaying(false);
                      }}
                      className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                      title="Paso anterior"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStep((prev) => (prev >= 4 ? 1 : prev + 1));
                        setIsAutoPlaying(false);
                      }}
                      className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                      title="Siguiente paso"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition cursor-pointer ${
                        isAutoPlaying
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                      title={isAutoPlaying ? 'Pausar rotación automática' : 'Reanudar rotación automática'}
                    >
                      {isAutoPlaying ? '● Auto' : 'Pausado'}
                    </button>
                  </div>
                </div>

                {/* Imagen Alusiva al Paso Seleccionado */}
                <div className="relative h-56 sm:h-64 bg-slate-100 overflow-hidden group">
                  <img
                    key={currentStepData.step}
                    src={currentStepData.image}
                    alt={currentStepData.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex items-end p-5">
                    <div>
                      <span className="text-amber-300 text-[11px] font-extrabold uppercase tracking-widest block">
                        {currentStepData.tag}
                      </span>
                      <h3 className="text-white text-lg sm:text-xl font-black leading-tight drop-shadow-md">
                        {currentStepData.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Explicación Detallada del Paso */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-extrabold text-[#C8102E]">
                      {currentStepData.subtitle}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                      {currentStepData.description}
                    </p>
                  </div>

                  {/* Botón de Acción Específico de este Paso */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4].map((stepNum) => (
                        <span
                          key={stepNum}
                          className={`inline-block h-1.5 rounded-full transition-all ${
                            stepNum === activeStep
                              ? 'w-6 bg-[#C8102E]'
                              : 'w-2 bg-slate-300'
                          }`}
                        />
                      ))}
                    </div>

                    {currentStepData.actionType === 'login' && (
                      <button
                        type="button"
                        onClick={() => setIsLoginDrawerOpen(true)}
                        className="px-4 py-2 bg-[#C8102E] hover:bg-[#990B1B] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>{currentStepData.actionText}</span>
                      </button>
                    )}

                    {currentStepData.actionType === 'agencias' && (
                      <a
                        href="#agencias"
                        className="px-4 py-2 bg-[#1E252D] hover:bg-[#C8102E] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <MapPinIcon className="w-3.5 h-3.5" />
                        <span>{currentStepData.actionText}</span>
                      </a>
                    )}

                    {currentStepData.actionType === 'tramites' && (
                      <a
                        href="#tramites"
                        className="px-4 py-2 bg-[#1E252D] hover:bg-[#C8102E] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <FileTextIcon className="w-3.5 h-3.5" />
                        <span>{currentStepData.actionText}</span>
                      </a>
                    )}

                    {currentStepData.actionType === 'agendar' && (
                      <button
                        type="button"
                        onClick={(e) => handleBookingAction(e)}
                        className="px-4 py-2 bg-[#C8102E] hover:bg-[#990B1B] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>{currentStepData.actionText}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Línea de Progreso de Tiempo al Pie */}
                {isAutoPlaying && (
                  <div className="w-full bg-slate-100 h-1 overflow-hidden">
                    <div
                      key={activeStep}
                      className="bg-[#C8102E] h-full animate-progress"
                    />
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ================= CONTENIDO PRINCIPAL: TRÁMITES Y AGENCIAS ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        
        {/* ================= CATÁLOGO DE TRÁMITES Y SERVICIOS ================= */}
        <section id="tramites" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-100/70 border border-red-200 text-[#C8102E] text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-[#C8102E]"></span>
              Requisitos y Servicios Oficiales
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E252D] tracking-tight">
              CATÁLOGO DE TRÁMITES Y SERVICIOS
            </h2>
            <div className="w-16 h-1 bg-[#C8102E] mx-auto mt-3 rounded-full" />
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
              Consulta los requisitos oficiales antes de agendar tu visita presencial y reserva tu turno preferencial sin esperas.
            </p>
          </div>

          {/* Buscador de Trámites */}
          <form onSubmit={handleSearchProcedures} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <SearchIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar trámite (ej: Apertura, Cheques, Tarjeta, Pensión)..."
                value={procedureSearch}
                onChange={(e) => setProcedureSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-[#1E252D] placeholder-slate-400 focus:outline-none focus:border-[#C8102E] focus:ring-2 focus:ring-red-100 text-xs sm:text-sm font-medium transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-6 py-3 bg-[#1E252D] hover:bg-[#C8102E] text-white font-extrabold rounded-2xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <SearchIcon className="w-4 h-4" />
                <span>Buscar</span>
              </button>
              {procedureSearch && (
                <button
                  type="button"
                  onClick={handleResetProcedureSearch}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {loading ? (
            <div className="py-12 text-center text-slate-500 font-semibold flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-3 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
              Consultando trámites oficiales desde Supabase...
            </div>
          ) : procedures.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 font-medium space-y-3">
              <p>No se encontraron trámites registrados que coincidan con la búsqueda.</p>
              {procedureSearch && (
                <button
                  type="button"
                  onClick={handleResetProcedureSearch}
                  className="px-4 py-2 bg-[#C8102E] text-white rounded-xl text-xs font-bold transition hover:bg-[#990B1B]"
                >
                  Restablecer catálogo
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Grid de Trámites con Tamaño Fijo y Diseño Uniforme */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {procedures
                  .slice((procedurePage - 1) * proceduresPerPage, procedurePage * proceduresPerPage)
                  .map((proc) => {
                    const reqCount = proc.requisitos?.length || 0;
                    return (
                      <div
                        key={proc.id_tramite}
                        className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-[#C8102E]/60 hover:shadow-lg transition-all bg-white flex flex-col justify-between group"
                      >
                        <div className="h-1.5 bg-[#C8102E] group-hover:h-2 transition-all" />
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#C8102E] flex items-center justify-center shrink-0 shadow-xs">
                                <FileTextIcon className="w-5 h-5 text-[#C8102E]" />
                              </div>
                              {proc.duracion_minutos && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  <ClockIcon className="w-3 h-3 text-[#C8102E]" />
                                  {proc.duracion_minutos} min
                                </span>
                              )}
                            </div>

                            <div>
                              <h3 className="font-extrabold text-[#1E252D] text-base leading-snug line-clamp-2">
                                {proc.nombre_tramite}
                              </h3>
                              <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-1.5 leading-relaxed">
                                {proc.descripcion || 'Trámite oficial disponible para agendamiento previo.'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedProcedureForModal(proc)}
                              className="text-xs font-bold text-[#C8102E] hover:text-[#990B1B] bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Ver requisitos</span>
                              {reqCount > 0 && (
                                <span className="w-4 h-4 rounded-full bg-[#C8102E] text-white text-[10px] font-bold flex items-center justify-center">
                                  {reqCount}
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleBookingAction(e, proc.id_tramite, undefined)}
                              className="px-3.5 py-2 bg-[#1E252D] hover:bg-[#C8102E] text-white font-extrabold rounded-xl transition text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span>Agendar</span>
                              <CalendarIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Paginación de Trámites */}
              {procedures.length > proceduresPerPage && (
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold">
                    Mostrando{' '}
                    <strong className="text-[#1E252D]">
                      {(procedurePage - 1) * proceduresPerPage + 1} -{' '}
                      {Math.min(procedurePage * proceduresPerPage, procedures.length)}
                    </strong>{' '}
                    de <strong className="text-[#1E252D]">{procedures.length}</strong> trámites disponibles
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={procedurePage === 1}
                      onClick={() => setProcedurePage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      ‹ Anterior
                    </button>

                    {Array.from({ length: Math.ceil(procedures.length / proceduresPerPage) }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isActive = pageNum === procedurePage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setProcedurePage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                            isActive
                              ? 'bg-[#C8102E] text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={procedurePage >= Math.ceil(procedures.length / proceduresPerPage)}
                      onClick={() => setProcedurePage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Siguiente ›
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ================= DIRECTORIO DE AGENCIAS DISPONIBLES & GEOLOCALIZACIÓN ================= */}
        <section id="agencias" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-100/70 border border-red-200 text-[#C8102E] text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-[#C8102E]"></span>
              Red Nacional de Agencias BN
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E252D] tracking-tight">
              DIRECTORIO DE AGENCIAS Y GEOLOCALIZACIÓN
            </h2>
            <div className="w-16 h-1 bg-[#C8102E] mx-auto mt-3 rounded-full" />
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
              Localiza tu agencia más cercana en tiempo real con nuestro mapa interactivo funcional y ahorra tiempo en tu traslado.
            </p>
          </div>

          {/* Barra de Geolocalización y Búsqueda */}
          <div className="bg-[#FAF5F0] p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDetectUserLocation}
                disabled={isLocating}
                className="w-full sm:w-auto px-5 py-3 bg-[#C8102E] hover:bg-[#990B1B] text-white font-black rounded-xl shadow-md text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <MapPinIcon className="w-4 h-4 text-white animate-bounce" />
                <span>{isLocating ? 'Detectando coordenadas GPS...' : '📍 Usar mi ubicación actual'}</span>
              </button>

              <span className="text-xs text-slate-600 font-medium text-center sm:text-right">
                {userLocation ? '✓ Coordenadas GPS sincronizadas con el mapa' : 'Haz clic para ordenar agencias por proximidad'}
              </span>
            </div>

            {locationNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between animate-fadeIn">
                <span>{locationNotice}</span>
                <button
                  type="button"
                  onClick={() => setLocationNotice(null)}
                  className="text-emerald-700 hover:text-emerald-950 font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Filtros de Distrito y Búsqueda */}
            <form onSubmit={handleSearchAgencies} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-200">
              <div className="md:col-span-4">
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="w-full py-3 px-3 bg-white border border-slate-300 rounded-xl text-[#1E252D] font-bold text-xs focus:outline-none focus:border-[#C8102E] transition"
                >
                  <option value="Todas las agencias">Todas las agencias</option>
                  {availableDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-5 relative">
                <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o dirección..."
                  value={agencySearch}
                  onChange={(e) => setAgencySearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-[#1E252D] placeholder-slate-400 focus:outline-none focus:border-[#C8102E] transition text-xs font-medium"
                />
              </div>

              <div className="md:col-span-3 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#1E252D] hover:bg-[#C8102E] text-white font-extrabold rounded-xl transition shadow-md uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BuildingIcon className="w-4 h-4" />
                  <span>BUSCAR</span>
                </button>
                {(districtFilter !== 'Todas las agencias' || agencySearch || userLocation) && (
                  <button
                    type="button"
                    onClick={handleResetAgencyFilters}
                    className="px-3 py-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition text-xs flex items-center justify-center cursor-pointer"
                    title="Restablecer filtros a default"
                  >
                    ✕ Limpiar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Visualizador de Mapa Funcional Leaflet OSM y Tarjetas de Agencia */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* COLUMNA MAPA FUNCIONAL: Altura fija coordinada */}
            <div className="lg:col-span-5 flex flex-col h-[580px]">
              <AgencyMapPreview
                agency={selectedMapAgency}
                allAgencies={agencies}
                userLocation={userLocation}
                distanceKm={selectedMapAgency ? agencyDistances[selectedMapAgency.id_agencia] : null}
                onLocateMe={handleDetectUserLocation}
                onSelectAgency={(ag) => setSelectedMapAgency(ag)}
                isLocating={isLocating}
              />
            </div>

            {/* COLUMNA LISTA DE TARJETAS: Panel de tamaño fijo con scroll interno */}
            <div className="lg:col-span-7 flex flex-col h-[580px]">
              {loading ? (
                <div className="h-full bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center text-slate-500 font-semibold gap-3">
                  <div className="w-6 h-6 border-3 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
                  Consultando agencias autorizadas desde Supabase...
                </div>
              ) : agencies.length === 0 ? (
                <div className="h-full bg-slate-50 border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-slate-600 font-medium space-y-3">
                  <p>No se encontraron agencias disponibles con los filtros aplicados.</p>
                  <button
                    type="button"
                    onClick={handleResetAgencyFilters}
                    className="px-4 py-2 bg-[#C8102E] text-white rounded-xl text-xs font-bold transition hover:bg-[#990B1B]"
                  >
                    Restablecer filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full overflow-y-auto pr-1 pb-1">
                  {agencies.map((agency) => {
                    const distKm = agencyDistances[agency.id_agencia];
                    const isClosest = nearestAgency?.id_agencia === agency.id_agencia;
                    const isSelected = selectedMapAgency?.id_agencia === agency.id_agencia;

                    return (
                      <div
                        key={agency.id_agencia}
                        onClick={() => setSelectedMapAgency(agency)}
                        className={`bg-white border rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition cursor-pointer ${
                          isSelected
                            ? 'border-[#C8102E] ring-2 ring-red-100 shadow-md'
                            : isClosest
                            ? 'border-emerald-500 ring-1 ring-emerald-200'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-extrabold uppercase text-[#C8102E]">
                                {agency.distrito}
                              </span>
                              {distKm !== undefined && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    isClosest
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {isClosest ? `⭐ MÁS CERCANA (${distKm.toFixed(1)} km)` : `📍 ${distKm.toFixed(1)} km`}
                                </span>
                              )}
                            </div>
                            <h3 className="font-black text-[#1E252D] text-sm leading-tight">
                              {agency.nombre_agencia}
                            </h3>
                            <p className="text-slate-600 text-xs font-medium">
                              {agency.direccion}
                            </p>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-0.5">
                            <span className="font-extrabold text-[10px] uppercase text-slate-500 block">Horario de Atención</span>
                            <p className="font-bold">Lunes a Viernes: 8:00 am - 5:00 pm</p>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMapAgency(agency);
                              }}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-[#1E252D] font-extrabold rounded-xl text-xs uppercase tracking-wider transition"
                            >
                              Ver en Mapa
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleBookingAction(e, undefined, agency.id_agencia)}
                              className="flex-1 py-2 bg-[#C8102E] hover:bg-[#990B1B] text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
                            >
                              Agendar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </section>
      </main>

      {/* ================= FOOTER INSTITUCIONAL BANCO DE LA NACIÓN ================= */}
      <footer className="bg-[#1E252D] text-slate-300 py-12 mt-12 border-t-4 border-[#C8102E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C8102E] flex items-center justify-center text-white font-black text-sm">
                  BN
                </div>
                <span className="text-white font-bold text-base">Banco de la Nación</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                El banco de todos los peruanos. Comprometidos con la inclusión financiera y la cercanía ciudadana en todo el país.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider mb-3">Atención al Ciudadano</h4>
              <ul className="text-xs space-y-2 text-slate-400">
                <li>Línea gratuita: 0-800-10-700</li>
                <li>Mesa de partes virtual</li>
                <li>Libro de Reclamaciones</li>
                <li>Canales anticorrupción</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider mb-3">Servicios Digitales</h4>
              <ul className="text-xs space-y-2 text-slate-400">
                <li><a href="https://pagalo.pe" target="_blank" rel="noopener noreferrer" className="hover:text-red-400">Plataforma Págalo.pe</a></li>
                <li>App Móvil Banco de la Nación</li>
                <li>Banca por Internet</li>
                <li>Agendamiento de Citas</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider mb-3">Seguridad</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nunca compartas tus claves, tokens o códigos SMS. El Banco de la Nación nunca te solicitará tus contraseñas por correo ni llamada.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>© {new Date().getFullYear()} Banco de la Nación Perú. Todos los derechos reservados.</p>
            <div className="flex gap-4 text-xs">
              <a href="#" className="hover:text-white">Términos y Condiciones</a>
              <a href="#" className="hover:text-white">Política de Privacidad</a>
              <a href="#" className="hover:text-white">Transparencia</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ================= MODAL DE REQUISITOS DEL TRÁMITE ================= */}
      {selectedProcedureForModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedProcedureForModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-[#1E252D] text-white flex items-start justify-between gap-4 border-b-4 border-[#C8102E]">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-800/40 inline-block">
                  Requisitos Oficiales BN
                </span>
                <h3 className="text-lg font-black leading-tight text-white">
                  {selectedProcedureForModal.nombre_tramite}
                </h3>
                {selectedProcedureForModal.duracion_minutos && (
                  <p className="text-xs text-slate-300 flex items-center gap-1.5 pt-0.5 font-medium">
                    <ClockIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tiempo de atención aproximado: <strong>{selectedProcedureForModal.duracion_minutos} minutos</strong></span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedProcedureForModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer text-sm font-bold shrink-0"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Contenido / Cuerpo del Modal */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {selectedProcedureForModal.descripcion && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Descripción del servicio
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                    {selectedProcedureForModal.descripcion}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#C8102E] flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-[#C8102E]" />
                  <span>Documentos y Requisitos Obligatorios</span>
                </h4>

                {selectedProcedureForModal.requisitos && selectedProcedureForModal.requisitos.length > 0 ? (
                  <ul className="space-y-2.5">
                    {selectedProcedureForModal.requisitos.map((req, idx) => (
                      <li
                        key={req.id_requisito || idx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-red-50/40 border border-red-100 text-xs text-slate-800 font-medium"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#C8102E] text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{req.descripcion_requisito}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 font-medium italic">
                    Este trámite no cuenta con requisitos adicionales específicos registrados. Recuerda portar tu DNI vigente en ventanilla.
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium space-y-1">
                <strong className="block font-bold">💡 Recomendación para tu visita:</strong>
                <p>Preséntate con 10 minutos de anticipación en la agencia seleccionada con tus documentos en físico.</p>
              </div>
            </div>

            {/* Footer de Acciones del Modal */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedProcedureForModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 transition text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={(e) => {
                  const tId = selectedProcedureForModal.id_tramite;
                  setSelectedProcedureForModal(null);
                  handleBookingAction(e, tId, undefined);
                }}
                className="px-5 py-2.5 bg-[#C8102E] hover:bg-[#990B1B] text-white font-extrabold rounded-xl shadow-md transition text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              >
                <span>Agendar Cita con este Trámite</span>
                <CalendarIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER LATERAL DERECHO MODULAR */}
      <LoginDrawer
        isOpen={isLoginDrawerOpen}
        onClose={() => setIsLoginDrawerOpen(false)}
        redirectUrl="/agendar"
        tramiteId={drawerTramiteId}
        agenciaId={drawerAgenciaId}
        onSessionChange={(s) => setUserSession(s)}
      />
    </div>
  );
}
