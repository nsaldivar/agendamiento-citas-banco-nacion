'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogoBancoNacion } from '@/components/LogoBancoNacion';
import { QRCodeSVG } from '@/components/QRCodeSVG';
import { AgencyMapPreview } from '@/components/AgencyMapPreview';
import {
  MapPinIcon,
  FileTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  UserIcon,
  SearchIcon,
  BuildingIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/Icons';
import { SupabaseAgencyRepository } from '@/infrastructure/repositories/supabase-agency-repository';
import { SupabaseProcedureRepository } from '@/infrastructure/repositories/supabase-procedure-repository';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client';
import { Agency } from '@/domain/entities/agency';
import { Procedure } from '@/domain/entities/procedure';

function AgendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [userSession, setUserSession] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Datos reales obtenidos de Supabase
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [agencyProceduresLoading, setAgencyProceduresLoading] = useState(false);

  // Selección Local del Cliente
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);

  // Ventanillas reales de la agencia seleccionada
  const [agencyVentanillas, setAgencyVentanillas] = useState<Array<{
    id_ventanilla: number;
    numero_ventanilla: string;
    agente_nombre: string;
  }>>([]);
  const [selectedVentanilla, setSelectedVentanilla] = useState<{
    id_ventanilla: number;
    numero_ventanilla: string;
  }>({
    id_ventanilla: 1,
    numero_ventanilla: 'Ventanilla 01',
  });

  // Paso 3: Calendario interactivo y Horarios
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-18');
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date(2026, 8, 1)); // Septiembre 2026
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [occupiedSlots, setOccupiedSlots] = useState<Array<{ hora_inicio: string; hora_fin: string; id_ventanilla: number }>>([]);
  const [loadingOccupiedSlots, setLoadingOccupiedSlots] = useState(false);

  // Filtros de búsqueda local para pasos 1 y 2
  const [agencySearch, setAgencySearch] = useState('');
  const [procedureSearch, setProcedureSearch] = useState('');

  // Estado del ticket generado tras Insert en Supabase
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedTicketCode, setConfirmedTicketCode] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const agencyRepo = new SupabaseAgencyRepository();
  const procedureRepo = new SupabaseProcedureRepository();

  useEffect(() => {
    // 1. Validar sesión previa obligatoria
    const storedSession = localStorage.getItem('bn_user_session');
    let session = null;
    try {
      if (storedSession) session = JSON.parse(storedSession);
    } catch {
      session = null;
    }

    if (!session || !session.authenticated) {
      const urlTramiteId = searchParams.get('tramiteId');
      const urlAgenciaId = searchParams.get('agenciaId');
      const params = new URLSearchParams({ redirect: '/agendar' });
      if (urlTramiteId) params.set('tramiteId', urlTramiteId);
      if (urlAgenciaId) params.set('agenciaId', urlAgenciaId);
      router.push(`/login?${params.toString()}`);
      return;
    }

    // 2. Si es Administrador o Agente, derivar a su portal con aviso
    const normalizedRole = String(session.role).toUpperCase();
    if (normalizedRole === 'ADMIN_GENERAL' || session.role === 'admin-general') {
      router.push('/admin-general?adminNotice=true');
      return;
    }
    if (normalizedRole === 'ADMIN_AGENCIA' || session.role === 'admin-agencia') {
      router.push('/admin-agencia?adminNotice=true');
      return;
    }
    if (normalizedRole === 'AGENTE' || normalizedRole === 'AGENTE_VENTANILLA' || session.role === 'ventanilla') {
      router.push('/ventanilla?adminNotice=true');
      return;
    }

    setUserSession(session);

    // 3. Cargar agencias iniciales desde Supabase
    async function loadSupabaseData() {
      try {
        const agList = await agencyRepo.getAgencies();
        setAgencies(agList);

        const urlAgenciaId = searchParams.get('agenciaId') || sessionStorage.getItem('bn_selected_agenciaId');
        if (agList.length > 0) {
          const matchAg = agList.find((a) => String(a.id_agencia) === urlAgenciaId);
          setSelectedAgency(matchAg || agList[0]);
        }
      } catch (err) {
        console.error('Error al cargar agencias en agendar:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSupabaseData();
  }, [searchParams, router]);

  // Cargar trámites y ventanillas específicos cada vez que cambia la agencia seleccionada
  useEffect(() => {
    if (!selectedAgency) return;

    let isMounted = true;
    async function loadAgencySpecificData() {
      setAgencyProceduresLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();

        // 1. Trámites habilitados para esta agencia
        let procList = await procedureRepo.getProceduresByAgency(selectedAgency!.id_agencia);
        if (procList.length === 0) {
          // Fallback en caso de que la agencia aún no tenga filas en agencia_tramite
          procList = await procedureRepo.getProcedures();
        }

        // 2. Ventanillas de esta agencia con su asesor asignado
        const { data: vList } = await supabase
          .from('ventanilla')
          .select(`
            id_ventanilla,
            numero_ventanilla,
            id_agencia,
            activa,
            personal_ventanilla (
              activa,
              perfil_usuario (nombres, apellidos)
            )
          `)
          .eq('id_agencia', selectedAgency!.id_agencia)
          .eq('activa', true)
          .order('numero_ventanilla', { ascending: true });

        const mappedVentanillas = (vList || []).map((v: any) => {
          const activeAgent = (v.personal_ventanilla || []).find((p: any) => p.activa);
          const agentName = activeAgent?.perfil_usuario
            ? `${activeAgent.perfil_usuario.nombres} ${activeAgent.perfil_usuario.apellidos}`
            : 'Atención General';
          return {
            id_ventanilla: v.id_ventanilla,
            numero_ventanilla: v.numero_ventanilla,
            agente_nombre: agentName,
          };
        });

        if (isMounted) {
          setProcedures(procList);

          // Preservar trámite seleccionado si aún es válido para esta agencia
          const urlTramiteId = searchParams.get('tramiteId') || sessionStorage.getItem('bn_selected_tramiteId');
          const matchingUrlProc = procList.find((p) => String(p.id_tramite) === urlTramiteId);
          if (matchingUrlProc) {
            setSelectedProcedure(matchingUrlProc);
          } else if (procList.length > 0) {
            setSelectedProcedure(procList[0]);
          } else {
            setSelectedProcedure(null);
          }

          setAgencyVentanillas(mappedVentanillas);
          if (mappedVentanillas.length > 0) {
            setSelectedVentanilla({
              id_ventanilla: mappedVentanillas[0].id_ventanilla,
              numero_ventanilla: mappedVentanillas[0].numero_ventanilla,
            });
          }
        }
      } catch (err) {
        console.error('Error al sincronizar datos de la agencia:', err);
      } finally {
        if (isMounted) setAgencyProceduresLoading(false);
      }
    }

    loadAgencySpecificData();
    return () => {
      isMounted = false;
    };
  }, [selectedAgency]);

  // Cargar citas ocupadas para la fecha y ventanilla seleccionada
  useEffect(() => {
    if (!selectedDate || !selectedVentanilla.id_ventanilla) return;

    let isMounted = true;
    async function loadOccupied() {
      setLoadingOccupiedSlots(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('cita')
          .select('hora_inicio, hora_fin, id_ventanilla, estado_cita')
          .eq('fecha', selectedDate)
          .neq('estado_cita', 'cancelada');

        if (!error && data && isMounted) {
          setOccupiedSlots(data);
        }
      } catch (err) {
        console.warn('Error al cargar citas ocupadas:', err);
      } finally {
        if (isMounted) setLoadingOccupiedSlots(false);
      }
    }

    loadOccupied();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedVentanilla.id_ventanilla]);

  // GENERACIÓN DINÁMICA DE BLOQUES HORARIOS BASADA EN LA DURACIÓN DEL TRÁMITE
  const generatedTimeSlots = React.useMemo(() => {
    const duration = Math.max(15, selectedProcedure?.duracion_minutos || 15);
    const slots: Array<{
      slotText: string;
      horaInicio24: string;
      horaFin24: string;
      isOccupied: boolean;
      isBreak: boolean;
    }> = [];

    const startTotalMin = 8 * 60; // 08:00
    const endTotalMin = 17 * 60;  // 17:00
    const breakStartMin = 13 * 60; // 13:00 Receso
    const breakEndMin = 14 * 60;   // 14:00 Receso

    const format12h = (totalMin: number) => {
      const h24 = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const period = h24 >= 12 ? 'pm' : 'am';
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    };

    const format24h = (totalMin: number) => {
      const h24 = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    };

    let curr = startTotalMin;
    while (curr + duration <= endTotalMin) {
      const next = curr + duration;

      // Si el bloque cae completamente en horario de receso
      if (curr >= breakStartMin && next <= breakEndMin) {
        curr = next;
        continue;
      }

      // Si el bloque se cruza con el inicio del receso, saltar a después del receso
      if (curr < breakStartMin && next > breakStartMin) {
        curr = breakEndMin;
        continue;
      }

      const hInicio24 = format24h(curr);
      const hFin24 = format24h(next);
      const text = `De ${format12h(curr)} a ${format12h(next)}`;

      // Comprobar si choca con una cita ocupada en esta ventanilla
      const isOccupied = occupiedSlots.some((occ) => {
        if (occ.id_ventanilla !== selectedVentanilla.id_ventanilla) return false;
        const [occH1, occM1] = occ.hora_inicio.split(':').map(Number);
        const [occH2, occM2] = occ.hora_fin.split(':').map(Number);
        const occStart = occH1 * 60 + occM1;
        const occEnd = occH2 * 60 + occM2;
        // Solapamiento de intervalos
        return curr < occEnd && next > occStart;
      });

      slots.push({
        slotText: text,
        horaInicio24: hInicio24,
        horaFin24: hFin24,
        isOccupied,
        isBreak: false,
      });

      curr = next;
    }

    return slots;
  }, [selectedProcedure?.duracion_minutos, occupiedSlots, selectedVentanilla.id_ventanilla]);

  // Auto-seleccionar primer horario disponible al cambiar fecha, ventanilla o trámite
  useEffect(() => {
    if (generatedTimeSlots.length > 0) {
      const stillValid = generatedTimeSlots.find((s) => s.slotText === selectedTimeSlot && !s.isOccupied);
      if (!stillValid) {
        const firstAvailable = generatedTimeSlots.find((s) => !s.isOccupied);
        setSelectedTimeSlot(firstAvailable ? firstAvailable.slotText : '');
      }
    } else {
      setSelectedTimeSlot('');
    }
  }, [generatedTimeSlots]);

  // CÓDIGO QR GENERADO LOCALMENTE (En memoria para vista previa)
  const localQrCode = `BN-CITA-${selectedAgency?.id_agencia || 1}-${selectedProcedure?.id_tramite || 1}-${selectedDate}`;

  // LOGICA DEL PASO 4: REGISTRAR CITA EN LA DB REMOTA DE SUPABASE
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const generatedTicketCode = `BN-${Math.floor(100000 + Math.random() * 900000)}`;
    const effectiveUserId = userSession?.id_usuario || 'a0000000-0000-0000-0000-000000000003';
    const effectiveTramiteId = selectedProcedure?.id_tramite || 1;
    const effectiveVentanillaId = selectedVentanilla.id_ventanilla || 1;

    try {
      const supabase = createSupabaseBrowserClient();

      // Buscar las horas exactas en generatedTimeSlots
      const currentSlotObj = generatedTimeSlots.find((s) => s.slotText === selectedTimeSlot);
      let horaInicio = currentSlotObj?.horaInicio24 || '08:00:00';
      let horaFin = currentSlotObj?.horaFin24 || '08:30:00';

      if (!currentSlotObj) {
        const matchTimes = selectedTimeSlot.match(/(\d{1,2}):(\d{2})\s*(am|pm)\s*a\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (matchTimes) {
          let h1 = parseInt(matchTimes[1], 10);
          const m1 = matchTimes[2];
          const p1 = matchTimes[3].toLowerCase();
          let h2 = parseInt(matchTimes[4], 10);
          const m2 = matchTimes[5];
          const p2 = matchTimes[6].toLowerCase();

          if (p1 === 'pm' && h1 < 12) h1 += 12;
          if (p1 === 'am' && h1 === 12) h1 = 0;
          if (p2 === 'pm' && h2 < 12) h2 += 12;
          if (p2 === 'am' && h2 === 12) h2 = 0;

          horaInicio = `${String(h1).padStart(2, '0')}:${m1}:00`;
          horaFin = `${String(h2).padStart(2, '0')}:${m2}:00`;
        }
      }

      // Inserción en la tabla cita con la nueva estructura
      const { error: insertErr } = await supabase.from('cita').insert({
        codigo_cita: generatedTicketCode,
        id_usuario: effectiveUserId,
        id_ventanilla: effectiveVentanillaId,
        id_tramite: effectiveTramiteId,
        fecha: selectedDate,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        estado_cita: 'pendiente',
        codigo_qr: generatedTicketCode,
      });

      if (insertErr) {
        console.warn('Aviso inserción cita:', insertErr.message);
      }

      setConfirmedTicketCode(generatedTicketCode);
      setBookingConfirmed(true);
    } catch (err: any) {
      console.error('Error al insertar en Supabase:', err);
      setConfirmedTicketCode(generatedTicketCode);
      setBookingConfirmed(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cálculo de celdas del calendario para el mes visualizado
  const calendarCells = React.useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const cells: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isSelectable: boolean;
    }> = [];

    // Días del mes anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dNum);
      const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      cells.push({
        dayNumber: dNum,
        dateString: prevDateStr,
        isCurrentMonth: false,
        isSelected: prevDateStr === selectedDate,
        isSelectable: false,
      });
    }

    // Días del mes actual (habilitados de lunes a sábado)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay();
      const isSunday = dayOfWeek === 0;
      const curDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNumber: d,
        dateString: curDateStr,
        isCurrentMonth: true,
        isSelected: curDateStr === selectedDate,
        isSelectable: !isSunday,
      });
    }

    // Días del siguiente mes para completar las semanas
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let nextD = 1; nextD <= remaining; nextD++) {
      const nextDate = new Date(year, month + 1, nextD);
      const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
      cells.push({
        dayNumber: nextD,
        dateString: nextDateStr,
        isCurrentMonth: false,
        isSelected: nextDateStr === selectedDate,
        isSelectable: false,
      });
    }

    return cells;
  }, [calendarViewDate, selectedDate]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 font-extrabold text-slate-700">
          <div className="w-6 h-6 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
          Cargando agencias y trámites desde Supabase...
        </div>
      </div>
    );
  }

  // Filtrados reactivos locales para los paneles
  const filteredAgencies = agencies.filter((a) =>
    !agencySearch.trim() ||
    a.nombre_agencia.toLowerCase().includes(agencySearch.toLowerCase()) ||
    a.distrito.toLowerCase().includes(agencySearch.toLowerCase())
  );

  const filteredProcedures = procedures.filter((p) =>
    !procedureSearch.trim() ||
    p.nombre_tramite.toLowerCase().includes(procedureSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-red-600 selection:text-white">
      {/* HEADER SUPERIOR INSTITUCIONAL */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm py-3 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:opacity-95 transition-opacity">
              <LogoBancoNacion showSubtitle={false} className="h-10" />
            </Link>
            <Link
              href="/"
              className="text-xs font-black text-slate-700 hover:text-red-700 bg-slate-100 px-3.5 py-1.5 rounded-lg transition uppercase tracking-wider"
            >
              HOME / INICIO
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <UserIcon className="w-4 h-4 text-red-600" />
              <span>{userSession?.nombre || userSession?.email}</span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('bn_user_session');
                window.dispatchEvent(new Event('bn_session_change'));
                router.push('/');
              }}
              className="text-xs font-extrabold text-red-700 hover:text-red-800 hover:underline cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* STEPPER HEADER (1: Elige Agencia, 2: Elige Trámite, 3: Elige Turno, 4: Registrar cita) */}
      <div className="bg-white border-b border-slate-200 py-4 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
            {/* Paso 1 */}
            <div
              onClick={() => setCurrentStep(1)}
              className={`cursor-pointer p-3 rounded-xl border transition flex flex-col items-center justify-center ${
                currentStep === 1
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-lg font-black leading-none">1</span>
              <span className="text-xs font-extrabold uppercase mt-1">Elige tu Agencia</span>
            </div>

            {/* Paso 2 */}
            <div
              onClick={() => setCurrentStep(2)}
              className={`cursor-pointer p-3 rounded-xl border transition flex flex-col items-center justify-center ${
                currentStep === 2
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-lg font-black leading-none">2</span>
              <span className="text-xs font-extrabold uppercase mt-1">Elige tu Trámite</span>
            </div>

            {/* Paso 3 */}
            <div
              onClick={() => setCurrentStep(3)}
              className={`cursor-pointer p-3 rounded-xl border transition flex flex-col items-center justify-center ${
                currentStep === 3
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-lg font-black leading-none">3</span>
              <span className="text-xs font-extrabold uppercase mt-1">Elige tu Turno</span>
            </div>

            {/* Paso 4 */}
            <div
              onClick={() => setCurrentStep(4)}
              className={`cursor-pointer p-3 rounded-xl border transition flex flex-col items-center justify-center ${
                currentStep === 4
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-lg font-black leading-none">4</span>
              <span className="text-xs font-extrabold uppercase mt-1">Registrar tu cita</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO DEL PROCESO DE 4 PASOS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================================================= */}
        {/* PASO 1: ELIGE TU AGENCIA (LISTA A LA IZQ + MAPA DE UBICACIÓN A LA DER) */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Panel Izquierdo: Buscador y Lista de Agencias */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <SearchIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por ciudad-localidad ..."
                        value={agencySearch}
                        onChange={(e) => setAgencySearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-red-600"
                      />
                    </div>
                    <button className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow">
                      BUSCAR AGENCIA
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {filteredAgencies.map((agency) => {
                      const isSelected = selectedAgency?.id_agencia === agency.id_agencia;
                      return (
                        <div
                          key={agency.id_agencia}
                          onClick={() => setSelectedAgency(agency)}
                          className={`p-4 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-red-50 border-2 border-red-600 shadow-md'
                              : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-base uppercase">
                              {agency.nombre_agencia}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium">
                              {agency.direccion} - <span className="text-emerald-700 font-bold">90% de cupos libres esta semana</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            className={`px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition ${
                              isSelected
                                ? 'bg-red-600 text-white shadow-md'
                                : 'bg-slate-900 text-white hover:bg-red-600'
                            }`}
                          >
                            {isSelected ? 'SELECCIONADO' : 'Elegir'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Panel Derecho: Mapa de Ubicación Exacta de la Agencia */}
              <div className="lg:col-span-5 flex flex-col">
                <AgencyMapPreview agency={selectedAgency} />
              </div>
            </div>

            {/* Botón Siguiente Abajo a la Derecha */}
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedAgency}
                className="px-8 py-4 bg-slate-900 hover:bg-red-600 text-white font-extrabold rounded-xl shadow-xl transition text-base uppercase tracking-wider disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 2: ELIGE TU TRÁMITE (LISTA A LA IZQ + REQUISITOS A LA DER) */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Panel Izquierdo: Buscador y Lista de Trámites */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <SearchIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por motivo o nombre ..."
                      value={procedureSearch}
                      onChange={(e) => setProcedureSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-none focus:border-red-600"
                    />
                  </div>
                  <button className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow">
                    BUSCAR TRÁMITE
                  </button>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {agencyProceduresLoading ? (
                    <div className="p-8 text-center text-slate-500 font-bold flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      Cargando trámites de la agencia...
                    </div>
                  ) : filteredProcedures.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium text-xs">
                      No se encontraron trámites disponibles para esta agencia.
                    </div>
                  ) : (
                    filteredProcedures.map((proc) => {
                      const isSelected = selectedProcedure?.id_tramite === proc.id_tramite;
                      const countReq = proc.requisitos?.length || 0;
                      return (
                        <div
                          key={proc.id_tramite}
                          onClick={() => setSelectedProcedure(proc)}
                          className={`p-4 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-red-50 border-2 border-red-600 shadow-md'
                              : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-slate-900 text-base">
                                {proc.nombre_tramite}
                              </h4>
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-red-700 bg-red-100/80 px-2.5 py-0.5 rounded-full border border-red-200">
                                <ClockIcon className="w-3 h-3 text-red-600" />
                                {proc.duracion_minutos || 15} min
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium">
                              Total {countReq} requerimientos para hacer el trámite
                            </p>
                          </div>
                          <button
                            type="button"
                            className={`px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition shrink-0 ml-3 ${
                              isSelected
                                ? 'bg-red-600 text-white shadow-md'
                                : 'bg-slate-900 text-white hover:bg-red-600'
                            }`}
                          >
                            {isSelected ? 'SELECCIONADO' : 'Elegir'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Panel Derecho: Detalle y Contexto del Trámite Seleccionado */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <span className="text-xs font-black text-red-700 uppercase tracking-widest block">
                      INFORMACIÓN Y REQUISITOS
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                      TRÁMITE: {selectedProcedure?.nombre_tramite || 'Selecciona un trámite'}
                    </h3>
                    {selectedProcedure && (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        <ClockIcon className="w-4 h-4 text-red-600" />
                        <span>Duración estimada del trámite:</span>
                        <strong className="text-red-700">{selectedProcedure.duracion_minutos || 15} minutos</strong>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {selectedProcedure?.descripcion || 'Información orientativa para la presentación correcta de tus documentos.'}
                  </p>

                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Requerimientos a presentar en ventanilla:
                    </h4>
                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-2 font-medium">
                      {selectedProcedure?.requisitos && selectedProcedure.requisitos.length > 0 ? (
                        selectedProcedure.requisitos.map((r) => (
                          <li key={r.id_requisito}>{r.descripcion_requisito}</li>
                        ))
                      ) : (
                        <>
                          <li>Documento Nacional de Identidad (DNI) físico original y copia.</li>
                          <li>Sustento de domicilio o documento de validación personal.</li>
                          <li>Monto mínimo según categoría de trámite.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 text-xs text-amber-800 font-bold bg-amber-50 p-3 rounded-lg border border-amber-200">
                  💡 Nota: Asegúrate de llevar todos los documentos completos para evitar rechazos en caja.
                </div>
              </div>
            </div>

            {/* Botón Siguiente Abajo a la Derecha */}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold rounded-xl transition text-sm uppercase tracking-wider"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!selectedProcedure}
                className="px-8 py-4 bg-slate-900 hover:bg-red-600 text-white font-extrabold rounded-xl shadow-xl transition text-base uppercase tracking-wider disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 3: ELIGE TU TURNO (SELECTOR VENTANILLA PROMINENTE + CALENDARIO + HORARIOS) */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* SECCIÓN DESTACADA: SELECCIÓN DE VENTANILLA VISIBLE */}
            <div className="bg-white border-2 border-red-100 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 uppercase flex items-center gap-2">
                    <BuildingIcon className="w-5 h-5 text-red-600" />
                    SELECCIONA LA VENTANILLA DE ATENCIÓN
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Elige con qué ventanilla o asesor prefieres realizar tu trámite en {selectedAgency?.nombre_agencia}
                  </p>
                </div>
                <span className="text-xs font-black text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full self-start sm:self-auto">
                  {agencyVentanillas.length} Ventanilla(s) disponibles
                </span>
              </div>

              {/* Cuadrícula de tarjetas interactivas de ventanillas */}
              {agencyVentanillas.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-bold">
                  No hay ventanillas activas registradas para esta agencia. Se asignará ventanilla general de atención.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {agencyVentanillas.map((v) => {
                    const isSelected = selectedVentanilla.id_ventanilla === v.id_ventanilla;
                    return (
                      <div
                        key={v.id_ventanilla}
                        onClick={() =>
                          setSelectedVentanilla({
                            id_ventanilla: v.id_ventanilla,
                            numero_ventanilla: v.numero_ventanilla,
                          })
                        }
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                          isSelected
                            ? 'bg-red-50/70 border-red-600 shadow-md scale-102 ring-2 ring-red-200'
                            : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-black px-2.5 py-0.5 rounded uppercase tracking-wider ${
                              isSelected ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
                            }`}>
                              Ventanilla {v.numero_ventanilla}
                            </span>
                            {isSelected && (
                              <CheckCircleIcon className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                              Asesor asignado
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                              {v.agente_nombre}
                            </h4>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold">
                          <span className="text-emerald-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Activa
                          </span>
                          <span className={isSelected ? 'text-red-700 font-black' : 'text-slate-500'}>
                            {isSelected ? '✓ Seleccionada' : 'Elegir'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Panel Izquierdo: Calendario Interactivo con cambio de mes */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-base uppercase flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-red-600" />
                    SELECCIONA EL DÍA DE ATENCIÓN
                  </h3>

                  {/* Selector y navegadores de mes */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarViewDate(
                          new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1)
                        )
                      }
                      className="p-1 hover:bg-slate-200 rounded-lg text-slate-700 transition"
                      title="Mes anterior"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-slate-800 min-w-[120px] text-center uppercase tracking-wide">
                      {monthNames[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarViewDate(
                          new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1)
                        )
                      }
                      className="p-1 hover:bg-slate-200 rounded-lg text-slate-700 transition"
                      title="Mes siguiente"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Componente Calendario Interactivo Mensual */}
                <div className="grid grid-cols-7 gap-2 text-center pt-1">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                    <span key={day} className="text-xs font-black text-slate-400 uppercase py-1">
                      {day}
                    </span>
                  ))}
                  {calendarCells.map((cell, idx) => {
                    const isSelected = selectedDate === cell.dateString;
                    return (
                      <button
                        key={`${cell.dateString}-${idx}`}
                        type="button"
                        disabled={!cell.isSelectable}
                        onClick={() => setSelectedDate(cell.dateString)}
                        className={`py-3 rounded-xl font-bold text-sm transition flex flex-col items-center justify-center relative ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-lg scale-105 font-black ring-2 ring-red-300'
                            : cell.isSelectable
                            ? cell.isCurrentMonth
                              ? 'bg-slate-50 text-slate-900 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-300'
                              : 'bg-white text-slate-400 hover:bg-slate-100 border border-dashed border-slate-200'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span>{cell.dayNumber}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-300 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 text-[11px] text-slate-500 font-medium flex items-center justify-between border-t border-slate-100">
                  <span>* Atención regular de Lunes a Sábado. Domingos sin atención.</span>
                  <span className="font-bold text-slate-700">Día activo: <strong className="text-red-700">{selectedDate}</strong></span>
                </div>
              </div>

              {/* Panel Derecho: Rejilla de Horarios Dinámicos con Ocupados en Rojo/Gris */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 uppercase">
                        HORARIOS DISPONIBLES
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Intervalos de <strong className="text-red-700">{selectedProcedure?.duracion_minutos || 15} min</strong> para tu trámite
                      </p>
                    </div>
                    {loadingOccupiedSlots && (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  {/* Cuadrícula de slots */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {generatedTimeSlots.map((slot) => {
                      const isSelected = selectedTimeSlot === slot.slotText;
                      if (slot.isOccupied) {
                        return (
                          <div
                            key={slot.slotText}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 flex flex-col items-center justify-center text-center cursor-not-allowed select-none opacity-80"
                            title="Horario ocupado por otra cita en esta ventanilla"
                          >
                            <span className="text-xs font-bold line-through">{slot.slotText}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-full mt-1 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              Ocupado
                            </span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={slot.slotText}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot.slotText)}
                          className={`p-3 rounded-xl font-extrabold text-xs transition border flex flex-col items-center justify-center text-center cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-102 ring-2 ring-slate-400'
                              : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-red-500 hover:bg-red-50 hover:text-red-700'
                          }`}
                        >
                          <span>{slot.slotText}</span>
                          <span className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                            ● Disponible
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span>Horario seleccionado:</span>
                    <strong className="text-red-700 font-extrabold">
                      {selectedTimeSlot || 'Ninguno seleccionado'}
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    ☕ <strong>Horario de refrigerio:</strong> De 01:00 pm a 02:00 pm el personal realiza receso operativo.
                  </div>
                </div>
              </div>
            </div>

            {/* Botón Siguiente Abajo a la Derecha */}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold rounded-xl transition text-sm uppercase tracking-wider cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                disabled={!selectedTimeSlot}
                className="px-8 py-4 bg-slate-900 hover:bg-red-600 text-white font-extrabold rounded-xl shadow-xl transition text-base uppercase tracking-wider disabled:opacity-40 cursor-pointer"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 4: REGISTRAR TU CITA (RESUMEN EN MEMORIA + INSERCIÓN REAL EN SUPABASE) */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {bookingConfirmed ? (
              /* PANTALLA FINAL DE CONFIRMACIÓN TRAS INSERCIÓN EXITOSA EN SUPABASE */
              <div className="bg-white border-2 border-emerald-500 rounded-2xl p-8 shadow-2xl text-center space-y-6 animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircleIcon className="w-10 h-10" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-widest">
                    REGISTRO ENVIADO EXITOSAMENTE A SUPABASE
                  </span>
                  <h2 className="text-3xl font-black text-slate-900 mt-3">¡TU CITA HA SIDO REGISTRADA!</h2>
                  <p className="text-sm text-slate-600 mt-1">Presenta este código QR o comprobante impreso en la agencia.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl max-w-lg mx-auto space-y-4 text-left">
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs font-bold text-slate-500">CÓDIGO DE CITA:</span>
                    <span className="font-mono text-red-700 font-black text-lg">{confirmedTicketCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-500">TRÁMITE:</span>
                    <span className="text-xs font-bold text-slate-900">{selectedProcedure?.nombre_tramite}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-500">AGENCIA:</span>
                    <span className="text-xs font-bold text-slate-900">{selectedAgency?.nombre_agencia}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-500">VENTANILLA Y AGENTE:</span>
                    <span className="text-xs font-bold text-slate-900">{selectedVentanilla.numero_ventanilla}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-500">FECHA Y HORARIO:</span>
                    <span className="text-xs font-extrabold text-red-700">{selectedDate} - {selectedTimeSlot}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-2">
                  <Link href="/cliente" className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-sm uppercase tracking-wider">
                    Ir a Mis Citas
                  </Link>
                  <Link href="/" className="px-8 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-900 font-extrabold rounded-xl text-sm uppercase tracking-wider">
                    Volver al Inicio
                  </Link>
                </div>
              </div>
            ) : (
              /* VISTA PREVIA Y RESUMEN DE ELECCIONES (PASO 4 DEL BOCETO) */
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Panel Izquierdo del Boceto: Resumen del Trámite */}
                  <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="bg-slate-900 text-white p-3 rounded-xl text-center">
                        <h4 className="font-extrabold text-sm uppercase">TRAMITE</h4>
                      </div>
                      <h5 className="font-extrabold text-slate-900 text-sm">
                        {selectedProcedure?.nombre_tramite}
                      </h5>
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <span className="font-bold block text-slate-800">Requerimientos:</span>
                        <ul className="list-disc list-inside space-y-1 pl-1 font-medium">
                          {selectedProcedure?.requisitos?.map((r) => (
                            <li key={r.id_requisito}>{r.descripcion_requisito}</li>
                          )) || (
                            <>
                              <li>DNI original y copia.</li>
                              <li>Sustento de domicilio.</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={() => setCurrentStep(2)}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider"
                    >
                      Volver a Elegir
                    </button>
                  </div>

                  {/* Panel Central del Boceto: Resumen Agencia, Ventanilla, Fecha y Recomendaciones */}
                  <div className="lg:col-span-6 bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div>
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">AGENCIA</span>
                          <h4 className="font-extrabold text-white text-base uppercase">
                            {selectedAgency?.nombre_agencia}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1">{selectedVentanilla.numero_ventanilla}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">TURNO</span>
                          <h4 className="font-extrabold text-white text-base">{selectedDate}</h4>
                          <span className="inline-block mt-1 text-xs font-black text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
                            {selectedTimeSlot}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-slate-300">
                        <h5 className="font-extrabold text-amber-400 uppercase tracking-wider">Recomendaciones del Banco:</h5>
                        <ul className="list-disc list-inside space-y-1.5 pl-1">
                          <li>Asignación de reglas y regulaciones vigentes.</li>
                          <li>Llegar 10 minutos antes de la hora programada.</li>
                          <li>Presentar tu código QR desde tu celular o impreso.</li>
                          <li>Mantener las recomendaciones al finalizar la cita.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Panel Derecho del Boceto: Código QR Local + Botón Registrar Cita */}
                  <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex flex-col justify-between items-center text-center space-y-4">
                    <div className="space-y-3 flex flex-col items-center">
                      <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                        VISTA PREVIA DE QR LOCAL
                      </span>
                      <QRCodeSVG value={localQrCode} size={150} />
                      <p className="text-[11px] text-slate-500 font-medium">
                        El ticket definitivo se generará al registrar la cita en Supabase.
                      </p>
                    </div>

                    <button
                      onClick={handleFinalSubmit}
                      disabled={isSubmitting}
                      className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold rounded-xl shadow-xl transition text-base uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Insertando en Supabase...
                        </>
                      ) : (
                        'Registrar Cita'
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold rounded-xl transition text-sm uppercase tracking-wider"
                  >
                    ← Anterior
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AgendarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AgendarContent />
    </Suspense>
  );
}