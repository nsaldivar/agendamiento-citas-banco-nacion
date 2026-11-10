'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client';
import { QRCodeSVG } from '@/components/common/QRCodeSVG';

export interface CitizenAppointment {
  id_cita: string;
  codigo_cita: string;
  tramite_nombre: string;
  agencia_nombre: string;
  numero_ventanilla: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado_cita: string;
  codigo_qr?: string | null;
}

export function ClienteDashboardView() {
  const router = useRouter();
  const [userName, setUserName] = useState('Maria Quispe Ciudadana');
  const [userDni, setUserDni] = useState('87654321');
  const [userEmail, setUserEmail] = useState('cliente.prueba@gmail.com');
  const [userId, setUserId] = useState('a0000000-0000-0000-0000-000000000003');
  const [appointments, setAppointments] = useState<CitizenAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState<string | null>(null);

  useEffect(() => {
    // 1. Cargar sesión de usuario
    let currentUserId = 'a0000000-0000-0000-0000-000000000003';
    try {
      const stored = localStorage.getItem('bn_user_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session.nombre) setUserName(session.nombre);
        if (session.dni) setUserDni(session.dni);
        if (session.email) setUserEmail(session.email);
        if (session.id_usuario) {
          setUserId(session.id_usuario);
          currentUserId = session.id_usuario;
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Cargar citas desde Supabase
    async function loadCitizenAppointments() {
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
          .eq('id_usuario', currentUserId)
          .order('fecha_registro', { ascending: false });

        if (error) {
          console.warn('Error al consultar citas de cliente:', error.message);
        } else if (data && data.length > 0) {
          const mapped: CitizenAppointment[] = (data as any[]).map((c) => ({
            id_cita: c.id_cita,
            codigo_cita: c.codigo_cita,
            tramite_nombre: c.tramite?.nombre_tramite || 'Trámite Bancario',
            agencia_nombre: c.ventanilla?.agencia?.nombre_agencia || 'Agencia Cusco Central',
            numero_ventanilla: c.ventanilla?.numero_ventanilla || 'V-01',
            fecha: c.fecha || '2026-09-24',
            hora_inicio: c.hora_inicio || '08:00',
            hora_fin: c.hora_fin || '08:15',
            estado_cita: c.estado_cita,
            codigo_qr: c.codigo_qr || c.codigo_cita,
          }));
          setAppointments(mapped);
        } else {
          // Fallback con la cita del seed demo
          setAppointments([
            {
              id_cita: 'c0000000-0000-0000-0000-000000000001',
              codigo_cita: 'CIT-2026-001',
              tramite_nombre: 'Apertura de Cuenta de Ahorros',
              agencia_nombre: 'Agencia Cusco Central',
              numero_ventanilla: 'V-01',
              fecha: '2026-09-23',
              hora_inicio: '08:00',
              hora_fin: '08:15',
              estado_cita: 'pendiente',
              codigo_qr: 'CIT-2026-001',
            },
          ]);
        }
      } catch (err) {
        console.error('Error cargando citas:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCitizenAppointments();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Rol Cliente */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white shadow-md">
            BN
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base">MI PORTAL CIUDADANO</h1>
            <span className="text-xs text-amber-400 font-semibold">ROL 1: CLIENTE</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-slate-400 hover:text-white px-3 py-1.5 transition">
            Inicio
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('bn_user_session');
              window.dispatchEvent(new Event('bn_session_change'));
              router.push('/');
            }}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-800 transition cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Contenido Cliente */}
      <main className="max-w-6xl w-full mx-auto p-6 space-y-6 flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-6 rounded-xl border border-slate-800 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Bienvenido, {userName}</h2>
            <p className="text-xs text-slate-400 mt-1">DNI: {userDni} | Correo: {userEmail}</p>
          </div>
          <Link href="/agendar" className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition shadow-md">
            + Agendar Nueva Cita
          </Link>
        </div>

        {/* Citas Pendientes */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="font-extrabold text-amber-400 text-sm uppercase tracking-wider">
            MIS CITAS REGISTRADAS
          </h3>

          {loading ? (
            <div className="text-center py-8 text-sm text-slate-400">Cargando tus citas desde Supabase...</div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              No tienes citas programadas actualmente.{' '}
              <Link href="/agendar" className="text-red-400 hover:underline font-bold">
                ¡Agenda tu primera cita aquí!
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((cita) => (
                <div
                  key={cita.id_cita}
                  className="border border-slate-800 rounded-lg p-5 bg-slate-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border ${
                      cita.estado_cita === 'pendiente'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : cita.estado_cita === 'atendida'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {cita.estado_cita}
                    </span>
                    <h4 className="font-bold text-white text-lg mt-2">{cita.tramite_nombre}</h4>
                    <p className="text-xs text-slate-400">{cita.agencia_nombre} ({cita.numero_ventanilla})</p>
                    <p className="text-xs text-slate-400">
                      Fecha: {cita.fecha} | Horario: {cita.hora_inicio} - {cita.hora_fin}
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1.5 w-full md:w-auto">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                      CÓDIGO CITA
                    </span>
                    <span className="font-mono text-amber-400 font-extrabold text-base block">
                      {cita.codigo_cita}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQrModal(cita.codigo_qr || cita.codigo_cita)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline pt-1 inline-block"
                    >
                      Ver Código QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal Visualizador de QR */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h4 className="font-black text-slate-900 text-base">CÓDIGO QR DE ATENCIÓN</h4>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block mx-auto">
              <QRCodeSVG value={showQrModal} size={180} />
            </div>
            <p className="text-xs font-mono text-slate-700 font-bold">{showQrModal}</p>
            <p className="text-xs text-slate-500">Muestra este código al agente en ventanilla para validar tu turno.</p>
            <button
              type="button"
              onClick={() => setShowQrModal(null)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
