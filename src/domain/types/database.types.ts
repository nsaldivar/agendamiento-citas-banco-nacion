export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'CLIENTE' | 'AGENTE' | 'ADMIN_AGENCIA' | 'ADMIN_GENERAL';

export type EstadoHorario = 'disponible' | 'reservado' | 'bloqueado' | 'completado';

export type EstadoCita =
  | 'pendiente'
  | 'confirmada'
  | 'en_atencion'
  | 'atendida'
  | 'rechazada'
  | 'cancelada';

export type ResultadoTramite = 'aceptado' | 'rechazado';

export type TipoNotificacion = 'correo' | 'sms';

export type EstadoEnvio = 'pendiente' | 'enviado' | 'fallido';

export interface Database {
  public: {
    Tables: {
      rol: {
        Row: {
          id_rol: number;
          nombre_rol: string;
        };
        Insert: {
          id_rol?: number;
          nombre_rol: string;
        };
        Update: {
          id_rol?: number;
          nombre_rol?: string;
        };
        Relationships: [];
      };
      permiso: {
        Row: {
          id_permiso: number;
          codigo_permiso: string;
          descripcion: string | null;
        };
        Insert: {
          id_permiso?: number;
          codigo_permiso: string;
          descripcion?: string | null;
        };
        Update: {
          id_permiso?: number;
          codigo_permiso?: string;
          descripcion?: string | null;
        };
        Relationships: [];
      };
      rol_permiso: {
        Row: {
          id_rol: number;
          id_permiso: number;
        };
        Insert: {
          id_rol: number;
          id_permiso: number;
        };
        Update: {
          id_rol?: number;
          id_permiso?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rol_permiso_id_rol_fkey";
            columns: ["id_rol"];
            isOneToOne: false;
            referencedRelation: "rol";
            referencedColumns: ["id_rol"];
          },
          {
            foreignKeyName: "rol_permiso_id_permiso_fkey";
            columns: ["id_permiso"];
            isOneToOne: false;
            referencedRelation: "permiso";
            referencedColumns: ["id_permiso"];
          }
        ];
      };
      agencia: {
        Row: {
          id_agencia: number;
          nombre_agencia: string;
          direccion: string;
          distrito: string;
          provincia?: string | null;
          departamento?: string | null;
          telefono: string | null;
          latitud: number | null;
          longitud: number | null;
          activa: boolean;
        };
        Insert: {
          id_agencia?: number;
          nombre_agencia: string;
          direccion: string;
          distrito: string;
          provincia?: string | null;
          departamento?: string | null;
          telefono?: string | null;
          latitud?: number | null;
          longitud?: number | null;
          activa?: boolean;
        };
        Update: {
          id_agencia?: number;
          nombre_agencia?: string;
          direccion?: string;
          distrito?: string;
          provincia?: string | null;
          departamento?: string | null;
          telefono?: string | null;
          latitud?: number | null;
          longitud?: number | null;
          activa?: boolean;
        };
        Relationships: [];
      };
      ventanilla: {
        Row: {
          id_ventanilla: number;
          id_agencia: number;
          numero_ventanilla: string;
          activa: boolean;
        };
        Insert: {
          id_ventanilla?: number;
          id_agencia: number;
          numero_ventanilla: string;
          activa?: boolean;
        };
        Update: {
          id_ventanilla?: number;
          id_agencia?: number;
          numero_ventanilla?: string;
          activa?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "ventanilla_id_agencia_fkey";
            columns: ["id_agencia"];
            isOneToOne: false;
            referencedRelation: "agencia";
            referencedColumns: ["id_agencia"];
          }
        ];
      };
      plantilla_horario_agencia: {
        Row: {
          id_plantilla: number;
          id_agencia: number;
          dia_semana: number;
          hora_apertura: string;
          hora_cierre: string;
          hora_inicio_almuerzo: string | null;
          hora_fin_almuerzo: string | null;
          intervalo_minutos: number;
          activa: boolean;
        };
        Insert: {
          id_plantilla?: number;
          id_agencia: number;
          dia_semana: number;
          hora_apertura: string;
          hora_cierre: string;
          hora_inicio_almuerzo?: string | null;
          hora_fin_almuerzo?: string | null;
          intervalo_minutos?: number;
          activa?: boolean;
        };
        Update: {
          id_plantilla?: number;
          id_agencia?: number;
          dia_semana?: number;
          hora_apertura?: string;
          hora_cierre?: string;
          hora_inicio_almuerzo?: string | null;
          hora_fin_almuerzo?: string | null;
          intervalo_minutos?: number;
          activa?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "plantilla_horario_agencia_id_agencia_fkey";
            columns: ["id_agencia"];
            isOneToOne: false;
            referencedRelation: "agencia";
            referencedColumns: ["id_agencia"];
          }
        ];
      };
      perfil_usuario: {
        Row: {
          id_usuario: string;
          dni: string;
          nombres: string;
          apellidos: string;
          correo: string;
          telefono: string | null;
          password_hash: string | null;
          id_rol: number;
          id_agencia: number | null;
          contraseña?: string | null;
        };
        Insert: {
          id_usuario: string;
          dni: string;
          nombres: string;
          apellidos: string;
          correo: string;
          telefono?: string | null;
          password_hash?: string | null;
          id_rol?: number;
          id_agencia?: number | null;
          contraseña?: string | null;
        };
        Update: {
          id_usuario?: string;
          dni?: string;
          nombres?: string;
          apellidos?: string;
          correo?: string;
          telefono?: string | null;
          password_hash?: string | null;
          id_rol?: number;
          id_agencia?: number | null;
          contraseña?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "perfil_usuario_id_rol_fkey";
            columns: ["id_rol"];
            isOneToOne: false;
            referencedRelation: "rol";
            referencedColumns: ["id_rol"];
          },
          {
            foreignKeyName: "perfil_usuario_id_agencia_fkey";
            columns: ["id_agencia"];
            isOneToOne: false;
            referencedRelation: "agencia";
            referencedColumns: ["id_agencia"];
          }
        ];
      };
      personal_ventanilla: {
        Row: {
          id_asignacion: number;
          id_usuario: string;
          id_ventanilla: number;
          fecha: string;
          activa: boolean;
        };
        Insert: {
          id_asignacion?: number;
          id_usuario: string;
          id_ventanilla: number;
          fecha?: string;
          activa?: boolean;
        };
        Update: {
          id_asignacion?: number;
          id_usuario?: string;
          id_ventanilla?: number;
          fecha?: string;
          activa?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "personal_ventanilla_id_usuario_fkey";
            columns: ["id_usuario"];
            isOneToOne: false;
            referencedRelation: "perfil_usuario";
            referencedColumns: ["id_usuario"];
          },
          {
            foreignKeyName: "personal_ventanilla_id_ventanilla_fkey";
            columns: ["id_ventanilla"];
            isOneToOne: false;
            referencedRelation: "ventanilla";
            referencedColumns: ["id_ventanilla"];
          }
        ];
      };
      tramite: {
        Row: {
          id_tramite: number;
          nombre_tramite: string;
          descripcion: string | null;
          duracion_minutos: number;
          activo: boolean;
        };
        Insert: {
          id_tramite?: number;
          nombre_tramite: string;
          descripcion?: string | null;
          duracion_minutos: number;
          activo?: boolean;
        };
        Update: {
          id_tramite?: number;
          nombre_tramite?: string;
          descripcion?: string | null;
          duracion_minutos?: number;
          activo?: boolean;
        };
        Relationships: [];
      };
      agencia_tramite: {
        Row: {
          id_agencia: number;
          id_tramite: number;
        };
        Insert: {
          id_agencia: number;
          id_tramite: number;
        };
        Update: {
          id_agencia?: number;
          id_tramite?: number;
        };
        Relationships: [
          {
            foreignKeyName: "agencia_tramite_id_agencia_fkey";
            columns: ["id_agencia"];
            isOneToOne: false;
            referencedRelation: "agencia";
            referencedColumns: ["id_agencia"];
          },
          {
            foreignKeyName: "agencia_tramite_id_tramite_fkey";
            columns: ["id_tramite"];
            isOneToOne: false;
            referencedRelation: "tramite";
            referencedColumns: ["id_tramite"];
          }
        ];
      };
      requisito_tramite: {
        Row: {
          id_requisito: number;
          id_tramite: number;
          descripcion_requisito: string;
          es_obligatorio: boolean;
        };
        Insert: {
          id_requisito?: number;
          id_tramite: number;
          descripcion_requisito: string;
          es_obligatorio?: boolean;
        };
        Update: {
          id_requisito?: number;
          id_tramite?: number;
          descripcion_requisito?: string;
          es_obligatorio?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "requisito_tramite_id_tramite_fkey";
            columns: ["id_tramite"];
            isOneToOne: false;
            referencedRelation: "tramite";
            referencedColumns: ["id_tramite"];
          }
        ];
      };
      cita: {
        Row: {
          id_cita: string;
          codigo_cita: string;
          id_usuario: string;
          id_ventanilla: number;
          id_tramite: number;
          fecha: string;
          hora_inicio: string;
          hora_fin: string;
          estado_cita: EstadoCita;
          codigo_qr: string | null;
          fecha_registro: string | null;
        };
        Insert: {
          id_cita?: string;
          codigo_cita: string;
          id_usuario: string;
          id_ventanilla: number;
          id_tramite: number;
          fecha: string;
          hora_inicio: string;
          hora_fin: string;
          estado_cita?: EstadoCita;
          codigo_qr?: string | null;
          fecha_registro?: string | null;
        };
        Update: {
          id_cita?: string;
          codigo_cita?: string;
          id_usuario?: string;
          id_ventanilla?: number;
          id_tramite?: number;
          fecha?: string;
          hora_inicio?: string;
          hora_fin?: string;
          estado_cita?: EstadoCita;
          codigo_qr?: string | null;
          fecha_registro?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cita_id_usuario_fkey";
            columns: ["id_usuario"];
            isOneToOne: false;
            referencedRelation: "perfil_usuario";
            referencedColumns: ["id_usuario"];
          },
          {
            foreignKeyName: "cita_id_ventanilla_fkey";
            columns: ["id_ventanilla"];
            isOneToOne: false;
            referencedRelation: "ventanilla";
            referencedColumns: ["id_ventanilla"];
          },
          {
            foreignKeyName: "cita_id_tramite_fkey";
            columns: ["id_tramite"];
            isOneToOne: false;
            referencedRelation: "tramite";
            referencedColumns: ["id_tramite"];
          }
        ];
      };
      atencion_cita: {
        Row: {
          id_atencion: string;
          id_cita: string;
          id_agente: string;
          hora_inicio_atencion: string | null;
          hora_fin_atencion: string | null;
          resultado_tramite: ResultadoTramite | null;
          comentario_observacion: string | null;
          fecha_registro: string | null;
        };
        Insert: {
          id_atencion?: string;
          id_cita: string;
          id_agente: string;
          hora_inicio_atencion?: string | null;
          hora_fin_atencion?: string | null;
          resultado_tramite?: ResultadoTramite | null;
          comentario_observacion?: string | null;
          fecha_registro?: string | null;
        };
        Update: {
          id_atencion?: string;
          id_cita?: string;
          id_agente?: string;
          hora_inicio_atencion?: string | null;
          hora_fin_atencion?: string | null;
          resultado_tramite?: ResultadoTramite | null;
          comentario_observacion?: string | null;
          fecha_registro?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "atencion_cita_id_cita_fkey";
            columns: ["id_cita"];
            isOneToOne: true;
            referencedRelation: "cita";
            referencedColumns: ["id_cita"];
          },
          {
            foreignKeyName: "atencion_cita_id_agente_fkey";
            columns: ["id_agente"];
            isOneToOne: false;
            referencedRelation: "perfil_usuario";
            referencedColumns: ["id_usuario"];
          }
        ];
      };
      cita_requisito_estado: {
        Row: {
          id_cita_req: number;
          id_atencion: string;
          id_requisito: number;
          cumplido: boolean;
        };
        Insert: {
          id_cita_req?: number;
          id_atencion: string;
          id_requisito: number;
          cumplido: boolean;
        };
        Update: {
          id_cita_req?: number;
          id_atencion?: string;
          id_requisito?: number;
          cumplido?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "cita_requisito_estado_id_atencion_fkey";
            columns: ["id_atencion"];
            isOneToOne: false;
            referencedRelation: "atencion_cita";
            referencedColumns: ["id_atencion"];
          },
          {
            foreignKeyName: "cita_requisito_estado_id_requisito_fkey";
            columns: ["id_requisito"];
            isOneToOne: false;
            referencedRelation: "requisito_tramite";
            referencedColumns: ["id_requisito"];
          }
        ];
      };
      notificacion: {
        Row: {
          id_notificacion: number;
          id_cita: string;
          tipo_notificacion: TipoNotificacion;
          estado_envio: EstadoEnvio;
          fecha_envio: string | null;
        };
        Insert: {
          id_notificacion?: number;
          id_cita: string;
          tipo_notificacion: TipoNotificacion;
          estado_envio?: EstadoEnvio;
          fecha_envio?: string | null;
        };
        Update: {
          id_notificacion?: number;
          id_cita?: string;
          tipo_notificacion?: TipoNotificacion;
          estado_envio?: EstadoEnvio;
          fecha_envio?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notificacion_id_cita_fkey";
            columns: ["id_cita"];
            isOneToOne: false;
            referencedRelation: "cita";
            referencedColumns: ["id_cita"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generar_horarios_agencia: {
        Args: {
          p_id_agencia: number;
          p_fecha_inicio: string;
          p_fecha_fin: string;
        };
        Returns: number;
      };
      bloquear_rango_horario: {
        Args: {
          p_id_ventanilla: number;
          p_fecha: string;
          p_hora_inicio: string;
          p_hora_fin: string;
        };
        Returns: number;
      };
      reservar_cita: {
        Args: {
          p_id_usuario: string;
          p_id_horario: number;
          p_id_tramite: number;
          p_codigo_cita: string;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
