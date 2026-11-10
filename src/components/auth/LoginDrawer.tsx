'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogoBancoNacion } from '@/components/LogoBancoNacion';
import {
  CalendarIcon,
  FileTextIcon,
} from '@/components/Icons';
import { QRCodeSVG } from '@/components/QRCodeSVG';
import { SupabaseUserRepository } from '@/infrastructure/repositories/supabase-user-repository';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client';

export interface CitizenAppointmentDetail {
  id_cita: string;
  codigo_cita: string;
  tramite_nombre: string;
  agencia_nombre: string;
  numero_ventanilla: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado_cita: string;
  codigo_qr: string;
  cliente_nombre?: string;
  cliente_dni?: string;
}

interface LoginDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  redirectUrl?: string;
  tramiteId?: number | null;
  agenciaId?: number | null;
  onSessionChange?: (session: any) => void;
}

export function LoginDrawer({
  isOpen,
  onClose,
  redirectUrl = '/',
  tramiteId,
  agenciaId,
  onSessionChange,
}: LoginDrawerProps) {
  const router = useRouter();

  // Estados de sesión activa
  const [userSession, setUserSession] = useState<any>(null);

  // Citas del historial del cliente
  const [appointments, setAppointments] = useState<CitizenAppointmentDetail[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Modal para ver detalle de cita y QR
  const [selectedAppointmentForModal, setSelectedAppointmentForModal] =
    useState<CitizenAppointmentDetail | null>(null);

  // Estados del formulario de Login
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDemoRole, setSelectedDemoRole] = useState<string | null>(null);

  const userRepo = new SupabaseUserRepository();

  // Leer sesión guardada en localStorage
  const checkStoredSession = () => {
    try {
      const stored = localStorage.getItem('bn_user_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.authenticated) {
          setUserSession(parsed);
          return parsed;
        }
      }
    } catch {
      // Ignorar errores de parseo
    }
    setUserSession(null);
    return null;
  };

  // Cargar sesión y datos cuando el drawer se abre
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      const session = checkStoredSession();
      if (session && isClientRole(session)) {
        loadCitizenAppointments(session.id_usuario);
      }
    }
  }, [isOpen]);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedAppointmentForModal) {
          setSelectedAppointmentForModal(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedAppointmentForModal, onClose]);

  // Helper para verificar si es rol cliente
  const isClientRole = (session: any) => {
    if (!session) return false;
    const r = String(session.role || '').toUpperCase();
    return r === 'CLIENTE' || r === 'CIUDADANO' || session.id_rol === 1;
  };

  // Cargar citas del cliente desde Supabase
  const loadCitizenAppointments = async (userId: string) => {
    setLoadingAppointments(true);
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
          tramite:id_tramite ( nombre_tramite ),
          ventanilla:id_ventanilla (
            numero_ventanilla,
            agencia:id_agencia ( nombre_agencia )
          )
        `)
        .eq('id_usuario', userId)
        .order('fecha_registro', { ascending: false });

      if (error) {
        console.warn('Error al consultar citas de cliente:', error.message);
      } else if (data && data.length > 0) {
        const mapped: CitizenAppointmentDetail[] = (data as any[]).map((c) => ({
          id_cita: c.id_cita,
          codigo_cita: c.codigo_cita,
          tramite_nombre: c.tramite?.nombre_tramite || 'Trámite Bancario',
          agencia_nombre: c.ventanilla?.agencia?.nombre_agencia || 'Agencia Cusco Central',
          numero_ventanilla: c.ventanilla?.numero_ventanilla || 'V-01',
          fecha: c.fecha || '2026-10-08',
          hora_inicio: c.hora_inicio || '08:00',
          hora_fin: c.hora_fin || '08:15',
          estado_cita: c.estado_cita,
          codigo_qr: c.codigo_qr || c.codigo_cita,
          cliente_nombre: userSession?.nombre || 'Maria Quispe Ciudadana',
          cliente_dni: userSession?.dni || '87654321',
        }));
        setAppointments(mapped);
      } else {
        // Cita inicial de demostración
        setAppointments([
          {
            id_cita: 'demo-1',
            codigo_cita: 'CIT-2026-001',
            tramite_nombre: 'Apertura de Cuenta de Ahorros',
            agencia_nombre: 'Agencia Cusco Central',
            numero_ventanilla: 'V-01',
            fecha: '2026-09-23',
            hora_inicio: '08:00',
            hora_fin: '08:15',
            estado_cita: 'atendida',
            codigo_qr: 'CIT-2026-001',
            cliente_nombre: userSession?.nombre || 'Maria Quispe Ciudadana',
            cliente_dni: userSession?.dni || '87654321',
          },
        ]);
      }
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Redirigir hacia la interfaz de Agendar Cita
  const handleGoToAgendar = () => {
    onClose();
    const params = new URLSearchParams();
    if (tramiteId) params.set('tramiteId', String(tramiteId));
    if (agenciaId) params.set('agenciaId', String(agenciaId));
    const targetUrl = params.toString() ? `/agendar?${params.toString()}` : '/agendar';
    router.push(targetUrl);
  };

  // Manejar Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoginLoading(true);

    try {
      const user = await userRepo.authenticateUser(identifier, password);

      if (!user) {
        setErrorMessage('DNI / Correo o contraseña incorrectos en Supabase.');
        setLoginLoading(false);
        return;
      }

      const sessionData = {
        authenticated: true,
        id_usuario: user.id_usuario,
        dni: user.dni,
        email: user.correo,
        nombre:
          user.nombre_completo ||
          `${user.nombres || ''} ${user.apellidos || ''}`.trim() ||
          'Usuario',
        role: user.rol,
        id_rol: user.id_rol,
        rol_nombre: user.rol_nombre,
        id_agencia: user.id_agencia,
        agencia_nombre: user.agencia_nombre,
      };

      localStorage.setItem('bn_user_session', JSON.stringify(sessionData));
      window.dispatchEvent(new Event('bn_session_change'));
      if (onSessionChange) onSessionChange(sessionData);

      const normalizedRole = String(user.rol).toUpperCase();

      // Redirecciones solo para roles administrativos / operativos
      if (normalizedRole === 'ADMIN_GENERAL' || user.id_rol === 4) {
        onClose();
        router.push('/admin-general?adminNotice=true');
        return;
      }
      if (normalizedRole === 'ADMIN_AGENCIA' || user.id_rol === 3) {
        onClose();
        router.push('/admin-agencia?adminNotice=true');
        return;
      }
      if (
        normalizedRole === 'AGENTE' ||
        normalizedRole === 'AGENTE_VENTANILLA' ||
        user.id_rol === 2
      ) {
        onClose();
        router.push('/ventanilla?adminNotice=true');
        return;
      }

      // Si es CLIENTE: transformar este Drawer en su Portal de Citas
      setUserSession(sessionData);
      loadCitizenAppointments(sessionData.id_usuario);
    } catch (err: any) {
      console.error('Error de autenticación unificada:', err);
      setErrorMessage(err?.message || 'Error al conectar con la base de datos de Supabase.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Cerrar Sesión del Cliente
  const handleLogout = () => {
    localStorage.removeItem('bn_user_session');
    window.dispatchEvent(new Event('bn_session_change'));
    if (onSessionChange) onSessionChange(null);
    setUserSession(null);
    setAppointments([]);
    setIdentifier('');
    setPassword('');
    onClose();
    router.push('/');
  };

  // Prefill de credenciales para demos
  const handlePrefill = (demoUser: string, demoPass: string, roleName: string) => {
    setIdentifier(demoUser);
    setPassword(demoPass);
    setSelectedDemoRole(roleName);
    setErrorMessage(null);
  };

  // Descargar el código QR como imagen comprobante PNG
  const handleDownloadQR = (appointment: CitizenAppointmentDetail) => {
    const svg = document.getElementById(`qr-svg-${appointment.codigo_cita}`);
    if (!svg) {
      alert('No se pudo encontrar el gráfico del código QR para descargar.');
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 440;
      canvas.height = 560;
      if (ctx) {
        // Fondo blanco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Encabezado Rojo Banco de la Nación
        ctx.fillStyle = '#C8102E';
        ctx.fillRect(0, 0, canvas.width, 75);

        // Textos del encabezado
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BANCO DE LA NACIÓN', canvas.width / 2, 32);
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('COMPROBANTE OFICIAL DE CITA PREVIA', canvas.width / 2, 54);

        // Código QR al centro
        ctx.drawImage(img, (canvas.width - 200) / 2, 95, 200, 200);

        // Código de turno
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(appointment.codigo_cita, canvas.width / 2, 330);

        // Línea divisoria
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, 345);
        ctx.lineTo(410, 345);
        ctx.stroke();

        // Datos del turno
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#334155';
        ctx.fillText(`Trámite: ${appointment.tramite_nombre}`, 30, 375);
        ctx.fillText(`Agencia: ${appointment.agencia_nombre}`, 30, 405);
        ctx.fillText(`Ventanilla: ${appointment.numero_ventanilla}`, 30, 435);
        ctx.fillText(`Fecha: ${appointment.fecha} • Horario: ${appointment.hora_inicio} hs`, 30, 465);
        ctx.fillText(`Ciudadano: ${appointment.cliente_nombre || userSession?.nombre || 'Cliente'}`, 30, 495);
        ctx.fillText(`DNI: ${appointment.cliente_dni || userSession?.dni || ''}`, 30, 525);
      }

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `comprobante-cita-${appointment.codigo_cita}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!isOpen) return null;

  const isClient = isClientRole(userSession);

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
        {/* Fondo oscuro translúcido */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer"
          aria-hidden="true"
        />

        {/* Panel lateral deslizante derecho */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
          <div className="w-screen max-w-md sm:max-w-lg bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out">
            
            {/* CABECERA DEL DRAWER */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <LogoBancoNacion showSubtitle={false} className="scale-90 origin-left" />
              <div className="flex items-center gap-2">
                {isClient && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg border border-emerald-300 uppercase tracking-wider">
                    ● En Línea
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200 flex items-center justify-center text-sm font-bold transition cursor-pointer"
                  title="Cerrar ventana"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* CUERPO DEL DRAWER */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

              {/* ============================================================== */}
              {/* CASO A: CLIENTE CON SESIÓN ACTIVA (PORTAL Y CITAS)             */}
              {/* ============================================================== */}
              {isClient ? (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* TARJETA DEL USUARIO CONECTADO */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg border-l-4 border-red-600 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-lg shadow-md border-2 border-white/20">
                          {userSession.nombre ? userSession.nombre.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                            Portal Ciudadano • Sesión Iniciada
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                            {userSession.nombre}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-700/60 font-medium">
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase font-bold">DNI / Documento</span>
                        <strong className="text-white font-mono text-xs">{userSession.dni || 'No registrado'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase font-bold">Correo Electrónico</span>
                        <strong className="text-white text-xs truncate block">{userSession.email || 'Sin correo'}</strong>
                      </div>
                    </div>

                    {/* BOTONES DE ACCIÓN: REDIRIGIR A INTERFAZ AGENDAR CITA Y CERRAR SESIÓN */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                      <button
                        type="button"
                        onClick={handleGoToAgendar}
                        className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-red-900/30"
                      >
                        <CalendarIcon className="w-4 h-4" />
                        <span>+ Registrar una Cita</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="py-3 px-3.5 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-white border border-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                        title="Cerrar Sesión"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>

                  {/* HISTORIAL DE CITAS DEL CLIENTE */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                        <FileTextIcon className="w-4 h-4 text-red-600" />
                        <span>Historial de Citas</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => loadCitizenAppointments(userSession.id_usuario)}
                        className="text-xs font-bold text-red-700 hover:text-red-900 transition flex items-center gap-1 cursor-pointer"
                        title="Actualizar citas"
                      >
                        <span className={loadingAppointments ? 'animate-spin inline-block' : ''}>🔄</span>
                        <span>Refrescar</span>
                      </button>
                    </div>

                    {loadingAppointments ? (
                      <div className="py-8 text-center text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        <span>Consultando citas registradas en Supabase...</span>
                      </div>
                    ) : appointments.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-xs space-y-2">
                        <p className="font-bold">Aún no tienes citas agendadas.</p>
                        <p>Haz clic en el botón "+ Registrar una Cita" de arriba para programar tu turno en las interfaces de agendamiento.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {appointments.map((appt) => (
                          <div
                            key={appt.id_cita}
                            className="bg-white border border-slate-200 hover:border-red-400 rounded-xl p-3.5 shadow-sm transition space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-red-700 text-xs tracking-wider">
                                {appt.codigo_cita}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  appt.estado_cita === 'atendida'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : appt.estado_cita === 'en_atencion'
                                    ? 'bg-blue-100 text-blue-800 animate-pulse'
                                    : appt.estado_cita === 'rechazada'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {appt.estado_cita === 'atendida'
                                  ? '✓ Atendida'
                                  : appt.estado_cita === 'en_atencion'
                                  ? '● En Ventanilla'
                                  : appt.estado_cita === 'rechazada'
                                  ? '✕ Rechazada'
                                  : '⌛ En Espera'}
                              </span>
                            </div>

                            <div>
                              <strong className="text-xs font-black text-slate-900 block leading-tight">
                                {appt.tramite_nombre}
                              </strong>
                              <span className="text-[11px] text-slate-500 font-medium block">
                                {appt.agencia_nombre} • {appt.numero_ventanilla}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                              <span>📅 {appt.fecha} • {appt.hora_inicio} hs</span>
                              <button
                                type="button"
                                onClick={() => setSelectedAppointmentForModal(appt)}
                                className="px-3 py-1 bg-slate-900 hover:bg-red-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wider transition flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <span>Ver Cita / QR</span>
                                <span>🔍</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ============================================================== */
                /* CASO B: FORMULARIO DE LOGIN UNIFICADO                          */
                /* ============================================================== */
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Iniciar Sesión
                    </h3>
                    <p className="text-xs text-slate-500">
                      Acceso unificado para Ciudadanos y Personal del Banco de la Nación.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 bg-red-100 border border-red-300 rounded-xl text-red-800 text-xs font-bold animate-fadeIn">
                      {errorMessage}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                        DNI o Correo Electrónico
                      </label>
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Ej: 87654321 o cliente.prueba@gmail.com"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-md text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loginLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Validando en Supabase...</span>
                        </>
                      ) : (
                        'Ingresar al Sistema'
                      )}
                    </button>
                  </form>

                  {/* Accesos rápidos Demo */}
                  <div className="pt-4 border-t border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Cuentas Demo para Pruebas:
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Clave: Banco2026*</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-left">
                      <button
                        type="button"
                        onClick={() => handlePrefill('87654321', 'Banco2026*', 'Cliente')}
                        className={`p-2.5 rounded-xl border text-xs transition flex flex-col gap-0.5 cursor-pointer ${
                          selectedDemoRole === 'Cliente'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-200'
                            : 'bg-slate-50 hover:bg-emerald-50/70 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-extrabold uppercase text-emerald-700">1. Cliente</span>
                        <span className="font-mono text-slate-900 font-bold text-[11px]">87654321</span>
                        <span className="text-[10px] text-slate-500 truncate">Maria Quispe</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrefill('12345678', 'Banco2026*', 'Ventanilla')}
                        className={`p-2.5 rounded-xl border text-xs transition flex flex-col gap-0.5 cursor-pointer ${
                          selectedDemoRole === 'Ventanilla'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-200'
                            : 'bg-slate-50 hover:bg-blue-50/70 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-extrabold uppercase text-blue-700">2. Ventanilla</span>
                        <span className="font-mono text-slate-900 font-bold text-[11px]">12345678</span>
                        <span className="text-[10px] text-slate-500 truncate">Juan Pérez</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrefill('41235678', 'Banco2026*', 'Admin Agencia')}
                        className={`p-2.5 rounded-xl border text-xs transition flex flex-col gap-0.5 cursor-pointer ${
                          selectedDemoRole === 'Admin Agencia'
                            ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-200'
                            : 'bg-slate-50 hover:bg-purple-50/70 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-extrabold uppercase text-purple-700">3. Admin Agencia</span>
                        <span className="font-mono text-slate-900 font-bold text-[11px]">41235678</span>
                        <span className="text-[10px] text-slate-500 truncate">Patricia Ramos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrefill('76929984', 'Banco2026*', 'Admin General')}
                        className={`p-2.5 rounded-xl border text-xs transition flex flex-col gap-0.5 cursor-pointer ${
                          selectedDemoRole === 'Admin General'
                            ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-200'
                            : 'bg-slate-50 hover:bg-red-50/70 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-extrabold uppercase text-red-700">4. Admin General</span>
                        <span className="font-mono text-slate-900 font-bold text-[11px]">76929984</span>
                        <span className="text-[10px] text-slate-500 truncate">J. Leonardo Cruz</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PIE DEL PANEL */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-center">
              <span className="text-[11px] text-slate-400 font-medium">
                Terminal Digital • Banco de la Nación del Perú © {new Date().getFullYear()}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL DE DETALLE DE CITA Y CÓDIGO QR DESCARGABLE              */}
      {/* ============================================================== */}
      {selectedAppointmentForModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Header del Ticket */}
            <div className="bg-red-700 text-white p-5 text-center relative">
              <button
                onClick={() => setSelectedAppointmentForModal(null)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-red-800 hover:bg-red-900 text-white flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
              <h4 className="text-xs font-black tracking-widest uppercase text-red-200">
                BANCO DE LA NACIÓN
              </h4>
              <h3 className="text-base font-black uppercase tracking-wide mt-0.5">
                COMPROBANTE DE CITA PREVIA
              </h3>
            </div>

            <div className="p-6 space-y-5 text-center">
              {/* Código de Turno */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  CÓDIGO DE TURNO
                </span>
                <span className="font-mono text-2xl font-black text-red-700">
                  {selectedAppointmentForModal.codigo_cita}
                </span>
              </div>

              {/* QR Code Dinámico con ID para descargar */}
              <div className="flex justify-center py-2">
                <QRCodeSVG
                  id={`qr-svg-${selectedAppointmentForModal.codigo_cita}`}
                  value={selectedAppointmentForModal.codigo_qr}
                  size={190}
                  className="shadow-md"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Muestra este código QR al llegar a la ventanilla para validar tu turno.
              </p>

              {/* Detalle del Trámite */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold">Trámite:</span>
                  <strong className="text-slate-900 text-right font-black">{selectedAppointmentForModal.tramite_nombre}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold">Agencia:</span>
                  <strong className="text-slate-900 text-right">{selectedAppointmentForModal.agencia_nombre}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold">Ventanilla:</span>
                  <strong className="text-slate-900 text-right">{selectedAppointmentForModal.numero_ventanilla}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-bold">Fecha y Hora:</span>
                  <strong className="text-slate-900 text-right">
                    {selectedAppointmentForModal.fecha} a las {selectedAppointmentForModal.hora_inicio} hs
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Ciudadano:</span>
                  <strong className="text-slate-900 text-right">
                    {selectedAppointmentForModal.cliente_nombre || userSession?.nombre || 'Cliente'} (DNI: {selectedAppointmentForModal.cliente_dni || userSession?.dni})
                  </strong>
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownloadQR(selectedAppointmentForModal)}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📥 Descargar QR / Comprobante</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAppointmentForModal(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
