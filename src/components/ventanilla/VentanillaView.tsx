'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogoBancoNacion } from '@/components/LogoBancoNacion';
import {
  UserIcon,
  SearchIcon,
  ClockIcon,
  LogOutIcon,
  CalendarIcon,
} from '@/components/Icons';
import { QRCodeSVG } from '@/components/QRCodeSVG';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client';

export interface AppointmentAgendaItem {
  id: string; // id_cita UUID de Supabase
  codigo: string;
  fecha: string;
  hora: string;
  cliente: string;
  dni: string;
  telefono: string;
  email: string;
  tramite: string;
  id_tramite?: number;
  id_ventanilla?: number;
  estado: 'pendiente' | 'en_atencion' | 'atendida' | 'rechazada';
  requisitos: { id: number; descripcion: string; estado: 'ok' | 'baja' | 'pendiente' }[];
  observaciones?: string;
  resultado_tramite?: 'aceptado' | 'rechazado';
}

interface MergedTimeBlock {
  id: string;
  horaInicio: string;
  horaFin: string;
  isBreak: boolean;
  isEmpty: boolean;
  durationMinutes: number;
  appointment?: AppointmentAgendaItem;
}

export function VentanillaView() {
  const router = useRouter();
  const [operatorName, setOperatorName] = useState('Juan Pérez');
  const [operatorId, setOperatorId] = useState('a0000000-0000-0000-0000-000000000002');
  const [agenciaNombre, setAgenciaNombre] = useState('Agencia Cusco Central');
  const [ventanillaNumero, setVentanillaNumero] = useState('V-01');

  // Vista activa: 'agenda' (Vista 1) o 'atencion' (Vista 2)
  const [activeView, setActiveView] = useState<'agenda' | 'atencion'>('agenda');

  // Fecha seleccionada en el calendario (Default operativo)
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-18');

  // Control del Popup del Calendario
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarPopupRef = useRef<HTMLDivElement>(null);

  // Mes y Año en visualización del calendario popover
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date(2026, 8, 1)); // Septiembre 2026

  // Búsqueda y código manual
  const [searchQuery, setSearchQuery] = useState('');
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Cita seleccionada para atención
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentAgendaItem | null>(null);

  // Observaciones y estado del trámite en la Vista 2
  const [observaciones, setObservaciones] = useState('');
  const [resultadoFinal, setResultadoFinal] = useState<'en_proceso' | 'aceptado' | 'rechazado'>('en_proceso');

  // Lista de citas en vivo (sincronizada directamente con la DB remota)
  const [agendaList, setAgendaList] = useState<AppointmentAgendaItem[]>([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // Cerrar Sesión
  const handleLogout = () => {
    localStorage.removeItem('bn_user_session');
    window.dispatchEvent(new Event('bn_session_change'));
    router.push('/');
  };

  // Click outside para cerrar el popup del calendario
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarPopupRef.current && !calendarPopupRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Cargar citas reales en vivo desde Supabase DB
  const loadSupabaseAppointments = async () => {
    setIsLoadingDB(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('cita')
        .select(`
          id_cita,
          codigo_cita,
          estado_cita,
          codigo_qr,
          fecha,
          hora_inicio,
          hora_fin,
          id_ventanilla,
          usuario:perfil_usuario!cita_id_usuario_fkey (
            id_usuario,
            nombres,
            apellidos,
            dni,
            telefono,
            correo
          ),
          tramite:tramite!cita_id_tramite_fkey (
            id_tramite,
            nombre_tramite,
            requisitos:requisito_tramite (
              id_requisito,
              descripcion_requisito,
              es_obligatorio
            )
          ),
          ventanilla:ventanilla!cita_id_ventanilla_fkey (
            id_ventanilla,
            numero_ventanilla,
            agencia:agencia!ventanilla_id_agencia_fkey (
              id_agencia,
              nombre_agencia
            )
          ),
          atencion:atencion_cita (
            id_atencion,
            id_agente,
            resultado_tramite,
            comentario_observacion,
            hora_inicio_atencion,
            hora_fin_atencion,
            requisitos_estados:cita_requisito_estado (
              id_requisito,
              cumplido
            )
          )
        `)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: true });

      if (error) {
        console.error('Error al consultar citas de Supabase:', error);
        return;
      }

      if (data) {
        const mapped: AppointmentAgendaItem[] = data.map((c: any) => {
          const u = c.usuario;
          const nombreCliente = u
            ? `${u.nombres || ''} ${u.apellidos || ''}`.trim() || 'Ciudadano'
            : 'Ciudadano Registrado';

          const rawReqs = c.tramite?.requisitos || [];
          const atencionInfo = Array.isArray(c.atencion) ? c.atencion[0] : c.atencion;
          const reqEstadosMap = new Map<number, boolean>();
          if (atencionInfo?.requisitos_estados) {
            atencionInfo.requisitos_estados.forEach((re: any) => {
              reqEstadosMap.set(re.id_requisito, re.cumplido);
            });
          }

          let st: 'pendiente' | 'en_atencion' | 'atendida' | 'rechazada' = 'pendiente';
          if (c.estado_cita === 'atendida' || c.estado_cita === 'completada') st = 'atendida';
          else if (c.estado_cita === 'rechazada' || c.estado_cita === 'cancelada') st = 'rechazada';
          else if (c.estado_cita === 'en_atencion' || c.estado_cita === 'en_curso') st = 'en_atencion';

          const reqs = rawReqs.length > 0
            ? rawReqs.map((r: any) => {
                let reqSt: 'ok' | 'baja' | 'pendiente' = 'ok';
                if (reqEstadosMap.has(r.id_requisito)) {
                  reqSt = reqEstadosMap.get(r.id_requisito) ? 'ok' : 'baja';
                } else if (st === 'pendiente') {
                  reqSt = 'pendiente';
                }
                return {
                  id: r.id_requisito,
                  descripcion: r.descripcion_requisito,
                  estado: reqSt,
                };
              })
            : [
                { id: 1, descripcion: 'DNI físico vigente (original y copia)', estado: 'ok' as const },
                { id: 2, descripcion: 'Recibo o sustento del trámite', estado: 'ok' as const },
              ];

          return {
            id: c.id_cita,
            codigo: c.codigo_cita,
            fecha: c.fecha || '',
            hora: c.hora_inicio ? c.hora_inicio.substring(0, 5) : '08:00',
            cliente: nombreCliente,
            dni: u?.dni || '87654321',
            telefono: u?.telefono || '+51 955 443 322',
            email: u?.correo || 'cliente.prueba@gmail.com',
            tramite: c.tramite?.nombre_tramite || 'Trámite Bancario',
            id_tramite: c.tramite?.id_tramite,
            id_ventanilla: c.id_ventanilla,
            estado: st,
            requisitos: reqs,
            observaciones: atencionInfo?.comentario_observacion || '',
            resultado_tramite: atencionInfo?.resultado_tramite || (st === 'atendida' ? 'aceptado' : st === 'rechazada' ? 'rechazado' : undefined),
          };
        });

        setAgendaList(mapped);

        // Si hay una cita seleccionada, actualizarla con los datos frescos
        setSelectedAppointment((prev) => {
          if (!prev) return null;
          const found = mapped.find((m) => m.id === prev.id || m.codigo === prev.codigo);
          return found || prev;
        });

        // Configurar la fecha default con actividad si es necesario
        if (mapped.length > 0) {
          const dates = mapped.map((m) => m.fecha).filter(Boolean);
          if (!dates.includes(selectedDate) && dates.length > 0) {
            setSelectedDate(dates[0]);
            const [y, m] = dates[0].split('-').map(Number);
            if (y && m) setCalendarViewDate(new Date(y, m - 1, 1));
          }
        }
      }
    } catch (err) {
      console.error('Error al procesar citas remotas:', err);
    } finally {
      setIsLoadingDB(false);
    }
  };

  useEffect(() => {
    // 1. Cargar datos de la sesión del operador
    const storedSession = localStorage.getItem('bn_user_session');
    if (storedSession) {
      try {
        const s = JSON.parse(storedSession);
        if (s.nombre) setOperatorName(s.nombre);
        if (s.agencia_nombre) setAgenciaNombre(s.agencia_nombre);
        if (s.id_usuario) setOperatorId(s.id_usuario);
        if (s.numero_ventanilla) setVentanillaNumero(s.numero_ventanilla);
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Conectar y recuperar datos de Supabase DB iniciales
    loadSupabaseAppointments();

    // 3. Suscripción en Tiempo Real (Realtime) para escuchar nuevas citas y actualizaciones
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel('ventanilla-citas-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cita' },
        () => {
          loadSupabaseAppointments();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atencion_cita' },
        () => {
          loadSupabaseAppointments();
        }
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Contador de tiempo de atención en segundos
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isAttentionStarted, setIsAttentionStarted] = useState(false);

  // Formato mm:ss
  const formatSeconds = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Cronómetro activo en segundo plano mientras la atención esté en curso
  useEffect(() => {
    let interval: any = null;
    if (isAttentionStarted && activeView === 'atencion') {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAttentionStarted, activeView]);

  // Abrir vista de atención de un cliente seleccionado
  const handleStartAttention = (item: AppointmentAgendaItem) => {
    if (isAttentionStarted && selectedAppointment && selectedAppointment.codigo !== item.codigo) {
      alert(`⚠️ ATENCIÓN EN CURSO: Ya tiene una sesión activa con ${selectedAppointment.cliente} (${selectedAppointment.codigo}). Debe presionar "Finalizar Atención" antes de atender a otro cliente.`);
      return;
    }

    setSelectedAppointment(item);
    setObservaciones(item.observaciones || '');
    setResultadoFinal(
      item.resultado_tramite ||
      (item.estado === 'atendida' ? 'aceptado' : item.estado === 'rechazada' ? 'rechazado' : 'en_proceso')
    );

    if (item.estado === 'atendida' || item.estado === 'rechazada') {
      setIsAttentionStarted(false);
      setTimerSeconds(0);
    } else if (!isAttentionStarted || selectedAppointment?.codigo !== item.codigo) {
      setIsAttentionStarted(false);
      setTimerSeconds(0);
    }
    setActiveView('atencion');
  };

  // Botón "INICIAR CON LA ATENCIÓN": Arranca cronómetro y actualiza a 'en_atencion'
  const handleStartAttentionSession = async () => {
    if (!selectedAppointment) return;
    setIsAttentionStarted(true);
    setTimerSeconds(0);

    const updatedAppt: AppointmentAgendaItem = {
      ...selectedAppointment,
      estado: 'en_atencion',
    };
    setSelectedAppointment(updatedAppt);
    setAgendaList((prev) =>
      prev.map((item) => (item.id === selectedAppointment.id ? updatedAppt : item))
    );

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase
        .from('cita')
        .update({ estado_cita: 'en_atencion' })
        .eq('id_cita', selectedAppointment.id);
    } catch (e) {
      console.warn('Error al actualizar en_atencion en Supabase:', e);
    }
  };

  // Buscar manualmente por código ingresado en el input izquierdo (Código o DNI)
  const handleManualCodeSearch = () => {
    if (!manualCodeInput.trim()) return;
    const clean = manualCodeInput.trim().toLowerCase();
    const match = agendaList.find(
      (a) => a.codigo.toLowerCase() === clean || a.dni.toLowerCase() === clean
    );
    if (match) {
      handleStartAttention(match);
    } else {
      alert(`No se encontró ninguna cita registrada con el código o DNI: ${manualCodeInput}`);
    }
  };

  // Cambiar el estado de un requisito individual ('ok' | 'baja')
  const handleToggleRequirementState = (reqId: number, newState: 'ok' | 'baja') => {
    if (!selectedAppointment || (!isAttentionStarted && selectedAppointment.estado !== 'atendida' && selectedAppointment.estado !== 'rechazada')) return;

    const updatedReqs = selectedAppointment.requisitos.map((r) =>
      r.id === reqId ? { ...r, estado: newState } : r
    );

    const updatedAppt = {
      ...selectedAppointment,
      requisitos: updatedReqs,
    };
    setSelectedAppointment(updatedAppt);
    setAgendaList((prev) =>
      prev.map((item) => (item.id === selectedAppointment.id ? updatedAppt : item))
    );
  };

  // Finalizar atención y persistir directamente en Supabase (cita, atencion_cita y requisitos)
  const handleFinishAttention = async () => {
    if (!selectedAppointment) return;

    if (!isAttentionStarted && selectedAppointment.estado !== 'atendida' && selectedAppointment.estado !== 'rechazada') {
      alert('⚠️ La atención no ha sido iniciada aún. Presione "INICIAR CON LA ATENCIÓN" antes de finalizar.');
      return;
    }

    let finalDecision = resultadoFinal;
    if (finalDecision === 'en_proceso') {
      const allOk = selectedAppointment.requisitos.every((r) => r.estado === 'ok');
      const confirmMsg = allOk
        ? 'Todos los requisitos están cumplidos (✓ OK). ¿Desea APROBAR y finalizar este trámite?'
        : 'Hay requisitos no cumplidos o dados de baja. ¿Desea RECHAZAR este trámite?';
      const userConfirmed = window.confirm(confirmMsg);
      if (!userConfirmed) return;
      finalDecision = allOk ? 'aceptado' : 'rechazado';
      setResultadoFinal(finalDecision);
    }

    const dbState: AppointmentAgendaItem['estado'] = finalDecision === 'rechazado' ? 'rechazada' : 'atendida';
    const comentarioFinal = observaciones.trim() || (finalDecision === 'aceptado' ? 'Trámite validado y aprobado en ventanilla' : 'Trámite rechazado por documentación incompleta');

    // 1. Actualizar agenda local inmediatamente en React
    const updatedAppointment: AppointmentAgendaItem = {
      ...selectedAppointment,
      estado: dbState,
      resultado_tramite: finalDecision,
      observaciones: comentarioFinal,
    };
    setSelectedAppointment(updatedAppointment);
    setAgendaList((prev) =>
      prev.map((item) => (item.id === selectedAppointment.id ? updatedAppointment : item))
    );

    // 2. Persistir en la base de datos remota de Supabase
    try {
      const supabase = createSupabaseBrowserClient();

      // a) Actualizar estado_cita en la tabla cita
      await supabase
        .from('cita')
        .update({ estado_cita: dbState })
        .eq('id_cita', selectedAppointment.id);

      // b) Upsert en la tabla atencion_cita
      const nowIso = new Date().toISOString();
      const { data: atencionSaved, error: atencionErr } = await supabase
        .from('atencion_cita')
        .upsert(
          {
            id_cita: selectedAppointment.id,
            id_agente: operatorId,
            hora_inicio_atencion: nowIso,
            hora_fin_atencion: nowIso,
            resultado_tramite: finalDecision,
            comentario_observacion: comentarioFinal,
            fecha_registro: nowIso,
          },
          { onConflict: 'id_cita' }
        )
        .select()
        .single();

      if (atencionErr) {
        console.error('Aviso persistencia atencion_cita:', atencionErr);
      }

      // c) Guardar los requisitos verificados en cita_requisito_estado
      if (atencionSaved?.id_atencion && selectedAppointment.requisitos.length > 0) {
        await supabase
          .from('cita_requisito_estado')
          .delete()
          .eq('id_atencion', atencionSaved.id_atencion);

        const reqRows = selectedAppointment.requisitos.map((r) => ({
          id_atencion: atencionSaved.id_atencion,
          id_requisito: r.id,
          cumplido: r.estado === 'ok',
        }));

        await supabase.from('cita_requisito_estado').insert(reqRows);
      }
    } catch (e) {
      console.error('Error al persistir estado en Supabase:', e);
    }

    const durationText = formatSeconds(timerSeconds);
    setIsAttentionStarted(false);

    alert(`✓ Atención finalizada exitosamente (${finalDecision === 'aceptado' ? 'TRÁMITE APROBADO' : 'TRÁMITE RECHAZADO'}).\nTiempo registrado: ${durationText} min.`);

    setActiveView('agenda');
  };

  // Siguiente cliente en cola
  const handleNextClientInQueue = () => {
    if (isAttentionStarted) {
      alert(`⚠️ ATENCIÓN EN CURSO: No puede pasar al siguiente cliente sin antes presionar "Finalizar Atención" para concluir el trámite de ${selectedAppointment?.cliente}.`);
      return;
    }

    const pendingList = agendaList.filter((a) => a.estado === 'pendiente' && a.fecha === selectedDate);
    if (pendingList.length > 0) {
      handleStartAttention(pendingList[0]);
    } else {
      alert('No hay más clientes pendientes en la cola para la fecha seleccionada.');
    }
  };

  // Citas del día seleccionado
  const appointmentsForSelectedDate = useMemo(() => {
    return agendaList.filter((a) => a.fecha === selectedDate);
  }, [agendaList, selectedDate]);

  // GENERADOR Y FUSIÓN DE BLOQUES DE 15 MINUTOS (JUNTANDO BLOQUES VACÍOS CONSECUTIVOS)
  const mergedTimeBlocks = useMemo(() => {
    const toTimeStr = (totalMin: number) => {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // 1. Crear todos los slots de 15 min de 08:00 a 17:00
    const rawSlots: Array<{
      startMin: number;
      endMin: number;
      horaInicio: string;
      horaFin: string;
      isBreak: boolean;
      appointment?: AppointmentAgendaItem;
    }> = [];

    let curr = 8 * 60; // 08:00
    const endDay = 17 * 60; // 17:00
    const breakStart = 13 * 60; // 13:00
    const breakEnd = 14 * 60; // 14:00

    while (curr < endDay) {
      // Bloque de Descanso / Refrigerio (13:00 - 14:00)
      if (curr === breakStart) {
        rawSlots.push({
          startMin: breakStart,
          endMin: breakEnd,
          horaInicio: '13:00',
          horaFin: '14:00',
          isBreak: true,
        });
        curr = breakEnd;
        continue;
      }

      const next = curr + 15;
      const startStr = toTimeStr(curr);
      const endStr = toTimeStr(next);

      // Buscar si hay cita en este slot
      const found = appointmentsForSelectedDate.find((a) => {
        const [h, m] = a.hora.split(':').map(Number);
        const aMin = h * 60 + m;
        return aMin >= curr && aMin < next;
      });

      rawSlots.push({
        startMin: curr,
        endMin: next,
        horaInicio: startStr,
        horaFin: endStr,
        isBreak: false,
        appointment: found,
      });

      curr = next;
    }

    // 2. FUSIONAR BLOQUES CONSECUTIVOS SÓLO SI SON VACÍOS
    const merged: MergedTimeBlock[] = [];
    let emptyStartMin: number | null = null;
    let emptyEndMin: number | null = null;

    const flushEmpty = () => {
      if (emptyStartMin !== null && emptyEndMin !== null) {
        merged.push({
          id: `empty-${emptyStartMin}-${emptyEndMin}`,
          horaInicio: toTimeStr(emptyStartMin),
          horaFin: toTimeStr(emptyEndMin),
          isBreak: false,
          isEmpty: true,
          durationMinutes: emptyEndMin - emptyStartMin,
        });
        emptyStartMin = null;
        emptyEndMin = null;
      }
    };

    for (const slot of rawSlots) {
      if (slot.isBreak) {
        flushEmpty();
        merged.push({
          id: 'break-13-14',
          horaInicio: slot.horaInicio,
          horaFin: slot.horaFin,
          isBreak: true,
          isEmpty: false,
          durationMinutes: 60,
        });
      } else if (slot.appointment) {
        flushEmpty();
        merged.push({
          id: `appt-${slot.appointment.codigo}`,
          horaInicio: slot.horaInicio,
          horaFin: slot.horaFin,
          isBreak: false,
          isEmpty: false,
          durationMinutes: 15,
          appointment: slot.appointment,
        });
      } else {
        // Slot vacío consecutivo: acumular para fusionar
        if (emptyStartMin === null) {
          emptyStartMin = slot.startMin;
        }
        emptyEndMin = slot.endMin;
      }
    }

    flushEmpty();

    return merged;
  }, [appointmentsForSelectedDate]);

  // Filtrado de bloques por texto de búsqueda
  const displayedBlocks = useMemo(() => {
    if (!searchQuery.trim()) return mergedTimeBlocks;
    const q = searchQuery.toLowerCase();
    return mergedTimeBlocks.filter((block) => {
      if (block.isBreak) return true;
      if (!block.appointment) return false;
      return (
        block.appointment.cliente.toLowerCase().includes(q) ||
        block.appointment.codigo.toLowerCase().includes(q) ||
        block.appointment.dni.toLowerCase().includes(q) ||
        block.appointment.tramite.toLowerCase().includes(q)
      );
    });
  }, [mergedTimeBlocks, searchQuery]);

  // --- LÓGICA DEL CALENDARIO IDÉNTICO AL DISEÑO DE LA IMAGEN ---
  const calendarYear = calendarViewDate.getFullYear();
  const calendarMonth = calendarViewDate.getMonth();

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const calendarTitle = `${monthNamesEn[calendarMonth]} ${calendarYear}`;

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calendarYear, calendarMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarViewDate(new Date(calendarYear, calendarMonth + 1, 1));
  };

  // Cuadrícula idéntica a la imagen: Su Mo Tu We Th Fr Sa con días previos y posteriores en gris
  const calendarDaysMatrix = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();

    const cells: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isSelected: boolean;
      hasAppointments: boolean;
    }> = [];

    // Días del mes anterior (gris tenue)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevDate = new Date(calendarYear, calendarMonth - 1, dNum);
      const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      cells.push({
        dayNumber: dNum,
        dateString: prevDateStr,
        isCurrentMonth: false,
        isSelected: prevDateStr === selectedDate,
        hasAppointments: agendaList.some((a) => a.fecha === prevDateStr),
      });
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const curDateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNumber: d,
        dateString: curDateStr,
        isCurrentMonth: true,
        isSelected: curDateStr === selectedDate,
        hasAppointments: agendaList.some((a) => a.fecha === curDateStr),
      });
    }

    // Días del siguiente mes para completar las semanas
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let nextD = 1; nextD <= remaining; nextD++) {
      const nextDate = new Date(calendarYear, calendarMonth + 1, nextD);
      const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
      cells.push({
        dayNumber: nextD,
        dateString: nextDateStr,
        isCurrentMonth: false,
        isSelected: nextDateStr === selectedDate,
        hasAppointments: agendaList.some((a) => a.fecha === nextDateStr),
      });
    }

    return cells;
  }, [calendarYear, calendarMonth, selectedDate, agendaList]);

  // Helper para formatear la duración de bloques libres
  const formatDurationText = (minutes: number) => {
    if (minutes < 60) return `${minutes} min libres`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m libres` : `${h} horas libres`;
  };

  // Resumen del día seleccionado
  const totalCitasDia = appointmentsForSelectedDate.length;
  const pendientesDia = appointmentsForSelectedDate.filter((a) => a.estado === 'pendiente').length;
  const atendidasDia = appointmentsForSelectedDate.filter((a) => a.estado === 'atendida').length;

  // Cálculo dinámico del resumen de requerimientos para la Vista 2
  const totalReqs = selectedAppointment?.requisitos.length || 0;
  const countOk = selectedAppointment?.requisitos.filter((r) => r.estado === 'ok').length || 0;
  const countBaja = selectedAppointment?.requisitos.filter((r) => r.estado === 'baja').length || 0;
  const countPendiente = selectedAppointment?.requisitos.filter((r) => r.estado === 'pendiente').length || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-red-600 selection:text-white">
      {/* HEADER INSTITUCIONAL UNIFICADO */}
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 shadow-xs sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Lado Izquierdo: Logo, Operador y Navegación de Vista */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="hover:opacity-95 transition-opacity shrink-0">
              <LogoBancoNacion showSubtitle={false} />
            </Link>
            <div className="h-6 w-px bg-slate-200 hidden md:block" />
            <div className="text-xs text-slate-700 font-bold hidden md:block">
              Hola, <strong className="text-slate-900">{operatorName}</strong> | <span className="text-red-700 font-semibold">{agenciaNombre}</span>
            </div>

            {/* Selector de Vista */}
            <div className="flex items-center gap-1 ml-1 sm:ml-2 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => {
                  if (isAttentionStarted) {
                    const confirmLeave = confirm(
                      'Hay una atención en curso. ¿Desea ver la agenda sin finalizar la atención?\n\nNota: El cronómetro seguirá activo hasta que presione "Finalizar Atención".'
                    );
                    if (!confirmLeave) return;
                  }
                  setActiveView('agenda');
                }}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  activeView === 'agenda'
                    ? 'bg-red-600 text-white font-extrabold shadow-xs'
                    : 'hover:text-red-700'
                }`}
              >
                Agenda por Bloques
              </button>
              {activeView === 'atencion' && (
                <span className="px-3 py-1 bg-white text-slate-900 rounded-lg font-black shadow-xs border border-slate-200">
                  Atención de Usuario
                </span>
              )}
            </div>
          </div>

          {/* Lado Derecho: Siguiente Cliente, Indicador DB en vivo, Ventanilla y Cerrar Sesión */}
          <div className="flex items-center gap-2 sm:gap-3">
            {activeView === 'atencion' && (
              <button
                onClick={handleNextClientInQueue}
                title={
                  isAttentionStarted
                    ? 'Debe finalizar la atención actual antes de pasar al siguiente cliente'
                    : 'Llamar al siguiente cliente en cola'
                }
                className={`px-4 py-1.5 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
                  isAttentionStarted
                    ? 'bg-slate-400 hover:bg-slate-500'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <span className="hidden sm:inline">Siguiente Cliente</span>
                <span className="sm:hidden">Siguiente</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}

            {/* Indicador y botón para sincronizar citas de Supabase */}
            <button
              onClick={loadSupabaseAppointments}
              title={isRealtimeActive ? 'Sincronizado en tiempo real con Supabase (Click para recargar)' : 'Sincronizar citas con Supabase'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 hover:text-red-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 cursor-pointer text-xs font-bold"
            >
              <span className={`w-2 h-2 rounded-full ${isRealtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <svg
                className={`w-3.5 h-3.5 ${isLoadingDB ? 'animate-spin text-red-600' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden md:inline">{isRealtimeActive ? 'En Vivo' : 'Recargar'}</span>
            </button>

            <span className="px-3.5 py-1.5 bg-slate-900 text-white font-black text-xs rounded-xl shadow-xs tracking-wider uppercase">
              {ventanillaNumero}
            </span>

            {/* BOTÓN CERRAR SESIÓN */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 hover:border-red-300 rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOutIcon className="w-4 h-4 text-red-600" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>

        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ========================================================================= */}
        {/* VISTA 1: AGENDA DE BLOQUES FUSIONADOS CON BOTÓN POPUP DE CALENDARIO */}
        {/* ========================================================================= */}
        {activeView === 'agenda' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMNA IZQUIERDA: ESCÁNER / CÓDIGO MANUAL + CITA SELECCIONADA */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* 1. Caja de Ingreso Manual de Código o DNI */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4 text-center">
                <div className="flex justify-center">
                  <QRCodeSVG value={manualCodeInput || 'BN-ESCANER'} size={110} />
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Ingreso Manual de Código o DNI
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: BN-748401 o DNI..."
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualCodeSearch()}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-red-600"
                  />
                  <button
                    onClick={handleManualCodeSearch}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow cursor-pointer"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              {/* 2. Tarjeta de Resultado de Cita Seleccionada */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-center border-b border-slate-100 pb-2">
                  Cita Seleccionada
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Ciudadano:</span>
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-bold text-slate-900">
                      {selectedAppointment ? `${selectedAppointment.cliente} (${selectedAppointment.dni})` : 'Seleccione una cita de los bloques'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Trámite:</span>
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-bold text-slate-900">
                      {selectedAppointment ? selectedAppointment.tramite : '---'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Horario Asignado:</span>
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-bold text-slate-900">
                      {selectedAppointment ? `${selectedAppointment.fecha} • ${selectedAppointment.hora} hs` : '---'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Estado:</span>
                    <div className="p-2 rounded-lg font-extrabold uppercase text-center text-xs">
                      {selectedAppointment ? (
                        selectedAppointment.estado === 'atendida' ? (
                          <span className="text-emerald-700 bg-emerald-100 block py-1 rounded-md">
                            ✓ Atendido ({selectedAppointment.resultado_tramite === 'aceptado' ? 'Aprobado' : 'Rechazado'})
                          </span>
                        ) : selectedAppointment.estado === 'rechazada' ? (
                          <span className="text-red-700 bg-red-100 block py-1 rounded-md">✕ Rechazado</span>
                        ) : selectedAppointment.estado === 'en_atencion' ? (
                          <span className="text-blue-700 bg-blue-100 block py-1 rounded-md">● En Atención</span>
                        ) : (
                          <span className="text-amber-800 bg-amber-100 block py-1 rounded-md">⌛ Pendiente</span>
                        )
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  disabled={!selectedAppointment}
                  onClick={() => selectedAppointment && handleStartAttention(selectedAppointment)}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold rounded-xl shadow-lg transition text-xs uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                >
                  {selectedAppointment && (selectedAppointment.estado === 'atendida' || selectedAppointment.estado === 'rechazada')
                    ? 'Ver Revisión de Trámite'
                    : 'Iniciar Atención'}
                </button>
              </div>
            </div>

            {/* COLUMNA DERECHA: AGENDA EN BLOQUES FUSIONADOS CON EL BOTÓN POPUP DE CALENDAR */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6">
              
              {/* Cabecera de la Agenda con el Selector Popup del Calendario en lugar del buscador */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-xl tracking-tight uppercase flex items-center gap-2">
                    Horario de Ventanilla en Bloques de 15 Min
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Día seleccionado: <strong className="text-red-700 font-bold">{selectedDate}</strong> • Bloques vacíos fusionados para lectura ágil
                  </p>
                </div>

                {/* BOTÓN POPUP DE CALENDARIO (REEMPLAZA LA BÚSQUEDA TRADICIONAL EN EL HEADER) */}
                <div className="relative flex items-center gap-2 self-start sm:self-auto" ref={calendarPopupRef}>
                  
                  {/* Botón Pick a date con icono de calendario */}
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer border ${
                      isCalendarOpen
                        ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-slate-400 font-normal">Calendar:</span>
                    <span className="font-mono font-bold text-red-700">{selectedDate}</span>
                    <CalendarIcon className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* POPUP FLOTANTE DEL CALENDARIO (DISEÑO FIEL A LA IMAGEN) */}
                  {isCalendarOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xl space-y-3.5 transition animate-fadeIn">
                      
                      {/* Header Month Year + Flechitas ▲ ▼ */}
                      <div className="flex items-center justify-between px-1">
                        <h4 className="font-bold text-slate-800 text-sm">
                          {calendarTitle}
                        </h4>
                        <div className="flex items-center gap-2 text-slate-500">
                          <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="hover:text-slate-900 transition p-0.5 cursor-pointer text-xs"
                            title="Previous month"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={handleNextMonth}
                            className="hover:text-slate-900 transition p-0.5 cursor-pointer text-xs"
                            title="Next month"
                          >
                            ▼
                          </button>
                        </div>
                      </div>

                      {/* Días de la semana Su Mo Tu We Th Fr Sa */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-700">
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                      </div>

                      {/* Grilla de Días con Círculo Azul Sólido en el Día Seleccionado (#1976d2) */}
                      <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 text-center text-xs">
                        {calendarDaysMatrix.map((item, idx) => {
                          return (
                            <div key={`${item.dateString}-${idx}`} className="flex items-center justify-center h-8">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDate(item.dateString);
                                  const [y, m] = item.dateString.split('-').map(Number);
                                  if (y && m) setCalendarViewDate(new Date(y, m - 1, 1));
                                  setIsCalendarOpen(false); // Cierra el popup al elegir
                                }}
                                className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition cursor-pointer relative ${
                                  item.isSelected
                                    ? 'bg-[#1976d2] text-white font-bold shadow-md scale-105'
                                    : item.isCurrentMonth
                                    ? 'text-slate-800 hover:bg-slate-100 font-medium'
                                    : 'text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                <span>{item.dayNumber}</span>
                                {item.hasAppointments && !item.isSelected && (
                                  <span className="absolute bottom-0 w-1 h-1 rounded-full bg-red-600" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer del Popup: Fechas con actividad rápida */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Citas en el día:</span>
                          <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {totalCitasDia} {totalCitasDia === 1 ? 'cita' : 'citas'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {Array.from(new Set(agendaList.map((a) => a.fecha).filter(Boolean)))
                            .sort()
                            .reverse()
                            .slice(0, 4)
                            .map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  setSelectedDate(d);
                                  const [y, m] = d.split('-').map(Number);
                                  if (y && m) setCalendarViewDate(new Date(y, m - 1, 1));
                                  setIsCalendarOpen(false);
                                }}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 rounded text-[10px] font-bold border border-slate-200 transition"
                              >
                                {d}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen de la jornada (Citas, Pendientes, Atendidas, Horario) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <span className="text-slate-600 font-bold">Citas en el día:</span>
                    <strong className="text-slate-900 font-black">{totalCitasDia}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-600 font-bold">Pendientes:</span>
                    <strong className="text-amber-800 font-black">{pendientesDia}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="text-slate-600 font-bold">Atendidas:</span>
                    <strong className="text-emerald-800 font-black">{atendidasDia}</strong>
                  </div>
                </div>

                <div className="text-slate-500 font-medium text-[11px]">
                  Jornada: 08:00 a 17:00 hs (Descanso 13:00 - 14:00)
                </div>
              </div>

              {/* TABLA PRINCIPAL DE BLOQUES FUSIONADOS */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl w-36">Horario</th>
                      <th className="p-3.5 w-28">Código</th>
                      <th className="p-3.5">Ciudadano / Detalle</th>
                      <th className="p-3.5">Trámite Bancario</th>
                      <th className="p-3.5 text-center rounded-r-xl w-32">Acción / Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {isLoadingDB ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                            <span className="font-bold">Cargando horario de bloques desde Supabase...</span>
                          </div>
                        </td>
                      </tr>
                    ) : displayedBlocks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500">
                          <p className="font-bold text-sm text-slate-700">No se encontraron citas o bloques para el filtro ingresado.</p>
                        </td>
                      </tr>
                    ) : (
                      displayedBlocks.map((block) => {
                        // CASO 1: BLOQUE DE DESCANSO / REFRIGERIO (13:00 - 14:00)
                        if (block.isBreak) {
                          return (
                            <tr
                              key={block.id}
                              className="bg-amber-100/75 border-y-2 border-amber-300 font-bold text-amber-950"
                            >
                              <td className="p-3.5 font-mono text-xs">
                                <div className="flex items-center gap-1.5 font-black text-amber-900">
                                  <span className="text-base">☕</span>
                                  <span>13:00 — 14:00</span>
                                </div>
                              </td>
                              <td colSpan={3} className="p-3.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 bg-amber-300 text-amber-950 rounded font-black text-[10px] uppercase border border-amber-400">
                                    Descanso del Operador
                                  </span>
                                  <span className="text-xs text-amber-900 font-medium">
                                    Horario de refrigerio institucional (Ventanilla en pausa operativa de 60 min)
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-center">
                                <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-200 px-2.5 py-1 rounded-md border border-amber-300">
                                  Receso
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        // CASO 2: BLOQUE CON CITA AGENDADA (15 MIN)
                        if (block.appointment) {
                          const item = block.appointment;
                          const isSelected = selectedAppointment?.codigo === item.codigo;

                          return (
                            <tr
                              key={block.id}
                              onClick={() => setSelectedAppointment(item)}
                              className={`cursor-pointer transition ${
                                isSelected
                                  ? 'bg-red-50 border-l-4 border-red-600 font-bold'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="p-3.5 font-bold text-slate-900 font-mono text-xs">
                                <span className="px-2 py-1 bg-red-100 text-red-900 rounded-md font-black border border-red-200">
                                  {block.horaInicio} - {block.horaFin}
                                </span>
                              </td>
                              <td className="p-3.5 font-mono font-black text-red-700 text-xs">
                                {item.codigo}
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900 text-xs">{item.cliente}</div>
                                <div className="text-[10px] text-slate-400 font-mono">DNI: {item.dni}</div>
                              </td>
                              <td className="p-3.5 text-slate-800 text-xs">
                                {item.tramite}
                              </td>
                              <td className="p-3.5 text-center">
                                {item.estado === 'atendida' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartAttention(item);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black rounded-full text-[10px] uppercase transition cursor-pointer"
                                    title="Ver revisión efectuada"
                                  >
                                    ✓ ATENDIDO
                                  </button>
                                ) : item.estado === 'rechazada' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartAttention(item);
                                    }}
                                    className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-black rounded-full text-[10px] uppercase transition cursor-pointer"
                                    title="Ver rechazo efectuado"
                                  >
                                    ✕ RECHAZADO
                                  </button>
                                ) : item.estado === 'en_atencion' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartAttention(item);
                                    }}
                                    className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-black rounded-full text-[10px] uppercase transition cursor-pointer"
                                  >
                                    ● EN ATENCIÓN
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartAttention(item);
                                    }}
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-red-600 text-white font-extrabold rounded-lg transition text-[10px] uppercase tracking-wider shadow cursor-pointer"
                                  >
                                    Realizar Trámite
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        }

                        // CASO 3: BLOQUES CONSECUTIVOS VACÍOS FUSIONADOS
                        return (
                          <tr key={block.id} className="text-slate-500 bg-slate-50/60 hover:bg-slate-50 transition border-dashed">
                            <td className="p-3.5 font-mono text-xs font-bold text-slate-600">
                              <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                {block.horaInicio} — {block.horaFin}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-slate-300">
                              ---
                            </td>
                            <td colSpan={2} className="p-3.5 text-xs text-slate-500">
                              <div className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="font-semibold text-slate-700">
                                  Bloque libre disponible:
                                </span>
                                <span className="text-slate-500 font-mono text-[11px]">
                                  ({formatDurationText(block.durationMinutes)} continuos sin turnos)
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-black uppercase">
                                Disponible
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISTA 2: INTERFAZ DE ATENCIÓN DEL USUARIO Y VALIDACIÓN DE DOCUMENTOS */}
        {/* ========================================================================= */}
        {activeView === 'atencion' && selectedAppointment && (
          <div className="space-y-6 animate-fadeIn">
            {/* Sub-header de atención en curso con Cronómetro Activo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 font-black rounded-full text-xs uppercase tracking-widest border transition ${
                    selectedAppointment.estado === 'atendida'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : selectedAppointment.estado === 'rechazada'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : isAttentionStarted
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {selectedAppointment.estado === 'atendida'
                    ? '✓ TRÁMITE ATENDIDO'
                    : selectedAppointment.estado === 'rechazada'
                    ? '✕ TRÁMITE RECHAZADO'
                    : isAttentionStarted
                    ? '● ATENCIÓN EN CURSO'
                    : '⏸ EN ESPERA DE INICIO'}
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  {selectedAppointment.cliente}
                </h2>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs">
                  <ClockIcon className={`w-4 h-4 ${isAttentionStarted ? 'text-emerald-400 animate-spin' : 'text-slate-400'}`} />
                  <span>Tiempo transcurrido:</span>
                  <span
                    className={`font-mono text-sm font-black px-2.5 py-0.5 rounded-lg tracking-wider ${
                      isAttentionStarted
                        ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {formatSeconds(timerSeconds)}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-500 hidden sm:block">
                  Turno: <strong className="text-red-700">{selectedAppointment.fecha} • {selectedAppointment.hora} hs</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* COLUMNA 1: DATOS DEL CLIENTE */}
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-4 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border-4 border-slate-200 flex items-center justify-center font-black text-white text-2xl mx-auto shadow-md">
                    <UserIcon className="w-10 h-10 text-white" />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900 text-lg leading-tight">
                      {selectedAppointment.cliente}
                    </h3>
                    <span
                      className={`inline-block mt-1 px-3 py-0.5 font-extrabold text-[10px] rounded-full uppercase tracking-wider ${
                        selectedAppointment.estado === 'atendida'
                          ? 'bg-emerald-600 text-white'
                          : selectedAppointment.estado === 'rechazada'
                          ? 'bg-red-600 text-white'
                          : isAttentionStarted
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {selectedAppointment.estado === 'atendida'
                        ? 'Revisión Concluida'
                        : selectedAppointment.estado === 'rechazada'
                        ? 'Revisión Rechazada'
                        : isAttentionStarted
                        ? 'En atención activa'
                        : 'Pendiente de inicio'}
                    </span>
                  </div>

                  <div className="space-y-3 text-left text-xs text-slate-700 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Código de Turno</span>
                      <strong className="font-mono text-red-700 font-black text-sm">{selectedAppointment.codigo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">DNI / CUIT</span>
                      <strong className="text-slate-900">{selectedAppointment.dni}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Teléfono</span>
                      <strong className="text-slate-900">{selectedAppointment.telefono}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Email</span>
                      <strong className="text-slate-900 truncate block">{selectedAppointment.email}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Trámite Solicitado</span>
                      <strong className="text-slate-900">{selectedAppointment.tramite}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Fecha y Hora</span>
                      <strong className="text-slate-900">{selectedAppointment.fecha} • {selectedAppointment.hora} hs</strong>
                    </div>
                  </div>
                </div>

                {selectedAppointment.estado === 'atendida' || selectedAppointment.estado === 'rechazada' ? (
                  <div className="w-full py-3 bg-slate-100 border border-slate-300 text-slate-800 font-extrabold rounded-xl text-xs uppercase tracking-wider text-center">
                    ✓ Trámite Registrado en BD
                  </div>
                ) : !isAttentionStarted ? (
                  <button
                    type="button"
                    onClick={handleStartAttentionSession}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>INICIAR CON LA ATENCIÓN</span>
                  </button>
                ) : (
                  <div className="w-full py-3 bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold rounded-xl text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping inline-block" />
                    <span>✓ ATENCIÓN EN CURSO ({formatSeconds(timerSeconds)})</span>
                  </div>
                )}
              </div>

              {/* COLUMNA 2: REQUERIMIENTOS DEL TRÁMITE CON BOTONES ✓ OK / ✕ BAJA */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base uppercase">
                        Requerimientos del Trámite
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {selectedAppointment.tramite} — Marque cada item o dé de baja si no cumple
                      </p>
                    </div>
                    {!isAttentionStarted && selectedAppointment.estado !== 'atendida' && selectedAppointment.estado !== 'rechazada' && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0">
                        🔒 Bloqueado
                      </span>
                    )}
                  </div>

                  {/* Banner de bloqueo si la atención no se ha iniciado */}
                  {!isAttentionStarted && selectedAppointment.estado !== 'atendida' && selectedAppointment.estado !== 'rechazada' && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-amber-900 text-xs">
                      <span className="text-base shrink-0">🔒</span>
                      <div>
                        <strong className="block font-bold">Atención no iniciada</strong>
                        <span>Haga clic en <strong className="text-emerald-700 underline font-black">"INICIAR CON LA ATENCIÓN"</strong> en el panel izquierdo para desbloquear la validación de requisitos y activar el cronómetro.</span>
                      </div>
                    </div>
                  )}

                  {/* Lista de Requisitos con Botones ✓ OK y ✕ Baja */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {selectedAppointment.requisitos.map((req) => (
                      <div
                        key={req.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                          !isAttentionStarted && selectedAppointment.estado !== 'atendida' && selectedAppointment.estado !== 'rechazada'
                            ? 'bg-slate-50/70 border-slate-200 opacity-70'
                            : req.estado === 'ok'
                            ? 'bg-emerald-50 border-emerald-300'
                            : req.estado === 'baja'
                            ? 'bg-red-50 border-red-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {req.estado === 'ok' ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              ✓
                            </div>
                          ) : req.estado === 'baja' ? (
                            <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              ✕
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              ?
                            </div>
                          )}
                          <span className="text-xs font-extrabold text-slate-900 leading-tight">
                            {req.descripcion}
                          </span>
                        </div>

                        {/* Botones duales ✓ OK y ✕ Baja */}
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={!isAttentionStarted && selectedAppointment.estado !== 'atendida' && selectedAppointment.estado !== 'rechazada'}
                            onClick={() => handleToggleRequirementState(req.id, 'ok')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition border ${
                              !isAttentionStarted && selectedAppointment.estado !== 'atendida' && selectedAppointment.estado !== 'rechazada'
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                                : req.estado === 'ok'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow cursor-pointer'
                                : 'bg-white text-slate-700 hover:bg-emerald-100 border-slate-300 cursor-pointer'
                            }`}
                          >
                            ✓ OK
                          </button>
                          <button
                            type="button"
                            disabled={!isAttentionStarted && selectedAppointment.estado !== 'atendida' && selectedAppointment.estado !== 'rechazada'}
                            onClick={() => handleToggleRequirementState(req.id, 'baja')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition border ${
                              !isAttentionStarted && selectedAppointment.estado !== 'atendida' && selectedAppointment.estado !== 'rechazada'
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                                : req.estado === 'baja'
                                ? 'bg-red-600 text-white border-red-600 shadow cursor-pointer'
                                : 'bg-white text-slate-700 hover:bg-red-100 border-slate-300 cursor-pointer'
                            }`}
                          >
                            ✕ Baja
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* COLUMNA 3: ACCIONES, TIEMPO Y RESUMEN DE VERIFICACIÓN */}
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-200 pb-2">
                    Acciones
                  </h3>

                  {/* Estado del trámite */}
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Estado del trámite</span>
                    <div className="bg-slate-900 text-amber-400 p-2.5 rounded-xl font-black text-xs text-center uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs">
                      <ClockIcon className="w-4 h-4 text-amber-400" />
                      <span>
                        {resultadoFinal === 'aceptado'
                          ? '✓ ACEPTADO'
                          : resultadoFinal === 'rechazado'
                          ? '✕ RECHAZADO'
                          : isAttentionStarted
                          ? '⌛ En proceso'
                          : '⏸ En espera'}
                      </span>
                    </div>
                  </div>

                  {/* Resumen de verificación dinámico */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
                    <span className="font-black text-slate-800 uppercase block border-b border-slate-200 pb-1">
                      Resumen de verificación
                    </span>
                    <div className="flex justify-between font-bold">
                      <span className="text-emerald-700">Cumplidos</span>
                      <span className="text-slate-900 font-black">{countOk} / {totalReqs}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-red-700">Dados de baja</span>
                      <span className="text-slate-900 font-black">{countBaja} / {totalReqs}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-500">Pendientes</span>
                      <span className="text-slate-900 font-black">{countPendiente} / {totalReqs}</span>
                    </div>
                  </div>

                  {/* Textarea de Observaciones */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 uppercase block mb-1">Observaciones</label>
                    <textarea
                      rows={3}
                      placeholder={isAttentionStarted || selectedAppointment.estado === 'atendida' || selectedAppointment.estado === 'rechazada' ? "Escribir comentarios u observaciones..." : "Inicie la atención para redactar notas..."}
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-red-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResultadoFinal('aceptado')}
                    className={`w-full py-2.5 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer ${
                      resultadoFinal === 'aceptado'
                        ? 'bg-emerald-700 text-white ring-2 ring-emerald-500 shadow-md'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    ✓ Aceptar Trámite
                  </button>

                  <button
                    type="button"
                    onClick={() => setResultadoFinal('rechazado')}
                    className={`w-full py-2.5 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer ${
                      resultadoFinal === 'rechazado'
                        ? 'bg-red-800 text-white ring-2 ring-red-500 shadow-md'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    ✕ Rechazar Trámite
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishAttention}
                    className="w-full py-3 font-extrabold rounded-xl text-xs uppercase tracking-wider transition mt-2 shadow-md bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white cursor-pointer"
                  >
                    {selectedAppointment.estado === 'atendida' || selectedAppointment.estado === 'rechazada'
                      ? 'Actualizar Guardado en BD'
                      : 'Finalizar y Guardar en BD'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER INSTITUCIONAL */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <LogoBancoNacion showSubtitle={false} />
          <p className="text-xs text-slate-500 font-medium">
            Terminal de Ventanilla • Banco de la Nación del Perú © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
