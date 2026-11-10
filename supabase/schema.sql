-- =========================================================================
-- CREACIÓN DE TABLAS Y CONFIGURACIÓN DE ACCESO ANÓNIMO / LIBRE DE AUTENTICACIÓN
-- Engine: PostgreSQL (Supabase)
-- =========================================================================

-- 1. LIMPIEZA PREVIA DE TABLAS
DROP TABLE IF EXISTS public.notificacion CASCADE;
DROP TABLE IF EXISTS public.cita_requisito_estado CASCADE;
DROP TABLE IF EXISTS public.atencion_cita CASCADE;
DROP TABLE IF EXISTS public.cita CASCADE;
DROP TABLE IF EXISTS public.horario_disponible CASCADE;
DROP TABLE IF EXISTS public.plantilla_horario_agencia CASCADE;
DROP TABLE IF EXISTS public.requisito_tramite CASCADE;
DROP TABLE IF EXISTS public.agencia_tramite CASCADE;
DROP TABLE IF EXISTS public.tramite CASCADE;
DROP TABLE IF EXISTS public.personal_ventanilla CASCADE;
DROP TABLE IF EXISTS public.perfil_usuario CASCADE;
DROP TABLE IF EXISTS public.ventanilla CASCADE;
DROP TABLE IF EXISTS public.agencia CASCADE;
DROP TABLE IF EXISTS public.rol_permiso CASCADE;
DROP TABLE IF EXISTS public.permiso CASCADE;
DROP TABLE IF EXISTS public.rol CASCADE;

