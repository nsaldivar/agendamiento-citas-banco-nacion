export type EstadoRequisito = 'OK' | 'BAJA' | 'PENDIENTE';

export function validarDNI(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

export function generarCodigoCita(anio: number, correlativo: number): string {
  return 'CIT-' + anio + '-' + String(correlativo).padStart(3, '0');
}

export function resumirVerificacion(items: EstadoRequisito[]) {
  return {
    cumplidos: items.filter((e) => e === 'OK').length,
    dadosDeBaja: items.filter((e) => e === 'BAJA').length,
    pendientes: items.filter((e) => e === 'PENDIENTE').length,
  };
}
