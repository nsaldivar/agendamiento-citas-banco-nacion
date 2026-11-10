import { describe, it, expect, vi } from 'vitest';
import { ListarTramitesActivos } from './ListarTramitesActivos';

describe('ListarTramitesActivos (HU-04)', () => {
  it('devuelve solo trámites activos con sus requisitos', async () => {
    const repo = {
      listar: vi.fn().mockResolvedValue([
        {
          id: 't1',
          nombre: 'Apertura de Cuenta de Ahorros',
          activo: true,
          requisitos: ['DNI físico vigente', 'Recibo de servicio público'],
        },
        { id: 't2', nombre: 'Trámite descontinuado', activo: false, requisitos: [] },
      ]),
    };
    const resultado = await new ListarTramitesActivos(repo as never).execute();
    expect(resultado).toHaveLength(1);
    expect(resultado[0].requisitos).toHaveLength(2);
  });
});
