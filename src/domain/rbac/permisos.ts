export type RolUsuario = 'CLIENTE' | 'AGENTE_VENTANILLA' | 'ADMIN_AGENCIA' | 'ADMIN_GENERAL';

export type Permiso =
  | 'cita:crear'
  | 'cita:consultar'
  | 'cita:cancelar'
  | 'atencion:registrar'
  | 'atencion:consultar'
  | 'personal:gestionar'
  | 'ventanilla:gestionar'
  | 'reportes:agencia'
  | 'auditoria:global'
  | 'agencias:gestionar'
  | 'usuarios:gestionar';

export const MATRIZ_PERMISOS: Record<RolUsuario, Permiso[]> = {
  CLIENTE: [
    'cita:crear',
    'cita:consultar',
    'cita:cancelar',
  ],
  AGENTE_VENTANILLA: [
    'atencion:registrar',
    'atencion:consultar',
    'cita:consultar',
  ],
  ADMIN_AGENCIA: [
    'ventanilla:gestionar',
    'personal:gestionar',
    'reportes:agencia',
    'atencion:consultar',
  ],
  ADMIN_GENERAL: [
    'auditoria:global',
    'agencias:gestionar',
    'usuarios:gestionar',
    'ventanilla:gestionar',
    'personal:gestionar',
    'reportes:agencia',
    'atencion:registrar',
    'atencion:consultar',
    'cita:crear',
    'cita:consultar',
    'cita:cancelar',
  ],
};

export function tienePermiso(rol: string, permiso: string): boolean {
  return MATRIZ_PERMISOS[rol as RolUsuario]?.includes(permiso as Permiso) ?? false;
}
