'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  FileText,
  BarChart3,
  Calendar,
  LogOut,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Monitor,
  Check,
  X,
  AlertTriangle,
  UserCheck,
  PieChart,
  BarChart2,
  TrendingUp,
  Printer,
  Shield,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { LogoBancoNacion } from '@/components/LogoBancoNacion';
import { StaffMember, ClientMember } from '@/domain/entities/user';
import { SupabaseAgencyRepository } from '@/infrastructure/repositories/supabase-agency-repository';
import { SupabaseProcedureRepository } from '@/infrastructure/repositories/supabase-procedure-repository';
import { SupabaseUserRepository } from '@/infrastructure/repositories/supabase-user-repository';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client';

export interface AdminAgenciaViewProps {
  showAdminNoticeProp?: boolean;
}

export function AdminAgenciaView({ showAdminNoticeProp = false }: AdminAgenciaViewProps) {
  const router = useRouter();

  // Navegación por pestañas especializada para Administrador de Agencia
  const [activeTab, setActiveTab] = useState<'mi-agencia' | 'ventanillas' | 'personal' | 'tramites' | 'clientes' | 'reportes'>('mi-agencia');
  const [showAdminNotice, setShowAdminNotice] = useState(showAdminNoticeProp);

  // Datos de Sesión del Administrador de Agencia
  const [operatorName, setOperatorName] = useState('Patricia Ramos Solís');
  const [agencyId, setAgencyId] = useState<number>(1);
  const [agencyName, setAgencyName] = useState('Agencia Cusco Central');

  // Estados de Mi Agencia
  const [agencyDetails, setAgencyDetails] = useState<any>({
    id_agencia: 1,
    nombre_agencia: 'Agencia Cusco Central',
    direccion: 'Av. El Sol 345',
    distrito: 'Cusco',
    provincia: 'Cusco',
    departamento: 'Cusco',
    telefono: '(084) 223344',
    latitud: -13.518,
    longitud: -71.978,
    activa: true,
    total_ventanillas: 2,
    diasSemana: [1, 2, 3, 4, 5],
    horaApertura: '08:30',
    horaCierre: '17:30',
    horaInicioAlmuerzo: '13:00',
    horaFinAlmuerzo: '14:00',
    tramitesSeleccionados: [1, 2, 3],
  });

  const [modalEditAgencyOpen, setModalEditAgencyOpen] = useState(false);
  const [isSavingAgency, setIsSavingAgency] = useState(false);
  const [agencyForm, setAgencyForm] = useState({
    telefono: '',
    horaApertura: '08:30',
    horaCierre: '17:30',
    horaInicioAlmuerzo: '13:00',
    horaFinAlmuerzo: '14:00',
    diasSemana: [1, 2, 3, 4, 5],
    activa: true,
  });

  // Estados de Ventanillas Locales
  const [ventanillasList, setVentanillasList] = useState<
    Array<{
      id_ventanilla: number;
      numero_ventanilla: string;
      activa: boolean;
      assigned_to_id?: string | null;
      assigned_to_name?: string | null;
    }>
  >([]);
  const [isLoadingVentanillas, setIsLoadingVentanillas] = useState(false);

  // Estados de Personal de Sede (Solo Agentes Rol 2)
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchStaff, setSearchStaff] = useState('');
  const [filterStaffStatus, setFilterStaffStatus] = useState('todos');
  const [modalStaffOpen, setModalStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    id_ventanilla: null as number | null,
    activo: true,
  });

  // Estados de Trámites en Sede
  const [tramitesList, setTramitesList] = useState<any[]>([]);
  const [enabledTramiteIds, setEnabledTramiteIds] = useState<number[]>([]);
  const [searchTramites, setSearchTramites] = useState('');
  const [isSavingTramiteSetting, setIsSavingTramiteSetting] = useState(false);

  // Estados de Clientes en Sede
  const [clientsList, setClientsList] = useState<ClientMember[]>([]);
  const [searchClients, setSearchClients] = useState('');
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<ClientMember | null>(null);
  const [modalClientHistoryOpen, setModalClientHistoryOpen] = useState(false);
  const [clientAppointmentsHistory, setClientAppointmentsHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Estados de Reportes de Agencia
  const [reportesList, setReportesList] = useState<any[]>([]);
  const [reporteRango, setReporteRango] = useState('mes');
  const [reporteEstado, setReporteEstado] = useState('todos');
  const [tipoGraficoReporte, setTipoGraficoReporte] = useState<'estados' | 'tramites' | 'horarios'>('estados');

  // 1. Cargar Sesión del Administrador de Agencia
  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem('bn_user_session');
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (parsed.nombre) setOperatorName(parsed.nombre);
        if (parsed.id_agencia) setAgencyId(Number(parsed.id_agencia));
        if (parsed.agencia_nombre) setAgencyName(parsed.agencia_nombre);
      }
    } catch {
      // Uso de valores institucionales seguros
    }
  }, []);

  // 2. Cargar Datos Remotos de la Agencia desde Supabase
  const loadAgencyData = async () => {
    try {
      const agencyRepo = new SupabaseAgencyRepository();
      const userRepo = new SupabaseUserRepository();
      const procedureRepo = new SupabaseProcedureRepository();

      // a. Obtener detalles de la agencia asignada
      const details = await agencyRepo.getAgencyFullDetails(agencyId);
      if (details) {
        setAgencyDetails({
          id_agencia: agencyId,
          nombre_agencia: details.agencia.nombre_agencia,
          direccion: details.agencia.direccion,
          distrito: details.agencia.distrito,
          provincia: details.agencia.provincia || 'Cusco',
          departamento: details.agencia.departamento || 'Cusco',
          telefono: details.agencia.telefono || '(084) 223344',
          latitud: details.agencia.latitud || -13.518,
          longitud: details.agencia.longitud || -71.978,
          activa: details.agencia.activa,
          total_ventanillas: details.ventanillasCount,
          diasSemana: details.diasSemana,
          horaApertura: details.horaApertura,
          horaCierre: details.horaCierre,
          horaInicioAlmuerzo: details.horaInicioAlmuerzo,
          horaFinAlmuerzo: details.horaFinAlmuerzo,
          tramitesSeleccionados: details.tramitesSeleccionados,
        });
        setEnabledTramiteIds(details.tramitesSeleccionados);
        setAgencyName(details.agencia.nombre_agencia);
      }

      // b. Obtener ventanillas y asignaciones de la agencia
      setIsLoadingVentanillas(true);
      const supabase = createSupabaseBrowserClient();
      const { data: vData } = await supabase
        .from('ventanilla')
        .select('id_ventanilla, numero_ventanilla, activa')
        .eq('id_agencia', agencyId)
        .order('numero_ventanilla', { ascending: true });

      const { data: assignData } = await supabase
        .from('personal_ventanilla')
        .select('id_ventanilla, id_usuario, usuario:id_usuario(nombres, apellidos)')
        .eq('activa', true);

      const assignMap = new Map<number, { id_usuario: string; name: string }>();
      if (assignData) {
        assignData.forEach((as: any) => {
          if (as.id_ventanilla) {
            const u = as.usuario;
            const name = u ? `${u.nombres || ''} ${u.apellidos || ''}`.trim() : 'Agente Asignado';
            assignMap.set(as.id_ventanilla, { id_usuario: as.id_usuario, name });
          }
        });
      }

      if (vData) {
        setVentanillasList(
          vData.map((v) => {
            const asig = assignMap.get(v.id_ventanilla);
            return {
              id_ventanilla: v.id_ventanilla,
              numero_ventanilla: v.numero_ventanilla,
              activa: v.activa,
              assigned_to_id: asig?.id_usuario || null,
              assigned_to_name: asig?.name || null,
            };
          })
        );
      }
      setIsLoadingVentanillas(false);

      // c. Obtener solo el personal de esta agencia (Rol 2: Agente Ventanilla)
      const staff = await userRepo.getStaffMembers(undefined, undefined, undefined, agencyId);
      setStaffList(staff.filter((s) => s.id_rol === 2));

      // d. Obtener catálogo institucional de trámites
      const procedures = await procedureRepo.getProcedures('', true);
      setTramitesList(procedures);

      // e. Obtener clientes con citas en esta agencia
      const clients = await userRepo.getClientMembers();
      setClientsList(clients);

      // f. Obtener citas de la agencia para reportes
      const windowIds = (vData || []).map((v) => v.id_ventanilla);
      if (windowIds.length > 0) {
        const { data: citas } = await supabase
          .from('cita')
          .select(`
            id_cita,
            codigo_cita,
            fecha,
            hora_inicio,
            hora_fin,
            estado_cita,
            usuario:id_usuario(nombres, apellidos),
            tramite:id_tramite(nombre_tramite),
            ventanilla:id_ventanilla(numero_ventanilla)
          `)
          .in('id_ventanilla', windowIds)
          .order('fecha', { ascending: false });

        if (citas && citas.length > 0) {
          const mapped = citas.map((c: any, idx: number) => {
            const cliName = c.usuario ? `${c.usuario.nombres || ''} ${c.usuario.apellidos || ''}`.trim() : 'Ciudadano';
            const estado =
              c.estado_cita === 'atendida' ? 'Terminado' :
              c.estado_cita === 'cancelada' ? 'Cancelado' :
              c.estado_cita === 'denegada' ? 'Denegado' : 'En Espera';

            const rawV = c.ventanilla?.numero_ventanilla || 'V-01';
            const vLabel = rawV.startsWith('V-') ? `Ventanilla ${parseInt(rawV.substring(2), 10) || rawV.substring(2)}` : `Ventanilla ${rawV}`;

            return {
              id: idx + 1,
              hora: c.hora_inicio ? c.hora_inicio.substring(0, 5) : '09:00',
              estado,
              cliente: cliName,
              tramite: c.tramite?.nombre_tramite || 'Trámite Bancario',
              agencia: agencyName,
              ventanilla: vLabel,
              atendidoPor: 'Agente Ventanilla',
            };
          });
          setReportesList(mapped);
        }
      }
    } catch (err) {
      console.error('Error al sincronizar datos de la agencia:', err);
    }
  };

  useEffect(() => {
    loadAgencyData();
  }, [agencyId]);

  const handleLogout = () => {
    localStorage.removeItem('bn_user_session');
    window.dispatchEvent(new Event('bn_session_change'));
    router.push('/');
  };

  // ---------------------------------------------------------------------------
  // GESTIÓN DE HORARIO Y OPERATIVIDAD DE LA AGENCIA
  // ---------------------------------------------------------------------------
  const openEditAgencyModal = () => {
    setAgencyForm({
      telefono: agencyDetails.telefono || '',
      horaApertura: agencyDetails.horaApertura || '08:30',
      horaCierre: agencyDetails.horaCierre || '17:30',
      horaInicioAlmuerzo: agencyDetails.horaInicioAlmuerzo || '13:00',
      horaFinAlmuerzo: agencyDetails.horaFinAlmuerzo || '14:00',
      diasSemana: agencyDetails.diasSemana || [1, 2, 3, 4, 5],
      activa: agencyDetails.activa,
    });
    setModalEditAgencyOpen(true);
  };

  const handleSaveAgencySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAgency(true);
    try {
      const agencyRepo = new SupabaseAgencyRepository();
      await agencyRepo.updateAgencyWithDependencies(agencyId, {
        nombre_agencia: agencyDetails.nombre_agencia,
        direccion: agencyDetails.direccion,
        distrito: agencyDetails.distrito,
        provincia: agencyDetails.provincia,
        departamento: agencyDetails.departamento,
        telefono: agencyForm.telefono,
        activa: agencyForm.activa,
        dias_semana: agencyForm.diasSemana,
        hora_apertura: agencyForm.horaApertura,
        hora_cierre: agencyForm.horaCierre,
        hora_inicio_almuerzo: agencyForm.horaInicioAlmuerzo,
        hora_fin_almuerzo: agencyForm.horaFinAlmuerzo,
      });

      setAgencyDetails((prev: any) => ({
        ...prev,
        telefono: agencyForm.telefono,
        horaApertura: agencyForm.horaApertura,
        horaCierre: agencyForm.horaCierre,
        horaInicioAlmuerzo: agencyForm.horaInicioAlmuerzo,
        horaFinAlmuerzo: agencyForm.horaFinAlmuerzo,
        diasSemana: agencyForm.diasSemana,
        activa: agencyForm.activa,
      }));

      alert('Configuración de la agencia guardada exitosamente en la base de datos.');
      setModalEditAgencyOpen(false);
    } catch (err: any) {
      alert('Error al actualizar configuración de sede: ' + err.message);
    } finally {
      setIsSavingAgency(false);
    }
  };

  // ---------------------------------------------------------------------------
  // GESTIÓN DE VENTANILLAS
  // ---------------------------------------------------------------------------
  const handleToggleVentanilla = async (v: any) => {
    const action = v.activa ? 'inhabilitar' : 'habilitar';
    if (!confirm(`¿Deseas ${action} la ventanilla ${v.numero_ventanilla}?`)) return;

    try {
      const agencyRepo = new SupabaseAgencyRepository();
      await agencyRepo.toggleVentanillaStatus(v.id_ventanilla, !v.activa);
      setVentanillasList((prev) =>
        prev.map((item) => (item.id_ventanilla === v.id_ventanilla ? { ...item, activa: !item.activa } : item))
      );
    } catch (err: any) {
      alert('Error al modificar ventanilla: ' + err.message);
    }
  };

  const handleAssignAgentToWindow = async (idVentanilla: number, idUsuario: string) => {
    try {
      const agencyRepo = new SupabaseAgencyRepository();
      await agencyRepo.assignAgentToVentanilla(idVentanilla, idUsuario);
      await loadAgencyData();
      alert('Agente asignado exitosamente a la ventanilla.');
    } catch (err: any) {
      alert('Error al asignar agente: ' + err.message);
    }
  };

  // ---------------------------------------------------------------------------
  // GESTIÓN DE PERSONAL DE SEDE (Agentes)
  // ---------------------------------------------------------------------------
  const openNewStaffModal = () => {
    setEditingStaff(null);
    setStaffForm({
      dni: '',
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: '',
      id_ventanilla: null,
      activo: true,
    });
    setModalStaffOpen(true);
  };

  const openEditStaffModal = (s: StaffMember) => {
    setEditingStaff(s);
    setStaffForm({
      dni: s.dni,
      nombres: s.nombres,
      apellidos: s.apellidos,
      correo: s.correo,
      telefono: s.telefono || '',
      id_ventanilla: s.id_ventanilla || null,
      activo: s.activo,
    });
    setModalStaffOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.dni || staffForm.dni.trim().length !== 8) {
      alert('El DNI debe tener 8 dígitos numéricos.');
      return;
    }
    if (!staffForm.nombres.trim() || !staffForm.apellidos.trim() || !staffForm.correo.trim()) {
      alert('Por favor completa los nombres, apellidos y correo del agente.');
      return;
    }

    setIsSavingStaff(true);
    try {
      const userRepo = new SupabaseUserRepository();

      if (editingStaff) {
        await userRepo.updateStaffMember(editingStaff.id_usuario, {
          dni: staffForm.dni,
          nombres: staffForm.nombres,
          apellidos: staffForm.apellidos,
          correo: staffForm.correo,
          telefono: staffForm.telefono,
          id_rol: 2, // Siempre Agente Ventanilla
          id_agencia: agencyId, // Fijado en esta agencia
          id_ventanilla: staffForm.id_ventanilla,
        });
        alert('Agente actualizado exitosamente en el sistema.');
      } else {
        await userRepo.createStaffMember({
          dni: staffForm.dni,
          nombres: staffForm.nombres,
          apellidos: staffForm.apellidos,
          correo: staffForm.correo,
          telefono: staffForm.telefono,
          id_rol: 2, // Siempre Agente Ventanilla
          id_agencia: agencyId, // Fijado en esta agencia
          id_ventanilla: staffForm.id_ventanilla,
        });
        alert('Agente de ventanilla creado exitosamente en Supabase (Contraseña por defecto: Banco2026*).');
      }

      await loadAgencyData();
      setModalStaffOpen(false);
    } catch (err: any) {
      alert('Error al guardar personal: ' + err.message);
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleToggleStaffStatus = async (s: StaffMember) => {
    const action = s.activo ? 'inhabilitar' : 'reactivar';
    if (!confirm(`¿Estás seguro de ${action} los accesos del agente ${s.nombre_completo}?`)) return;

    try {
      const userRepo = new SupabaseUserRepository();
      await userRepo.toggleStaffStatus(s.id_usuario, !s.activo, s.id_rol);
      setStaffList((prev) =>
        prev.map((item) => (item.id_usuario === s.id_usuario ? { ...item, activo: !s.activo } : item))
      );
    } catch (err: any) {
      alert('Error al modificar estado: ' + err.message);
    }
  };

  // ---------------------------------------------------------------------------
  // GESTIÓN DE TRÁMITES ACTIVOS EN SEDE
  // ---------------------------------------------------------------------------
  const handleToggleTramiteInAgency = async (idTramite: number) => {
    setIsSavingTramiteSetting(true);
    const newSelection = enabledTramiteIds.includes(idTramite)
      ? enabledTramiteIds.filter((id) => id !== idTramite)
      : [...enabledTramiteIds, idTramite];

    try {
      const agencyRepo = new SupabaseAgencyRepository();
      await agencyRepo.updateAgencyWithDependencies(agencyId, {
        nombre_agencia: agencyDetails.nombre_agencia,
        direccion: agencyDetails.direccion,
        distrito: agencyDetails.distrito,
        tramite_ids: newSelection,
      });
      setEnabledTramiteIds(newSelection);
    } catch (err: any) {
      alert('Error al actualizar disponibilidad de trámites: ' + err.message);
    } finally {
      setIsSavingTramiteSetting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HISTORIAL DE CLIENTE
  // ---------------------------------------------------------------------------
  const handleViewClientHistory = async (cli: ClientMember) => {
    setSelectedClientForHistory(cli);
    setModalClientHistoryOpen(true);
    setIsLoadingHistory(true);
    setClientAppointmentsHistory([]);

    try {
      const userRepo = new SupabaseUserRepository();
      const appointments = await userRepo.getClientAppointments(cli.id_usuario);
      // Filtrar citas que correspondan a esta agencia si aplica
      setClientAppointmentsHistory(appointments);
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ---------------------------------------------------------------------------
  // CÁLCULOS REACTIVOS DE REPORTES DE AGENCIA
  // ---------------------------------------------------------------------------
  const filteredReportes = useMemo(() => {
    return reportesList.filter((rep) => {
      if (reporteEstado !== 'todos' && rep.estado.toLowerCase() !== reporteEstado.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [reportesList, reporteEstado]);

  const reportStats = useMemo(() => {
    const total = filteredReportes.length;
    const terminados = filteredReportes.filter((r) => r.estado === 'Terminado').length;
    const cancelados = filteredReportes.filter((r) => r.estado === 'Cancelado').length;
    const denegados = filteredReportes.filter((r) => r.estado === 'Denegado').length;
    const pendientes = filteredReportes.filter((r) => r.estado === 'En Espera').length;
    const tasaExito = total > 0 ? Math.round((terminados / total) * 100) : 0;

    // Conteo por trámite
    const tramitesMap: Record<string, number> = {};
    filteredReportes.forEach((r) => {
      tramitesMap[r.tramite] = (tramitesMap[r.tramite] || 0) + 1;
    });
    const tramitesRanking = Object.entries(tramitesMap)
      .map(([nombre, count]) => ({
        nombre,
        count,
        porcentaje: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Conteo por franja horaria
    const franjas = [
      { id: 'manana', label: '08:00 - 10:00 (Mañana)', count: 0 },
      { id: 'punta', label: '10:00 - 12:00 (Hora Punta)', count: 0 },
      { id: 'mediodia', label: '12:00 - 14:00 (Mediodía)', count: 0 },
      { id: 'tarde', label: '14:00 - 17:30 (Tarde)', count: 0 },
    ];
    filteredReportes.forEach((r) => {
      const horaStr = r.hora;
      const hour = parseInt(horaStr.split(':')[0], 10);
      if (hour < 10) franjas[0].count++;
      else if (hour < 12) franjas[1].count++;
      else if (hour < 14) franjas[2].count++;
      else franjas[3].count++;
    });

    return { total, terminados, cancelados, denegados, pendientes, tasaExito, tramitesRanking, franjas };
  }, [filteredReportes]);

  // Cálculos Donut SVG
  const donutCircumference = 301.59;
  const terminadosOffset = 0;
  const terminadosLength = reportStats.total > 0 ? (reportStats.terminados / reportStats.total) * donutCircumference : 0;
  const pendientesLength = reportStats.total > 0 ? (reportStats.pendientes / reportStats.total) * donutCircumference : 0;
  const canceladosLength = reportStats.total > 0 ? ((reportStats.cancelados + reportStats.denegados) / reportStats.total) * donutCircumference : 0;
  const pendientesOffset = -terminadosLength;
  const canceladosOffset = -(terminadosLength + pendientesLength);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Banner de Bienvenida Institucional */}
      {showAdminNotice && (
        <div className="print:hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-extrabold text-emerald-300 uppercase tracking-wider mr-2">Panel Operativo:</span>
              <span className="font-medium text-slate-200">
                Sesión autenticada como <strong>Administrador de Agencia</strong> para <strong>{agencyName}</strong>. Control de ventanillas, agentes locales y afluencia.
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowAdminNotice(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOPBAR PRINCIPAL */}
      <header className="print:hidden h-20 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <LogoBancoNacion showSubtitle={true} />
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sede Operativa Asignada
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              <span>{agencyName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-extrabold text-slate-900">{operatorName}</div>
            <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-end gap-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              Administrador de Agencia
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center border-2 border-emerald-300 shadow-sm">
            {operatorName.charAt(0)}
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition border border-slate-200 hover:border-red-200 text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* CONTENEDOR CENTRAL: SIDEBAR + VISTA */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVEGACIÓN FIJO */}
        <aside className="print:hidden w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 md:sticky md:top-20 md:h-[calc(100vh-5rem)] md:self-start">
          <div className="p-4 border-b border-slate-800">
            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-3 py-1 bg-emerald-950/60 rounded-lg border border-emerald-800/50 text-center">
              Gestión Descentralizada
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button
              onClick={() => setActiveTab('mi-agencia')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'mi-agencia'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Mi Agencia</span>
            </button>

            <button
              onClick={() => setActiveTab('ventanillas')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'ventanillas'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>Ventanillas y Turnos</span>
            </button>

            <button
              onClick={() => setActiveTab('personal')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'personal'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Agentes de Sede</span>
            </button>

            <button
              onClick={() => setActiveTab('tramites')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'tramites'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Trámites Habilitados</span>
            </button>

            <button
              onClick={() => setActiveTab('clientes')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'clientes'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Clientes en Sede</span>
            </button>

            <button
              onClick={() => setActiveTab('reportes')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'reportes'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Reportes de Sucursal</span>
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 space-y-1">
            <div className="font-extrabold text-slate-300">Banco de la Nación</div>
            <div>Oficina Descentralizada Operativa</div>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100">
          {/* =========================================================================
              PESTAÑA 1: MI AGENCIA
             ========================================================================= */}
          {activeTab === 'mi-agencia' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700 uppercase tracking-wider mb-1">
                    <Building2 className="w-4 h-4" />
                    <span>Perfil Operativo de Sucursal</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{agencyDetails.nombre_agencia}</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {agencyDetails.direccion} &bull; {agencyDetails.distrito}, {agencyDetails.provincia}, {agencyDetails.departamento}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold tracking-wide uppercase ${
                      agencyDetails.activa
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${agencyDetails.activa ? 'bg-emerald-600' : 'bg-red-600'}`} />
                    {agencyDetails.activa ? 'Sede Operativa Abierta' : 'Sede Temporalmente Cerrada'}
                  </span>
                  <button
                    onClick={openEditAgencyModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition shadow-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Modificar Horarios y Operación</span>
                  </button>
                </div>
              </div>

              {/* Grid Informativo de la Agencia */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tarjeta de Ventanillas */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">{ventanillasList.length}</div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ventanillas Físicas</div>
                  <div className="text-xs text-slate-500 font-medium">
                    {ventanillasList.filter((v) => v.activa).length} ventanillas activas para atención hoy.
                  </div>
                  <button
                    onClick={() => setActiveTab('ventanillas')}
                    className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 pt-2"
                  >
                    <span>Administrar Ventanillas</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tarjeta de Horario de Atención */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    {agencyDetails.horaApertura} - {agencyDetails.horaCierre}
                  </div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Jornada de Atención</div>
                  <div className="text-xs text-slate-500 font-medium">
                    Refrigerio programado: <strong>{agencyDetails.horaInicioAlmuerzo} - {agencyDetails.horaFinAlmuerzo}</strong>
                  </div>
                  <div className="text-xs font-bold text-slate-600 pt-2">
                    Lunes a Viernes (Días hábiles bancarios)
                  </div>
                </div>

                {/* Tarjeta de Personal Asignado */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">{staffList.length}</div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Agentes Registrados</div>
                  <div className="text-xs text-slate-500 font-medium">
                    Colaboradores asignados exclusivamente a esta sede.
                  </div>
                  <button
                    onClick={() => setActiveTab('personal')}
                    className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 pt-2"
                  >
                    <span>Ver Equipo de Agentes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Ficha Institucional y Teléfonos */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-red-600" />
                  <span>Datos Institucionales y Contacto</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Departamento</div>
                    <div className="font-extrabold text-slate-800 text-sm mt-0.5">{agencyDetails.departamento}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Provincia</div>
                    <div className="font-extrabold text-slate-800 text-sm mt-0.5">{agencyDetails.provincia}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Distrito</div>
                    <div className="font-extrabold text-slate-800 text-sm mt-0.5">{agencyDetails.distrito}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Teléfono de Central</div>
                    <div className="font-extrabold text-slate-800 text-sm mt-0.5">{agencyDetails.telefono || 'Sin teléfono'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 2: VENTANILLAS Y TURNOS
             ========================================================================= */}
          {activeTab === 'ventanillas' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Gestión Operativa de Ventanillas</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Habilita o inhabilita ventanillas en tiempo real y asigna a los agentes en turno para {agencyName}.
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  Total Ventanillas: <strong>{ventanillasList.length}</strong>
                </div>
              </div>

              {isLoadingVentanillas ? (
                <div className="p-12 text-center text-xs font-bold text-slate-400">
                  <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Cargando estado de ventanillas...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ventanillasList.map((v) => (
                    <div
                      key={v.id_ventanilla}
                      className={`bg-white rounded-2xl border p-5 shadow-sm transition space-y-4 ${
                        v.activa ? 'border-slate-200' : 'border-red-200 bg-red-50/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                              v.activa ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {v.numero_ventanilla}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900">Ventanilla {v.numero_ventanilla}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">{agencyName}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleVentanilla(v)}
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition ${
                            v.activa
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {v.activa ? 'Activa' : 'Inactiva'}
                        </button>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Agente Asignado en Turno:
                        </div>
                        {v.assigned_to_name ? (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-800">{v.assigned_to_name}</span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              En Operación
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-amber-600">Sin agente asignado</div>
                        )}

                        <div className="pt-2 border-t border-slate-200">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Reasignar a otro agente:
                          </label>
                          <select
                            value={v.assigned_to_id || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignAgentToWindow(v.id_ventanilla, e.target.value);
                              }
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-red-600"
                          >
                            <option value="">Seleccionar agente...</option>
                            {staffList.map((st) => (
                              <option key={st.id_usuario} value={st.id_usuario}>
                                {st.nombre_completo} ({st.dni})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 3: PERSONAL DE SEDE (AGENTES)
             ========================================================================= */}
          {activeTab === 'personal' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Agentes de Ventanilla en {agencyName}</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Registra y administra los colaboradores operativos autorizados para atender en tu sucursal.
                  </p>
                </div>
                <button
                  onClick={openNewStaffModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Agente</span>
                </button>
              </div>

              {/* Filtros de Personal */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchStaff}
                    onChange={(e) => setSearchStaff(e.target.value)}
                    placeholder="Buscar por DNI o nombres..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-500">Estado:</span>
                  <select
                    value={filterStaffStatus}
                    onChange={(e) => setFilterStaffStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Solo Activos</option>
                    <option value="inactivo">Solo Inactivos</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Agentes */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">DNI</th>
                      <th className="py-3 px-4">Agente de Ventanilla</th>
                      <th className="py-3 px-4">Correo Institucional</th>
                      <th className="py-3 px-4">Teléfono</th>
                      <th className="py-3 px-4">Ventanilla Actual</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {staffList
                      .filter((s) => {
                        const term = searchStaff.toLowerCase().trim();
                        const match = s.nombre_completo.toLowerCase().includes(term) || s.dni.includes(term) || s.correo.toLowerCase().includes(term);
                        if (!match) return false;
                        if (filterStaffStatus !== 'todos') {
                          const isAct = filterStaffStatus === 'activo';
                          if (s.activo !== isAct) return false;
                        }
                        return true;
                      })
                      .map((s) => (
                        <tr key={s.id_usuario} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.dni}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">{s.nombre_completo}</td>
                          <td className="py-3.5 px-4 text-slate-600">{s.correo}</td>
                          <td className="py-3.5 px-4 text-slate-600">{s.telefono || '-'}</td>
                          <td className="py-3.5 px-4">
                            {s.numero_ventanilla ? (
                              <span className="px-2.5 py-1 bg-red-50 text-red-700 font-bold rounded-lg border border-red-200 text-[11px]">
                                Ventanilla {s.numero_ventanilla}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">Sin asignar</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                s.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {s.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => openEditStaffModal(s)}
                              title="Editar agente"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStaffStatus(s)}
                              title={s.activo ? 'Inhabilitar agente' : 'Reactivar agente'}
                              className={`p-1.5 rounded-lg transition ${
                                s.activo ? 'text-slate-500 hover:text-red-600 hover:bg-red-50' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {s.activo ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 4: TRÁMITES HABILITADOS EN SEDE
             ========================================================================= */}
          {activeTab === 'tramites' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Disponibilidad de Trámites en Sede</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Activa o desactiva qué trámites oficiales del Banco de la Nación se atienden en {agencyName}.
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  {enabledTramiteIds.length} trámites activos en tu sucursal
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tramitesList.map((tr) => {
                  const isEnabled = enabledTramiteIds.includes(tr.id_tramite);
                  return (
                    <div
                      key={tr.id_tramite}
                      className={`p-5 rounded-2xl border transition shadow-sm flex items-center justify-between gap-4 ${
                        isEnabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-70'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-black text-slate-900">{tr.nombre_tramite}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{tr.descripcion || 'Trámite oficial BN'}</div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {tr.duracion_minutos || 15} minutos
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-400" />
                            {tr.requisitos ? tr.requisitos.length : 0} requisitos
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleTramiteInAgency(tr.id_tramite)}
                        disabled={isSavingTramiteSetting}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
                          isEnabled
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        {isEnabled ? 'Habilitado' : 'Pausado'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 5: CLIENTES EN SEDE
             ========================================================================= */}
          {activeTab === 'clientes' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Padrón de Clientes en Sede</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Consulta el historial de citas y expedientes de los ciudadanos que acuden a {agencyName}.
                  </p>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchClients}
                    onChange={(e) => setSearchClients(e.target.value)}
                    placeholder="Buscar cliente por DNI o nombres..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">DNI</th>
                      <th className="py-3 px-4">Ciudadano</th>
                      <th className="py-3 px-4">Correo</th>
                      <th className="py-3 px-4">Teléfono</th>
                      <th className="py-3 px-4 text-center">Citas Atendidas</th>
                      <th className="py-3 px-4 text-center">Pendientes</th>
                      <th className="py-3 px-4 text-right">Expediente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {clientsList
                      .filter((c) => {
                        const term = searchClients.toLowerCase().trim();
                        return c.nombre_completo.toLowerCase().includes(term) || c.dni.includes(term) || c.correo.toLowerCase().includes(term);
                      })
                      .map((cli) => (
                        <tr key={cli.id_usuario} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{cli.dni}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">{cli.nombre_completo}</td>
                          <td className="py-3.5 px-4 text-slate-600">{cli.correo}</td>
                          <td className="py-3.5 px-4 text-slate-600">{cli.telefono || '-'}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              {cli.citas_atendidas}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                              {cli.citas_pendientes}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleViewClientHistory(cli)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-red-600" />
                              <span>Ver Historial</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              PESTAÑA 6: REPORTES DE AGENCIA (CON GRÁFICOS Y PRINT)
             ========================================================================= */}
          {activeTab === 'reportes' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* Header de Reporte */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Reporte Operativo de Sucursal</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Métricas de atención, efectividad de ventanillas y afluencia exclusivamente para <strong>{agencyName}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition shadow-sm shrink-0"
                >
                  <Printer className="w-4 h-4" />
                  <span>IMPRIMIR REPORTE OFICIAL</span>
                </button>
              </div>

              {/* Filtros de Reportes (Con Sede Bloqueada) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Rango Temporal
                  </label>
                  <select
                    value={reporteRango}
                    onChange={(e) => setReporteRango(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-600"
                  >
                    <option value="hoy">Hoy</option>
                    <option value="semana">Esta Semana</option>
                    <option value="mes">Este Mes</option>
                    <option value="historico">Histórico Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Sede Operativa (Fija)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={agencyName}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Filtro por Estado
                  </label>
                  <select
                    value={reporteEstado}
                    onChange={(e) => setReporteEstado(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-600"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="Terminado">Terminados</option>
                    <option value="En Espera">En Espera</option>
                    <option value="Cancelado">Cancelados</option>
                  </select>
                </div>
              </div>

              {/* Tarjetas de Métricas de la Sede */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Total Citas en Sede</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{reportStats.total}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Tasa de Éxito</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{reportStats.tasaExito}%</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Atendidas en Ventanilla</div>
                  <div className="text-2xl font-black text-blue-600 mt-1">{reportStats.terminados}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Canceladas / En Espera</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">{reportStats.cancelados + reportStats.pendientes}</div>
                </div>
              </div>

              {/* Panel de Gráficos de la Sede */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-red-600" />
                      <span>Análisis Gráfico de Operatividad</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Visualización de rendimiento de sucursal</p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setTipoGraficoReporte('estados')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        tipoGraficoReporte === 'estados' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Efectividad
                    </button>
                    <button
                      onClick={() => setTipoGraficoReporte('tramites')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        tipoGraficoReporte === 'tramites' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Trámites
                    </button>
                    <button
                      onClick={() => setTipoGraficoReporte('horarios')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        tipoGraficoReporte === 'horarios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Afluencia
                    </button>
                  </div>
                </div>

                {/* VISTA 1: DONUT SVG */}
                {tipoGraficoReporte === 'estados' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-44 h-44">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="48" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                          {terminadosLength > 0 && (
                            <circle
                              cx="60"
                              cy="60"
                              r="48"
                              fill="none"
                              stroke="#059669"
                              strokeWidth="16"
                              strokeDasharray={`${terminadosLength} ${donutCircumference}`}
                              strokeDashoffset={terminadosOffset}
                            />
                          )}
                          {pendientesLength > 0 && (
                            <circle
                              cx="60"
                              cy="60"
                              r="48"
                              fill="none"
                              stroke="#d97706"
                              strokeWidth="16"
                              strokeDasharray={`${pendientesLength} ${donutCircumference}`}
                              strokeDashoffset={pendientesOffset}
                            />
                          )}
                          {canceladosLength > 0 && (
                            <circle
                              cx="60"
                              cy="60"
                              r="48"
                              fill="none"
                              stroke="#dc2626"
                              strokeWidth="16"
                              strokeDasharray={`${canceladosLength} ${donutCircumference}`}
                              strokeDashoffset={canceladosOffset}
                            />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-black text-slate-900">{reportStats.tasaExito}%</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cumplimiento</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-600" />
                          <span className="font-bold text-slate-800">Citas Atendidas (Completadas)</span>
                        </div>
                        <span className="font-extrabold text-emerald-800">{reportStats.terminados} citas</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-500" />
                          <span className="font-bold text-slate-800">Citas en Espera / Ventanilla</span>
                        </div>
                        <span className="font-extrabold text-amber-800">{reportStats.pendientes} citas</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-600" />
                          <span className="font-bold text-slate-800">Citas Canceladas</span>
                        </div>
                        <span className="font-extrabold text-red-800">{reportStats.cancelados + reportStats.denegados} citas</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* VISTA 2: RANKING TRÁMITES */}
                {tipoGraficoReporte === 'tramites' && (
                  <div className="space-y-3 py-2">
                    {reportStats.tramitesRanking.map((tr, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>{tr.nombre}</span>
                          <span className="text-slate-900">{tr.count} citas ({tr.porcentaje}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-red-600 h-2.5 rounded-full" style={{ width: `${tr.porcentaje}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* VISTA 3: AFLUENCIA POR HORAS */}
                {tipoGraficoReporte === 'horarios' && (
                  <div className="space-y-3 py-2">
                    {reportStats.franjas.map((fr) => {
                      const perc = reportStats.total > 0 ? Math.round((fr.count / reportStats.total) * 100) : 0;
                      return (
                        <div key={fr.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>{fr.label}</span>
                            <span className="text-slate-900">{fr.count} citas ({perc}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: `${perc}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Padrón de Citas */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 text-xs font-black text-slate-900 uppercase tracking-wider">
                  Detalle de Citas Registradas en Sede
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Hora</th>
                      <th className="py-3 px-4">Ventanilla</th>
                      <th className="py-3 px-4">Trámite</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredReportes.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{rep.hora}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{rep.ventanilla}</td>
                        <td className="py-3.5 px-4 text-slate-800">{rep.tramite}</td>
                        <td className="py-3.5 px-4 text-slate-900 font-bold">{rep.cliente}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              rep.estado === 'Terminado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rep.estado === 'Cancelado'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rep.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          HOJA OFICIAL DE IMPRESIÓN EXCLUSIVA (PRINT ONLY)
         ========================================================================= */}
      <div className="hidden print:block bg-white text-slate-900 p-8 max-w-4xl mx-auto">
        <div className="border-b-2 border-red-600 pb-4 mb-6 flex justify-between items-start">
          <div>
            <div className="text-xl font-black text-red-700 tracking-tight">BANCO DE LA NACIÓN</div>
            <div className="text-xs font-bold text-slate-600">INFORME OPERATIVO DE AGENCIA</div>
            <div className="text-[11px] text-slate-500 mt-1">Sede: <strong>{agencyName}</strong></div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <div>Fecha de Emisión: <strong>{new Date().toLocaleDateString('es-PE')}</strong></div>
            <div>Hora: <strong>{new Date().toLocaleTimeString('es-PE')}</strong></div>
            <div>Supervisor: <strong>{operatorName}</strong></div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 p-4 bg-slate-100 rounded-lg text-xs font-bold mb-6">
          <div>Total Citas: <span className="text-slate-900">{reportStats.total}</span></div>
          <div>Efectividad: <span className="text-emerald-700">{reportStats.tasaExito}%</span></div>
          <div>Atendidas: <span className="text-blue-700">{reportStats.terminados}</span></div>
          <div>Canceladas: <span className="text-red-700">{reportStats.cancelados}</span></div>
        </div>

        <table className="w-full text-left border-collapse text-xs border border-slate-300">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-300 font-extrabold text-[10px]">
              <th className="p-2 border-r border-slate-300">Hora</th>
              <th className="p-2 border-r border-slate-300">Ventanilla</th>
              <th className="p-2 border-r border-slate-300">Trámite</th>
              <th className="p-2 border-r border-slate-300">Ciudadano</th>
              <th className="p-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredReportes.map((rep) => (
              <tr key={rep.id}>
                <td className="p-2 border-r border-slate-200 font-mono">{rep.hora}</td>
                <td className="p-2 border-r border-slate-200 font-bold">{rep.ventanilla}</td>
                <td className="p-2 border-r border-slate-200">{rep.tramite}</td>
                <td className="p-2 border-r border-slate-200">{rep.cliente}</td>
                <td className="p-2 text-center font-bold">{rep.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <div className="border-t border-slate-400 mx-8 pt-1">
              <strong>{operatorName}</strong>
              <div className="text-[10px] text-slate-500">Administrador de Agencia ({agencyName})</div>
            </div>
          </div>
          <div>
            <div className="border-t border-slate-400 mx-8 pt-1">
              <strong>V°B° Auditoría Operativa</strong>
              <div className="text-[10px] text-slate-500">Banco de la Nación</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: EDITAR HORARIOS Y OPERACIÓN DE SEDE
         ========================================================================= */}
      {modalEditAgencyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Configuración Operativa de {agencyName}</h3>
                <p className="text-xs text-slate-400 font-medium">Actualiza horario de atención y estado de la sucursal</p>
              </div>
              <button onClick={() => setModalEditAgencyOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgencySettings} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1 text-slate-600 uppercase text-[10px]">Teléfono de Central</label>
                <input
                  type="text"
                  value={agencyForm.telefono}
                  onChange={(e) => setAgencyForm({ ...agencyForm, telefono: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600 uppercase text-[10px]">Hora Apertura</label>
                  <input
                    type="time"
                    value={agencyForm.horaApertura}
                    onChange={(e) => setAgencyForm({ ...agencyForm, horaApertura: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-600 uppercase text-[10px]">Hora Cierre</label>
                  <input
                    type="time"
                    value={agencyForm.horaCierre}
                    onChange={(e) => setAgencyForm({ ...agencyForm, horaCierre: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600 uppercase text-[10px]">Inicio Refrigerio</label>
                  <input
                    type="time"
                    value={agencyForm.horaInicioAlmuerzo}
                    onChange={(e) => setAgencyForm({ ...agencyForm, horaInicioAlmuerzo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-600 uppercase text-[10px]">Fin Refrigerio</label>
                  <input
                    type="time"
                    value={agencyForm.horaFinAlmuerzo}
                    onChange={(e) => setAgencyForm({ ...agencyForm, horaFinAlmuerzo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-600 uppercase text-[10px]">Estado Operativo de Sucursal</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAgencyForm({ ...agencyForm, activa: true })}
                    className={`py-2 rounded-xl text-xs font-extrabold border transition ${
                      agencyForm.activa ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Operativa (Abierta)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgencyForm({ ...agencyForm, activa: false })}
                    className={`py-2 rounded-xl text-xs font-extrabold border transition ${
                      !agencyForm.activa ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Cerrada Temporalmente
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEditAgencyOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAgency}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {isSavingAgency ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REGISTRAR / EDITAR AGENTE DE SEDE
         ========================================================================= */}
      {modalStaffOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingStaff ? 'Modificar Agente de Ventanilla' : 'Registrar Nuevo Agente'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">Sede Operativa: {agencyName}</p>
              </div>
              <button onClick={() => setModalStaffOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600 uppercase text-[10px]">DNI (8 dígitos)</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    disabled={!!editingStaff}
                    value={staffForm.dni}
                    onChange={(e) => setStaffForm({ ...staffForm, dni: e.target.value.replace(/\D/g, '') })}
                    placeholder="76929984"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-600 uppercase text-[10px]">Teléfono</label>
                  <input
                    type="text"
                    value={staffForm.telefono}
                    onChange={(e) => setStaffForm({ ...staffForm, telefono: e.target.value })}
                    placeholder="987654321"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600 uppercase text-[10px]">Nombres</label>
                  <input
                    type="text"
                    required
                    value={staffForm.nombres}
                    onChange={(e) => setStaffForm({ ...staffForm, nombres: e.target.value })}
                    placeholder="Juan Carlos"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-600 uppercase text-[10px]">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={staffForm.apellidos}
                    onChange={(e) => setStaffForm({ ...staffForm, apellidos: e.target.value })}
                    placeholder="Pérez Gómez"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-600 uppercase text-[10px]">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={staffForm.correo}
                  onChange={(e) => setStaffForm({ ...staffForm, correo: e.target.value })}
                  placeholder="agente.cusco@banco.gob.pe"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-600 uppercase text-[10px]">Asignación de Ventanilla en {agencyName}</label>
                <select
                  value={staffForm.id_ventanilla || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, id_ventanilla: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-red-600"
                >
                  <option value="">Sin ventanilla asignada</option>
                  {ventanillasList.map((v) => (
                    <option key={v.id_ventanilla} value={v.id_ventanilla}>
                      Ventanilla {v.numero_ventanilla} {v.assigned_to_name ? `(Actualmente: ${v.assigned_to_name})` : '(Libre)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalStaffOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {isSavingStaff ? 'Guardando...' : editingStaff ? 'Actualizar Agente' : 'Crear Agente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EXPEDIENTE / HISTORIAL DE CITAS DE CLIENTE
         ========================================================================= */}
      {modalClientHistoryOpen && selectedClientForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Expediente de Citas: {selectedClientForHistory.nombre_completo}
                </h3>
                <p className="text-xs text-slate-400 font-medium">DNI: {selectedClientForHistory.dni}</p>
              </div>
              <button onClick={() => setModalClientHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Consultando citas en base de datos remota...
              </div>
            ) : clientAppointmentsHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl border border-slate-200">
                Este ciudadano no registra citas previas en el sistema.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2.5">
                {clientAppointmentsHistory.map((cita) => (
                  <div key={cita.id_cita} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-extrabold text-slate-900">{cita.tramite_nombre}</div>
                      <div className="text-slate-500 font-medium text-[11px]">
                        {cita.fecha} &bull; {cita.hora_inicio?.substring(0, 5)} - {cita.hora_fin?.substring(0, 5)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                        {cita.agencia_nombre} &bull; {cita.numero_ventanilla}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        cita.estado_cita === 'atendida'
                          ? 'bg-emerald-100 text-emerald-800'
                          : cita.estado_cita === 'cancelada'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {cita.estado_cita}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setModalClientHistoryOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
