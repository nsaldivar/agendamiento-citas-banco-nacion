export type AppointmentState = 
  | 'pendiente'
  | 'confirmada'
  | 'en_atencion'
  | 'atendida'
  | 'rechazada'
  | 'cancelada';

export interface Ventanilla {
  id_ventanilla: number;
  id_agencia: number;
  numero_ventanilla: string;
  activa: boolean;
}

export interface AvailableSlot {
  id_horario: number;
  id_ventanilla: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado_horario: 'disponible' | 'reservado' | 'bloqueado' | 'completado';
  ventanilla?: Ventanilla;
}

export interface Appointment {
  id_cita: string;
  codigo_cita: string;
  id_usuario: string;
  id_ventanilla: number;
  id_tramite: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado_cita: AppointmentState;
  codigo_qr?: string | null;
  fecha_registro?: string | null;
  // Campos de compatibilidad y relaciones pobladas opcionales
  id_horario?: number;
  tramite_nombre?: string;
  agencia_nombre?: string;
  horario_fecha?: string;
  horario_inicio?: string;
  horario_fin?: string;
  numero_ventanilla?: string;
  ciudadano_nombre?: string;
  ciudadano_dni?: string;
}

export interface AtencionCita {
  id_atencion: string;
  id_cita: string;
  id_agente: string;
  hora_inicio_atencion?: string | null;
  hora_fin_atencion?: string | null;
  resultado_tramite?: 'aceptado' | 'rechazado' | null;
  comentario_observacion?: string | null;
  fecha_registro?: string | null;
}

export interface CitaRequisitoEstado {
  id_cita_req: number;
  id_atencion: string;
  id_requisito: number;
  cumplido: boolean;
}

export interface Notificacion {
  id_notificacion: number;
  id_cita: string;
  tipo_notificacion: 'correo' | 'sms';
  estado_envio: 'pendiente' | 'enviado' | 'fallido';
  fecha_envio?: string | null;
}

export interface CreateAppointmentDTO {
  id_usuario: string;
  id_ventanilla?: number;
  id_tramite: number;
  codigo_cita: string;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
  codigo_qr?: string;
  id_horario?: number;
}

export type CreateAppointmentInput = CreateAppointmentDTO;