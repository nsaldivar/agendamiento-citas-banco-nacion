import { UserProfile, StaffMember, ClientMember, roleIdToEnum } from '@/domain/entities/user';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client';
import { createClient } from '@supabase/supabase-js';

export class SupabaseUserRepository {
  async authenticateUser(identifier: string, contrasenia?: string): Promise<UserProfile | null> {
    const cleanIdentifier = identifier.trim();
    const cleanPassword = (contrasenia || '').trim();

    if (!cleanIdentifier || !cleanPassword) {
      return null;
    }

    const supabase = createSupabaseBrowserClient();

    // 1. Consultar perfil en perfil_usuario relacionando rol y agencia
    // Permitir ingresar tanto DNI como Correo electrónico
    let query = supabase
      .from('perfil_usuario')
      .select('*, rol:id_rol(nombre_rol), agencia:id_agencia(nombre_agencia)');

    if (cleanIdentifier.includes('@')) {
      query = query.ilike('correo', cleanIdentifier);
    } else if (/^\d+$/.test(cleanIdentifier)) {
      query = query.eq('dni', cleanIdentifier);
    } else {
      query = query.or(`dni.eq.${cleanIdentifier},correo.ilike.${cleanIdentifier}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error de consulta remota en Supabase perfil_usuario:', error.message);
      throw new Error(`Error en servidor remoto Supabase: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    const item = data[0];

    // 2. Validación de contraseña tradicional almacenada en perfil_usuario (password_hash)
    const dbPassword = item.password_hash ?? item.contraseña ?? (item as any)['contrasenia'] ?? null;
    let isValidPassword = false;

    if (dbPassword !== null && dbPassword !== undefined) {
      if (String(dbPassword).trim() === cleanPassword) {
        isValidPassword = true;
      }
    }

    // Respaldo secundario con Supabase Auth si está configurado
    if (!isValidPassword) {
      try {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: item.correo,
          password: cleanPassword,
        });
        if (!authErr) {
          isValidPassword = true;
        }
      } catch (authErr) {
        // Ignorar si auth no está sincronizado
      }
    }

    // Si la contraseña no coincide con la base de datos ni con auth, denegar acceso
    if (!isValidPassword) {
      return null;
    }

    const fullName = `${item.nombres || ''} ${item.apellidos || ''}`.trim() || item.correo;
    const roleEnum = roleIdToEnum(item.id_rol || 1);
    const roleName = (item.rol as any)?.nombre_rol || 'Cliente';
    const agencyName = (item.agencia as any)?.nombre_agencia || null;

    return {
      id_usuario: item.id_usuario,
      dni: item.dni,
      nombres: item.nombres,
      apellidos: item.apellidos,
      nombre_completo: fullName,
      correo: item.correo,
      telefono: item.telefono,
      id_rol: item.id_rol,
      rol_nombre: roleName,
      rol: roleEnum,
      id_agencia: item.id_agencia,
      agencia_nombre: agencyName,
      password_hash: item.password_hash ?? item.contraseña ?? null,
    };
  }

  async getUserById(id_usuario: string): Promise<UserProfile | null> {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('perfil_usuario')
      .select('*, rol:id_rol(nombre_rol), agencia:id_agencia(nombre_agencia)')
      .eq('id_usuario', id_usuario)
      .single();

    if (error || !data) return null;

    const item = data;
    const fullName = `${item.nombres || ''} ${item.apellidos || ''}`.trim() || item.correo;

    return {
      id_usuario: item.id_usuario,
      dni: item.dni,
      nombres: item.nombres,
      apellidos: item.apellidos,
      nombre_completo: fullName,
      correo: item.correo,
      telefono: item.telefono,
      id_rol: item.id_rol,
      rol_nombre: (item.rol as any)?.nombre_rol || 'Cliente',
      rol: roleIdToEnum(item.id_rol || 1),
      id_agencia: item.id_agencia,
      agencia_nombre: (item.agencia as any)?.nombre_agencia || null,
      password_hash: item.password_hash ?? item.contraseña ?? null,
    };
  }

