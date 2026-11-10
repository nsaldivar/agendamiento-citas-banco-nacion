# Documento de Arquitectura, Componentes y Guía de Arranque
## Sistema de Agendamiento y Orientación - Banco de la Nación

Este documento resume la estructura arquitectónica del sistema de agendamiento de citas y orientación ciudadana para el **Banco de la Nación**, especificando el propósito de cada componente, las reglas de separación por capas y roles (RBAC) y los pasos detallados para comenzar a desarrollar o extender la aplicación.

---

## 1. Propósito de cada Componente del Sistema

| Componente | Descripción y Propósito | Tecnologías | Ubicación en Código |
| :--- | :--- | :--- | :--- |
| **Aplicación cliente** | Renderiza la interfaz gráfica para el ciudadano y personal del banco. Expone la Landing Page de orientación, consulta de trámites con requisitos, directorio de agencias con horarios y el flujo de agendamiento de citas. | React 19, Next.js (App Router), TailwindCSS, TypeScript | `src/app/(public)`, `src/app/(auth)`, `src/app/(dashboard)` |
| **Servidor de aplicaciones** | Ejecuta el renderizado híbrido (SSR/SSG), procesa las Server Actions y expone los endpoints internos. Aloja las 4 capas lógicas (Dominio, Aplicación, Infraestructura y Presentación) intermediando de forma segura entre el cliente y Supabase. | Vercel Serverless, Node.js, Next.js Actions | `src/app/actions`, `src/application/use-cases` |
| **Servicio de autenticación** | Administra el registro, inicio de sesión y control de acceso por roles (RBAC) de usuarios y personal de agencias (Cliente, Agente Ventanilla, Admin Agencia, Admin General). Validado vía tokens de sesión. | Supabase Auth, `@supabase/ssr` | `src/infrastructure/supabase` |
| **Base de datos** | Persiste las entidades de dominio en un esquema PostgreSQL en Supabase (`agencia`, `tramite`, `requisito_tramite`, `perfil_usuario`, `cita`, `horario_disponible`, `atencion_cita`, `notificacion`). Controlado exclusivamente mediante repositorios e Infraestructura con políticas RLS. | PostgreSQL en Supabase | `supabase/schema.sql`, `src/infrastructure/repositories` |
| **Servicios externos de notificación** | Envían confirmaciones de reserva y recordatorios de cita por correo electrónico o SMS. Se integran mediante adaptadores desacoplados de las reglas de dominio. | Adaptador Infraestructura (Resend / Twilio ready) | `src/infrastructure/notifications` |

---

## 2. Sistema de Diseño Globales (Banco de la Nación)

El archivo global de estilos [`src/app/globals.css`](file:///g:/MathiusDigital/Escritorio/Agendamiento/src/app/globals.css) define la paleta institucional:

- **Rojo Principal (`#C8102E` / `#9A0B22`)**: Utilizado en el logotipo, botones primarios, llamadas a la acción (AGENDAR CITA) y elementos de marca.
- **Negro / Carbón (`#0F172A` / `#090D16`)**: Fondos de tarjetas, headers institucionales y superficies oscuras legibles.
- **Dorado Acento (`#D4AF37`)**: Badges de prioridad, títulos de atención rápida y badges de rol preferencial.
- **Verde Acento (`#10B981`)**: Indicador de ventanillas activas, horarios disponibles y confirmaciones de cita.
- **Blanco / Gris Claro (`#FFFFFF` / `#F8FAFC`)**: Texto contrastado e insumos de formularios.

---

## 3. Organización de Directorios por Rol (Auditoría RBAC)

Para facilitar auditorías de código y mantener una separación limpia de permisos de usuario, las rutas se organizan en los siguientes módulos:

```
src/
├── app/
│   ├── (public)/              # Portal público sin autenticación (Landing page, trámites, agencias)
│   ├── (auth)/                # Iniciar Sesión y Registro con Supabase Auth
│   ├── (dashboard)/
│   │   ├── cliente/           # [Rol 1] Portal del Ciudadano (Ver citas, agendar nueva cita)
│   │   ├── ventanilla/        # [Rol 2] Módulo de Agente Ventanilla (Atender citas, validar requisitos)
│   │   ├── admin-agencia/     # [Rol 3] Gestión Local de Agencia (Asignar ventanillas y personal)
│   │   └── admin-general/     # [Rol 4] Auditoría RBAC y Administración Global
│   ├── layout.tsx             # Root layout con metadatos institucionales
│   └── globals.css            # Tokens de diseño del Banco
├── domain/                    # Capa 1: Entidades puras y tipos TypeScript
├── application/               # Capa 2: Puertos (interfaces) y Casos de Uso
├── infrastructure/            # Capa 3: Supabase Clients, Repositorios SQL y Notificaciones
```

---

## 4. Estructura de la Base de Datos en Supabase

El script oficial guardado en [`supabase/schema.sql`](file:///g:/MathiusDigital/Escritorio/Agendamiento/supabase/schema.sql) incluye:

1. **`rol` / `permiso` / `rol_permiso`**: Control RBAC con los 4 roles (Cliente = 1, Agente Ventanilla = 2, Admin Agencia = 3, Admin General = 4).
2. **`agencia` / `ventanilla`**: Directorio de sedes del banco y sus guijas de atención.
3. **`perfil_usuario`**: Mapeo de `auth.users` con DNI, nombres, correo y rol asignado.
4. **`tramite` / `requisito_tramite`**: Catálogo de servicios bancarios y lista dinámica de documentos requeridos.
5. **`horario_disponible` / `cita`**: Gestión de turnos y generación de códigos únicos QR para agendamiento.
6. **`crear_perfil_cliente_nuevo()`**: Trigger que crea automáticamente el perfil en `perfil_usuario` al registrarse en Supabase Auth.
7. **`reservar_cita()`**: Función almacenada PostgreSQL con bloqueo `FOR UPDATE` para impedir que dos personas reserven el mismo turno simultáneamente.

---

## 5. Guía de Inicio y Ejecución del Proyecto

1. **Variables de Entorno (`.env.local`)**:
   Verifica que el archivo `.env.local` contenga las llaves públicas de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://jrbzqhpacyejeahusvkc.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

2. **Iniciar Servidor Local**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en el navegador para ver la Landing Page basada en el boceto oficial.

3. **Verificación de Rutas**:
   - Landing Page Pública: `/`
   - Iniciar Sesión / Auditoría RBAC: `/login`
   - Módulo Cliente: `/cliente`
   - Módulo Ventanilla: `/ventanilla`
   - Módulo Admin Agencia: `/admin-agencia`
   - Módulo Admin General: `/admin-general`