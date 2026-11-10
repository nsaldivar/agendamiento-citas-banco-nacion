import { Agency } from '@/domain/entities/agency';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client';

export interface CreateAgencyParams {
  nombre_agencia: string;
  direccion: string;
  distrito: string;
  provincia?: string;
  departamento?: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
  total_ventanillas: number;
  dias_semana: number[]; // Ej: [1, 2, 3, 4, 5] (Lunes a Viernes)
  hora_apertura: string; // Ej: "08:30"
  hora_cierre: string; // Ej: "17:30"
  hora_inicio_almuerzo?: string; // Ej: "13:00"
  hora_fin_almuerzo?: string; // Ej: "14:00"
  tramite_ids: number[];
}

export class SupabaseAgencyRepository {
  /**
   * Obtiene la lista de agencias con conteo de ventanillas asociadas.
   * Si includeInactive es false, solo trae agencias activas (para el público).
   */
  async getAgencies(
    districtFilter?: string,
    searchQuery?: string,
    includeInactive = false
  ): Promise<Agency[]> {
    const supabase = createSupabaseBrowserClient();
    let query = supabase.from('agencia').select('*, ventanilla(id_ventanilla, activa)');

    if (!includeInactive) {
      query = query.eq('activa', true);
    }

    if (districtFilter && districtFilter !== 'Todas las agencias') {
      query = query.ilike('distrito', `%${districtFilter}%`);
    }

    if (searchQuery && searchQuery.trim() !== '') {
      query = query.or(
        `nombre_agencia.ilike.%${searchQuery}%,direccion.ilike.%${searchQuery}%,distrito.ilike.%${searchQuery}%,provincia.ilike.%${searchQuery}%,departamento.ilike.%${searchQuery}%`
      );
    }

    query = query.order('id_agencia', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error al consultar agencias en Supabase:', error.message);
      throw error;
    }

    return ((data as any[]) ?? []).map((row) => ({
      id_agencia: row.id_agencia,
      nombre_agencia: row.nombre_agencia,
      direccion: row.direccion,
      distrito: row.distrito,
      provincia: row.provincia || undefined,
      departamento: row.departamento || undefined,
      telefono: row.telefono,
      latitud: row.latitud ? Number(row.latitud) : undefined,
      longitud: row.longitud ? Number(row.longitud) : undefined,
      activa: row.activa,
      total_ventanillas: Array.isArray(row.ventanilla) ? row.ventanilla.length : 0,
    }));
  }

