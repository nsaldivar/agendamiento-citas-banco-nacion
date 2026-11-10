import type { Appointment } from "@/domain/entities/appointment";
export interface NotificationService { sendAppointmentConfirmation(appointment: Appointment): Promise<void>; }