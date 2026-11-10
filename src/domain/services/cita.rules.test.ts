import { describe, it, expect } from 'vitest';
import { validarDNI, generarCodigoCita, resumirVerificacion } from './cita.rules';

describe('validarDNI (HU-01)', () => {
  it('acepta un DNI de 8 dígitos', () => {
    expect(validarDNI('87654321')).toBe(true);
  });

  it.each(['1234567', '123456789', '1234567A', ''])(
    'rechaza el formato inválido "%s"',
    (dni) => {
      expect(validarDNI(dni)).toBe(false);
    },
  );
});

describe('generarCodigoCita (HU-07)', () => {
  it('genera el formato CIT-AAAA-NNN', () => {
    expect(generarCodigoCita(2026, 1)).toBe('CIT-2026-001');
  });
});

describe('resumirVerificacion (HU-10)', () => {
  it('cuenta cumplidos, dados de baja y pendientes', () => {
    const r = resumirVerificacion(['OK', 'OK', 'BAJA', 'PENDIENTE']);
    expect(r).toEqual({ cumplidos: 2, dadosDeBaja: 1, pendientes: 1 });
  });
});
