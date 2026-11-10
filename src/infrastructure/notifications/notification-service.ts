import type { Appointment } from "@/domain/entities/appointment";
import type { NotificationService } from "@/application/ports/notification-service";
export class ExternalNotificationService implements NotificationService {
  async sendAppointmentConfirmation(appointment: Appointment): Promise<void> {
    void appointment;
    // Integrar aquí el proveedor de correo/SMS elegido mediante su SDK.
  }
}