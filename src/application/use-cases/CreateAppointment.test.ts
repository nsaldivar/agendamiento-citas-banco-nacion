import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CreateAppointment } from './CreateAppointment';
import type { AppointmentRepository } from '@/application/ports/AppointmentRepository';

const solicitud = {
  clienteId: 'u-001',
  tramiteId: 'tr-001',
  agenciaId: 'ag-001',
  horarioId: 'hd-001',
  fecha: '2026-09-18',
};

describe('CreateAppointment (HU-06)', () => {
  let repo: { estaDisponible: ReturnType<typeof vi.fn>; guardar: ReturnType<typeof vi.fn> };
  let useCase: CreateAppointment;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T09:00:00'));
    repo = {
      estaDisponible: vi.fn().mockResolvedValue(true),
      guardar: vi.fn().mockImplementation(async (c) => ({ ...c, id: 'cita-1' })),
    };
    useCase = new CreateAppointment(repo as unknown as AppointmentRepository);
  });

  afterEach(() => vi.useRealTimers());

  it('registra la cita cuando el turno está libre', async () => {
    const cita = await useCase.execute(solicitud);
    expect(repo.guardar).toHaveBeenCalledTimes(1);
    expect(cita.id).toBe('cita-1');
  });

  it('rechaza la reserva si el turno ya fue tomado', async () => {
    repo.estaDisponible.mockResolvedValue(false);
    await expect(useCase.execute(solicitud)).rejects.toThrow('TURNO_NO_DISPONIBLE');
    expect(repo.guardar).not.toHaveBeenCalled();
  });

  it('rechaza fechas anteriores a hoy', async () => {
    const pasada = { ...solicitud, fecha: '2026-09-10' };
    await expect(useCase.execute(pasada)).rejects.toThrow('FECHA_INVALIDA');
    expect(repo.guardar).not.toHaveBeenCalled();
  });
});
