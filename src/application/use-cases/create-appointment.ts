import type { Appointment, CreateAppointmentInput } from "@/domain/entities/appointment";
import type { AppointmentRepository } from "@/application/ports/appointment-repository";
import type { NotificationService } from "@/application/ports/notification-service";
export async function createAppointment(input: CreateAppointmentInput, dependencies: { appointments: AppointmentRepository; notifications: NotificationService }): Promise<Appointment> {
  const appointment = await dependencies.appointments.create(input);
  await dependencies.notifications.sendAppointmentConfirmation(appointment);
  return appointment;
}