-- 2. TABLAS BASE DE ROL Y PERMISOS
CREATE TABLE public.rol (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE public.permiso (
    id_permiso SERIAL PRIMARY KEY,
    codigo_permiso VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE public.rol_permiso (
    id_rol INT REFERENCES public.rol(id_rol) ON DELETE CASCADE,
    id_permiso INT REFERENCES public.permiso(id_permiso) ON DELETE CASCADE,
    PRIMARY KEY (id_rol, id_permiso)
);

-- 3. INFRAESTRUCTURA Y HORARIOS DE AGENCIAS
CREATE TABLE public.agencia (
    id_agencia SERIAL PRIMARY KEY,
    nombre_agencia VARCHAR(100) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    distrito VARCHAR(100) NOT NULL,
    telefono VARCHAR(15),
    latitud NUMERIC(10, 8),
    longitud NUMERIC(11, 8),
    activa BOOLEAN DEFAULT true
);

CREATE TABLE public.ventanilla (
    id_ventanilla SERIAL PRIMARY KEY,
    id_agencia INT NOT NULL REFERENCES public.agencia(id_agencia) ON DELETE CASCADE,
    numero_ventanilla VARCHAR(10) NOT NULL,
    activa BOOLEAN DEFAULT true,
    CONSTRAINT uq_agencia_ventanilla UNIQUE (id_agencia, numero_ventanilla)
);

CREATE TABLE public.plantilla_horario_agencia (
    id_plantilla SERIAL PRIMARY KEY,
    id_agencia INT NOT NULL REFERENCES public.agencia(id_agencia) ON DELETE CASCADE,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1: Lunes, 7: Domingo
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    hora_inicio_almuerzo TIME,
    hora_fin_almuerzo TIME,
    intervalo_minutos SMALLINT NOT NULL DEFAULT 15 CHECK (intervalo_minutos > 0),
    activa BOOLEAN DEFAULT true,
    CONSTRAINT uq_agencia_dia UNIQUE (id_agencia, dia_semana),
    CONSTRAINT ck_rango_jornada CHECK (hora_cierre > hora_apertura)
);

-- 4. USUARIOS Y ASIGNACIÓN
CREATE TABLE public.perfil_usuario (
    id_usuario UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    dni CHAR(8) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(15),
    password_hash VARCHAR(255),
    id_rol INT NOT NULL REFERENCES public.rol(id_rol) DEFAULT 1,
    id_agencia INT REFERENCES public.agencia(id_agencia) ON DELETE SET NULL
);

CREATE TABLE public.personal_ventanilla (
    id_asignacion SERIAL PRIMARY KEY,
    id_usuario UUID NOT NULL REFERENCES public.perfil_usuario(id_usuario) ON DELETE CASCADE,
    id_ventanilla INT NOT NULL REFERENCES public.ventanilla(id_ventanilla) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    activa BOOLEAN DEFAULT true
);

-- 5. TRÁMITES Y REQUISITOS
CREATE TABLE public.tramite (
    id_tramite SERIAL PRIMARY KEY,
    nombre_tramite VARCHAR(100) NOT NULL,
    descripcion TEXT,
    duracion_minutos SMALLINT NOT NULL CHECK (duracion_minutos > 0),
    activo BOOLEAN DEFAULT true
);

CREATE TABLE public.agencia_tramite (
    id_agencia INT REFERENCES public.agencia(id_agencia) ON DELETE CASCADE,
    id_tramite INT REFERENCES public.tramite(id_tramite) ON DELETE CASCADE,
    PRIMARY KEY (id_agencia, id_tramite)
);

CREATE TABLE public.requisito_tramite (
    id_requisito SERIAL PRIMARY KEY,
    id_tramite INT NOT NULL REFERENCES public.tramite(id_tramite) ON DELETE CASCADE,
    descripcion_requisito TEXT NOT NULL,
    es_obligatorio BOOLEAN DEFAULT true
);

-- 5b. HORARIOS DISPONIBLES (faltaba en el script original)
CREATE TABLE public.horario_disponible (
    id_horario SERIAL PRIMARY KEY,
    id_ventanilla INT NOT NULL REFERENCES public.ventanilla(id_ventanilla) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado_horario VARCHAR(20) NOT NULL DEFAULT 'disponible'
        CHECK (estado_horario IN ('disponible', 'reservado', 'bloqueado', 'completado')),
    CONSTRAINT uq_horario UNIQUE (id_ventanilla, fecha, hora_inicio)
);

-- 6. CITAS
CREATE TABLE public.cita (
    id_cita UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cita VARCHAR(15) NOT NULL UNIQUE,
    id_usuario UUID NOT NULL REFERENCES public.perfil_usuario(id_usuario),
    id_horario INT REFERENCES public.horario_disponible(id_horario) ON DELETE SET NULL,
    id_ventanilla INT NOT NULL REFERENCES public.ventanilla(id_ventanilla),
    id_tramite INT NOT NULL REFERENCES public.tramite(id_tramite),
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado_cita VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_cita IN ('pendiente', 'confirmada', 'en_atencion', 'atendida', 'rechazada', 'cancelada')),
    codigo_qr TEXT UNIQUE,
    fecha_registro TIMESTAMPTZ DEFAULT now()
);

-- 7. ATENCIÓN Y NOTIFICACIONES
CREATE TABLE public.atencion_cita (
    id_atencion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cita UUID NOT NULL UNIQUE REFERENCES public.cita(id_cita) ON DELETE CASCADE,
    id_agente UUID NOT NULL REFERENCES public.perfil_usuario(id_usuario),
    hora_inicio_atencion TIMESTAMPTZ,
    hora_fin_atencion TIMESTAMPTZ,
    resultado_tramite VARCHAR(20) CHECK (resultado_tramite IN ('aceptado', 'rechazado')),
    comentario_observacion TEXT,
    fecha_registro TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.cita_requisito_estado (
    id_cita_req SERIAL PRIMARY KEY,
    id_atencion UUID NOT NULL REFERENCES public.atencion_cita(id_atencion) ON DELETE CASCADE,
    id_requisito INT NOT NULL REFERENCES public.requisito_tramite(id_requisito),
    cumplido BOOLEAN NOT NULL
);

CREATE TABLE public.notificacion (
    id_notificacion SERIAL PRIMARY KEY,
    id_cita UUID NOT NULL REFERENCES public.cita(id_cita) ON DELETE CASCADE,
    tipo_notificacion VARCHAR(10) NOT NULL CHECK (tipo_notificacion IN ('correo', 'sms')),
    estado_envio VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_envio IN ('pendiente', 'enviado', 'fallido')),
    fecha_envio TIMESTAMPTZ
);

-- =========================================================================
-- PERMISOS DE ACCESO TOTAL PARA USUARIOS ANÓNIMOS (SIN AUTENTICACIÓN)
-- =========================================================================

-- Otorgar permisos globales al rol anónimo (anon) y autenticado (authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Desactivar RLS en todas las tablas para permitir consultas libres sin token
ALTER TABLE public.rol DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permiso DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol_permiso DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventanilla DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantilla_horario_agencia DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_usuario DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_ventanilla DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tramite DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_tramite DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisito_tramite DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.horario_disponible DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cita DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.atencion_cita DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cita_requisito_estado DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacion DISABLE ROW LEVEL SECURITY;

-- =========================================================================
-- SCRIPT DE FUNCIONES Y CARGA DE DATOS INICIALES (CORREGIDO)
-- Engine: PostgreSQL (Supabase)
-- =========================================================================

-- 1. FUNCIONES Y TRIGGERS DE LÓGICA DE NEGOCIO

CREATE OR REPLACE FUNCTION public.crear_perfil_cliente_nuevo()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfil_usuario (
        id_usuario, dni, nombres, apellidos, correo, telefono, id_rol, id_agencia
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'dni', '00000000'),
        COALESCE(NEW.raw_user_meta_data->>'nombres', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'apellidos', 'Registrado'),
        NEW.email,
        NEW.raw_user_meta_data->>'telefono',
        1,
        NULL
    )
    ON CONFLICT (id_usuario) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS al_crear_usuario_auth ON auth.users;
CREATE TRIGGER al_crear_usuario_auth
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_cliente_nuevo();

CREATE OR REPLACE FUNCTION public.generar_horarios_agencia(
    p_id_agencia INT,
    p_fecha_inicio DATE,
    p_fecha_fin DATE
) RETURNS INTEGER AS $$
DECLARE
    v_fecha DATE;
    v_dia_semana SMALLINT;
    v_plantilla RECORD;
    v_ventanilla RECORD;
    v_curr_time TIME;
    v_next_time TIME;
    v_total_insertados INTEGER := 0;
BEGIN
    v_fecha := p_fecha_inicio;
    WHILE v_fecha <= p_fecha_fin LOOP
        v_dia_semana := EXTRACT(ISODOW FROM v_fecha);
        SELECT * INTO v_plantilla FROM public.plantilla_horario_agencia
        WHERE id_agencia = p_id_agencia AND dia_semana = v_dia_semana AND activa = true;
        
        IF FOUND THEN
            FOR v_ventanilla IN SELECT id_ventanilla FROM public.ventanilla WHERE id_agencia = p_id_agencia AND activa = true LOOP
                v_curr_time := v_plantilla.hora_apertura;
                WHILE v_curr_time < v_plantilla.hora_cierre LOOP
                    v_next_time := v_curr_time + (v_plantilla.intervalo_minutos || ' minutes')::INTERVAL;
                    IF v_next_time > v_plantilla.hora_cierre THEN EXIT; END IF;

                    IF v_plantilla.hora_inicio_almuerzo IS NOT NULL AND v_plantilla.hora_fin_almuerzo IS NOT NULL THEN
                        IF v_curr_time >= v_plantilla.hora_inicio_almuerzo AND v_next_time <= v_plantilla.hora_fin_almuerzo THEN
                            v_curr_time := v_next_time;
                            CONTINUE;
                        END IF;
                    END IF;

                    INSERT INTO public.horario_disponible (id_ventanilla, fecha, hora_inicio, hora_fin, estado_horario)
                    VALUES (v_ventanilla.id_ventanilla, v_fecha, v_curr_time, v_next_time, 'disponible')
                    ON CONFLICT (id_ventanilla, fecha, hora_inicio) DO NOTHING;
                    
                    v_total_insertados := v_total_insertados + 1;
                    v_curr_time := v_next_time;
                END LOOP;
            END LOOP;
        END IF;
        v_fecha := v_fecha + 1;
    END LOOP;
    RETURN v_total_insertados;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.bloquear_rango_horario(
    p_id_ventanilla INT,
    p_fecha DATE,
    p_hora_inicio TIME,
    p_hora_fin TIME
) RETURNS INTEGER AS $$
DECLARE
    v_filas_afectadas INTEGER;
BEGIN
    UPDATE public.horario_disponible
    SET estado_horario = 'bloqueado'
    WHERE id_ventanilla = p_id_ventanilla
      AND fecha = p_fecha
      AND hora_inicio >= p_hora_inicio
      AND hora_fin <= p_hora_fin
      AND estado_horario = 'disponible';

    GET DIAGNOSTICS v_filas_afectadas = ROW_COUNT;
    RETURN v_filas_afectadas;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.reservar_cita(
    p_id_usuario UUID,
    p_id_horario INT,
    p_id_tramite INT,
    p_codigo_cita VARCHAR
) RETURNS UUID AS $$
DECLARE
    v_id_cita UUID;
BEGIN
    PERFORM 1 FROM public.horario_disponible
    WHERE id_horario = p_id_horario AND estado_horario = 'disponible'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El horario seleccionado ya no está disponible.';
    END IF;

    UPDATE public.horario_disponible
    SET estado_horario = 'reservado'
    WHERE id_horario = p_id_horario;

    INSERT INTO public.cita (id_usuario, id_horario, id_ventanilla, id_tramite, fecha, hora_inicio, hora_fin, codigo_cita, codigo_qr)
    SELECT p_id_usuario, h.id_horario, h.id_ventanilla, p_id_tramite, h.fecha, h.hora_inicio, h.hora_fin, p_codigo_cita, p_codigo_cita
    FROM public.horario_disponible h WHERE h.id_horario = p_id_horario
    RETURNING id_cita INTO v_id_cita;

    RETURN v_id_cita;
END;
$$ LANGUAGE plpgsql;

-- 2. ROLES
INSERT INTO public.rol (id_rol, nombre_rol) VALUES 
(1, 'Cliente'),
(2, 'Agente Ventanilla'),
(3, 'Administrador Agencia'),
(4, 'Administrador General')
ON CONFLICT (id_rol) DO NOTHING;

-- 3. AGENCIAS Y VENTANILLAS
INSERT INTO public.agencia (id_agencia, nombre_agencia, direccion, distrito, telefono, latitud, longitud, activa) VALUES
(1, 'Agencia Cusco Central', 'Av. El Sol 345', 'Cusco', '084-221100', -13.518333, -71.978056, true),
(2, 'Agencia Wanchaq', 'Av. La Cultura 820', 'Wanchaq', '084-245566', -13.522500, -71.958889, true)
ON CONFLICT (id_agencia) DO NOTHING;

SELECT setval('agencia_id_agencia_seq', (SELECT MAX(id_agencia) FROM public.agencia));

INSERT INTO public.ventanilla (id_ventanilla, id_agencia, numero_ventanilla, activa) VALUES
(1, 1, 'V-01', true),
(2, 1, 'V-02', true),
(3, 2, 'V-01', true)
ON CONFLICT (id_ventanilla) DO NOTHING;

SELECT setval('ventanilla_id_ventanilla_seq', (SELECT MAX(id_ventanilla) FROM public.ventanilla));

-- 4. PLANTILLA DE HORARIOS
INSERT INTO public.plantilla_horario_agencia (id_agencia, dia_semana, hora_apertura, hora_cierre, hora_inicio_almuerzo, hora_fin_almuerzo, intervalo_minutos)
SELECT a.id_agencia, d, '08:00:00'::TIME, '17:00:00'::TIME, '13:00:00'::TIME, '14:00:00'::TIME, 15
FROM public.agencia a
CROSS JOIN generate_series(1, 5) d
ON CONFLICT (id_agencia, dia_semana) DO NOTHING;

-- 5. USUARIOS
DELETE FROM auth.users WHERE email IN ('76929984@continental.edu.pe', 'agente.cusco@banco.gob.pe', 'cliente.prueba@gmail.com');

-- A. ADMIN PRINCIPAL
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    '76929984@continental.edu.pe',
    '$2a$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuu',
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombres":"Jose Leonardo", "apellidos":"Cruz Gonzales", "dni":"76929984", "telefono":"987654321"}',
    NOW(),
    NOW()
);