  /**
   * Crea una nueva agencia y alimenta automáticamente sus dependencias:
   * 1. public.agencia
   * 2. public.ventanilla (genera N ventanillas en formato V-01)
   * 3. public.plantilla_horario_agencia (genera horario por cada día con intervalo de 15 min)
   * 4. public.agencia_tramite (asocia los trámites elegidos)
   */
  async createAgencyWithDependencies(params: CreateAgencyParams): Promise<Agency> {
    const supabase = createSupabaseBrowserClient();

    // 1. Insertar en public.agencia
    const { data: agenciaData, error: agenciaError } = await supabase
      .from('agencia')
      .insert({
        nombre_agencia: params.nombre_agencia.trim(),
        direccion: params.direccion.trim(),
        distrito: params.distrito.trim(),
        provincia: params.provincia?.trim() || null,
        departamento: params.departamento?.trim() || null,
        telefono: params.telefono?.trim() || null,
        latitud: params.latitud !== undefined ? params.latitud : null,
        longitud: params.longitud !== undefined ? params.longitud : null,
        activa: true,
      })
      .select()
      .single();

    if (agenciaError || !agenciaData) {
      console.error('Error al crear agencia en Supabase:', agenciaError?.message);
      throw new Error(agenciaError?.message || 'Error al crear la agencia');
    }

    const idAgencia = agenciaData.id_agencia;

    // 2. Insertar en public.ventanilla (Formato V-01, V-02 para cumplir con VARCHAR(10))
    const totalVentanillas = Math.max(1, params.total_ventanillas || 1);
    const ventanillasToInsert = Array.from({ length: totalVentanillas }, (_, idx) => ({
      id_agencia: idAgencia,
      numero_ventanilla: `V-${String(idx + 1).padStart(2, '0')}`,
      activa: true,
    }));

    const { error: ventanillaError } = await supabase.from('ventanilla').insert(ventanillasToInsert);
    if (ventanillaError) {
      console.warn('Aviso: Error al registrar ventanillas:', ventanillaError.message);
    }

    // 3. Insertar en public.plantilla_horario_agencia (días seleccionados, intervalo fijo en 15 min)
    const dias = params.dias_semana.length > 0 ? params.dias_semana : [1, 2, 3, 4, 5];
    const horariosToInsert = dias.map((dia) => ({
      id_agencia: idAgencia,
      dia_semana: dia,
      hora_apertura: params.hora_apertura || '08:30:00',
      hora_cierre: params.hora_cierre || '17:30:00',
      hora_inicio_almuerzo: params.hora_inicio_almuerzo || '13:00:00',
      hora_fin_almuerzo: params.hora_fin_almuerzo || '14:00:00',
      intervalo_minutos: 15,
      activa: true,
    }));

    const { error: horarioError } = await supabase
      .from('plantilla_horario_agencia')
      .insert(horariosToInsert);
    if (horarioError) {
      console.warn('Aviso: Error al registrar plantilla de horarios:', horarioError.message);
    }

    // 4. Insertar en public.agencia_tramite (los trámites seleccionados)
    if (params.tramite_ids && params.tramite_ids.length > 0) {
      const tramitesToInsert = params.tramite_ids.map((idTramite) => ({
        id_agencia: idAgencia,
        id_tramite: idTramite,
      }));

      const { error: tramitesError } = await supabase
        .from('agencia_tramite')
        .insert(tramitesToInsert);
      if (tramitesError) {
        console.warn('Aviso: Error al asociar trámites a la agencia:', tramitesError.message);
      }
    }

    return {
      id_agencia: agenciaData.id_agencia,
      nombre_agencia: agenciaData.nombre_agencia,
      direccion: agenciaData.direccion,
      distrito: agenciaData.distrito,
      provincia: agenciaData.provincia || undefined,
      departamento: agenciaData.departamento || undefined,
      telefono: agenciaData.telefono || undefined,
      latitud: agenciaData.latitud ? Number(agenciaData.latitud) : undefined,
      longitud: agenciaData.longitud ? Number(agenciaData.longitud) : undefined,
      total_ventanillas: totalVentanillas,
      activa: agenciaData.activa,
    };
  }

  /**
   * Actualiza datos básicos de la agencia
   */
  async updateAgency(id: number, data: Partial<Agency>): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    const updatePayload: any = {};

    if (data.nombre_agencia !== undefined) updatePayload.nombre_agencia = data.nombre_agencia;
    if (data.direccion !== undefined) updatePayload.direccion = data.direccion;
    if (data.distrito !== undefined) updatePayload.distrito = data.distrito;
    if (data.provincia !== undefined) updatePayload.provincia = data.provincia;
    if (data.departamento !== undefined) updatePayload.departamento = data.departamento;
    if (data.telefono !== undefined) updatePayload.telefono = data.telefono;
    if (data.latitud !== undefined) updatePayload.latitud = data.latitud;
    if (data.longitud !== undefined) updatePayload.longitud = data.longitud;
    if (data.activa !== undefined) updatePayload.activa = data.activa;

    const { error } = await supabase.from('agencia').update(updatePayload).eq('id_agencia', id);

