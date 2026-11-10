'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogoBancoNacion } from '@/components/LogoBancoNacion';
import { UserIcon } from '@/components/Icons';

import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client';

export default function RegistroPage() {
  const router = useRouter();
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    let assignedId = 'a0000000-0000-0000-0000-000000000099';

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: correo,
        password: password,
        options: {
          data: {
            dni,
            nombres,
            apellidos,
            telefono,
          },
        },
      });

      if (data?.user?.id) {
        assignedId = data.user.id;
        // Almacenar la contraseña en perfil_usuario para el login tradicional
        await supabase
          .from('perfil_usuario')
          .update({ password_hash: password })
          .eq('id_usuario', assignedId);
      } else if (error) {
        console.warn('Nota de registro auth:', error.message);
      }
    } catch (err: any) {
      console.warn('Error al llamar a Supabase auth:', err?.message);
    }

    const sessionData = {
      authenticated: true,
      id_usuario: assignedId,
      email: correo,
      dni,
      nombres,
      apellidos,
      nombre: `${nombres} ${apellidos}`.trim() || 'Ciudadano',
      telefono,
      id_rol: 1,
      role: 'CLIENTE',
    };
    localStorage.setItem('bn_user_session', JSON.stringify(sessionData));
    setLoading(false);
    router.push('/agendar');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-red-600 selection:text-white">
      <div className="mb-6">
        <Link href="/">
          <LogoBancoNacion showSubtitle={true} className="h-14" />
        </Link>
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-600 flex items-center justify-center font-extrabold text-red-700 text-xl mx-auto mb-4 shadow-sm">
          <UserIcon className="w-8 h-8 text-red-600" />
        </div>

        <div className="text-center mb-6 space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Registro de Ciudadano</h1>
          <p className="text-sm text-slate-600 font-medium">Crea tu cuenta para gestionar tus citas</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">DNI</label>
            <input
              type="text"
              required
              maxLength={8}
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="12345678"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Nombres</label>
              <input
                type="text"
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                placeholder="Juan"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Apellidos</label>
              <input
                type="text"
                required
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Pérez"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Correo electrónico</label>
            <input
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="usuario@empresa.com"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Teléfono / Celular</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="987654321"
              maxLength={15}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold rounded-xl shadow-md hover:shadow-red-200 transition text-base uppercase tracking-wider mt-2 disabled:opacity-50"
          >
            {loading ? 'CREANDO CUENTA...' : 'CREAR MI CUENTA'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 font-medium">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-extrabold text-red-700 underline hover:text-red-800 transition">
            Inicia sesión
          </Link>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-xs font-extrabold text-slate-600 hover:text-red-700 transition">
          ← Volver a la página principal
        </Link>
      </div>
    </div>
  );
}