  /**
   * Obtiene la lista de colaboradores institucionales (roles 2, 3 y 4)
   */
  async getStaffMembers(
    searchQuery?: string,
    filterRole?: string,
    filterStatus?: string,
    agencyId?: number | null
  ): Promise<StaffMember[]> {
    const supabase = createSupabaseBrowserClient();
    let query = supabase
      .from('perfil_usuario')
      .select('*, rol:id_rol(nombre_rol), agencia:id_agencia(nombre_agencia)')
      .in('id_rol', [2, 3, 4]);

    if (agencyId) {
      query = query.eq('id_agencia', agencyId);
    }

    const { data: users, error } = await query;
    if (error) {
      console.error('Error al obtener personal de Supabase:', error.message);
      return [];
    }

    // Consultar asignaciones de ventanilla activas
    const { data: assignments } = await supabase
      .from('personal_ventanilla')
      .select('id_usuario, id_ventanilla, ventanilla:id_ventanilla(numero_ventanilla)')
      .eq('activa', true);

    const assignmentMap = new Map<string, { id_ventanilla: number; numero_ventanilla: string }>();
    if (assignments) {
      assignments.forEach((asig: any) => {
        if (asig.id_usuario && asig.id_ventanilla) {
          assignmentMap.set(asig.id_usuario, {
            id_ventanilla: asig.id_ventanilla,
            numero_ventanilla: asig.ventanilla?.numero_ventanilla || `V-${asig.id_ventanilla}`,
          });
        }
      });
    }

    let staffList: StaffMember[] = (users || []).map((u: any) => {
      const asig = assignmentMap.get(u.id_usuario);
      const fullName = `${u.nombres || ''} ${u.apellidos || ''}`.trim() || u.correo;
      return {
        id_usuario: u.id_usuario,
        dni: u.dni,
        nombres: u.nombres || '',
        apellidos: u.apellidos || '',
        nombre_completo: fullName,
        correo: u.correo,
        telefono: u.telefono || null,
        id_rol: u.id_rol,
        rol_nombre: (u.rol as any)?.nombre_rol || (u.id_rol === 4 ? 'Administrador General' : u.id_rol === 3 ? 'Administrador Agencia' : 'Agente Ventanilla'),
        rol: roleIdToEnum(u.id_rol),
        id_agencia: u.id_agencia || null,
        agencia_nombre: (u.agencia as any)?.nombre_agencia || (u.id_rol === 4 ? 'Sede Central (Global)' : 'Sin agencia asignada'),
        id_ventanilla: asig?.id_ventanilla || null,
        numero_ventanilla: asig?.numero_ventanilla || null,
        activo: u.activo !== false,
      };
    });

    // Filtro de búsqueda en memoria si aplica
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      staffList = staffList.filter(
        (s) =>
          s.nombre_completo.toLowerCase().includes(q) ||
          s.dni.includes(q) ||
          s.correo.toLowerCase().includes(q) ||
          (s.agencia_nombre && s.agencia_nombre.toLowerCase().includes(q))
      );
    }

    // Filtro por rol
    if (filterRole && filterRole !== 'todos') {
      const roleId = Number(filterRole);
      if (!isNaN(roleId)) {
        staffList = staffList.filter((s) => s.id_rol === roleId);
      }
    }

    // Filtro por estado
    if (filterStatus && filterStatus !== 'todos') {
      const isActivo = filterStatus === 'activo';
      staffList = staffList.filter((s) => s.activo === isActivo);
    }

