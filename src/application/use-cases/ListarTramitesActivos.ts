export interface TramiteItem {
  id: string;
  nombre: string;
  activo: boolean;
  requisitos: string[];
}

export interface TramiteRepository {
  listar(): Promise<TramiteItem[]>;
}

export class ListarTramitesActivos {
  constructor(private readonly tramiteRepo: TramiteRepository) {}

  async execute(): Promise<TramiteItem[]> {
    const todos = await this.tramiteRepo.listar();
    return todos.filter((tramite) => tramite.activo);
  }
}