    if (error) {
      console.error('Error al actualizar agencia en Supabase:', error.message);
      throw error;
    }
  }

  /**
   * Borrado Lógico: Marca activa = false
   */
  async softDeleteAgency(id: number): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('agencia').update({ activa: false }).eq('id_agencia', id);

    if (error) {
      console.error('Error al dar de baja la agencia:', error.message);
      throw error;
    }
  }

  /**
   * Reactivar agencia: Marca activa = true
   */
  async reactivateAgency(id: number): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('agencia').update({ activa: true }).eq('id_agencia', id);

    if (error) {
      console.error('Error al reactivar la agencia:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene los datos completos de una agencia incluyendo sus dependencias (ventanillas, horario, trámites).
   */
  async getAgencyFullDetails(idAgencia: number): Promise<{
    agencia: any;
    ventanillasCount: number;
    diasSemana: number[];
    horaApertura: string;
    horaCierre: string;
    horaInicioAlmuerzo: string;
    horaFinAlmuerzo: string;
    tramitesSeleccionados: number[];
  }> {
    const supabase = createSupabaseBrowserClient();

    // 1. Consultar datos de la agencia
    const { data: agencia, error: agError } = await supabase
      .from('agencia')
      .select('*')
      .eq('id_agencia', idAgencia)
      .single();

    if (agError || !agencia) {
      throw new Error(agError?.message || 'Agencia no encontrada');
    }

    // 2. Consultar ventanillas
    const { data: ventanillas } = await supabase
      .from('ventanilla')
      .select('id_ventanilla, activa')
      .eq('id_agencia', idAgencia);

    const activeVentanillas = (ventanillas || []).filter((v) => v.activa).length;
    const ventanillasCount = Math.max(1, activeVentanillas || ventanillas?.length || 1);

    // 3. Consultar plantilla de horarios
    const { data: horarios } = await supabase
      .from('plantilla_horario_agencia')
      .select('*')
      .eq('id_agencia', idAgencia)
      .order('dia_semana', { ascending: true });

    let diasSemana = [1, 2, 3, 4, 5];
    let horaApertura = '08:30';
    let horaCierre = '17:30';
    let horaInicioAlmuerzo = '13:00';
    let horaFinAlmuerzo = '14:00';

    if (horarios && horarios.length > 0) {
      diasSemana = horarios.map((h) => h.dia_semana);
      const first = horarios[0];
      if (first.hora_apertura) horaApertura = first.hora_apertura.slice(0, 5);
      if (first.hora_cierre) horaCierre = first.hora_cierre.slice(0, 5);
      if (first.hora_inicio_almuerzo) horaInicioAlmuerzo = first.hora_inicio_almuerzo.slice(0, 5);
      if (first.hora_fin_almuerzo) horaFinAlmuerzo = first.hora_fin_almuerzo.slice(0, 5);
    }

    // 4. Consultar trámites asociados
    const { data: tramites } = await supabase
      .from('agencia_tramite')
      .select('id_tramite')
      .eq('id_agencia', idAgencia);

    const tramitesSeleccionados = (tramites || []).map((t) => t.id_tramite);

    return {
      agencia,
      ventanillasCount,
      diasSemana,
      horaApertura,
      horaCierre,
      horaInicioAlmuerzo,
      horaFinAlmuerzo,
      tramitesSeleccionados,
    };
  }

  /**
   * Actualiza completamente una agencia y sus dependencias (ventanillas, horario, trámites)
   */
  async updateAgencyWithDependencies(
    idAgencia: number,
    params: {
      nombre_agencia: string;
      direccion: string;
      distrito: string;
      provincia?: string;
      departamento?: string;
      telefono?: string;
      latitud?: number;
      longitud?: number;
      activa?: boolean;
      total_ventanillas?: number;
      dias_semana?: number[];
      hora_apertura?: string;
      hora_cierre?: string;
      hora_inicio_almuerzo?: string;
      hora_fin_almuerzo?: string;
      tramite_ids?: number[];
    }
  ): Promise<void> {
    const supabase = createSupabaseBrowserClient();

    // 1. Actualizar tabla agencia
    const updatePayload: any = {
      nombre_agencia: params.nombre_agencia.trim(),
      direccion: params.direccion.trim(),
      distrito: params.distrito.trim(),
      provincia: params.provincia?.trim() || null,
      departamento: params.departamento?.trim() || null,
      telefono: params.telefono?.trim() || null,
    };

    if (params.latitud !== undefined) updatePayload.latitud = params.latitud;
    if (params.longitud !== undefined) updatePayload.longitud = params.longitud;
    if (params.activa !== undefined) updatePayload.activa = params.activa;

    const { error: agError } = await supabase
      .from('agencia')
      .update(updatePayload)
      .eq('id_agencia', idAgencia);

    if (agError) {
      console.error('Error al actualizar agencia en Supabase:', agError.message);
      throw agError;
    }

    // 2. Actualizar ventanillas si se especificaron
    if (params.total_ventanillas !== undefined) {
      const targetCount = Math.max(1, params.total_ventanillas);
      const { data: existingVentanillas } = await supabase
        .from('ventanilla')
        .select('id_ventanilla, numero_ventanilla, activa')
        .eq('id_agencia', idAgencia)
        .order('id_ventanilla', { ascending: true });

      const currentCount = existingVentanillas?.length || 0;

      if (currentCount < targetCount) {
        // Insertar las faltantes
        const toAdd = Array.from({ length: targetCount - currentCount }, (_, idx) => ({
          id_agencia: idAgencia,
          numero_ventanilla: `V-${String(currentCount + idx + 1).padStart(2, '0')}`,
          activa: true,
        }));
        await supabase.from('ventanilla').insert(toAdd);
      } else if (currentCount > targetCount && existingVentanillas) {
        // Desactivar las sobrantes para no romper integridad de citas existentes
        const excessIds = existingVentanillas.slice(targetCount).map((v) => v.id_ventanilla);
        await supabase
          .from('ventanilla')
          .update({ activa: false })
          .in('id_ventanilla', excessIds);
      }
    }

    // 3. Actualizar plantilla de horarios si se especificaron días
    if (params.dias_semana && params.dias_semana.length > 0) {
      await supabase.from('plantilla_horario_agencia').delete().eq('id_agencia', idAgencia);

      const horariosToInsert = params.dias_semana.map((dia) => ({
        id_agencia: idAgencia,
        dia_semana: dia,
        hora_apertura: params.hora_apertura ? (params.hora_apertura.length === 5 ? `${params.hora_apertura}:00` : params.hora_apertura) : '08:30:00',
        hora_cierre: params.hora_cierre ? (params.hora_cierre.length === 5 ? `${params.hora_cierre}:00` : params.hora_cierre) : '17:30:00',
        hora_inicio_almuerzo: params.hora_inicio_almuerzo
          ? (params.hora_inicio_almuerzo.length === 5 ? `${params.hora_inicio_almuerzo}:00` : params.hora_inicio_almuerzo)
          : '13:00:00',
        hora_fin_almuerzo: params.hora_fin_almuerzo
          ? (params.hora_fin_almuerzo.length === 5 ? `${params.hora_fin_almuerzo}:00` : params.hora_fin_almuerzo)
          : '14:00:00',
        intervalo_minutos: 15,
        activa: true,
      }));

      await supabase.from('plantilla_horario_agencia').insert(horariosToInsert);
    }

    // 4. Actualizar trámites asociados si se especificaron
    if (params.tramite_ids !== undefined) {
      await supabase.from('agencia_tramite').delete().eq('id_agencia', idAgencia);

      if (params.tramite_ids.length > 0) {
        const tramitesToInsert = params.tramite_ids.map((idTr) => ({
          id_agencia: idAgencia,
          id_tramite: idTr,
        }));
        await supabase.from('agencia_tramite').insert(tramitesToInsert);
      }
    }
  }

  /**
   * Alterna el estado operativo (activa/inactiva) de una ventanilla
   */
  async toggleVentanillaStatus(idVentanilla: number, activa: boolean): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('ventanilla').update({ activa }).eq('id_ventanilla', idVentanilla);
    if (error) {
      console.error('Error al actualizar estado de ventanilla:', error.message);
      throw error;
    }
  }

  /**
   * Asigna un agente a una ventanilla desactivando cualquier asignación previa
   */
  async assignAgentToVentanilla(idVentanilla: number, idUsuario: string): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('personal_ventanilla').update({ activa: false }).eq('id_ventanilla', idVentanilla);
    await supabase.from('personal_ventanilla').update({ activa: false }).eq('id_usuario', idUsuario);

    const { error } = await supabase.from('personal_ventanilla').insert({
      id_ventanilla: idVentanilla,
      id_usuario: idUsuario,
      fecha: new Date().toISOString().split('T')[0],
      activa: true,
    });
    if (error) {
      console.error('Error al asignar agente a ventanilla:', error.message);
      throw error;
    }
  }
}