    return staffList;
  }

  /**
   * Obtiene las ventanillas activas de una agencia específica indicando si están ocupadas por otro agente
   */
  async getAgencyActiveWindows(
    id_agencia: number,
    currentUserId?: string
  ): Promise<Array<{
    id_ventanilla: number;
    numero_ventanilla: string;
    is_occupied: boolean;
    assigned_to_name?: string | null;
  }>> {
    if (!id_agencia) return [];
    const supabase = createSupabaseBrowserClient();
    const { data: windows, error } = await supabase
      .from('ventanilla')
      .select('id_ventanilla, numero_ventanilla, activa')
      .eq('id_agencia', id_agencia)
      .eq('activa', true)
      .order('numero_ventanilla', { ascending: true });

    if (error || !windows) return [];

    // Consultar asignaciones activas de ventanilla en esta sede
    const windowIds = windows.map((w) => w.id_ventanilla);
    const { data: assignments } = await supabase
      .from('personal_ventanilla')
      .select('id_ventanilla, id_usuario, usuario:id_usuario(nombres, apellidos)')
      .in('id_ventanilla', windowIds)
      .eq('activa', true);

    const assignmentMap = new Map<number, { id_usuario: string; name: string }>();
    if (assignments) {
      assignments.forEach((as: any) => {
        const u = as.usuario;
        const name = u ? `${u.nombres || ''} ${u.apellidos || ''}`.trim() : 'Otro colaborador';
        assignmentMap.set(as.id_ventanilla, { id_usuario: as.id_usuario, name });
      });
    }

    return windows.map((v) => {
      const assigned = assignmentMap.get(v.id_ventanilla);
      // Está ocupada si tiene un asignado y ese asignado NO es el usuario que estamos editando
      const isOccupiedByOther = Boolean(assigned && (!currentUserId || assigned.id_usuario !== currentUserId));
      return {
        id_ventanilla: v.id_ventanilla,
        numero_ventanilla: v.numero_ventanilla,
        is_occupied: isOccupiedByOther,
        assigned_to_name: assigned?.name || null,
      };
    });
  }

  /**
   * Registra un nuevo colaborador con la contraseña por defecto institucional 'Banco2026*'
   */
  async createStaffMember(staff: {
    dni: string;
    nombres: string;
    apellidos: string;
    correo: string;
    telefono?: string;
    id_rol: number;
    id_agencia?: number | null;
    id_ventanilla?: number | null;
  }): Promise<string> {
    const supabase = createSupabaseBrowserClient();
    const defaultPassword = 'Banco2026*';
    const cleanEmail = staff.correo.trim().toLowerCase();
    const newUserId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'b' + Math.random().toString(36).substring(2, 10) + '-0000-0000-0000-000000000000';

    // 1. Intentar inserción directa en perfil_usuario (instantánea, sin depender de SMTP ni límites de correos)
    const directPayload: any = {
      id_usuario: newUserId,
      dni: staff.dni.trim(),
      nombres: staff.nombres.trim(),
      apellidos: staff.apellidos.trim(),
      correo: cleanEmail,
      telefono: staff.telefono?.trim() || null,
      id_rol: staff.id_rol,
      id_agencia: staff.id_rol === 4 ? null : staff.id_agencia || null,
      password_hash: defaultPassword,
    };

    const { error: directInsertError } = await supabase
      .from('perfil_usuario')
      .insert(directPayload);

    let finalUserId = newUserId;

    if (directInsertError) {
      // Si falló por restricción de clave foránea a auth.users, intentar vía auth.signUp
      if (directInsertError.message?.includes('foreign key') || directInsertError.code === '23503') {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
        const isolatedClient = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: authData, error: authError } = await isolatedClient.auth.signUp({
          email: cleanEmail,
          password: defaultPassword,
          options: {
            data: {
              dni: staff.dni.trim(),
              nombres: staff.nombres.trim(),
              apellidos: staff.apellidos.trim(),
              telefono: staff.telefono?.trim() || null,
            },
          },
        });

        if (authError || !authData.user?.id) {
          if (authError?.message?.toLowerCase().includes('rate limit')) {
            throw new Error(
              'Límite de envío de correos de Supabase alcanzado (email rate limit exceeded). ' +
              'Para registrar personal sin límites de correo, ejecuta en tu Supabase SQL Editor: ' +
              'ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS perfil_usuario_id_usuario_fkey;'
            );
          }
          throw new Error(authError?.message || 'No se pudo crear la cuenta de usuario');
        }

        finalUserId = authData.user.id;

        // Actualizar datos y rol en perfil_usuario
        try {
          await supabase
            .from('perfil_usuario')
            .update({
              dni: staff.dni.trim(),
              nombres: staff.nombres.trim(),
              apellidos: staff.apellidos.trim(),
              correo: cleanEmail,
              telefono: staff.telefono?.trim() || null,
              id_rol: staff.id_rol,
              id_agencia: staff.id_rol === 4 ? null : staff.id_agencia || null,
              password_hash: defaultPassword,
            })
            .eq('id_usuario', finalUserId);
        } catch (e: any) {
          console.warn('Nota al actualizar perfil creado:', e.message);
        }
      } else {
        throw new Error(`Error en base de datos al guardar personal: ${directInsertError.message}`);
      }
    }

    // 2. Si es agente y se especificó ventanilla, registrar en personal_ventanilla
    if (staff.id_rol === 2 && staff.id_ventanilla) {
      await supabase.from('personal_ventanilla').insert({
        id_usuario: finalUserId,
        id_ventanilla: staff.id_ventanilla,
        fecha: new Date().toISOString().split('T')[0],
        activa: true,
      });
    }

    return finalUserId;
  }

  /**
   * Actualiza los datos, rol, sede y ventanilla del personal
   */
  async updateStaffMember(
    id_usuario: string,
    staff: {
      dni: string;
      nombres: string;
      apellidos: string;
      correo: string;
      telefono?: string;
      id_rol: number;
      id_agencia?: number | null;
      id_ventanilla?: number | null;
    }
  ): Promise<void> {
    const supabase = createSupabaseBrowserClient();

    const updatePayload: any = {
      dni: staff.dni.trim(),
      nombres: staff.nombres.trim(),
      apellidos: staff.apellidos.trim(),
      correo: staff.correo.trim().toLowerCase(),
      telefono: staff.telefono?.trim() || null,
      id_rol: staff.id_rol,
      id_agencia: staff.id_rol === 4 ? null : staff.id_agencia || null,
    };

    const { error } = await supabase.from('perfil_usuario').update(updatePayload).eq('id_usuario', id_usuario);
    if (error) {
      throw new Error(`Error al actualizar el personal: ${error.message}`);
    }

    // Gestión de asignación a ventanilla
    if (staff.id_rol === 2) {
      // Desactivar asignaciones previas
      await supabase.from('personal_ventanilla').update({ activa: false }).eq('id_usuario', id_usuario);

      if (staff.id_ventanilla) {
        await supabase.from('personal_ventanilla').insert({
          id_usuario,
          id_ventanilla: staff.id_ventanilla,
          fecha: new Date().toISOString().split('T')[0],
          activa: true,
        });
      }
    } else {
      // Si el rol es administrador, desactivar cualquier asignación de ventanilla
      await supabase.from('personal_ventanilla').update({ activa: false }).eq('id_usuario', id_usuario);
    }
  }

  /**
   * Alterna el estado activo/inactivo (inhabilitar sesión).
   * Solo disponible para Agentes (rol 2) y Administradores de Agencia (rol 3).
   * Administrador General (rol 4) está estrictamente protegido.
   */
  async toggleStaffStatus(id_usuario: string, newStatus: boolean, id_rol: number): Promise<void> {
    if (id_rol === 4) {
      throw new Error('Por políticas de seguridad y gobernanza bancaria, no se puede inhabilitar al Administrador General');
    }

    const supabase = createSupabaseBrowserClient();

    // Intentar actualizar columna activo en perfil_usuario
    try {
      await supabase
        .from('perfil_usuario')
        .update({ activo: newStatus } as any)
        .eq('id_usuario', id_usuario);
    } catch {
      // Columna no añadida aún
    }

    // Si es agente, actualizar el estado de su asignación en personal_ventanilla
    if (id_rol === 2) {
      await supabase
        .from('personal_ventanilla')
        .update({ activa: newStatus })
        .eq('id_usuario', id_usuario);
    }
  }

  /**
   * =========================================================================
   * GESTIÓN DE CLIENTES / CIUDADANOS (Rol 1)
   * =========================================================================
   */

  /**
   * Obtiene la lista de clientes ciudadanos con métricas de citas
   */
  async getClientMembers(): Promise<ClientMember[]> {
    const supabase = createSupabaseBrowserClient();

    // Consultar usuarios con rol 1 (CLIENTE) o sin rol asignado
    const { data: users, error } = await supabase
      .from('perfil_usuario')
      .select('*')
      .or('id_rol.eq.1,id_rol.is.null');

    if (error) {
      console.error('Error al obtener clientes de Supabase:', error.message);
      return [];
    }

    // Obtener resumen de citas
    const { data: citas } = await supabase
      .from('cita')
      .select('id_cita, id_usuario, estado_cita');

    const appointmentCounts = new Map<string, { total: number; pendientes: number; atendidas: number }>();
    if (citas) {
      citas.forEach((c: any) => {
        if (!c.id_usuario) return;
        const current = appointmentCounts.get(c.id_usuario) || { total: 0, pendientes: 0, atendidas: 0 };
        current.total += 1;
        if (c.estado_cita === 'pendiente' || c.estado_cita === 'confirmada' || c.estado_cita === 'en_atencion') {
          current.pendientes += 1;
        } else if (c.estado_cita === 'atendida') {
          current.atendidas += 1;
        }
        appointmentCounts.set(c.id_usuario, current);
      });
    }

    return (users || []).map((u: any) => {
      const counts = appointmentCounts.get(u.id_usuario) || { total: 0, pendientes: 0, atendidas: 0 };
      const fullName = u.nombres && u.apellidos
        ? `${u.nombres} ${u.apellidos}`.trim()
        : u.nombres || u.correo || 'Ciudadano';

      return {
        id_usuario: u.id_usuario,
        dni: u.dni || '',
        nombres: u.nombres || '',
        apellidos: u.apellidos || '',
        nombre_completo: fullName,
        correo: u.correo || '',
        telefono: u.telefono || null,
        activo: u.activo !== false,
        fecha_registro: u.created_at || u.fecha_creacion || undefined,
        total_citas: counts.total,
        citas_pendientes: counts.pendientes,
        citas_atendidas: counts.atendidas,
      };
    });
  }

  /**
   * Crea un nuevo cliente en perfil_usuario
   */
  async createClientMember(client: {
    dni: string;
    nombres: string;
    apellidos: string;
    correo: string;
    telefono?: string;
  }): Promise<string> {
    const supabase = createSupabaseBrowserClient();
    const cleanDni = client.dni.trim();
    const cleanEmail = client.correo.trim().toLowerCase();

    // 1. Verificar si ya existe un usuario con este DNI
    const { data: existingDni } = await supabase
      .from('perfil_usuario')
      .select('id_usuario, dni')
      .eq('dni', cleanDni)
      .limit(1);

    if (existingDni && existingDni.length > 0) {
      throw new Error(`Ya existe un usuario registrado con el DNI ${cleanDni}`);
    }

    const newUserId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'c' + Math.random().toString(36).substring(2, 10) + '-0000-0000-0000-000000000000';
    const defaultPassword = cleanDni;

    const insertPayload: any = {
      id_usuario: newUserId,
      dni: cleanDni,
      nombres: client.nombres.trim(),
      apellidos: client.apellidos.trim(),
      correo: cleanEmail,
      telefono: client.telefono?.trim() || null,
      id_rol: 1, // CLIENTE
      id_agencia: null,
      password_hash: defaultPassword,
    };

    const { error: directInsertError } = await supabase.from('perfil_usuario').insert(insertPayload);
    if (directInsertError) {
      // Si falla por foreign key de auth.users, crear vía auth.signUp
      if (directInsertError.message.includes('foreign key') || directInsertError.message.includes('fkey')) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: defaultPassword,
          options: {
            data: {
              nombres: client.nombres.trim(),
              apellidos: client.apellidos.trim(),
              dni: cleanDni,
            },
          },
        });

        if (authError || !authData.user?.id) {
          throw new Error(authError?.message || `Error al registrar cliente: ${directInsertError.message}`);
        }

        const authUserId = authData.user.id;
        await supabase
          .from('perfil_usuario')
          .update({
            dni: cleanDni,
            nombres: client.nombres.trim(),
            apellidos: client.apellidos.trim(),
            correo: cleanEmail,
            telefono: client.telefono?.trim() || null,
            id_rol: 1,
            password_hash: defaultPassword,
          } as any)
          .eq('id_usuario', authUserId);

        return authUserId;
      }
      throw new Error(`Error al registrar cliente: ${directInsertError.message}`);
    }

    return newUserId;
  }

  /**
   * Actualiza los datos de un cliente
   */
  async updateClientMember(
    id_usuario: string,
    data: {
      nombres: string;
      apellidos: string;
      correo: string;
      telefono?: string;
      activo?: boolean;
    }
  ): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    const updatePayload: any = {
      nombres: data.nombres.trim(),
      apellidos: data.apellidos.trim(),
      correo: data.correo.trim().toLowerCase(),
      telefono: data.telefono?.trim() || null,
    };

    const { error } = await supabase.from('perfil_usuario').update(updatePayload).eq('id_usuario', id_usuario);
    if (error) {
      throw new Error(`Error al actualizar el cliente: ${error.message}`);
    }

    if (data.activo !== undefined) {
      try {
        await supabase.from('perfil_usuario').update({ activo: data.activo } as any).eq('id_usuario', id_usuario);
      } catch {
        // Columna opcional
      }
    }
  }

  /**
   * Alterna el estado activo / bloqueado de un cliente
   */
  async toggleClientStatus(id_usuario: string, newStatus: boolean): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    try {
      await supabase
        .from('perfil_usuario')
        .update({ activo: newStatus } as any)
        .eq('id_usuario', id_usuario);
    } catch {
      // Columna opcional
    }
  }

  /**
   * Obtiene el expediente de citas de un cliente específico
   */
  async getClientAppointments(id_usuario: string): Promise<any[]> {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('cita')
      .select(`
        id_cita,
        codigo_cita,
        id_usuario,
        fecha,
        hora_inicio,
        hora_fin,
        estado_cita,
        tramite:id_tramite ( nombre_tramite ),
        ventanilla:id_ventanilla (
          numero_ventanilla,
          agencia:id_agencia ( nombre_agencia, direccion )
        )
      `)
      .eq('id_usuario', id_usuario)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error al obtener citas del cliente:', error.message);
      return [];
    }

    return (data || []).map((c: any) => ({
      id_cita: c.id_cita,
      codigo_cita: c.codigo_cita,
      fecha: c.fecha,
      hora_inicio: c.hora_inicio,
      hora_fin: c.hora_fin,
      estado_cita: c.estado_cita,
      tramite_nombre: c.tramite?.nombre_tramite || 'Trámite Bancario',
      numero_ventanilla: c.ventanilla?.numero_ventanilla ? `Ventanilla ${c.ventanilla.numero_ventanilla}` : 'Ventanilla',
      agencia_nombre: c.ventanilla?.agencia?.nombre_agencia || 'Sede BN',
      direccion_agencia: c.ventanilla?.agencia?.direccion || '',
    }));
  }
}