UPDATE public.perfil_usuario 
SET id_rol = 4, 
    nombres = 'Jose Leonardo', 
    apellidos = 'Cruz Gonzales', 
    dni = '76929984'
WHERE id_usuario = 'a0000000-0000-0000-0000-000000000001';

-- B. AGENTE DE VENTANILLA
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
    'a0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'agente.cusco@banco.gob.pe',
    '$2a$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuu',
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombres":"Juan", "apellidos":"Perez Agente", "dni":"12345678", "telefono":"912345678"}',
    NOW(),
    NOW()
);

UPDATE public.perfil_usuario SET id_rol = 2, id_agencia = 1 WHERE id_usuario = 'a0000000-0000-0000-0000-000000000002';

INSERT INTO public.personal_ventanilla (id_usuario, id_ventanilla, fecha, activa)
VALUES ('a0000000-0000-0000-0000-000000000002', 1, CURRENT_DATE, true)
ON CONFLICT DO NOTHING;

-- C. CLIENTE DE PRUEBA
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
    'a0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'cliente.prueba@gmail.com',
    '$2a$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuu',
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombres":"Maria", "apellidos":"Quispe Ciudadana", "dni":"87654321", "telefono":"955443322"}',
    NOW(),
    NOW()
);

-- 6. TRÁMITES Y REQUISITOS
INSERT INTO public.tramite (id_tramite, nombre_tramite, descripcion, duracion_minutos, activo) VALUES
(1, 'Apertura de Cuenta de Ahorros', 'Apertura de cuenta de ahorros personal en moneda nacional.', 30, true),
(2, 'Cobro de Giros y Bonos', 'Atención para cobro de giros nacionales y subvenciones del Estado.', 15, true)
ON CONFLICT (id_tramite) DO NOTHING;

