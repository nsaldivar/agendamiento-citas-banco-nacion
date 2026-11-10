import type { AppointmentRepository, SolicitudCitaInput } from '@/application/ports/AppointmentRepository';

export class CreateAppointment {
  constructor(private readonly appointmentRepo: AppointmentRepository) {}

  async execute(solicitud: SolicitudCitaInput): Promise<SolicitudCitaInput & { id: string }> {
    // Validar que la fecha de la cita no sea anterior a hoy
    const hoy = new Date();
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const [year, month, day] = solicitud.fecha.split('-').map(Number);
    const fechaSinHora = new Date(year, month - 1, day);

    if (fechaSinHora < hoySinHora) {
      throw new Error('FECHA_INVALIDA');
    }

    // Validar disponibilidad del turno
    const disponible = await this.appointmentRepo.estaDisponible(solicitud.horarioId, solicitud.fecha);
    if (!disponible) {
      throw new Error('TURNO_NO_DISPONIBLE');
    }

    return await this.appointmentRepo.guardar(solicitud);
  }
}
