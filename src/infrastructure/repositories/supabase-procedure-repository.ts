import { Procedure, ProcedureRequirement } from '@/domain/entities/procedure';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client';

export interface CreateProcedureParams {
  nombre_tramite: string;
  descripcion?: string;
  duracion_minutos: number;
  requisitos?: Array<{
    descripcion_requisito: string;
    es_obligatorio: boolean;
  }>;
}

export interface UpdateProcedureParams {
  nombre_tramite: string;
  descripcion?: string;
  duracion_minutos: number;
  activo?: boolean;
  requisitos?: Array<{
    id_requisito?: number;
    descripcion_requisito: string;
    es_obligatorio: boolean;
  }>;
}

export class SupabaseProcedureRepository {
  /**
   * Obtiene la lista de trámites con sus requisitos.
   * Si includeInactive es false, solo trae los activos (para clientes).
   */
  async getProcedures(searchQuery?: string, includeInactive = false): Promise<Procedure[]> {
    const supabase = createSupabaseBrowserClient();
    let query = supabase.from('tramite').select('*, requisito_tramite(*)');

    if (!includeInactive) {
      query = query.eq('activo', true);
    }

    if (searchQuery && searchQuery.trim() !== '') {
      query = query.or(`nombre_tramite.ilike.%${searchQuery}%,descripcion.ilike.%${searchQuery}%`);
    }

    query = query.order('id_tramite', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error al consultar trámites en Supabase:', error.message);
      throw error;
    }

    return ((data as any[]) ?? []).map((item) => ({
      id_tramite: item.id_tramite,
      nombre_tramite: item.nombre_tramite,
      descripcion: item.descripcion || '',
      duracion_minutos: item.duracion_minutos || 15,
      activo: item.activo,
      requisitos: (item.requisito_tramite ?? []).map((r: any) => ({
        id_requisito: r.id_requisito,
        id_tramite: r.id_tramite,
        descripcion_requisito: r.descripcion_requisito,
        es_obligatorio: r.es_obligatorio,
      })),
    }));
  }

  /**
   * Obtiene la lista de trámites habilitados para una agencia específica (vía agencia_tramite).
   */
  async getProceduresByAgency(idAgencia: number): Promise<Procedure[]> {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('agencia_tramite')
      .select('id_agencia, tramite(id_tramite, nombre_tramite, descripcion, duracion_minutos, activo, requisito_tramite(*))')
      .eq('id_agencia', idAgencia);

    if (error) {
      console.error('Error al consultar trámites por agencia:', error.message);
      throw error;
    }

    const procedures: Procedure[] = [];
    for (const item of (data as any[]) ?? []) {
      const t = item.tramite;
      if (t && t.activo) {
        procedures.push({
          id_tramite: t.id_tramite,
          nombre_tramite: t.nombre_tramite,
          descripcion: t.descripcion || '',
          duracion_minutos: t.duracion_minutos || 15,
          activo: t.activo,
          requisitos: (t.requisito_tramite ?? []).map((r: any) => ({
            id_requisito: r.id_requisito,
            id_tramite: r.id_tramite,
            descripcion_requisito: r.descripcion_requisito,
            es_obligatorio: r.es_obligatorio,
          })),
        });
      }
    }

    return procedures;
  }

  /**
   * Obtiene el detalle completo de un trámite específico con sus requisitos.
   */
  async getProcedureFullDetails(idTramite: number): Promise<Procedure> {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('tramite')
      .select('*, requisito_tramite(*)')
      .eq('id_tramite', idTramite)
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Trámite no encontrado');
    }

