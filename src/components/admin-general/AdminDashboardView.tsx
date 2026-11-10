'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogoBancoNacion } from '@/components/LogoBancoNacion';
import {
  HomeIcon,
  FileTextIcon,
  UsersIcon,
  FileBarChartIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  PrinterIcon,
  LogOutIcon,
  BuildingIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@/components/Icons';
import {
  ShieldCheck,
  Building2,
  UserCheck,
  Landmark,
  Lock,
  CheckCircle2,
  AlertTriangle,
  X,
  Check,
  Users,
  UserPlus,
  Calendar,
  Ban,
  Phone,
  Mail,
  FileClock,
  Eye,
  PieChart,
  BarChart2,
  TrendingUp,
  Printer,
} from 'lucide-react';
import { SupabaseAgencyRepository } from '@/infrastructure/repositories/supabase-agency-repository';
import { SupabaseProcedureRepository } from '@/infrastructure/repositories/supabase-procedure-repository';
import { SupabaseUserRepository } from '@/infrastructure/repositories/supabase-user-repository';
import { StaffMember, ClientMember } from '@/domain/entities/user';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client';
import { PERU_UBIGEO } from '@/data/peru-locations';

const AgencyLocationPicker = dynamic(() => import('@/components/AgencyLocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-56 bg-slate-100 animate-pulse rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 font-bold text-xs gap-2">
      <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      <span>Cargando mapa interactivo...</span>
    </div>
  ),
});

export type AdminTab = 'agencias' | 'tramites' | 'personal' | 'clientes' | 'reportes';

interface AdminDashboardViewProps {
  forcedRole?: 'ADMIN_GENERAL' | 'ADMIN_AGENCIA';
  showAdminNoticeProp?: boolean;
}

