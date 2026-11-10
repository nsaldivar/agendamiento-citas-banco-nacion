export interface SolicitudCitaInput {
  clienteId: string;
  tramiteId: string;
  agenciaId: string;
  horarioId: string;
  fecha: string;
}

export interface AppointmentRepository {
  estaDisponible(horarioId: string, fecha: string): Promise<boolean>;
  guardar(cita: SolicitudCitaInput): Promise<SolicitudCitaInput & { id: string }>;
}