SELECT setval('tramite_id_tramite_seq', (SELECT MAX(id_tramite) FROM public.tramite));

INSERT INTO public.agencia_tramite (id_agencia, id_tramite) VALUES
(1, 1), (1, 2), (2, 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.requisito_tramite (id_tramite, descripcion_requisito, es_obligatorio) VALUES
(1, 'DNI físico vigente (original y copia).', true),
(1, 'Recibo de servicio público (agua o luz) con antigüedad no mayor a 2 meses.', true),
(2, 'DNI físico original del beneficiario.', true),
(2, 'Código de transacción de 10 dígitos proporcionado por el remitente.', true)
ON CONFLICT DO NOTHING;

-- 7. GENERACIÓN DE HORARIOS (CORREGIDO CON SUMA DE DÍAS ENTEROS)
SELECT public.generar_horarios_agencia(1, CURRENT_DATE, (CURRENT_DATE + 7));

-- 8. REGISTRAR CITA DE DEMOSTRACIÓN
INSERT INTO public.cita (id_cita, codigo_cita, id_usuario, id_horario, id_ventanilla, id_tramite, fecha, hora_inicio, hora_fin, estado_cita, codigo_qr)
SELECT 'c0000000-0000-0000-0000-000000000001', 'CIT-2026-001', 'a0000000-0000-0000-0000-000000000003',
       h.id_horario, h.id_ventanilla, 1, h.fecha, h.hora_inicio, h.hora_fin, 'pendiente', 'CIT-2026-001'
FROM public.horario_disponible h
WHERE h.id_ventanilla = 1
ORDER BY h.fecha, h.hora_inicio
LIMIT 1
ON CONFLICT (id_cita) DO NOTHING;

UPDATE public.horario_disponible 
SET estado_horario = 'reservado' 
WHERE id_horario = (SELECT id_horario FROM public.cita WHERE id_cita = 'c0000000-0000-0000-0000-000000000001');