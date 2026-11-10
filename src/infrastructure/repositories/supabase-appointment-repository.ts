import type { Appointment, CreateAppointmentInput } from "@/domain/entities/appointment";
import type { AppointmentRepository } from "@/application/ports/appointment-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export class SupabaseAppointmentRepository implements AppointmentRepository {
  async create(input: CreateAppointmentInput): Promise<Appointment> {
    const supabase = await createSupabaseServerClient();

    // Determinar la ventanilla adecuada si no viene especificada
    let ventanillaId = input.id_ventanilla || 1;
    if (!input.id_ventanilla) {
      try {
        const { data: vData } = await supabase
          .from("ventanilla")
          .select("id_ventanilla")
          .eq("activa", true)
          .limit(1);
        if (vData && vData.length > 0) {
          ventanillaId = vData[0].id_ventanilla;
        }
      } catch (vErr) {
        console.warn("No se pudo obtener ventanilla predeterminada, usando 1:", vErr);
      }
    }

    const fechaCita = input.fecha || new Date().toISOString().split("T")[0];
    const horaInicio = input.hora_inicio || "08:00:00";
    const horaFin = input.hora_fin || "08:30:00";

    // Inserción directa en la nueva estructura de la tabla cita
    const { data, error } = await supabase
      .from("cita")
      .insert({
        codigo_cita: input.codigo_cita,
        id_usuario: input.id_usuario,
        id_ventanilla: ventanillaId,
        id_tramite: input.id_tramite,
        fecha: fechaCita,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        estado_cita: "pendiente",
        codigo_qr: input.codigo_qr ?? input.codigo_cita,
      })
      .select(`
        *,
        tramite:id_tramite ( nombre_tramite ),
        ventanilla:id_ventanilla (
          numero_ventanilla,
          agencia:id_agencia ( nombre_agencia )
        )
      `)
      .single();

    if (error) throw new Error(`No se pudo crear la cita: ${error.message}`);

    const item = data as any;
    return {
      id_cita: item.id_cita,
      codigo_cita: item.codigo_cita,
      id_usuario: item.id_usuario,
      id_ventanilla: item.id_ventanilla,
      id_tramite: item.id_tramite,
      fecha: item.fecha,
      hora_inicio: item.hora_inicio,
      hora_fin: item.hora_fin,
      estado_cita: item.estado_cita,
      codigo_qr: item.codigo_qr,
      fecha_registro: item.fecha_registro,
      tramite_nombre: item.tramite?.nombre_tramite,
      agencia_nombre: item.ventanilla?.agencia?.nombre_agencia,
      horario_fecha: item.fecha,
      horario_inicio: item.hora_inicio,
      horario_fin: item.hora_fin,
      numero_ventanilla: item.ventanilla?.numero_ventanilla,
    };
  }

  async findByCitizen(citizenId: string): Promise<Appointment[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cita")
      .select(`
        *,
        tramite:id_tramite ( nombre_tramite ),
        ventanilla:id_ventanilla (
          numero_ventanilla,
          agencia:id_agencia ( nombre_agencia )
        )
      `)
      .eq("id_usuario", citizenId)
      .order("fecha_registro", { ascending: false });

    if (error) throw new Error(`No se pudieron consultar las citas: ${error.message}`);

    return ((data ?? []) as any[]).map((item) => ({
      id_cita: item.id_cita,
      codigo_cita: item.codigo_cita,
      id_usuario: item.id_usuario,
      id_ventanilla: item.id_ventanilla,
      id_tramite: item.id_tramite,
      fecha: item.fecha,
      hora_inicio: item.hora_inicio,
      hora_fin: item.hora_fin,
      estado_cita: item.estado_cita,
      codigo_qr: item.codigo_qr,
      fecha_registro: item.fecha_registro,
      tramite_nombre: item.tramite?.nombre_tramite,
      agencia_nombre: item.ventanilla?.agencia?.nombre_agencia,
      horario_fecha: item.fecha,
      horario_inicio: item.hora_inicio,
      horario_fin: item.hora_fin,
      numero_ventanilla: item.ventanilla?.numero_ventanilla,
    }));
  }
}