    return {
      id_tramite: data.id_tramite,
      nombre_tramite: data.nombre_tramite,
      descripcion: data.descripcion || '',
      duracion_minutos: data.duracion_minutos || 15,
      activo: data.activo,
      requisitos: (data.requisito_tramite ?? []).map((r: any) => ({
        id_requisito: r.id_requisito,
        id_tramite: r.id_tramite,
        descripcion_requisito: r.descripcion_requisito,
        es_obligatorio: r.es_obligatorio,
      })),
    };
  }

  /**
   * Crea un nuevo trámite y registra sus requisitos en public.requisito_tramite.
   */
  async createProcedure(params: CreateProcedureParams): Promise<Procedure> {
    const supabase = createSupabaseBrowserClient();

    // 1. Insertar en tabla tramite
    const { data: tramiteData, error: tramiteError } = await supabase
      .from('tramite')
      .insert({
        nombre_tramite: params.nombre_tramite.trim(),
        descripcion: params.descripcion?.trim() || null,
        duracion_minutos: Math.max(15, params.duracion_minutos || 15),
        activo: true,
      })
      .select()
      .single();

    if (tramiteError || !tramiteData) {
      console.error('Error al crear trámite en Supabase:', tramiteError?.message);
      throw new Error(tramiteError?.message || 'Error al crear el trámite');
    }

    const idTramite = tramiteData.id_tramite;
    let savedRequirements: ProcedureRequirement[] = [];

    // 2. Insertar requisitos asociados si se especificaron
    if (params.requisitos && params.requisitos.length > 0) {
      const validReqs = params.requisitos
        .filter((r) => r.descripcion_requisito && r.descripcion_requisito.trim() !== '')
        .map((r) => ({
          id_tramite: idTramite,
          descripcion_requisito: r.descripcion_requisito.trim(),
          es_obligatorio: r.es_obligatorio ?? true,
        }));

      if (validReqs.length > 0) {
        const { data: reqsData, error: reqsError } = await supabase
          .from('requisito_tramite')
          .insert(validReqs)
          .select();

        if (reqsError) {
          console.warn('Aviso: Error al registrar requisitos del trámite:', reqsError.message);
        } else if (reqsData) {
          savedRequirements = reqsData.map((r: any) => ({
            id_requisito: r.id_requisito,
            id_tramite: r.id_tramite,
            descripcion_requisito: r.descripcion_requisito,
            es_obligatorio: r.es_obligatorio,
          }));
        }
      }
    }

    return {
      id_tramite: tramiteData.id_tramite,
      nombre_tramite: tramiteData.nombre_tramite,
      descripcion: tramiteData.descripcion || '',
      duracion_minutos: tramiteData.duracion_minutos,
      activo: tramiteData.activo,
      requisitos: savedRequirements,
    };
  }

  /**
   * Actualiza los datos de un trámite y sincroniza sus requisitos en public.requisito_tramite.
   */
  async updateProcedure(idTramite: number, params: UpdateProcedureParams): Promise<void> {
    const supabase = createSupabaseBrowserClient();

    // 1. Actualizar tabla tramite
    const updatePayload: any = {
      nombre_tramite: params.nombre_tramite.trim(),
      descripcion: params.descripcion?.trim() || null,
      duracion_minutos: Math.max(15, params.duracion_minutos || 15),
    };

    if (params.activo !== undefined) {
      updatePayload.activo = params.activo;
    }

    const { error: tramiteError } = await supabase
      .from('tramite')
      .update(updatePayload)
      .eq('id_tramite', idTramite);

    if (tramiteError) {
      console.error('Error al actualizar trámite en Supabase:', tramiteError.message);
      throw tramiteError;
    }

    // 2. Sincronizar requisitos si se enviaron
    if (params.requisitos !== undefined) {
      // Eliminar los requisitos anteriores
      await supabase.from('requisito_tramite').delete().eq('id_tramite', idTramite);

      const validReqs = params.requisitos
        .filter((r) => r.descripcion_requisito && r.descripcion_requisito.trim() !== '')
        .map((r) => ({
          id_tramite: idTramite,
          descripcion_requisito: r.descripcion_requisito.trim(),
          es_obligatorio: r.es_obligatorio ?? true,
        }));

      if (validReqs.length > 0) {
        const { error: reqsError } = await supabase.from('requisito_tramite').insert(validReqs);
        if (reqsError) {
          console.warn('Aviso: Error al sincronizar requisitos:', reqsError.message);
        }
      }
    }
  }

  /**
   * Borrado Lógico: Marca activo = false
   */
  async softDeleteProcedure(idTramite: number): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from('tramite')
      .update({ activo: false })
      .eq('id_tramite', idTramite);

    if (error) {
      console.error('Error al dar de baja el trámite:', error.message);
      throw error;
    }
  }

  /**
   * Reactivar trámite: Marca activo = true
   */
  async reactivateProcedure(idTramite: number): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from('tramite')
      .update({ activo: true })
      .eq('id_tramite', idTramite);

    if (error) {
      console.error('Error al reactivar el trámite:', error.message);
      throw error;
    }
  }
}
