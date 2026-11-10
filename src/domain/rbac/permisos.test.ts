import { describe, it, expect } from 'vitest';
import { tienePermiso } from './permisos';

describe('RBAC por rol (HU-02, HU-11, HU-12)', () => {
  it.each([
    ['CLIENTE', 'cita:crear', true],
    ['CLIENTE', 'atencion:registrar', false],
    ['AGENTE_VENTANILLA', 'atencion:registrar', true],
    ['AGENTE_VENTANILLA', 'personal:gestionar', false],
    ['ADMIN_AGENCIA', 'ventanilla:gestionar', true],
    ['ADMIN_AGENCIA', 'auditoria:global', false],
    ['ADMIN_GENERAL', 'auditoria:global', true],
  ])('rol %s / permiso %s -> %s', (rol, permiso, esperado) => {
    expect(tienePermiso(rol, permiso)).toBe(esperado);
  });
});