export function AdminDashboardView({ forcedRole = 'ADMIN_GENERAL', showAdminNoticeProp = false }: AdminDashboardViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('agencias');
  const [showAdminNotice, setShowAdminNotice] = useState(showAdminNoticeProp);
  const [operatorName, setOperatorName] = useState('Leonardo Cruz');
  const [operatorLocation, setOperatorLocation] = useState('Sede Central - Lima');
  const [userRole, setUserRole] = useState<'ADMIN_GENERAL' | 'ADMIN_AGENCIA'>(forcedRole);

  // Estados de Búsqueda y Filtros
  const [searchAgencias, setSearchAgencias] = useState('');
  const [filterEstadoAgencias, setFilterEstadoAgencias] = useState('todos');
  const [filterRegionAgencias, setFilterRegionAgencias] = useState('todos');

  const [searchTramites, setSearchTramites] = useState('');
  const [filterEstadoTramites, setFilterEstadoTramites] = useState('todos');

  const [searchPersonal, setSearchPersonal] = useState('');
  const [filterEstadoPersonal, setFilterEstadoPersonal] = useState('todos');

  const [reporteFecha, setReporteFecha] = useState('hoy');
  const [reporteAgencia, setReporteAgencia] = useState('todas');
  const [reporteEstado, setReporteEstado] = useState('todos');
  const [tipoGraficoReporte, setTipoGraficoReporte] = useState<'estados' | 'tramites' | 'horarios'>('estados');

  // Modales CRUD
  const [modalAgenciaOpen, setModalAgenciaOpen] = useState(false);
  const [modalTramiteOpen, setModalTramiteOpen] = useState(false);
  const [modalPersonalOpen, setModalPersonalOpen] = useState(false);
  const [modalReporteDetalleOpen, setModalReporteDetalleOpen] = useState(false);
  const [selectedReporteItem, setSelectedReporteItem] = useState<any>(null);

  // Data para CRUD Agencias
  const [agenciasList, setAgenciasList] = useState<any[]>([
    { id: 1, nombre: 'Agencia Sur', lugar: 'San Jeronimo', direccion: 'Av. Manco Cápac 123', departamento: 'Cusco', provincia: 'Cusco', distrito: 'San Jeronimo', ventanillas: 2, estado: 'Activo', latitud: -13.535, longitud: -71.91 },
    { id: 2, nombre: 'Agencia Central Principal', lugar: 'Cercado de Lima', direccion: 'Jr. Lampa 450', departamento: 'Lima', provincia: 'Lima', distrito: 'Cercado de Lima', ventanillas: 6, estado: 'Activo', latitud: -12.046, longitud: -77.03 },
    { id: 3, nombre: 'Agencia San Isidro Financiera', lugar: 'San Isidro', direccion: 'Av. Rivera Navarrete 525', departamento: 'Lima', provincia: 'Lima', distrito: 'San Isidro', ventanillas: 4, estado: 'Activo', latitud: -12.095, longitud: -77.032 },
    { id: 4, nombre: 'Agencia Miraflores Pardo', lugar: 'Miraflores', direccion: 'Av. José Pardo 450', departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores', ventanillas: 3, estado: 'Activo', latitud: -12.121, longitud: -77.03 },
    { id: 5, nombre: 'Agencia Callao Puerto', lugar: 'Callao', direccion: 'Av. Sáenz Peña 320', departamento: 'Callao', provincia: 'Callao', distrito: 'Callao', ventanillas: 2, estado: 'Inactivo', latitud: -12.06, longitud: -77.14 },
  ]);
  const [editingAgencia, setEditingAgencia] = useState<any>(null);
  const [agenciaModalTab, setAgenciaModalTab] = useState<'datos' | 'horario' | 'tramites'>('datos');
  const [isSavingAgencia, setIsSavingAgencia] = useState(false);
  const [canSubmitAgencia, setCanSubmitAgencia] = useState(false);

  // Evitar envío involuntario o rebote de doble clic al entrar al paso 3 (Trámites)
  useEffect(() => {
    if (agenciaModalTab === 'tramites') {
      setCanSubmitAgencia(false);
      const timer = setTimeout(() => {
        setCanSubmitAgencia(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCanSubmitAgencia(false);
    }
  }, [agenciaModalTab]);

  const [agenciaForm, setAgenciaForm] = useState({
    nombre: '',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'Cercado de Lima',
    direccion: '',
    telefono: '',
    latitud: -12.046374,
    longitud: -77.042793,
    ventanillas: 2,
    estado: 'Activo',
    diasSemana: [1, 2, 3, 4, 5], // Lunes a Viernes
    horaApertura: '08:30',
    horaCierre: '17:30',
    horaInicioAlmuerzo: '13:00',
    horaFinAlmuerzo: '14:00',
    tramitesSeleccionados: [] as number[],
  });

  // Provincias disponibles según el departamento seleccionado en el formulario
  const availableProvincias = useMemo(() => {
    const dep = PERU_UBIGEO.find((d) => d.nombre === agenciaForm.departamento);
    return dep ? dep.provincias : [];
  }, [agenciaForm.departamento]);

  // Distritos disponibles según la provincia seleccionada en el formulario
  const availableDistritos = useMemo(() => {
    const prov = availableProvincias.find((p) => p.nombre === agenciaForm.provincia);
    return prov ? prov.distritos : [];
  }, [availableProvincias, agenciaForm.provincia]);

  interface TramiteItem {
    id: number;
    nombre: string;
    descripcion?: string;
    duracion_minutos?: number;
    requisitos: number;
    requisitosDetalle?: any[];
    fecha?: string;
    estado: string;
  }

  // Data para CRUD Trámites (Fiel a Maqueta 2)
  const [tramitesList, setTramitesList] = useState<TramiteItem[]>([
    { id: 1, nombre: 'Apertura de Cuentas de Ahorros', descripcion: 'Apertura de cuentas corrientes y de ahorros', duracion_minutos: 20, requisitos: 5, fecha: '31-08-2026', estado: 'Activo' },
    { id: 2, nombre: 'Bloqueo y Reposición de Tarjeta Multired', descripcion: 'Emisión y reposición de tarjeta de débito', duracion_minutos: 15, requisitos: 3, fecha: '28-08-2026', estado: 'Activo' },
    { id: 3, nombre: 'Pago de Tasas y Tributos MTC / Reniec', descripcion: 'Cobro de tasas y aranceles públicos', duracion_minutos: 15, requisitos: 2, fecha: '15-08-2026', estado: 'Activo' },
    { id: 4, nombre: 'Crédito Multired y Préstamos Personales', descripcion: 'Evaluación y desembolso de préstamos', duracion_minutos: 30, requisitos: 6, fecha: '10-08-2026', estado: 'Activo' },
    { id: 5, nombre: 'Actualización de Datos de Titular', descripcion: 'Actualización de dirección, firma y contacto', duracion_minutos: 15, requisitos: 4, fecha: '01-08-2026', estado: 'Inactivo' },
  ]);
  const [editingTramite, setEditingTramite] = useState<any>(null);
  const [tramiteModalTab, setTramiteModalTab] = useState<'datos' | 'requisitos'>('datos');
  const [isSavingTramite, setIsSavingTramite] = useState(false);
  const [tramiteForm, setTramiteForm] = useState<{
    nombre: string;
    descripcion: string;
    duracionMinutos: number;
    estado: string;
    requisitos: Array<{ id_requisito?: number; descripcion_requisito: string; es_obligatorio: boolean }>;
  }>({
    nombre: '',
    descripcion: '',
    duracionMinutos: 15,
    estado: 'Activo',
    requisitos: [],
  });

  // Data para CRUD Personal y Accesos
  const [personalList, setPersonalList] = useState<StaffMember[]>([
    {
      id_usuario: 'a0000000-0000-0000-0000-000000000001',
      dni: '76929984',
      nombres: 'Jose Leonardo',
      apellidos: 'Cruz Gonzales',
      nombre_completo: 'Jose Leonardo Cruz Gonzales',
      correo: '76929984@continental.edu.pe',
      telefono: '987654321',
      id_rol: 4,
      rol_nombre: 'Administrador General',
      rol: 'ADMIN_GENERAL',
      id_agencia: null,
      agencia_nombre: 'Sede Central (Global)',
      id_ventanilla: null,
      numero_ventanilla: null,
      activo: true,
    },
    {
      id_usuario: 'a0000000-0000-0000-0000-000000000002',
      dni: '12345678',
      nombres: 'Juan',
      apellidos: 'Perez Agente',
      nombre_completo: 'Juan Perez Agente',
      correo: 'agente.cusco@banco.gob.pe',
      telefono: '912345678',
      id_rol: 2,
      rol_nombre: 'Agente Ventanilla',
      rol: 'AGENTE',
      id_agencia: 1,
      agencia_nombre: 'Agencia Cusco Central',
      id_ventanilla: 1,
      numero_ventanilla: 'V-01',
      activo: true,
    },
  ]);
  const [editingPersonal, setEditingPersonal] = useState<StaffMember | null>(null);
  const [personalModalTab, setPersonalModalTab] = useState<'datos' | 'sede'>('datos');
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [availableWindowsForPersonal, setAvailableWindowsForPersonal] = useState<
    Array<{
      id_ventanilla: number;
      numero_ventanilla: string;
      is_occupied: boolean;
      assigned_to_name?: string | null;
    }>
  >([]);
  const [agencySearchTerm, setAgencySearchTerm] = useState('');
  const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);
  const [filterRolPersonal, setFilterRolPersonal] = useState<string>('todos');
  const [personalForm, setPersonalForm] = useState<{
    dni: string;
    nombres: string;
    apellidos: string;
    correo: string;
    telefono: string;
    id_rol: number;
    id_agencia: number | null;
    id_ventanilla: number | null;
    activo: boolean;
  }>({
    dni: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    id_rol: 2,
    id_agencia: null,
    id_ventanilla: null,
    activo: true,
  });

  // Estados para Clientes / Ciudadanos (Rol 1)
  const [clientsList, setClientsList] = useState<ClientMember[]>([
    {
      id_usuario: 'cli-1',
      dni: '45892134',
      nombres: 'María Elena',
      apellidos: 'Torres Quispe',
      nombre_completo: 'María Elena Torres Quispe',
      correo: 'maria.torres@gmail.com',
      telefono: '984512345',
      activo: true,
      total_citas: 3,
      citas_pendientes: 1,
      citas_atendidas: 2,
    },
    {
      id_usuario: 'cli-2',
      dni: '71239845',
      nombres: 'Carlos Alberto',
      apellidos: 'Mendoza Rivas',
      nombre_completo: 'Carlos Alberto Mendoza Rivas',
      correo: 'carlos.mendoza@outlook.com',
      telefono: '971234567',
      activo: true,
      total_citas: 2,
      citas_pendientes: 0,
      citas_atendidas: 2,
    },
    {
      id_usuario: 'cli-3',
      dni: '09876543',
      nombres: 'Rosaura',
      apellidos: 'Pérez Del Solar',
      nombre_completo: 'Rosaura Pérez Del Solar',
      correo: 'rosaura.perez@yahoo.com',
      telefono: '912345678',
      activo: false,
      total_citas: 1,
      citas_pendientes: 0,
      citas_atendidas: 0,
    },
  ]);
  const [searchClients, setSearchClients] = useState('');
  const [filterEstadoClients, setFilterEstadoClients] = useState('todos');
  const [modalClientOpen, setModalClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientMember | null>(null);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [clientForm, setClientForm] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    activo: true,
  });

  // Modal de Expediente / Historial de Citas del Cliente
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<ClientMember | null>(null);
  const [modalClientHistoryOpen, setModalClientHistoryOpen] = useState(false);
  const [clientAppointmentsHistory, setClientAppointmentsHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Data de Reportes (Fiel a Maqueta 4)
  const [reportesList, setReportesList] = useState<any[]>([
    { id: 1, hora: '08:45', estado: 'Terminado', cliente: 'Sofía Ramírez', tramite: 'Bloqueo y Reposición de Tarjeta', agencia: 'Agencia Sur', ventanilla: 'Ventanilla 1', atendidoPor: 'Jose Leonardo Cruz' },
    { id: 2, hora: '09:15', estado: 'Terminado', cliente: 'Pedro Sánchez', tramite: 'Apertura de Cuentas de Ahorros', agencia: 'Agencia Sur', ventanilla: 'Ventanilla 2', atendidoPor: 'Jose Leonardo Cruz' },
    { id: 3, hora: '09:40', estado: 'Cancelado', cliente: 'Marcos Villegas', tramite: 'Pago de Tasas y Tributos', agencia: 'Agencia San Isidro Financiera', ventanilla: 'Ventanilla 1', atendidoPor: 'Patricia Ramos' },
    { id: 4, hora: '10:10', estado: 'Terminado', cliente: 'Lucía Flores', tramite: 'Crédito Multired y Préstamos', agencia: 'Agencia Central Principal', ventanilla: 'Ventanilla 3', atendidoPor: 'Ana Valdivia' },
    { id: 5, hora: '10:45', estado: 'Terminado', cliente: 'Diego Morales', tramite: 'Transferencia Internacional', agencia: 'Agencia Sur', ventanilla: 'Ventanilla 1', atendidoPor: 'Jose Leonardo Cruz' },
    { id: 6, hora: '11:15', estado: 'Terminado', cliente: 'Elena Castro', tramite: 'Actualización de Datos', agencia: 'Agencia San Isidro Financiera', ventanilla: 'Ventanilla 2', atendidoPor: 'Patricia Ramos' },
    { id: 7, hora: '11:30', estado: 'Denegado', cliente: 'Mario Barnechea', tramite: 'Crédito Multired y Préstamos', agencia: 'Agencia Central Principal', ventanilla: 'Ventanilla 4', atendidoPor: 'Ana Valdivia' },
    { id: 8, hora: '12:00', estado: 'Terminado', cliente: 'Valeria Ruiz', tramite: 'Bloqueo y Reposición de Tarjeta', agencia: 'Agencia Central Principal', ventanilla: 'Ventanilla 1', atendidoPor: 'Ana Valdivia' },
    { id: 9, hora: '12:30', estado: 'Terminado', cliente: 'Jorge Carranza', tramite: 'Apertura de Cuentas de Ahorros', agencia: 'Agencia Miraflores Pardo', ventanilla: 'Ventanilla 2', atendidoPor: 'Carlos Huamán' },
    { id: 10, hora: '13:15', estado: 'Terminado', cliente: 'Beatriz Salazar', tramite: 'Pago de Tasas y Tributos', agencia: 'Agencia Sur', ventanilla: 'Ventanilla 1', atendidoPor: 'Jose Leonardo Cruz' },
    { id: 11, hora: '14:20', estado: 'Terminado', cliente: 'Raúl Mendoza', tramite: 'Bloqueo y Reposición de Tarjeta', agencia: 'Agencia Central Principal', ventanilla: 'Ventanilla 2', atendidoPor: 'Ana Valdivia' },
    { id: 12, hora: '15:00', estado: 'Cancelado', cliente: 'Carmen Ortiz', tramite: 'Apertura de Cuentas de Ahorros', agencia: 'Agencia San Isidro Financiera', ventanilla: 'Ventanilla 3', atendidoPor: 'Patricia Ramos' },
    { id: 13, hora: '15:45', estado: 'Terminado', cliente: 'Alejandro Paz', tramite: 'Crédito Multired y Préstamos', agencia: 'Agencia Sur', ventanilla: 'Ventanilla 2', atendidoPor: 'Jose Leonardo Cruz' },
    { id: 14, hora: '16:30', estado: 'Terminado', cliente: 'Rosaura Delgado', tramite: 'Actualización de Datos', agencia: 'Agencia Miraflores Pardo', ventanilla: 'Ventanilla 1', atendidoPor: 'Carlos Huamán' },
  ]);

  // Cargar sesión del almacenamiento local si existe
  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem('bn_user_session');
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (parsed.nombre) setOperatorName(parsed.nombre);
        if (parsed.role) {
          const roleNormalized = String(parsed.role).toUpperCase();
          if (roleNormalized === 'ADMIN_AGENCIA') {
            setUserRole('ADMIN_AGENCIA');
            setOperatorLocation('Agencia Sur (Asignada)');
            setReporteAgencia('Sur');
          } else {
            setUserRole('ADMIN_GENERAL');
          }
        }
      }
    } catch {
      // Usar valores institucionales seguros
    }
  }, []);

  // Cargar agencias y trámites en vivo de Supabase si están disponibles
  useEffect(() => {
    async function loadLiveSupabaseData() {
      try {
        const agencyRepo = new SupabaseAgencyRepository();
        const liveAgencies = await agencyRepo.getAgencies(undefined, undefined, true);
        if (liveAgencies && liveAgencies.length > 0) {
          setAgenciasList(
            liveAgencies.map((a) => ({
              id: a.id_agencia,
              nombre: a.nombre_agencia,
              direccion: a.direccion,
              distrito: a.distrito,
              provincia: a.provincia,
              departamento: a.departamento,
              telefono: a.telefono,
              lugar: `${a.distrito}${a.provincia ? ', ' + a.provincia : ''}`,
              ventanillas: a.total_ventanillas || 1,
              estado: a.activa ? 'Activo' : 'Inactivo',
              latitud: a.latitud,
              longitud: a.longitud,
            }))
          );
        }

        const procedureRepo = new SupabaseProcedureRepository();
        const liveProcedures = await procedureRepo.getProcedures('', true);
        if (liveProcedures && liveProcedures.length > 0) {
          setTramitesList(
            liveProcedures.map((p) => ({
              id: p.id_tramite,
              nombre: p.nombre_tramite,
              descripcion: p.descripcion || '',
              duracion_minutos: p.duracion_minutos || 15,
              requisitos: p.requisitos ? p.requisitos.length : 0,
              requisitosDetalle: p.requisitos || [],
              fecha: '2026-09-28',
              estado: p.activo ? 'Activo' : 'Inactivo',
            }))
          );
        }

        const userRepo = new SupabaseUserRepository();
        const liveStaff = await userRepo.getStaffMembers();
        if (liveStaff && liveStaff.length > 0) {
          setPersonalList(liveStaff);
        }

        const liveClients = await userRepo.getClientMembers();
        if (liveClients && liveClients.length > 0) {
          setClientsList(liveClients);
        }

        // Cargar citas reales de Supabase para Reportes
        const supabase = createSupabaseBrowserClient();
        const { data: remoteCitas } = await supabase
          .from('cita')
          .select(`
            id_cita,
            codigo_cita,
            fecha,
            hora_inicio,
            hora_fin,
            estado_cita,
            usuario:id_usuario ( nombres, apellidos ),
            tramite:id_tramite ( nombre_tramite ),
            ventanilla:id_ventanilla (
              numero_ventanilla,
              agencia:id_agencia ( nombre_agencia )
            )
          `)
          .order('fecha', { ascending: false });

        if (remoteCitas && remoteCitas.length > 0) {
          const mappedReportes = remoteCitas.map((c: any, index: number) => {
            const clienteName = c.usuario
              ? `${c.usuario.nombres || ''} ${c.usuario.apellidos || ''}`.trim()
              : 'Ciudadano';

            const estadoFormateado =
              c.estado_cita === 'atendida'
                ? 'Terminado'
                : c.estado_cita === 'cancelada'
                ? 'Cancelado'
                : c.estado_cita === 'denegada'
                ? 'Denegado'
                : 'En Espera';

            const horaDisplay = c.hora_inicio ? c.hora_inicio.substring(0, 5) : '09:00';
            const rawVentanilla = c.ventanilla?.numero_ventanilla || 'V-01';
            const ventanillaLabel = rawVentanilla.startsWith('V-')
              ? `Ventanilla ${parseInt(rawVentanilla.substring(2), 10) || rawVentanilla.substring(2)}`
              : `Ventanilla ${rawVentanilla}`;
            const agenciaName = c.ventanilla?.agencia?.nombre_agencia || 'Agencia Cusco Central';

            return {
              id: index + 1,
              hora: horaDisplay,
              estado: estadoFormateado,
              cliente: clienteName,
              tramite: c.tramite?.nombre_tramite || 'Trámite Bancario',
              agencia: agenciaName,
              ventanilla: ventanillaLabel,
              atendidoPor: 'Agente Ventanilla',
            };
          });
          setReportesList(mappedReportes);
        }
      } catch (err) {
        console.log('Utilizando registros institucionales para el panel:', err);
      }
    }

    loadLiveSupabaseData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('bn_user_session');
    window.dispatchEvent(new Event('bn_session_change'));
    router.push('/');
  };

  // Apertura granular de modal para editar: Datos Generales, Horario/Ventanillas o Trámites
  const openEditAgencia = async (ag: any, tab: 'datos' | 'horario' | 'tramites' = 'datos') => {
    setEditingAgencia(ag);
    setAgenciaModalTab(tab);
    setAgenciaForm({
      nombre: ag.nombre,
      departamento: ag.departamento || 'Lima',
      provincia: ag.provincia || 'Lima',
      distrito: ag.distrito || ag.lugar || 'Cercado de Lima',
      direccion: ag.direccion || ag.lugar || '',
      telefono: ag.telefono || '',
      latitud: ag.latitud || -12.046374,
      longitud: ag.longitud || -77.042793,
      ventanillas: ag.ventanillas || 1,
      estado: ag.estado || 'Activo',
      diasSemana: [1, 2, 3, 4, 5],
      horaApertura: '08:30',
      horaCierre: '17:30',
      horaInicioAlmuerzo: '13:00',
      horaFinAlmuerzo: '14:00',
      tramitesSeleccionados: [],
    });
    setModalAgenciaOpen(true);

    try {
      const agencyRepo = new SupabaseAgencyRepository();
      const details = await agencyRepo.getAgencyFullDetails(ag.id);
      setAgenciaForm((prev) => ({
        ...prev,
        ventanillas: details.ventanillasCount,
        diasSemana: details.diasSemana,
        horaApertura: details.horaApertura,
        horaCierre: details.horaCierre,
        horaInicioAlmuerzo: details.horaInicioAlmuerzo,
        horaFinAlmuerzo: details.horaFinAlmuerzo,
        tramitesSeleccionados: details.tramitesSeleccionados,
      }));
    } catch (err) {
      console.warn('Aviso: Cargando datos locales para edición de la agencia:', err);
    }
  };

  // CRUD Handlers: Agencias conectados a Supabase
  const handleSaveAgencia = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Si no es edición y aún no estamos en la pestaña 3 ('tramites'), bloquear el guardado
    if (!editingAgencia && agenciaModalTab !== 'tramites') {
      return;
    }

    // 2. Proteger contra rebote de ratón o doble clic involuntario al pasar de paso 2 a 3
    if (!editingAgencia && !canSubmitAgencia) {
      return;
    }

    // 3. Exigir selección de trámites para evitar agencias vacías guardadas por error
    if (!editingAgencia && agenciaForm.tramitesSeleccionados.length === 0) {
      alert('Por favor selecciona al menos un trámite para habilitar en esta agencia antes de guardar.');
      return;
    }

    setIsSavingAgencia(true);
    try {
      const agencyRepo = new SupabaseAgencyRepository();
      if (editingAgencia) {
        await agencyRepo.updateAgencyWithDependencies(editingAgencia.id, {
          nombre_agencia: agenciaForm.nombre,
          direccion: agenciaForm.direccion,
          distrito: agenciaForm.distrito,
          provincia: agenciaForm.provincia,
          departamento: agenciaForm.departamento,
          telefono: agenciaForm.telefono,
          latitud: agenciaForm.latitud,
          longitud: agenciaForm.longitud,
          activa: agenciaForm.estado === 'Activo',
          total_ventanillas: agenciaForm.ventanillas,
          dias_semana: agenciaForm.diasSemana,
          hora_apertura: agenciaForm.horaApertura,
          hora_cierre: agenciaForm.horaCierre,
          hora_inicio_almuerzo: agenciaForm.horaInicioAlmuerzo,
          hora_fin_almuerzo: agenciaForm.horaFinAlmuerzo,
          tramite_ids: agenciaForm.tramitesSeleccionados,
        });
        setAgenciasList((prev) =>
          prev.map((item) =>
            item.id === editingAgencia.id
              ? {
                  ...item,
                  nombre: agenciaForm.nombre,
                  direccion: agenciaForm.direccion,
                  distrito: agenciaForm.distrito,
                  provincia: agenciaForm.provincia,
                  departamento: agenciaForm.departamento,
                  telefono: agenciaForm.telefono,
                  lugar: `${agenciaForm.distrito}, ${agenciaForm.provincia || agenciaForm.departamento || ''}`,
                  ventanillas: agenciaForm.ventanillas,
                  estado: agenciaForm.estado,
                  latitud: agenciaForm.latitud,
                  longitud: agenciaForm.longitud,
                }
              : item
          )
        );
        alert('Agencia y sus dependencias actualizadas exitosamente.');
        setModalAgenciaOpen(false);
      } else {
        const created = await agencyRepo.createAgencyWithDependencies({
          nombre_agencia: agenciaForm.nombre,
          direccion: agenciaForm.direccion,
          distrito: agenciaForm.distrito,
          provincia: agenciaForm.provincia,
          departamento: agenciaForm.departamento,
          telefono: agenciaForm.telefono,
          latitud: agenciaForm.latitud,
          longitud: agenciaForm.longitud,
          total_ventanillas: agenciaForm.ventanillas,
          dias_semana: agenciaForm.diasSemana,
          hora_apertura: agenciaForm.horaApertura,
          hora_cierre: agenciaForm.horaCierre,
          hora_inicio_almuerzo: agenciaForm.horaInicioAlmuerzo,
          hora_fin_almuerzo: agenciaForm.horaFinAlmuerzo,
          tramite_ids: agenciaForm.tramitesSeleccionados,
        });

        const newRow = {
          id: created.id_agencia,
          nombre: created.nombre_agencia,
          direccion: created.direccion,
          distrito: created.distrito,
          provincia: created.provincia,
          departamento: created.departamento,
          telefono: created.telefono,
          lugar: `${created.distrito}, ${created.provincia || created.departamento || ''}`,
          ventanillas: created.total_ventanillas || agenciaForm.ventanillas,
          estado: 'Activo',
          latitud: created.latitud,
          longitud: created.longitud,
        };
        setAgenciasList((prev) => [newRow, ...prev]);
      }
      setModalAgenciaOpen(false);
      setEditingAgencia(null);
    } catch (err: any) {
      alert('Error al guardar la agencia: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSavingAgencia(false);
    }
  };

  // Borrado Lógico: Marca la agencia como Inactiva
  const handleDeleteAgencia = async (id: number) => {
    if (confirm('¿Estás seguro de dar de baja esta agencia? (Borrado lógico: pasará a estado Inactivo sin perder citas ni historial)')) {
      try {
        const agencyRepo = new SupabaseAgencyRepository();
        await agencyRepo.softDeleteAgency(id);
        setAgenciasList((prev) =>
          prev.map((a) => (a.id === id ? { ...a, estado: 'Inactivo' } : a))
        );
      } catch (err: any) {
        alert('Error al dar de baja la agencia: ' + err.message);
      }
    }
  };

  // Reactivar Agencia
  const handleReactivateAgencia = async (id: number) => {
    if (confirm('¿Deseas reactivar esta agencia para que vuelva a recibir citas?')) {
      try {
        const agencyRepo = new SupabaseAgencyRepository();
        await agencyRepo.reactivateAgency(id);
        setAgenciasList((prev) =>
          prev.map((a) => (a.id === id ? { ...a, estado: 'Activo' } : a))
        );
      } catch (err: any) {
        alert('Error al reactivar la agencia: ' + err.message);
      }
    }
  };

  // Apertura granular para editar Trámite: Datos Generales o Requisitos
  const openEditTramite = async (tr: any, tab: 'datos' | 'requisitos' = 'datos') => {
    setEditingTramite(tr);
    setTramiteModalTab(tab);
    setTramiteForm({
      nombre: tr.nombre || '',
      descripcion: tr.descripcion || '',
      duracionMinutos: tr.duracion_minutos || 15,
      estado: tr.estado || 'Activo',
      requisitos: tr.requisitosDetalle || [],
    });
    setModalTramiteOpen(true);

    try {
      const repo = new SupabaseProcedureRepository();
      const details = await repo.getProcedureFullDetails(tr.id);
      setTramiteForm({
        nombre: details.nombre_tramite,
        descripcion: details.descripcion,
        duracionMinutos: details.duracion_minutos,
        estado: details.activo ? 'Activo' : 'Inactivo',
        requisitos: details.requisitos || [],
      });
    } catch (err) {
      console.warn('Aviso: Cargando requisitos locales para el trámite:', err);
    }
  };

  // CRUD Handlers: Trámites conectados a Supabase
  const handleSaveTramite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tramiteForm.nombre.trim()) {
      alert('Por favor ingresa el nombre del trámite.');
      return;
    }

    setIsSavingTramite(true);
    try {
      const repo = new SupabaseProcedureRepository();
      if (editingTramite) {
        await repo.updateProcedure(editingTramite.id, {
          nombre_tramite: tramiteForm.nombre,
          descripcion: tramiteForm.descripcion,
          duracion_minutos: tramiteForm.duracionMinutos,
          activo: tramiteForm.estado === 'Activo',
          requisitos: tramiteForm.requisitos,
        });

        setTramitesList((prev) =>
          prev.map((item) =>
            item.id === editingTramite.id
              ? {
                  ...item,
                  nombre: tramiteForm.nombre,
                  descripcion: tramiteForm.descripcion,
                  duracion_minutos: tramiteForm.duracionMinutos,
                  requisitos: tramiteForm.requisitos.filter((r) => r.descripcion_requisito.trim()).length,
                  requisitosDetalle: tramiteForm.requisitos,
                  estado: tramiteForm.estado,
                }
              : item
          )
        );
        alert('Trámite actualizado exitosamente.');
      } else {
        const created = await repo.createProcedure({
          nombre_tramite: tramiteForm.nombre,
          descripcion: tramiteForm.descripcion,
          duracion_minutos: tramiteForm.duracionMinutos,
          requisitos: tramiteForm.requisitos,
        });

        setTramitesList((prev) => [
          {
            id: created.id_tramite,
            nombre: created.nombre_tramite,
            descripcion: created.descripcion,
            duracion_minutos: created.duracion_minutos,
            requisitos: created.requisitos?.length || 0,
            requisitosDetalle: created.requisitos || [],
            fecha: '2026-09-28',
            estado: 'Activo',
          },
          ...prev,
        ]);
        alert('Trámite registrado exitosamente.');
      }

      setModalTramiteOpen(false);
      setEditingTramite(null);
    } catch (err: any) {
      console.error('Error al guardar trámite:', err);
      alert('Error al guardar el trámite: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSavingTramite(false);
    }
  };

  const handleDeleteTramite = async (id: number) => {
    if (confirm('¿Estás seguro de dar de baja este trámite? (Borrado lógico: quedará inactivo y se preservarán las citas pasadas)')) {
      try {
        const repo = new SupabaseProcedureRepository();
        await repo.softDeleteProcedure(id);
        setTramitesList((prev) =>
          prev.map((t) => (t.id === id ? { ...t, estado: 'Inactivo' } : t))
        );
      } catch (err: any) {
        alert('Error al dar de baja el trámite: ' + err.message);
      }
    }
  };

  const handleReactivateTramite = async (id: number) => {
    try {
      const repo = new SupabaseProcedureRepository();
      await repo.reactivateProcedure(id);
      setTramitesList((prev) =>
        prev.map((t) => (t.id === id ? { ...t, estado: 'Activo' } : t))
      );
    } catch (err: any) {
      alert('Error al reactivar el trámite: ' + err.message);
    }
  };

  // CRUD Handlers: Personal Institucional
  const loadAgencyWindows = async (idAgencia: number | null, currentUserId?: string) => {
    if (!idAgencia) {
      setAvailableWindowsForPersonal([]);
      return;
    }
    try {
      const userRepo = new SupabaseUserRepository();
      const windows = await userRepo.getAgencyActiveWindows(idAgencia, currentUserId);
      setAvailableWindowsForPersonal(windows);
    } catch (err) {
      console.error('Error cargando ventanillas de la agencia:', err);
      setAvailableWindowsForPersonal([]);
    }
  };

  const openCreatePersonal = () => {
    setEditingPersonal(null);
    setPersonalModalTab('datos');
    setAgencySearchTerm('');
    setIsAgencyDropdownOpen(false);
    setPersonalForm({
      dni: '',
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: '',
      id_rol: 2, // Agente Ventanilla por defecto
      id_agencia: null, // Inicialmente nulo para exigir selección en cascada
      id_ventanilla: null,
      activo: true,
    });
    setAvailableWindowsForPersonal([]);
    setModalPersonalOpen(true);
  };

  const openEditPersonal = async (pe: StaffMember, tab: 'datos' | 'sede' = 'datos') => {
    setEditingPersonal(pe);
    setPersonalModalTab(tab);
    setPersonalForm({
      dni: pe.dni,
      nombres: pe.nombres,
      apellidos: pe.apellidos,
      correo: pe.correo,
      telefono: pe.telefono || '',
      id_rol: pe.id_rol,
      id_agencia: pe.id_agencia,
      id_ventanilla: pe.id_ventanilla,
      activo: pe.activo,
    });
    const ag = agenciasList.find((a) => a.id === pe.id_agencia);
    setAgencySearchTerm(ag ? `${ag.nombre} (${ag.lugar})` : '');
    setIsAgencyDropdownOpen(false);
    if (pe.id_agencia) {
      await loadAgencyWindows(pe.id_agencia, pe.id_usuario);
    } else {
      setAvailableWindowsForPersonal([]);
    }
    setModalPersonalOpen(true);
  };

  const filteredAgenciesForCombobox = useMemo(() => {
    if (!agencySearchTerm.trim()) return agenciasList;
    const term = agencySearchTerm.toLowerCase().trim();
    return agenciasList.filter(
      (a) =>
        a.nombre.toLowerCase().includes(term) ||
        (a.lugar && a.lugar.toLowerCase().includes(term)) ||
        (a.distrito && a.distrito.toLowerCase().includes(term)) ||
        (a.provincia && a.provincia.toLowerCase().includes(term)) ||
        (a.departamento && a.departamento.toLowerCase().includes(term))
    );
  }, [agenciasList, agencySearchTerm]);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalForm.dni || personalForm.dni.trim().length !== 8) {
      alert('El DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }
    if (!personalForm.correo || !personalForm.correo.includes('@')) {
      alert('Por favor ingresa un correo electrónico corporativo o válido.');
      return;
    }

    // Validación de agencia para roles operativos 2 y 3
    if ((personalForm.id_rol === 2 || personalForm.id_rol === 3) && !personalForm.id_agencia) {
      alert('Debes seleccionar una agencia bancaria para este rol operativo.');
      setPersonalModalTab('sede');
      return;
    }

    // Validación estricta de ventanilla ocupada para Agente de Ventanilla
    if (personalForm.id_rol === 2 && personalForm.id_ventanilla) {
      const chosenWindow = availableWindowsForPersonal.find((w) => w.id_ventanilla === personalForm.id_ventanilla);
      if (chosenWindow && chosenWindow.is_occupied) {
        alert(
          `La Ventanilla ${chosenWindow.numero_ventanilla} ya se encuentra ocupada por ${
            chosenWindow.assigned_to_name || 'otro agente'
          }. Por favor selecciona una ventanilla disponible.`
        );
        setPersonalModalTab('sede');
        return;
      }
    }

    setIsSavingPersonal(true);
    try {
      const userRepo = new SupabaseUserRepository();
      if (editingPersonal) {
        await userRepo.updateStaffMember(editingPersonal.id_usuario, {
          dni: personalForm.dni,
          nombres: personalForm.nombres,
          apellidos: personalForm.apellidos,
          correo: personalForm.correo,
          telefono: personalForm.telefono,
          id_rol: personalForm.id_rol,
          id_agencia: personalForm.id_rol === 4 ? null : personalForm.id_agencia,
          id_ventanilla: personalForm.id_rol === 2 ? personalForm.id_ventanilla : null,
        });
      } else {
        await userRepo.createStaffMember({
          dni: personalForm.dni,
          nombres: personalForm.nombres,
          apellidos: personalForm.apellidos,
          correo: personalForm.correo,
          telefono: personalForm.telefono,
          id_rol: personalForm.id_rol,
          id_agencia: personalForm.id_rol === 4 ? null : personalForm.id_agencia,
          id_ventanilla: personalForm.id_rol === 2 ? personalForm.id_ventanilla : null,
        });
      }

      // Recargar lista actualizada
      const updatedList = await userRepo.getStaffMembers();
      setPersonalList(updatedList);
      setModalPersonalOpen(false);
      setEditingPersonal(null);
    } catch (err: any) {
      alert('Error al guardar personal: ' + err.message);
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleToggleStaffStatus = async (pe: StaffMember) => {
    if (pe.id_rol === 4) {
      alert('Por políticas de gobernanza y seguridad institucional, el Administrador General no puede ser inhabilitado.');
      return;
    }

    const accion = pe.activo ? 'inhabilitar la sesión y accesos operativos' : 'reactivar los accesos';
    if (!confirm(`¿Estás seguro de que deseas ${accion} de ${pe.nombre_completo}?`)) {
      return;
    }

    try {
      const userRepo = new SupabaseUserRepository();
      await userRepo.toggleStaffStatus(pe.id_usuario, !pe.activo, pe.id_rol);
      setPersonalList((prev) =>
        prev.map((item) => (item.id_usuario === pe.id_usuario ? { ...item, activo: !pe.activo } : item))
      );
    } catch (err: any) {
      alert('Error al actualizar estado del personal: ' + err.message);
    }
  };

  // Filtrado de agencias
  const filteredAgencias = agenciasList.filter((ag) => {
    const term = searchAgencias.toLowerCase();
    const matchSearch =
      !term ||
      ag.nombre.toLowerCase().includes(term) ||
      (ag.lugar && ag.lugar.toLowerCase().includes(term)) ||
      (ag.distrito && ag.distrito.toLowerCase().includes(term)) ||
      (ag.provincia && ag.provincia.toLowerCase().includes(term)) ||
      (ag.departamento && ag.departamento.toLowerCase().includes(term)) ||
      (ag.direccion && ag.direccion.toLowerCase().includes(term));
    const matchEstado =
      filterEstadoAgencias === 'todos' || ag.estado.toLowerCase() === filterEstadoAgencias.toLowerCase();
    const matchRegion =
      filterRegionAgencias === 'todos' ||
      (ag.departamento && ag.departamento.toLowerCase() === filterRegionAgencias.toLowerCase()) ||
      (ag.lugar && ag.lugar.toLowerCase().includes(filterRegionAgencias.toLowerCase()));
    return matchSearch && matchEstado && matchRegion;
  });

  // Filtrado de trámites
  const filteredTramites = tramitesList.filter((tr) => {
    const matchSearch = tr.nombre.toLowerCase().includes(searchTramites.toLowerCase());
    const matchEstado = filterEstadoTramites === 'todos' || tr.estado.toLowerCase() === filterEstadoTramites.toLowerCase();
    return matchSearch && matchEstado;
  });

  const filteredPersonal = useMemo(() => {
    return personalList.filter((pe) => {
      const term = searchPersonal.toLowerCase().trim();
      const matchSearch =
        !term ||
        pe.nombre_completo.toLowerCase().includes(term) ||
        pe.dni.includes(term) ||
        pe.correo.toLowerCase().includes(term) ||
        (pe.agencia_nombre && pe.agencia_nombre.toLowerCase().includes(term));

      const matchEstado =
        filterEstadoPersonal === 'todos' ||
        (filterEstadoPersonal === 'activo' && pe.activo) ||
        (filterEstadoPersonal === 'inactivo' && !pe.activo);

      const matchRol =
        filterRolPersonal === 'todos' ||
        String(pe.id_rol) === filterRolPersonal;

      return matchSearch && matchEstado && matchRol;
    });
  }, [personalList, searchPersonal, filterEstadoPersonal, filterRolPersonal]);

  // =========================================================================
  // CRUD HANDLERS: CLIENTES Y CIUDADANOS (ROL 1)
  // =========================================================================
  const openCreateClient = () => {
    setEditingClient(null);
    setClientForm({
      dni: '',
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: '',
      activo: true,
    });
    setModalClientOpen(true);
  };

  const openEditClient = (cli: ClientMember) => {
    setEditingClient(cli);
    setClientForm({
      dni: cli.dni,
      nombres: cli.nombres,
      apellidos: cli.apellidos,
      correo: cli.correo,
      telefono: cli.telefono || '',
      activo: cli.activo,
    });
    setModalClientOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.dni || clientForm.dni.trim().length !== 8) {
      alert('El DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }
    if (!clientForm.nombres.trim() || !clientForm.apellidos.trim()) {
      alert('Por favor ingresa los nombres y apellidos del cliente.');
      return;
    }
    if (!clientForm.correo || !clientForm.correo.includes('@')) {
      alert('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setIsSavingClient(true);
    try {
      const userRepo = new SupabaseUserRepository();
      if (editingClient) {
        await userRepo.updateClientMember(editingClient.id_usuario, {
          nombres: clientForm.nombres,
          apellidos: clientForm.apellidos,
          correo: clientForm.correo,
          telefono: clientForm.telefono,
          activo: clientForm.activo,
        });

        setClientsList((prev) =>
          prev.map((c) =>
            c.id_usuario === editingClient.id_usuario
              ? {
                  ...c,
                  nombres: clientForm.nombres.trim(),
                  apellidos: clientForm.apellidos.trim(),
                  nombre_completo: `${clientForm.nombres.trim()} ${clientForm.apellidos.trim()}`,
                  correo: clientForm.correo.trim().toLowerCase(),
                  telefono: clientForm.telefono.trim() || null,
                  activo: clientForm.activo,
                }
              : c
          )
        );
        alert('Datos del cliente actualizados exitosamente.');
      } else {
        const newId = await userRepo.createClientMember({
          dni: clientForm.dni,
          nombres: clientForm.nombres,
          apellidos: clientForm.apellidos,
          correo: clientForm.correo,
          telefono: clientForm.telefono,
        });

        const newClient: ClientMember = {
          id_usuario: newId,
          dni: clientForm.dni.trim(),
          nombres: clientForm.nombres.trim(),
          apellidos: clientForm.apellidos.trim(),
          nombre_completo: `${clientForm.nombres.trim()} ${clientForm.apellidos.trim()}`,
          correo: clientForm.correo.trim().toLowerCase(),
          telefono: clientForm.telefono.trim() || null,
          activo: true,
          total_citas: 0,
          citas_pendientes: 0,
          citas_atendidas: 0,
        };

        setClientsList((prev) => [newClient, ...prev]);
        alert('Cliente registrado exitosamente en el sistema.');
      }
      setModalClientOpen(false);
    } catch (err: any) {
      alert('Error al procesar cliente: ' + err.message);
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleToggleClientStatus = async (cli: ClientMember) => {
    const actionText = cli.activo ? 'bloquear / inhabilitar' : 'reactivar';
    if (!confirm(`¿Estás seguro de ${actionText} los accesos del ciudadano ${cli.nombre_completo}?`)) {
      return;
    }

    try {
      const userRepo = new SupabaseUserRepository();
      await userRepo.toggleClientStatus(cli.id_usuario, !cli.activo);
      setClientsList((prev) =>
        prev.map((c) => (c.id_usuario === cli.id_usuario ? { ...c, activo: !cli.activo } : c))
      );
    } catch (err: any) {
      alert('Error al modificar estado del cliente: ' + err.message);
    }
  };

  const handleViewClientHistory = async (cli: ClientMember) => {
    setSelectedClientForHistory(cli);
    setModalClientHistoryOpen(true);
    setIsLoadingHistory(true);
    setClientAppointmentsHistory([]);

    try {
      const userRepo = new SupabaseUserRepository();
      const appointments = await userRepo.getClientAppointments(cli.id_usuario);
      setClientAppointmentsHistory(appointments);
    } catch (err) {
      console.error('Error al cargar historial de citas:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const filteredClients = useMemo(() => {
    return clientsList.filter((c) => {
      const term = searchClients.toLowerCase().trim();
      const matchSearch =
        !term ||
        c.nombre_completo.toLowerCase().includes(term) ||
        c.dni.includes(term) ||
        c.correo.toLowerCase().includes(term) ||
        (c.telefono && c.telefono.includes(term));

      const matchEstado =
        filterEstadoClients === 'todos' ||
        (filterEstadoClients === 'activos' && c.activo) ||
        (filterEstadoClients === 'inactivos' && !c.activo);

      return matchSearch && matchEstado;
    });
  }, [clientsList, searchClients, filterEstadoClients]);

  const filteredReportes = reportesList.filter((rep) => {
    const matchAgencia =
      reporteAgencia === 'todas' || rep.agencia.toLowerCase().includes(reporteAgencia.toLowerCase());
    const matchEstado =
      reporteEstado === 'todos' || rep.estado.toLowerCase() === reporteEstado.toLowerCase();
    return matchAgencia && matchEstado;
  });

  // Cálculo reactivo de métricas y gráficos según filtros activos
  const reportStats = useMemo(() => {
    const total = filteredReportes.length;
    const terminados = filteredReportes.filter((r) => r.estado === 'Terminado').length;
    const cancelados = filteredReportes.filter((r) => r.estado === 'Cancelado').length;
    const denegados = filteredReportes.filter((r) => r.estado === 'Denegado').length;

    const tasaExitoNum = total > 0 ? (terminados / total) * 100 : 100;
    const tasaExito = tasaExitoNum.toFixed(1);

    // Conteo por trámite
    const tramitesMap: Record<string, number> = {};
    filteredReportes.forEach((r) => {
      tramitesMap[r.tramite] = (tramitesMap[r.tramite] || 0) + 1;
    });
    const tramitesSorted = Object.entries(tramitesMap)
      .map(([nombre, count]) => ({
        nombre,
        count,
        porcentaje: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Conteo por franja horaria
    let manana = 0; // 08:30 - 11:00
    let punta = 0; // 11:00 - 13:00
    let almuerzo = 0; // 13:00 - 14:30
    let tarde = 0; // 14:30 - 17:30

    filteredReportes.forEach((r) => {
      const parts = r.hora.split(':');
      const horaNum = parseInt(parts[0], 10);
      const minNum = parseInt(parts[1], 10);
      const totalMin = horaNum * 60 + minNum;

      if (totalMin < 11 * 60) {
        manana++;
      } else if (totalMin < 13 * 60) {
        punta++;
      } else if (totalMin < 14 * 60 + 30) {
        almuerzo++;
      } else {
        tarde++;
      }
    });

    const horariosData = [
      { tramo: 'Mañana (08:30 - 11:00)', count: manana, pct: total > 0 ? Math.round((manana / total) * 100) : 0, isPeak: false },
      { tramo: 'Hora Punta (11:00 - 13:00)', count: punta, pct: total > 0 ? Math.round((punta / total) * 100) : 0, isPeak: true },
      { tramo: 'Mediodía (13:00 - 14:30)', count: almuerzo, pct: total > 0 ? Math.round((almuerzo / total) * 100) : 0, isPeak: false },
      { tramo: 'Tarde (14:30 - 17:30)', count: tarde, pct: total > 0 ? Math.round((tarde / total) * 100) : 0, isPeak: false },
    ];

    return {
      total,
      terminados,
      cancelados,
      denegados,
      tasaExito,
      tasaExitoNum,
      tramitesSorted,
      horariosData,
    };
  }, [filteredReportes]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Banner de Aviso Institucional de Administrador */}
      {showAdminNotice && (
        <div className="bg-amber-500 text-slate-950 py-2.5 px-6 text-xs font-black flex items-center justify-between shadow-sm z-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
            <span>
              SESIÓN ADMINISTRATIVA ACTIVA: Has ingresado como{' '}
              <strong>{userRole === 'ADMIN_GENERAL' ? 'Administrador General' : 'Administrador de Agencia'}</strong>. La configuración realizada repercute en el agendamiento y ventanillas.
            </span>
          </div>
          <button
            onClick={() => setShowAdminNotice(false)}
            className="hover:bg-amber-600 px-2 py-0.5 rounded text-[11px] font-extrabold uppercase transition inline-flex items-center gap-1"
          >
            <span>Entendido</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOPBAR INSTITUCIONAL BLANCO CON LOGO OFICIAL */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-95 transition">
            <LogoBancoNacion showSubtitle={true} />
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-extrabold text-slate-800">
              Hola, <span className="text-red-700 font-black">{operatorName}</span> | <span className="text-slate-500 font-medium">{operatorLocation}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-semibold">Banco de la Nación del Perú</div>
          </div>

          <div className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-black tracking-wider uppercase shadow-sm">
            {userRole === 'ADMIN_GENERAL' ? 'ADMINISTRADOR' : 'ADMIN AGENCIA'}
          </div>

          {/* BOTÓN CERRAR SESIÓN EN EL ENCABEZADO */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 hover:border-red-300 rounded-lg text-xs font-black transition shadow-xs cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOutIcon className="w-4 h-4 text-red-600" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL CON SIDEBAR FIJO Y PANEL CENTRAL */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* SIDEBAR INSTITUCIONAL (Fijo al hacer scroll) */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-200 flex flex-col p-4 shrink-0 border-r border-slate-800 print:hidden md:sticky md:top-[61px] md:h-[calc(100vh-61px)] md:self-start md:overflow-y-auto">
          <div className="space-y-1.5 flex-1">
            <div className="px-3 py-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Menú de Gestión
            </div>

            {/* Link 1: Agencias */}
            <button
              onClick={() => setActiveTab('agencias')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition text-left cursor-pointer ${
                activeTab === 'agencias'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <HomeIcon className="w-5 h-5 shrink-0" />
              <span>Agencias</span>
            </button>

            {/* Link 2: Trámites y Requisitos */}
            <button
              onClick={() => setActiveTab('tramites')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition text-left cursor-pointer ${
                activeTab === 'tramites'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileTextIcon className="w-5 h-5 shrink-0" />
              <span>Tramites y Requisitos</span>
            </button>

            {/* Link 3: Personal y Accesos */}
            <button
              onClick={() => setActiveTab('personal')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition text-left cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <UsersIcon className="w-5 h-5 shrink-0" />
              <span>Personal y Accesos</span>
            </button>

            {/* Link 4: Clientes / Ciudadanos */}
            <button
              onClick={() => setActiveTab('clientes')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition text-left cursor-pointer ${
                activeTab === 'clientes'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Users className="w-5 h-5 shrink-0" />
              <span>Clientes / Ciudadanos</span>
            </button>

            {/* Link 5: Reportes */}
            <button
              onClick={() => setActiveTab('reportes')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition text-left cursor-pointer ${
                activeTab === 'reportes'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileBarChartIcon className="w-5 h-5 shrink-0" />
              <span>Reportes</span>
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL DINÁMICO SEGÚN PESTAÑA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* ========================================================= */}
          {/* VISTA 1: AGENCIAS (Fiel al Boceto 1) */}
          {/* ========================================================= */}
          {activeTab === 'agencias' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Header de la sección */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Agencias
                </h1>
                <button
                  onClick={() => {
                    setEditingAgencia(null);
                    setAgenciaModalTab('datos');
                    setAgenciaForm({
                      nombre: '',
                      departamento: 'Lima',
                      provincia: 'Lima',
                      distrito: 'Cercado de Lima',
                      direccion: '',
                      telefono: '',
                      latitud: -12.046374,
                      longitud: -77.042793,
                      ventanillas: 2,
                      estado: 'Activo',
                      diasSemana: [1, 2, 3, 4, 5],
                      horaApertura: '08:30',
                      horaCierre: '17:30',
                      horaInicioAlmuerzo: '13:00',
                      horaFinAlmuerzo: '14:00',
                      tramitesSeleccionados: tramitesList.filter((t) => t.estado === 'Activo').map((t) => t.id),
                    });
                    setModalAgenciaOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md transition text-sm uppercase tracking-wider"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Nueva Agencia</span>
                </button>
              </div>

              {/* Barra de Filtros Avanzada con Segmentación Territorial */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 relative">
                  <SearchIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchAgencias}
                    onChange={(e) => setSearchAgencias(e.target.value)}
                    placeholder="Buscar por nombre, distrito o dirección..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={filterRegionAgencias}
                    onChange={(e) => setFilterRegionAgencias(e.target.value)}
                    className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm"
                  >
                    <option value="todos">Todas las Regiones</option>
                    {PERU_UBIGEO.map((d) => (
                      <option key={d.nombre} value={d.nombre}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={filterEstadoAgencias}
                    onChange={(e) => setFilterEstadoAgencias(e.target.value)}
                    className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Agencias */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">NOMBRE DE AGENCIA</th>
                        <th className="p-4">UBICACIÓN (Distrito / Región)</th>
                        <th className="p-4">Ventanillas</th>
                        <th className="p-4">ESTADO</th>
                        <th className="p-4 text-center">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredAgencias.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                            No se encontraron agencias registradas con los filtros actuales.
                          </td>
                        </tr>
                      ) : (
                        filteredAgencias.map((ag) => (
                          <tr key={ag.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                  <BuildingIcon className="w-5 h-5 text-red-700" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{ag.nombre}</span>
                                  {ag.direccion && (
                                    <span className="text-[11px] text-slate-500 font-normal">{ag.direccion}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-slate-600">
                              <div className="font-extrabold text-slate-800">{ag.distrito || ag.lugar}</div>
                              {(ag.departamento || ag.provincia) && (
                                <div className="text-[11px] text-slate-400 font-medium">
                                  {[ag.provincia, ag.departamento].filter(Boolean).join(' • ')}
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-bold text-slate-800">{ag.ventanillas}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                  ag.estado === 'Activo'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {ag.estado}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Botón 1: Sede, Ubicación y Datos Generales */}
                                <button
                                  onClick={() => openEditAgencia(ag, 'datos')}
                                  title="Editar Sede y Datos Generales"
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-red-700 rounded-lg transition"
                                >
                                  <BuildingIcon className="w-4 h-4" />
                                </button>

                                {/* Botón 2: Horarios y Ventanillas */}
                                <button
                                  onClick={() => openEditAgencia(ag, 'horario')}
                                  title="Editar Horario y Ventanillas"
                                  className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition"
                                >
                                  <ClockIcon className="w-4 h-4" />
                                </button>

                                {/* Botón 3: Trámites Aceptados */}
                                <button
                                  onClick={() => openEditAgencia(ag, 'tramites')}
                                  title="Editar Trámites Aceptados"
                                  className="p-1.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg transition"
                                >
                                  <FileTextIcon className="w-4 h-4" />
                                </button>

                                <span className="h-3.5 w-[1px] bg-slate-200 mx-0.5" />

                                {ag.estado === 'Inactivo' ? (
                                  <button
                                    onClick={() => handleReactivateAgencia(ag.id)}
                                    title="Reactivar Agencia"
                                    className="p-1.5 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg transition"
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteAgencia(ag.id)}
                                    title="Dar de baja (Borrado Lógico)"
                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-500">
                    Mostrando 1-{filteredAgencias.length} de {agenciasList.length} resultados
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      ← Anterior
                    </button>
                    <button className="px-3 py-1.5 bg-red-600 text-white font-black rounded-lg shadow-sm">
                      1
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      2
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      3
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      Siguiente →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VISTA 2: TRÁMITES Y REQUISITOS (Fiel al Boceto 2) */}
          {/* ========================================================= */}
          {activeTab === 'tramites' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Tramites y Requisitos
                </h1>
                <button
                  onClick={() => {
                    setEditingTramite(null);
                    setTramiteModalTab('datos');
                    setTramiteForm({
                      nombre: '',
                      descripcion: '',
                      duracionMinutos: 15,
                      estado: 'Activo',
                      requisitos: [
                        { descripcion_requisito: 'DNI vigente original y copia legible', es_obligatorio: true },
                      ],
                    });
                    setModalTramiteOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md transition text-sm uppercase tracking-wider"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Nuevo Trámite</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3 relative">
                  <SearchIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTramites}
                    onChange={(e) => setSearchTramites(e.target.value)}
                    placeholder="Buscar trámite por nombre o descripción..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm"
                  />
                </div>
                <div className="sm:col-span-1">
                  <select
                    value={filterEstadoTramites}
                    onChange={(e) => setFilterEstadoTramites(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">NOMBRE Y DETALLES</th>
                        <th className="p-4">DURACIÓN VENTANILLA</th>
                        <th className="p-4">REQUISITOS</th>
                        <th className="p-4">ESTADO</th>
                        <th className="p-4 text-center">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredTramites.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                            No se encontraron trámites registrados con los filtros actuales.
                          </td>
                        </tr>
                      ) : (
                        filteredTramites.map((tr) => (
                          <tr key={tr.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                  <FileTextIcon className="w-5 h-5 text-red-700" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{tr.nombre}</span>
                                  {tr.descripcion && (
                                    <span className="text-[11px] text-slate-500 font-normal line-clamp-1">
                                      {tr.descripcion}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                                <ClockIcon className="w-3.5 h-3.5 text-blue-600" />
                                {tr.duracion_minutos || 15} min
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                {tr.requisitos} {tr.requisitos === 1 ? 'requisito' : 'requisitos'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                  tr.estado === 'Activo'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {tr.estado}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Botón 1: Editar Datos y Duración */}
                                <button
                                  onClick={() => openEditTramite(tr, 'datos')}
                                  title="Editar Datos y Duración"
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-red-700 rounded-lg transition"
                                >
                                  <BuildingIcon className="w-4 h-4" />
                                </button>

                                {/* Botón 2: Gestionar Requisitos */}
                                <button
                                  onClick={() => openEditTramite(tr, 'requisitos')}
                                  title="Gestionar Requisitos"
                                  className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition"
                                >
                                  <FileTextIcon className="w-4 h-4" />
                                </button>

                                <span className="h-3.5 w-[1px] bg-slate-200 mx-0.5" />

                                {tr.estado === 'Inactivo' ? (
                                  <button
                                    onClick={() => handleReactivateTramite(tr.id)}
                                    title="Reactivar Trámite"
                                    className="p-1.5 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg transition"
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteTramite(tr.id)}
                                    title="Dar de baja (Borrado Lógico)"
                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-500">
                    Mostrando 1-{filteredTramites.length} de {tramitesList.length} resultados
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      ← Anterior
                    </button>
                    <button className="px-3 py-1.5 bg-red-600 text-white font-black rounded-lg shadow-sm">
                      1
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      2
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      3
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      Siguiente →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VISTA 3: PERSONAL Y ACCESOS (Fiel al Boceto 3) */}
          {/* ========================================================= */}
          {activeTab === 'personal' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Personal y Accesos
                </h1>
                <button
                  onClick={openCreatePersonal}
                  className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md transition text-sm uppercase tracking-wider"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Nuevo Personal</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 relative">
                  <SearchIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchPersonal}
                    onChange={(e) => setSearchPersonal(e.target.value)}
                    placeholder="Buscar por nombre, DNI, correo o agencia..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={filterRolPersonal}
                    onChange={(e) => setFilterRolPersonal(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm"
                  >
                    <option value="todos">Todos los roles</option>
                    <option value="4">Administrador General</option>
                    <option value="3">Administrador Agencia</option>
                    <option value="2">Agente Ventanilla</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={filterEstadoPersonal}
                    onChange={(e) => setFilterEstadoPersonal(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">COLABORADOR</th>
                        <th className="p-4">ROL INSTITUCIONAL</th>
                        <th className="p-4">AGENCIA ASIGNADA</th>
                        <th className="p-4">VENTANILLA</th>
                        <th className="p-4">ESTADO</th>
                        <th className="p-4 text-center">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredPersonal.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                            No se encontró personal registrado con los filtros actuales.
                          </td>
                        </tr>
                      ) : (
                        filteredPersonal.map((pe) => (
                          <tr key={pe.id_usuario} className="hover:bg-slate-50/80 transition">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                  <UserIcon className="w-5 h-5 text-red-700" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900">{pe.nombre_completo}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                      DNI: {pe.dni}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                                    {pe.correo}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                  pe.id_rol === 4
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : pe.id_rol === 3
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {pe.id_rol === 4 && <ShieldCheck className="w-3.5 h-3.5 text-rose-700 shrink-0" />}
                                {pe.id_rol === 3 && <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />}
                                {pe.id_rol === 2 && <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                                <span>{pe.rol_nombre}</span>
                              </span>
                            </td>
                            <td className="p-4 text-slate-800 font-semibold">
                              <div className="flex items-center gap-1.5 text-xs">
                                <BuildingIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{pe.agencia_nombre || 'Sin sede asignada'}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              {pe.id_rol === 2 ? (
                                pe.numero_ventanilla ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                                    {pe.numero_ventanilla}
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Sin asignar
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 font-bold text-xs">- - - - -</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                  pe.activo
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {pe.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Botón 1: Editar Datos y Rol */}
                                <button
                                  onClick={() => openEditPersonal(pe, 'datos')}
                                  title="Editar Datos Personales y Rol"
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-red-700 rounded-lg transition"
                                >
                                  <UserIcon className="w-4 h-4" />
                                </button>

                                {/* Botón 2: Asignar Sede / Ventanilla */}
                                <button
                                  onClick={() => openEditPersonal(pe, 'sede')}
                                  title="Asignar Sede y Ventanilla"
                                  className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition"
                                >
                                  <BuildingIcon className="w-4 h-4" />
                                </button>

                                <span className="h-3.5 w-[1px] bg-slate-200 mx-0.5" />

                                {/* Botón 3: Inhabilitar / Reactivar Sesión */}
                                {pe.id_rol === 4 ? (
                                  <button
                                    disabled
                                    title="No se puede inhabilitar al Administrador General (Gobernanza)"
                                    className="p-1.5 text-slate-300 cursor-not-allowed rounded-lg"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                ) : pe.activo ? (
                                  <button
                                    onClick={() => handleToggleStaffStatus(pe)}
                                    title="Inhabilitar sesión y accesos operativos"
                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleStaffStatus(pe)}
                                    title="Reactivar accesos operativos"
                                    className="p-1.5 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg transition"
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-500">
                    Mostrando 1-{filteredPersonal.length} de {personalList.length} colaboradores
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      ← Anterior
                    </button>
                    <button className="px-3 py-1.5 bg-red-600 text-white font-black rounded-lg shadow-sm">
                      1
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      2
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      3
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      Siguiente →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VISTA 4: CLIENTES Y CIUDADANOS */}
          {/* ========================================================= */}
          {activeTab === 'clientes' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Header de la sección */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Clientes y Ciudadanos
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Directorio de usuarios registrados para reserva de citas bancarias, expedientes de atención y control de accesos.
                  </p>
                </div>
                <button
                  onClick={openCreateClient}
                  className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm uppercase tracking-wider shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Registrar Cliente</span>
                </button>
              </div>

              {/* Tarjetas de Métricas KPI Rápidas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Total Clientes</span>
                    <span className="text-xl font-black text-slate-900">{clientsList.length}</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Activos</span>
                    <span className="text-xl font-black text-emerald-700">
                      {clientsList.filter((c) => c.activo).length}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Inhabilitados</span>
                    <span className="text-xl font-black text-rose-700">
                      {clientsList.filter((c) => !c.activo).length}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Total Citas</span>
                    <span className="text-xl font-black text-blue-700">
                      {clientsList.reduce((acc, c) => acc + (c.total_citas || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de Filtros y Búsqueda */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-96">
                  <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchClients}
                    onChange={(e) => setSearchClients(e.target.value)}
                    placeholder="Buscar por DNI, nombres o correo..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 transition"
                  />
                  {searchClients && (
                    <button
                      onClick={() => setSearchClients('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <select
                    value={filterEstadoClients}
                    onChange={(e) => setFilterEstadoClients(e.target.value)}
                    className="w-full sm:w-auto py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-red-600 transition"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="activos">Solo Activos</option>
                    <option value="inactivos">Solo Inhabilitados</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Clientes */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">CIUDADANO</th>
                        <th className="p-4">CONTACTO</th>
                        <th className="p-4">ACTIVIDAD DE CITAS</th>
                        <th className="p-4">ESTADO</th>
                        <th className="p-4 text-center">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredClients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                            No se encontraron clientes registrados con los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        filteredClients.map((cli) => (
                          <tr key={cli.id_usuario} className="hover:bg-slate-50/80 transition">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 font-bold text-xs">
                                  <UserIcon className="w-4 h-4 text-slate-500" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900 text-xs">{cli.nombre_completo}</span>
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                      DNI: {cli.dni}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-0.5 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{cli.correo}</span>
                                </div>
                                {cli.telefono && (
                                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{cli.telefono}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {cli.total_citas || 0} cita(s)
                                </span>
                                {(cli.citas_pendientes || 0) > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    {cli.citas_pendientes} pendiente(s)
                                  </span>
                                )}
                                {(cli.citas_atendidas || 0) > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {cli.citas_atendidas} atendida(s)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                  cli.activo
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    cli.activo ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                                <span>{cli.activo ? 'Habilitado' : 'Inhabilitado'}</span>
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Botón 1: Ver Expediente / Citas */}
                                <button
                                  onClick={() => handleViewClientHistory(cli)}
                                  title="Ver expediente y citas del cliente"
                                  className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition"
                                >
                                  <Calendar className="w-4 h-4" />
                                </button>

                                {/* Botón 2: Editar Contacto */}
                                <button
                                  onClick={() => openEditClient(cli)}
                                  title="Editar datos de contacto"
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition"
                                >
                                  <EditIcon className="w-4 h-4" />
                                </button>

                                <span className="h-3.5 w-[1px] bg-slate-200 mx-0.5" />

                                {/* Botón 3: Inhabilitar / Reactivar Cuenta */}
                                <button
                                  onClick={() => handleToggleClientStatus(cli)}
                                  title={cli.activo ? 'Inhabilitar / Bloquear cuenta' : 'Reactivar cuenta'}
                                  className={`p-1.5 rounded-lg transition ${
                                    cli.activo
                                      ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                                      : 'hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700'
                                  }`}
                                >
                                  {cli.activo ? (
                                    <Ban className="w-4 h-4" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-500">
                    Mostrando 1-{filteredClients.length} de {clientsList.length} clientes
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      ← Anterior
                    </button>
                    <button className="px-3 py-1.5 bg-red-600 text-white font-black rounded-lg shadow-sm">
                      1
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition">
                      Siguiente →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VISTA 5: REPORTES Y RESUMEN (Fiel al Boceto 4) */}
          {/* ========================================================= */}
          {activeTab === 'reportes' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Reportes y Resumen
                </h1>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md transition text-sm uppercase tracking-wider"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>
              </div>

              {/* Fila de Filtros del Boceto 4 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Rango Temporal</label>
                  <select
                    value={reporteFecha}
                    onChange={(e) => setReporteFecha(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm"
                  >
                    <option value="hoy">Fecha de Hoy</option>
                    <option value="semana">Esta Semana</option>
                    <option value="mes">Este Mes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Filtro de Agencia</label>
                  <select
                    value={reporteAgencia}
                    onChange={(e) => setReporteAgencia(e.target.value)}
                    disabled={userRole === 'ADMIN_AGENCIA'}
                    className="w-full py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm disabled:bg-slate-100"
                  >
                    <option value="todas">Por Agencia (Todas)</option>
                    {agenciasList.map((ag) => (
                      <option key={ag.id} value={ag.nombre}>
                        {ag.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Filtro de Estado</label>
                  <select
                    value={reporteEstado}
                    onChange={(e) => setReporteEstado(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-sm"
                  >
                    <option value="todos">Estado (Todos)</option>
                    <option value="terminado">Terminado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="denegado">Denegado</option>
                  </select>
                </div>
              </div>

              {/* Grid de 2 Paneles (Pantalla Interactiva) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:hidden">
                {/* Panel Izquierdo: Analítica y Gráficos Reactivos */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    {/* Cabecera del Panel con Selector de Gráfico */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-black text-slate-900 text-sm">Analítica Operativa</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Visualización en tiempo real</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                        {reporteFecha === 'hoy' ? 'Hoy' : reporteFecha === 'semana' ? 'Semana' : 'Mes'}
                      </span>
                    </div>

                    {/* Selector de Pestañas del Gráfico (Segmented Control) */}
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setTipoGraficoReporte('estados')}
                        className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                          tipoGraficoReporte === 'estados'
                            ? 'bg-white text-red-700 shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Distribución de Estados"
                      >
                        <PieChart className="w-3.5 h-3.5" />
                        <span>Estados</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTipoGraficoReporte('tramites')}
                        className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                          tipoGraficoReporte === 'tramites'
                            ? 'bg-white text-red-700 shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Demanda por Trámite"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>Trámites</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTipoGraficoReporte('horarios')}
                        className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                          tipoGraficoReporte === 'horarios'
                            ? 'bg-white text-red-700 shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Afluencia por Horarios"
                      >
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>Horarios</span>
                      </button>
                    </div>

                    {/* VISTA 1: GRÁFICO DONUT DE EFECTIVIDAD (ESTADOS) */}
                    {tipoGraficoReporte === 'estados' && (
                      <div className="flex flex-col items-center animate-fadeIn">
                        <div className="relative w-44 h-44 flex items-center justify-center my-1">
                          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                            {/* Círculo Base Fondo */}
                            <circle
                              cx="60"
                              cy="60"
                              r="48"
                              className="stroke-slate-100"
                              strokeWidth="12"
                              fill="transparent"
                            />
                            {/* Segmento Terminados (Verde) */}
                            <circle
                              cx="60"
                              cy="60"
                              r="48"
                              className="stroke-emerald-500 transition-all duration-700 ease-out"
                              strokeWidth="12"
                              strokeDasharray={301.59}
                              strokeDashoffset={
                                301.59 * (1 - (reportStats.total > 0 ? reportStats.terminados / reportStats.total : 1))
                              }
                              strokeLinecap="round"
                              fill="transparent"
                            />
                            {/* Segmento Cancelados (Rojo) */}
                            {reportStats.cancelados > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="48"
                                className="stroke-rose-500 transition-all duration-700 ease-out"
                                strokeWidth="12"
                                strokeDasharray={301.59}
                                strokeDashoffset={
                                  301.59 * (1 - reportStats.cancelados / reportStats.total)
                                }
                                strokeLinecap="round"
                                fill="transparent"
                                style={{
                                  transformOrigin: 'center',
                                  transform: `rotate(${
                                    ((reportStats.terminados + reportStats.denegados) / reportStats.total) * 360
                                  }deg)`,
                                }}
                              />
                            )}
                            {/* Segmento Denegados (Ámbar) */}
                            {reportStats.denegados > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="48"
                                className="stroke-amber-400 transition-all duration-700 ease-out"
                                strokeWidth="12"
                                strokeDasharray={301.59}
                                strokeDashoffset={
                                  301.59 * (1 - reportStats.denegados / reportStats.total)
                                }
                                strokeLinecap="round"
                                fill="transparent"
                                style={{
                                  transformOrigin: 'center',
                                  transform: `rotate(${
                                    (reportStats.terminados / reportStats.total) * 360
                                  }deg)`,
                                }}
                              />
                            )}
                          </svg>

                          {/* Centro del Donut */}
                          <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                              {reportStats.tasaExito}%
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Éxito Operativo
                            </span>
                          </div>
                        </div>

                        {/* Leyenda de Estados */}
                        <div className="w-full space-y-1.5 mt-2 text-xs">
                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-bold text-slate-700 text-[11px]">Terminados</span>
                            </div>
                            <span className="font-black text-slate-900 text-xs">
                              {reportStats.terminados}{' '}
                              <span className="font-normal text-slate-400 text-[10px]">
                                ({reportStats.total > 0 ? Math.round((reportStats.terminados / reportStats.total) * 100) : 0}%)
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                              <span className="font-bold text-slate-700 text-[11px]">Denegados</span>
                            </div>
                            <span className="font-black text-slate-900 text-xs">
                              {reportStats.denegados}{' '}
                              <span className="font-normal text-slate-400 text-[10px]">
                                ({reportStats.total > 0 ? Math.round((reportStats.denegados / reportStats.total) * 100) : 0}%)
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                              <span className="font-bold text-slate-700 text-[11px]">Cancelados</span>
                            </div>
                            <span className="font-black text-slate-900 text-xs">
                              {reportStats.cancelados}{' '}
                              <span className="font-normal text-slate-400 text-[10px]">
                                ({reportStats.total > 0 ? Math.round((reportStats.cancelados / reportStats.total) * 100) : 0}%)
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VISTA 2: BARRAS DE DEMANDA POR TRÁMITE */}
                    {tipoGraficoReporte === 'tramites' && (
                      <div className="space-y-3 py-1 animate-fadeIn">
                        <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                          <span>Trámite Solicitado</span>
                          <span>Volumen</span>
                        </div>
                        {reportStats.tramitesSorted.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 font-medium">
                            No hay atenciones para graficar
                          </div>
                        ) : (
                          reportStats.tramitesSorted.slice(0, 5).map((tr, idx) => (
                            <div key={tr.nombre} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800 truncate max-w-[190px]" title={tr.nombre}>
                                  {idx + 1}. {tr.nombre}
                                </span>
                                <span className="font-black text-slate-900 text-xs">
                                  {tr.count} <span className="text-[10px] text-slate-400 font-medium">({tr.porcentaje}%)</span>
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-500"
                                  style={{ width: `${Math.max(tr.porcentaje, 8)}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* VISTA 3: AFLUENCIA POR FRANJA HORARIA */}
                    {tipoGraficoReporte === 'horarios' && (
                      <div className="space-y-3 py-1 animate-fadeIn">
                        <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                          <span>Franja Horaria</span>
                          <span>Atenciones</span>
                        </div>
                        {reportStats.horariosData.map((hr) => (
                          <div key={hr.tramo} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-slate-800 text-[11px] truncate">{hr.tramo}</span>
                                {hr.isPeak && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                                    Punta
                                  </span>
                                )}
                              </div>
                              <span className="font-black text-slate-900 text-xs">
                                {hr.count} <span className="text-[10px] text-slate-400 font-medium">({hr.pct}%)</span>
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  hr.isPeak
                                    ? 'bg-gradient-to-r from-red-600 to-amber-500'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                                }`}
                                style={{ width: `${Math.max(hr.pct, 8)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* KPIs Inferiores Consolidados */}
                  <div className="w-full grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 mt-4 text-left">
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-[10px] uppercase font-black text-slate-400 block">Total Atenciones</span>
                      <p className="text-lg font-black text-slate-900 mt-0.5">{reportStats.total}</p>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-xl">
                      <span className="text-[10px] uppercase font-black text-emerald-600 block">Tasa Éxito</span>
                      <p className="text-lg font-black text-emerald-700 mt-0.5">{reportStats.tasaExito}%</p>
                    </div>
                  </div>
                </div>

                {/* Panel Derecho: Tabla Detallada de Atenciones */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700">
                      Registro de Atenciones ({filteredReportes.length} resultados)
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Filtrado por: {reporteAgencia === 'todas' ? 'Todas las sedes' : reporteAgencia}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5">Hora</th>
                          <th className="p-3.5">Estado</th>
                          <th className="p-3.5">Cliente</th>
                          <th className="p-3.5">Trámite</th>
                          <th className="p-3.5">Agencia / Sede</th>
                          <th className="p-3.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-xs">
                        {filteredReportes.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                              No hay citas registradas para los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          filteredReportes.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3.5 font-bold font-mono text-slate-900">{item.hora}</td>
                              <td className="p-3.5">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    item.estado === 'Terminado'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.estado === 'Cancelado'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.estado}
                                </span>
                              </td>
                              <td className="p-3.5 font-extrabold text-slate-800">{item.cliente}</td>
                              <td className="p-3.5 text-slate-600 font-medium">{item.tramite}</td>
                              <td className="p-3.5 text-slate-500 text-[11px]">
                                <div>{item.agencia}</div>
                                <div className="text-[10px] text-slate-400">{item.ventanilla}</div>
                              </td>
                              <td className="p-3.5 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedReporteItem(item);
                                    setModalReporteDetalleOpen(true);
                                  }}
                                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition"
                                >
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* HOJA DE IMPRESIÓN OFICIAL (Visible al pulsar Imprimir / PDF) */}
              {/* ========================================================= */}
              <div className="hidden print:block p-8 bg-white text-slate-950 font-sans max-w-4xl mx-auto space-y-6">
                {/* Cabecera Oficial Banco de la Nación */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-red-700">
                  <div className="flex items-center gap-3">
                    <LogoBancoNacion showSubtitle={true} className="h-12" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black uppercase text-red-700 tracking-wider block">
                      BANCO DE LA NACIÓN DEL PERÚ
                    </span>
                    <span className="text-sm font-black text-slate-900 block">
                      REPORTE EJECUTIVO DE GESTIÓN OPERATIVA
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      Sistema de Agendamiento Web • Confidencial
                    </span>
                  </div>
                </div>

                {/* Recuadro de Auditoría y Parámetros del Reporte */}
                <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs">
                  <span className="font-black text-slate-800 uppercase tracking-wider text-[11px] block mb-2">
                    Parámetros y Filtros Utilizados en la Consulta
                  </span>
                  <div className="grid grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 font-bold block uppercase text-[10px]">Rango Temporal</span>
                      <strong className="text-slate-900 capitalize font-extrabold">
                        {reporteFecha === 'hoy' ? 'Fecha de Hoy' : reporteFecha === 'semana' ? 'Esta Semana' : 'Este Mes'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block uppercase text-[10px]">Sede / Agencia</span>
                      <strong className="text-slate-900 font-extrabold">
                        {reporteAgencia === 'todas' ? 'Todas las Agencias' : reporteAgencia}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block uppercase text-[10px]">Filtro de Estado</span>
                      <strong className="text-slate-900 capitalize font-extrabold">
                        {reporteEstado === 'todos' ? 'Todos los Estados' : reporteEstado}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block uppercase text-[10px]">Fecha de Emisión</span>
                      <strong className="text-slate-900 font-extrabold">
                        {new Date().toLocaleDateString('es-PE')} {new Date().toLocaleTimeString('es-PE')}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Resumen Ejecutivo de Métricas */}
                <div>
                  <span className="font-black text-slate-800 uppercase tracking-wider text-[11px] block mb-2">
                    Resumen de Indicadores Clave de Desempeño (KPIs)
                  </span>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="p-3 border border-slate-200 rounded-xl bg-slate-50">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Atenciones</span>
                      <span className="text-xl font-black text-slate-900 block mt-1">{reportStats.total}</span>
                    </div>
                    <div className="p-3 border border-emerald-200 rounded-xl bg-emerald-50/50">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Tasa de Éxito</span>
                      <span className="text-xl font-black text-emerald-800 block mt-1">{reportStats.tasaExito}%</span>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl bg-slate-50">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Terminados</span>
                      <span className="text-xl font-black text-slate-900 block mt-1">{reportStats.terminados}</span>
                    </div>
                    <div className="p-3 border border-rose-200 rounded-xl bg-rose-50/50">
                      <span className="text-[10px] uppercase font-bold text-rose-700 block">Cancelados / Denegados</span>
                      <span className="text-xl font-black text-rose-800 block mt-1">
                        {reportStats.cancelados + reportStats.denegados}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desglose Impreso del Gráfico Activo */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <span className="font-black text-slate-800 uppercase tracking-wider text-[11px] block mb-2">
                    Desglose Analítico Activo ({tipoGraficoReporte === 'estados' ? 'Distribución por Estados' : tipoGraficoReporte === 'tramites' ? 'Demanda por Trámite' : 'Afluencia por Horarios'})
                  </span>
                  {tipoGraficoReporte === 'estados' && (
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Terminados con Éxito</span>
                        <span className="font-black text-slate-900 text-sm">{reportStats.terminados} ({reportStats.total > 0 ? Math.round((reportStats.terminados / reportStats.total) * 100) : 0}%)</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-amber-700 block">Denegados</span>
                        <span className="font-black text-slate-900 text-sm">{reportStats.denegados} ({reportStats.total > 0 ? Math.round((reportStats.denegados / reportStats.total) * 100) : 0}%)</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-rose-700 block">Cancelados / Inasistencias</span>
                        <span className="font-black text-slate-900 text-sm">{reportStats.cancelados} ({reportStats.total > 0 ? Math.round((reportStats.cancelados / reportStats.total) * 100) : 0}%)</span>
                      </div>
                    </div>
                  )}
                  {tipoGraficoReporte === 'tramites' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {reportStats.tramitesSorted.map((tr, i) => (
                        <div key={tr.nombre} className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between">
                          <span className="font-bold text-slate-800">{i + 1}. {tr.nombre}</span>
                          <span className="font-black text-slate-900">{tr.count} ({tr.porcentaje}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {tipoGraficoReporte === 'horarios' && (
                    <div className="grid grid-cols-4 gap-2 text-xs text-center">
                      {reportStats.horariosData.map((hr) => (
                        <div key={hr.tramo} className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 block truncate">{hr.tramo}</span>
                          <span className="font-black text-slate-900 text-sm mt-1 block">{hr.count} ({hr.pct}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tabla Oficial de Citas Listadas */}
                <div>
                  <span className="font-black text-slate-800 uppercase tracking-wider text-[11px] block mb-2">
                    Detalle Oficial de Atenciones ({filteredReportes.length} Registros)
                  </span>
                  <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                    <thead className="bg-slate-200 text-slate-800 text-[10px] font-black uppercase">
                      <tr>
                        <th className="p-2 border border-slate-300">Hora</th>
                        <th className="p-2 border border-slate-300">Estado</th>
                        <th className="p-2 border border-slate-300">Cliente</th>
                        <th className="p-2 border border-slate-300">Trámite</th>
                        <th className="p-2 border border-slate-300">Agencia / Sede</th>
                        <th className="p-2 border border-slate-300">Atendido Por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      {filteredReportes.map((item) => (
                        <tr key={item.id} className="border-b border-slate-200">
                          <td className="p-2 font-mono font-bold text-slate-900">{item.hora}</td>
                          <td className="p-2 font-extrabold uppercase text-[10px]">
                            {item.estado}
                          </td>
                          <td className="p-2 font-bold text-slate-900">{item.cliente}</td>
                          <td className="p-2 text-slate-700">{item.tramite}</td>
                          <td className="p-2 text-slate-700">{item.agencia} - {item.ventanilla}</td>
                          <td className="p-2 text-slate-700">{item.atendidoPor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bloque de Firmas y Pie de Página de Conformidad */}
                <div className="pt-8 mt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="w-48 mx-auto border-b border-slate-400 mb-1" />
                    <span className="font-extrabold text-slate-900 block">{operatorName}</span>
                    <span className="text-[10px] text-slate-500 block">
                      {userRole === 'ADMIN_GENERAL' ? 'Administrador General' : 'Administrador de Sede'}
                    </span>
                  </div>
                  <div>
                    <div className="w-48 mx-auto border-b border-slate-400 mb-1" />
                    <span className="font-extrabold text-slate-900 block">Sello y Firma de Conformidad</span>
                    <span className="text-[10px] text-slate-500 block">Supervisión Operativa BN</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* MODALES CRUD INTERACTIVOS */}
      {/* ========================================================= */}

      {/* Modal: Nueva / Editar Agencia */}
      {modalAgenciaOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-scaleUp my-6 max-h-[92vh] flex flex-col">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {editingAgencia
                    ? agenciaModalTab === 'datos'
                      ? `Editar Sede: ${editingAgencia.nombre}`
                      : agenciaModalTab === 'horario'
                      ? `Editar Horario y Ventanillas: ${editingAgencia.nombre}`
                      : `Editar Trámites: ${editingAgencia.nombre}`
                    : 'Nueva Agencia Operativa'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {editingAgencia
                    ? 'Modifica los datos principales, ventanillas, horarios o trámites de la sede bancaria.'
                    : 'Configura la agencia, geolocalízala en el mapa, define ventanillas, horarios y sus trámites.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAgenciaOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pestañas de navegación interna (Disponibles tanto en creación como en edición) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl my-3 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setAgenciaModalTab('datos')}
                className={`flex-1 py-2 rounded-lg transition text-center ${
                  agenciaModalTab === 'datos'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Sede y Mapa
              </button>
              <button
                type="button"
                onClick={() => setAgenciaModalTab('horario')}
                className={`flex-1 py-2 rounded-lg transition text-center ${
                  agenciaModalTab === 'horario'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Ventanillas y Horario
              </button>
              <button
                type="button"
                onClick={() => setAgenciaModalTab('tramites')}
                className={`flex-1 py-2 rounded-lg transition text-center ${
                  agenciaModalTab === 'tramites'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Trámites ({agenciaForm.tramitesSeleccionados.length})
              </button>
            </div>

            <form
              onSubmit={handleSaveAgencia}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  if (!editingAgencia && agenciaModalTab !== 'tramites') {
                    e.preventDefault();
                  }
                }
              }}
              className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs font-bold text-slate-700"
            >
              {/* PESTAÑA 1: DATOS GENERALES Y MAPA */}
              {agenciaModalTab === 'datos' && (
                <div className="space-y-3.5 animate-fadeIn">
                  <div>
                    <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">Nombre de la Agencia *</label>
                    <input
                      type="text"
                      required
                      value={agenciaForm.nombre}
                      onChange={(e) => setAgenciaForm({ ...agenciaForm, nombre: e.target.value })}
                      placeholder="Ej: Agencia San Isidro Financiera"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                    />
                  </div>

                  {/* Selectores Territoriales Cascadas: Región, Provincia, Distrito */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block mb-1 uppercase tracking-wider text-[10px] text-slate-600">
                        1. Región / Depto *
                      </label>
                      <select
                        value={agenciaForm.departamento}
                        onChange={(e) => {
                          const newDep = e.target.value;
                          const depObj = PERU_UBIGEO.find((d) => d.nombre === newDep);
                          const firstProv = depObj?.provincias[0]?.nombre || '';
                          const firstDist = depObj?.provincias[0]?.distritos[0] || '';
                          setAgenciaForm({
                            ...agenciaForm,
                            departamento: newDep,
                            provincia: firstProv,
                            distrito: firstDist,
                          });
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600 shadow-sm"
                      >
                        {PERU_UBIGEO.map((d) => (
                          <option key={d.nombre} value={d.nombre}>
                            {d.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 uppercase tracking-wider text-[10px] text-slate-600">
                        2. Provincia *
                      </label>
                      <select
                        value={agenciaForm.provincia}
                        onChange={(e) => {
                          const newProv = e.target.value;
                          const provObj = availableProvincias.find((p) => p.nombre === newProv);
                          const firstDist = provObj?.distritos[0] || '';
                          setAgenciaForm({
                            ...agenciaForm,
                            provincia: newProv,
                            distrito: firstDist,
                          });
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600 shadow-sm"
                      >
                        {availableProvincias.map((p) => (
                          <option key={p.nombre} value={p.nombre}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 uppercase tracking-wider text-[10px] text-slate-600">
                        3. Distrito *
                      </label>
                      <select
                        value={agenciaForm.distrito}
                        onChange={(e) => {
                          setAgenciaForm({
                            ...agenciaForm,
                            distrito: e.target.value,
                          });
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600 shadow-sm"
                      >
                        {availableDistritos.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="uppercase tracking-wider text-[11px] text-slate-600">Dirección Física *</label>
                        <span className="text-[10px] text-emerald-600 font-medium hidden sm:inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Se autocompleta con el mapa</span>
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={agenciaForm.direccion}
                        onChange={(e) => setAgenciaForm({ ...agenciaForm, direccion: e.target.value })}
                        placeholder="Ej: Av. Rivera Navarrete 525"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">
                        Dirección sugerida automáticamente según el punto en el mapa (editable).
                      </p>
                    </div>
                    <div>
                      <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">Teléfono (Opcional)</label>
                      <input
                        type="text"
                        value={agenciaForm.telefono}
                        onChange={(e) => setAgenciaForm({ ...agenciaForm, telefono: e.target.value })}
                        placeholder="Ej: 01-315-9000"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                      />
                    </div>
                  </div>

                  {/* Mapa Interactivo con Leaflet y Auto-desplazamiento territorial */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="uppercase tracking-wider text-[11px] text-slate-600">
                        Geolocalización en Mapa (Buscador predictivo por provincia)
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Zona: {agenciaForm.distrito}, {agenciaForm.provincia}
                      </span>
                    </div>
                    <AgencyLocationPicker
                      initialLat={agenciaForm.latitud}
                      initialLng={agenciaForm.longitud}
                      departamento={agenciaForm.departamento}
                      provincia={agenciaForm.provincia}
                      distrito={agenciaForm.distrito}
                      direccion={agenciaForm.direccion}
                      availableDistritos={availableDistritos}
                      onChange={({ lat, lng }) => {
                        setAgenciaForm((prev) => ({ ...prev, latitud: lat, longitud: lng }));
                      }}
                      onAddressFound={(detectedAddress, detectedDist) => {
                        setAgenciaForm((prev) => {
                          const updates: any = { ...prev, direccion: detectedAddress };
                          if (detectedDist && availableDistritos.includes(detectedDist)) {
                            updates.distrito = detectedDist;
                          }
                          return updates;
                        });
                      }}
                    />
                  </div>

                  {editingAgencia && (
                    <div className="pt-2">
                      <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">Estado de la Agencia</label>
                      <select
                        value={agenciaForm.estado}
                        onChange={(e) => setAgenciaForm({ ...agenciaForm, estado: e.target.value })}
                        className="w-full sm:w-60 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600"
                      >
                        <option value="Activo">Activo (Operativo al público)</option>
                        <option value="Inactivo">Inactivo (Fuera de servicio)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 2: VENTANILLAS Y HORARIO */}
              {agenciaModalTab === 'horario' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Ventanillas */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <label className="block uppercase tracking-wider text-[11px] text-slate-700">
                      Ventanillas de Atención al Público
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        required
                        value={agenciaForm.ventanillas}
                        onChange={(e) => setAgenciaForm({ ...agenciaForm, ventanillas: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-24 p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-red-600"
                      />
                      <span className="text-xs text-slate-500 font-medium">
                        Se registrarán automáticamente: {Array.from({ length: agenciaForm.ventanillas }, (_, i) => `V-${String(i + 1).padStart(2, '0')}`).join(', ')}.
                      </span>
                    </div>
                  </div>

                  {/* Horario de Atención */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="uppercase tracking-wider text-[11px] text-slate-700">
                        Días de Atención al Público
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={agenciaForm.diasSemana.includes(6)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAgenciaForm({ ...agenciaForm, diasSemana: [...agenciaForm.diasSemana, 6] });
                              } else {
                                setAgenciaForm({ ...agenciaForm, diasSemana: agenciaForm.diasSemana.filter((d) => d !== 6) });
                              }
                            }}
                            className="rounded text-red-600 focus:ring-red-500"
                          />
                          Incluir Sábado (Día 6)
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block mb-1 text-[10px] text-slate-500 uppercase">Apertura</label>
                        <input
                          type="time"
                          required
                          value={agenciaForm.horaApertura}
                          onChange={(e) => setAgenciaForm({ ...agenciaForm, horaApertura: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[10px] text-slate-500 uppercase">Cierre</label>
                        <input
                          type="time"
                          required
                          value={agenciaForm.horaCierre}
                          onChange={(e) => setAgenciaForm({ ...agenciaForm, horaCierre: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[10px] text-slate-500 uppercase">Inicio Almuerzo</label>
                        <input
                          type="time"
                          value={agenciaForm.horaInicioAlmuerzo}
                          onChange={(e) => setAgenciaForm({ ...agenciaForm, horaInicioAlmuerzo: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[10px] text-slate-500 uppercase">Fin Almuerzo</label>
                        <input
                          type="time"
                          value={agenciaForm.horaFinAlmuerzo}
                          onChange={(e) => setAgenciaForm({ ...agenciaForm, horaFinAlmuerzo: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 font-medium flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        <strong>Intervalo de Turnos:</strong> 15 minutos por defecto. La duración de las citas se adapta al tiempo establecido en el trámite.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: TRÁMITES ASOCIADOS */}
              {agenciaModalTab === 'tramites' && (
                <div className="space-y-3 animate-fadeIn">
                  {agenciaForm.tramitesSeleccionados.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Selecciona al menos un trámite para esta agencia antes de poder guardarla.
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{agenciaForm.tramitesSeleccionados.length} trámite(s) seleccionado(s) listos para vincular.</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">
                      Elige los trámites disponibles en esta agencia:
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAgenciaForm({
                            ...agenciaForm,
                            tramitesSeleccionados: tramitesList.filter((t) => t.estado === 'Activo').map((t) => t.id),
                          })
                        }
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
                      >
                        Marcar Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgenciaForm({ ...agenciaForm, tramitesSeleccionados: [] })}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                    {tramitesList.map((tr) => {
                      const isSelected = agenciaForm.tramitesSeleccionados.includes(tr.id);
                      return (
                        <label
                          key={tr.id}
                          className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition text-xs ${
                            isSelected
                              ? 'bg-red-50/60 border-red-300 text-red-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAgenciaForm({
                                  ...agenciaForm,
                                  tramitesSeleccionados: [...agenciaForm.tramitesSeleccionados, tr.id],
                                });
                              } else {
                                setAgenciaForm({
                                  ...agenciaForm,
                                  tramitesSeleccionados: agenciaForm.tramitesSeleccionados.filter((id) => id !== tr.id),
                                });
                              }
                            }}
                            className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                          />
                          <div>
                            <span className="block leading-tight">{tr.nombre}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              Duración estándar (múltiplos de 15 min)
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botonera de Acción */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setModalAgenciaOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancelar
                </button>

                <div className="flex gap-2">
                  {editingAgencia ? (
                    <button
                      key="btn-modal-guardar-edicion"
                      type="submit"
                      disabled={isSavingAgencia}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold shadow-md transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSavingAgencia && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      <span>Guardar Cambios de la Sede</span>
                    </button>
                  ) : (
                    <>
                      {agenciaModalTab !== 'datos' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (agenciaModalTab === 'tramites') setAgenciaModalTab('horario');
                            else if (agenciaModalTab === 'horario') setAgenciaModalTab('datos');
                          }}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                        >
                          ← Anterior
                        </button>
                      )}

                      {agenciaModalTab !== 'tramites' ? (
                        <button
                          key="btn-modal-siguiente"
                          type="button"
                          onClick={() => {
                            if (!agenciaForm.nombre || !agenciaForm.distrito || !agenciaForm.direccion) {
                              alert('Por favor completa el nombre, distrito y dirección antes de avanzar.');
                              return;
                            }
                            if (agenciaModalTab === 'datos') setAgenciaModalTab('horario');
                            else if (agenciaModalTab === 'horario') setAgenciaModalTab('tramites');
                          }}
                          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md transition"
                        >
                          Siguiente →
                        </button>
                      ) : (
                        <button
                          key="btn-modal-guardar"
                          type="submit"
                          disabled={
                            isSavingAgencia || (!canSubmitAgencia || agenciaForm.tramitesSeleccionados.length === 0)
                          }
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSavingAgencia && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          )}
                          <span>
                            {agenciaForm.tramitesSeleccionados.length === 0
                              ? 'Elige al menos 1 trámite'
                              : `Crear Agencia (${agenciaForm.tramitesSeleccionados.length} trámites)`}
                          </span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo / Editar Trámite */}
      {modalTramiteOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-scaleUp my-6 max-h-[92vh] flex flex-col">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {editingTramite
                    ? tramiteModalTab === 'datos'
                      ? `Editar Datos: ${editingTramite.nombre}`
                      : `Editar Requisitos: ${editingTramite.nombre}`
                    : 'Nuevo Trámite Bancario'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {editingTramite
                    ? 'Actualiza el nombre, duración estimada en ventanilla o requisitos solicitados.'
                    : 'Registra un nuevo trámite bancario, su duración estimada y sus requisitos.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalTramiteOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pestañas internas: Datos vs Requisitos */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl my-3 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setTramiteModalTab('datos')}
                className={`flex-1 py-2 rounded-lg transition text-center ${
                  tramiteModalTab === 'datos'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Datos y Duración
              </button>
              <button
                type="button"
                onClick={() => setTramiteModalTab('requisitos')}
                className={`flex-1 py-2 rounded-lg transition text-center ${
                  tramiteModalTab === 'requisitos'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Requisitos ({tramiteForm.requisitos.length})
              </button>
            </div>

            <form onSubmit={handleSaveTramite} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs font-bold text-slate-700">
              {/* PESTAÑA 1: DATOS Y DURACIÓN */}
              {tramiteModalTab === 'datos' && (
                <div className="space-y-3.5 animate-fadeIn">
                  <div>
                    <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">Nombre del Trámite *</label>
                    <input
                      type="text"
                      required
                      value={tramiteForm.nombre}
                      onChange={(e) => setTramiteForm({ ...tramiteForm, nombre: e.target.value })}
                      placeholder="Ej: Apertura de Cuenta de Ahorros"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">Descripción del Trámite (Opcional)</label>
                    <textarea
                      rows={3}
                      value={tramiteForm.descripcion}
                      onChange={(e) => setTramiteForm({ ...tramiteForm, descripcion: e.target.value })}
                      placeholder="Indica de qué trata este trámite, a quién está dirigido o detalles para el cliente..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                        Duración Estimada en Ventanilla *
                      </label>
                      <select
                        value={tramiteForm.duracionMinutos}
                        onChange={(e) => setTramiteForm({ ...tramiteForm, duracionMinutos: parseInt(e.target.value) || 15 })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-red-600"
                      >
                        <option value={15}>15 minutos (Trámite Rápido)</option>
                        <option value={20}>20 minutos (Estándar)</option>
                        <option value={30}>30 minutos (Atención Media)</option>
                        <option value={45}>45 minutos (Atención Compleja)</option>
                        <option value={60}>60 minutos (Créditos / Asesoría)</option>
                      </select>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Determina el cálculo de los turnos e intervalos en la agenda.
                      </p>
                    </div>

                    {editingTramite && (
                      <div>
                        <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                          Estado del Trámite
                        </label>
                        <select
                          value={tramiteForm.estado}
                          onChange={(e) => setTramiteForm({ ...tramiteForm, estado: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600"
                        >
                          <option value="Activo">Activo (Disponible para citas)</option>
                          <option value="Inactivo">Inactivo (Deshabilitado)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: GESTIÓN DE REQUISITOS DINÁMICOS */}
              {tramiteModalTab === 'requisitos' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs text-slate-600 font-medium">
                      Documentos y requisitos que el cliente debe presentar:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTramiteForm({
                          ...tramiteForm,
                          requisitos: [
                            ...tramiteForm.requisitos,
                            { descripcion_requisito: '', es_obligatorio: true },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>+ Añadir Requisito</span>
                    </button>
                  </div>

                  {tramiteForm.requisitos.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                      <FileTextIcon className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-medium">
                        No hay requisitos registrados para este trámite.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setTramiteForm({
                            ...tramiteForm,
                            requisitos: [
                              { descripcion_requisito: 'DNI vigente original y copia legible', es_obligatorio: true },
                            ],
                          })
                        }
                        className="text-xs font-bold text-red-600 hover:text-red-700 underline"
                      >
                        Añadir el primer requisito
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto p-1">
                      {tramiteForm.requisitos.map((req, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl group hover:border-slate-300 transition"
                        >
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-black text-[11px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            required
                            value={req.descripcion_requisito}
                            onChange={(e) => {
                              const updated = [...tramiteForm.requisitos];
                              updated[idx].descripcion_requisito = e.target.value;
                              setTramiteForm({ ...tramiteForm, requisitos: updated });
                            }}
                            placeholder="Ej: DNI vigente original y copia legible"
                            className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-red-600"
                          />
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 shrink-0 px-2 py-1 bg-white rounded-lg border border-slate-200 select-none">
                            <input
                              type="checkbox"
                              checked={req.es_obligatorio}
                              onChange={(e) => {
                                const updated = [...tramiteForm.requisitos];
                                updated[idx].es_obligatorio = e.target.checked;
                                setTramiteForm({ ...tramiteForm, requisitos: updated });
                              }}
                              className="rounded text-red-600 focus:ring-red-500"
                            />
                            <span>{req.es_obligatorio ? 'Obligatorio' : 'Opcional'}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = tramiteForm.requisitos.filter((_, i) => i !== idx);
                              setTramiteForm({ ...tramiteForm, requisitos: updated });
                            }}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition shrink-0"
                            title="Eliminar requisito"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Botonera de Acción */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setModalTramiteOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancelar
                </button>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingTramite}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold shadow-md transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingTramite && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{editingTramite ? 'Guardar Cambios del Trámite' : 'Crear Trámite'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo / Editar Personal Institucional */}
      {modalPersonalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-scaleUp my-6 max-h-[92vh] flex flex-col">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {editingPersonal
                    ? personalModalTab === 'datos'
                      ? `Editar Colaborador: ${editingPersonal.nombre_completo}`
                      : `Asignar Sede / Ventanilla: ${editingPersonal.nombre_completo}`
                    : 'Nuevo Colaborador Institucional'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {editingPersonal
                    ? 'Actualiza los datos personales, cargo o asignación operativa de ventanilla.'
                    : 'Registra un nuevo colaborador bancario y asigna su sede física y rol operativo.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalPersonalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition font-black text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas del Modal */}
            <div className="flex gap-2 pt-3 border-b border-slate-100 text-xs font-extrabold">
              <button
                type="button"
                onClick={() => setPersonalModalTab('datos')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  personalModalTab === 'datos'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>1. Datos y Acceso</span>
              </button>
              <button
                type="button"
                onClick={() => setPersonalModalTab('sede')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  personalModalTab === 'sede'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <BuildingIcon className="w-4 h-4" />
                <span>2. Rol y Sede Operativa</span>
              </button>
            </div>

            <form onSubmit={handleSavePersonal} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-1">
              {/* PESTAÑA 1: DATOS PERSONALES Y ACCESO */}
              {personalModalTab === 'datos' && (
                <div className="space-y-3.5 animate-fadeIn text-xs font-bold text-slate-700">
                  <div>
                    <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                      DNI (8 dígitos) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      pattern="[0-9]{8}"
                      value={personalForm.dni}
                      onChange={(e) => setPersonalForm({ ...personalForm, dni: e.target.value.replace(/\D/g, '') })}
                      placeholder="Ej: 76929984"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                        Nombres <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={personalForm.nombres}
                        onChange={(e) => setPersonalForm({ ...personalForm, nombres: e.target.value })}
                        placeholder="Ej: Leonardo"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                        Apellidos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={personalForm.apellidos}
                        onChange={(e) => setPersonalForm({ ...personalForm, apellidos: e.target.value })}
                        placeholder="Ej: Cruz Gonzales"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                        Correo Institucional <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={personalForm.correo}
                        onChange={(e) => setPersonalForm({ ...personalForm, correo: e.target.value })}
                        placeholder="ejemplo@bn.com.pe"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                        Teléfono (Opcional)
                      </label>
                      <input
                        type="tel"
                        value={personalForm.telefono}
                        onChange={(e) => setPersonalForm({ ...personalForm, telefono: e.target.value })}
                        placeholder="Ej: 987654321"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                      />
                    </div>
                  </div>

                  {/* Banner Informativo de Contraseña Institucional por Defecto */}
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-4 h-4 text-amber-800" />
                    </div>
                    <div>
                      <span className="font-extrabold text-amber-900 text-xs block">
                        Contraseña Institucional Automática
                      </span>
                      <p className="text-[11px] text-amber-800 font-normal leading-relaxed mt-0.5">
                        Al crear este colaborador se le asignará automáticamente la contraseña institucional por defecto:{' '}
                        <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 text-amber-950">
                          Banco2026*
                        </strong>
                        . El colaborador podrá acceder al sistema de inmediato con su correo o DNI.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: ROL Y UBICACIÓN OPERATIVA */}
              {personalModalTab === 'sede' && (
                <div className="space-y-4 animate-fadeIn text-xs font-bold text-slate-700">
                  {/* Selector de Rol: Tarjetas de Radio / Segmented Control */}
                  <div>
                    <label className="block mb-2 uppercase tracking-wider text-[11px] text-slate-600 font-extrabold">
                      Rol Institucional Asignado <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Rol 1: Agente Ventanilla */}
                      <button
                        type="button"
                        onClick={() => {
                          setPersonalForm((prev) => ({
                            ...prev,
                            id_rol: 2,
                          }));
                        }}
                        className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                          personalForm.id_rol === 2
                            ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                            <UserCheck className="w-4 h-4 text-emerald-700" />
                          </div>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              personalForm.id_rol === 2
                                ? 'border-emerald-600 bg-emerald-600'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {personalForm.id_rol === 2 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div>
                          <span className="font-black text-slate-900 text-xs block">Agente Ventanilla</span>
                          <span className="text-[10px] text-slate-500 font-normal leading-tight block mt-0.5">
                            Atención directa en ventanilla de sede
                          </span>
                        </div>
                      </button>

                      {/* Rol 2: Administrador Agencia */}
                      <button
                        type="button"
                        onClick={() => {
                          setPersonalForm((prev) => ({
                            ...prev,
                            id_rol: 3,
                            id_ventanilla: null, // Administradores no atienden ventanilla
                          }));
                        }}
                        className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                          personalForm.id_rol === 3
                            ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                            <Building2 className="w-4 h-4 text-blue-700" />
                          </div>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              personalForm.id_rol === 3 ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {personalForm.id_rol === 3 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div>
                          <span className="font-black text-slate-900 text-xs block">Admin Agencia</span>
                          <span className="text-[10px] text-slate-500 font-normal leading-tight block mt-0.5">
                            Supervisión de sede local
                          </span>
                        </div>
                      </button>

                      {/* Rol 3: Administrador General */}
                      <button
                        type="button"
                        onClick={() => {
                          setPersonalForm((prev) => ({
                            ...prev,
                            id_rol: 4,
                            id_agencia: null,
                            id_ventanilla: null,
                          }));
                          setAgencySearchTerm('');
                          setIsAgencyDropdownOpen(false);
                          setAvailableWindowsForPersonal([]);
                        }}
                        className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                          personalForm.id_rol === 4
                            ? 'border-red-600 bg-red-50/70 ring-2 ring-red-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold text-sm">
                            <ShieldCheck className="w-4 h-4 text-red-700" />
                          </div>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              personalForm.id_rol === 4 ? 'border-red-600 bg-red-600' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {personalForm.id_rol === 4 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div>
                          <span className="font-black text-slate-900 text-xs block">Admin General</span>
                          <span className="text-[10px] text-slate-500 font-normal leading-tight block mt-0.5">
                            Gobernanza nacional global
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Lógica condicional: Si es Administrador General, bloquear con banner institucional */}
                  {personalForm.id_rol === 4 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3.5 animate-fadeIn">
                      <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center text-lg shrink-0 shadow-xs">
                        <Landmark className="w-5 h-5 text-red-700" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-900 block">Sede Central / Supervisión Global</span>
                        <p className="text-[11px] text-slate-500 font-normal leading-relaxed mt-0.5">
                          El Administrador General supervisa todas las sucursales del país de forma centralizada y no requiere estar asignado a una agencia o ventanilla física operativa.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Fila de Ubicación: Agencia y Ventanilla en retícula de 2 columnas */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start animate-fadeIn">
                      {/* Columna 1: Campo de Agencia (Autocompletado / Combobox con buscador) */}
                      <div className="space-y-1 relative">
                        <label className="block uppercase tracking-wider text-[11px] text-slate-600 font-extrabold">
                          Agencia Bancaria Asignada <span className="text-red-500">*</span>
                        </label>

                        {/* Si ya hay agencia seleccionada y dropdown cerrado */}
                        {personalForm.id_agencia && !isAgencyDropdownOpen ? (
                          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <BuildingIcon className="w-4 h-4 text-red-700 shrink-0" />
                              <div className="truncate">
                                <span className="font-black text-slate-900 text-xs block truncate">
                                  {agenciasList.find((a) => a.id === personalForm.id_agencia)?.nombre || 'Agencia seleccionada'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium block truncate">
                                  {agenciasList.find((a) => a.id === personalForm.id_agencia)?.lugar || ''}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAgencyDropdownOpen(true);
                                setAgencySearchTerm('');
                              }}
                              className="text-[11px] text-red-600 hover:text-red-800 font-extrabold px-2.5 py-1 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition shrink-0 ml-2"
                            >
                              Cambiar
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="relative">
                              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                autoFocus={isAgencyDropdownOpen}
                                value={agencySearchTerm}
                                onChange={(e) => {
                                  setAgencySearchTerm(e.target.value);
                                  setIsAgencyDropdownOpen(true);
                                }}
                                onFocus={() => setIsAgencyDropdownOpen(true)}
                                placeholder="Escribe para buscar agencia..."
                                className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-xs"
                              />
                                {agencySearchTerm && (
                                  <button
                                    type="button"
                                    onClick={() => setAgencySearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                            </div>

                            {/* Menú desplegable flotante de agencias */}
                            {isAgencyDropdownOpen && (
                              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                                {filteredAgenciesForCombobox.length === 0 ? (
                                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                                    No se encontraron agencias coincidentes
                                  </div>
                                ) : (
                                  filteredAgenciesForCombobox.map((ag) => (
                                    <button
                                      key={ag.id}
                                      type="button"
                                      onClick={async () => {
                                        setPersonalForm((prev) => ({
                                          ...prev,
                                          id_agencia: ag.id,
                                          id_ventanilla: null, // Reiniciar ventanilla en cascada
                                        }));
                                        setAgencySearchTerm(`${ag.nombre} (${ag.lugar})`);
                                        setIsAgencyDropdownOpen(false);
                                        await loadAgencyWindows(ag.id, editingPersonal?.id_usuario);
                                      }}
                                      className={`w-full p-2.5 text-left text-xs transition flex items-center justify-between hover:bg-red-50/50 ${
                                        personalForm.id_agencia === ag.id
                                          ? 'bg-red-50 text-red-900 font-extrabold'
                                          : 'text-slate-800'
                                      }`}
                                    >
                                      <div className="truncate pr-2">
                                        <span className="font-extrabold block text-xs truncate">{ag.nombre}</span>
                                        <span className="text-[10px] text-slate-500 font-medium block truncate">
                                          {ag.distrito}{ag.provincia ? `, ${ag.provincia}` : ''}
                                        </span>
                                      </div>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold shrink-0">
                                        {ag.ventanillas || 1} vent.
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Columna 2: Campo de Ventanilla (Comportamiento dependiente en cascada) */}
                      <div className="space-y-1">
                        <label className="block uppercase tracking-wider text-[11px] text-slate-600 font-extrabold">
                          Ventanilla de Atención {personalForm.id_rol === 2 && <span className="text-red-500">*</span>}
                        </label>

                        {/* Si el rol es Administrador de Agencia: Bloqueado con texto explicativo */}
                        {personalForm.id_rol === 3 ? (
                          <div>
                            <input
                              type="text"
                              disabled
                              value="No aplica para administradores de sede"
                              className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 cursor-not-allowed select-none"
                            />
                            <span className="text-[10px] text-slate-400 font-medium block mt-1">
                              Los administradores supervisan la sede completa y no atienden ventanillas.
                            </span>
                          </div>
                        ) : !personalForm.id_agencia ? (
                          /* Estado inicial: Sin agencia seleccionada -> Deshabilitado con placeholder sutil */
                          <div>
                            <select
                              disabled
                              className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 cursor-not-allowed select-none"
                            >
                              <option>Primero selecciona una agencia</option>
                            </select>
                            <span className="text-[10px] text-slate-400 font-medium block mt-1">
                              Elige la agencia a la izquierda para cargar sus ventanillas disponibles.
                            </span>
                          </div>
                        ) : (
                          /* Con agencia seleccionada -> Habilitado con lista de ventanillas e indicador de ocupación */
                          <div>
                            {availableWindowsForPersonal.length > 0 ? (
                              <div>
                                <select
                                  value={personalForm.id_ventanilla || ''}
                                  onChange={(e) =>
                                    setPersonalForm({
                                      ...personalForm,
                                      id_ventanilla: e.target.value ? Number(e.target.value) : null,
                                    })
                                  }
                                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition shadow-xs"
                                >
                                  <option value="">-- Sin ventanilla fija asignada --</option>
                                  {availableWindowsForPersonal.map((w) => (
                                    <option
                                      key={w.id_ventanilla}
                                      value={w.id_ventanilla}
                                      disabled={w.is_occupied}
                                      className={w.is_occupied ? 'text-red-500 bg-red-50' : 'text-slate-900'}
                                    >
                                      Ventanilla {w.numero_ventanilla}{' '}
                                      {w.is_occupied
                                        ? `[OCUPADA: ${w.assigned_to_name}]`
                                        : '[DISPONIBLE]'}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium mt-1">
                                  <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                    {availableWindowsForPersonal.filter((w) => !w.is_occupied).length} disponible(s)
                                  </span>
                                  {availableWindowsForPersonal.some((w) => w.is_occupied) && (
                                    <span className="flex items-center gap-1.5 text-rose-700 font-bold">
                                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                                      {availableWindowsForPersonal.filter((w) => w.is_occupied).length} ocupada(s)
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium leading-tight">
                                Esta agencia no tiene ventanillas activas registradas aún.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Estado (solo en edición) */}
                  {editingPersonal && (
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600 font-extrabold">
                        Estado de la Cuenta
                      </label>
                      <select
                        value={personalForm.activo ? 'activo' : 'inactivo'}
                        disabled={personalForm.id_rol === 4}
                        onChange={(e) => setPersonalForm({ ...personalForm, activo: e.target.value === 'activo' })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition disabled:opacity-50"
                      >
                        <option value="activo">Activo (Habilitado para operar)</option>
                        <option value="inactivo">Inactivo (Sesión bloqueada)</option>
                      </select>
                      {personalForm.id_rol === 4 && (
                        <span className="text-[10px] text-slate-400 block mt-1">
                          El Administrador General está protegido por gobernanza y no puede marcarse como inactivo.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Botonera de Acción */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setModalPersonalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition text-xs"
                >
                  Cancelar
                </button>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingPersonal}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold shadow-md transition disabled:opacity-50 flex items-center gap-2 text-xs"
                  >
                    {isSavingPersonal && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{editingPersonal ? 'Guardar Cambios' : 'Crear Colaborador'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar / Editar Cliente */}
      {modalClientOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingClient ? 'Editar Datos del Ciudadano' : 'Registrar Nuevo Cliente'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {editingClient
                    ? 'Actualiza el correo, teléfono o estado de habilitación del cliente.'
                    : 'Ingresa los datos para registrar al ciudadano y permitirle agendar citas.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalClientOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition font-black text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 pt-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                  DNI del Ciudadano <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  disabled={!!editingClient}
                  value={clientForm.dni}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setClientForm({ ...clientForm, dni: val });
                  }}
                  placeholder="8 dígitos (Ej: 45892134)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {editingClient && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    El DNI es el identificador oficial único y no puede modificarse tras el registro.
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                    Nombres <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientForm.nombres}
                    onChange={(e) => setClientForm({ ...clientForm, nombres: e.target.value })}
                    placeholder="Ej: María Elena"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                  />
                </div>
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientForm.apellidos}
                    onChange={(e) => setClientForm({ ...clientForm, apellidos: e.target.value })}
                    placeholder="Ej: Torres Quispe"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={clientForm.correo}
                    onChange={(e) => setClientForm({ ...clientForm, correo: e.target.value })}
                    placeholder="cliente@correo.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                  />
                </div>
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                    Teléfono Celular
                  </label>
                  <input
                    type="tel"
                    value={clientForm.telefono}
                    onChange={(e) => setClientForm({ ...clientForm, telefono: e.target.value })}
                    placeholder="Ej: 984512345"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                  />
                </div>
              </div>

              {/* Si está en edición: estado de habilitación */}
              {editingClient && (
                <div>
                  <label className="block mb-1 uppercase tracking-wider text-[11px] text-slate-600">
                    Estado de la Cuenta
                  </label>
                  <select
                    value={clientForm.activo ? 'activo' : 'inactivo'}
                    onChange={(e) => setClientForm({ ...clientForm, activo: e.target.value === 'activo' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-red-600 transition"
                  >
                    <option value="activo">Habilitado (Puede solicitar citas)</option>
                    <option value="inactivo">Inhabilitado / Bloqueado (Acceso suspendido)</option>
                  </select>
                </div>
              )}

              {/* Banner informativo de credenciales de cliente */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4 text-blue-800" />
                </div>
                <div>
                  <span className="font-extrabold text-blue-900 text-xs block">
                    Acceso para Ciudadanos
                  </span>
                  <p className="text-[11px] text-blue-800 font-normal leading-relaxed mt-0.5">
                    El ciudadano podrá consultar y agendar citas utilizando su <strong>DNI</strong> y correo electrónico registrado.
                  </p>
                </div>
              </div>

              {/* Botonera de Acción */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setModalClientOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition text-xs"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingClient}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold shadow-md transition disabled:opacity-50 flex items-center gap-2 text-xs"
                >
                  {isSavingClient && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Expediente / Historial de Citas del Cliente */}
      {modalClientHistoryOpen && selectedClientForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Expediente de Citas
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-xs text-slate-800">{selectedClientForHistory.nombre_completo}</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    DNI: {selectedClientForHistory.dni}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalClientHistoryOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition font-black text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 space-y-3">
              {isLoadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Cargando expediente de citas...</span>
                </div>
              ) : clientAppointmentsHistory.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    <FileClock className="w-6 h-6 text-slate-400" />
                  </div>
                  <span className="font-extrabold text-slate-800 text-xs mt-2">Sin citas registradas</span>
                  <p className="text-[11px] text-slate-500 max-w-xs font-medium">
                    Este ciudadano aún no cuenta con citas programadas ni historial de atenciones en el sistema.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {clientAppointmentsHistory.map((cita) => (
                    <div
                      key={cita.id_cita}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 text-xs">
                            {cita.codigo_cita}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              cita.estado_cita === 'atendida'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cita.estado_cita === 'cancelada' || cita.estado_cita === 'rechazada'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {cita.estado_cita}
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-800 block text-xs">
                          {cita.tramite_nombre}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {cita.agencia_nombre} • {cita.numero_ventanilla}
                        </span>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <span className="font-extrabold text-slate-900 block text-xs">
                          {cita.fecha}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px] block">
                          {cita.hora_inicio} - {cita.hora_fin}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setModalClientHistoryOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Cita en Reportes ("Ver") */}
      {modalReporteDetalleOpen && selectedReporteItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-black text-slate-900">
                Detalle de Atención
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black ${
                  selectedReporteItem.estado === 'Terminado'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedReporteItem.estado === 'Cancelado'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {selectedReporteItem.estado}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] uppercase font-black text-slate-400">Cliente</span>
                <p className="font-extrabold text-slate-900 text-sm">{selectedReporteItem.cliente}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] uppercase font-black text-slate-400">Trámite</span>
                <p className="font-extrabold text-slate-900 text-sm">{selectedReporteItem.tramite}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-black text-slate-400">Hora</span>
                  <p className="font-mono font-bold text-slate-900">{selectedReporteItem.hora}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-black text-slate-400">Agencia / Ventanilla</span>
                  <p className="font-bold text-slate-900 truncate">{selectedReporteItem.agencia}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-[10px] uppercase font-black text-slate-400">Atendido Por</span>
                <p className="font-bold text-slate-800">{selectedReporteItem.atendidoPor || 'Agente en Turno'}</p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setModalReporteDetalleOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition"
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
