export interface ProcedureRequirement {
  id_requisito?: number;
  id_tramite?: number;
  descripcion_requisito: string;
  es_obligatorio: boolean;
}

export interface Procedure {
  id_tramite: number;
  nombre_tramite: string;
  descripcion: string;
  duracion_minutos: number;
  activo: boolean;
  requisitos?: ProcedureRequirement[];
}