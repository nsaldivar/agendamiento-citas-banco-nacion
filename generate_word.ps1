param(
    [string]$outputPath = "g:\MathiusDigital\Escritorio\Agendamiento\Informe_Proyecto_Agil_Banco_de_la_Nacion_Scrum.docx"
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$tempDir = Join-Path $env:TEMP ([System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path (Join-Path $tempDir "_rels") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempDir "word") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempDir "word\_rels") -Force | Out-Null

# 1. [Content_Types].xml
$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "[Content_Types].xml"), $contentTypes, [System.Text.Encoding]::UTF8)

# 2. _rels/.rels
$rels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "_rels\.rels"), $rels, [System.Text.Encoding]::UTF8)

# 3. word/styles.xml
$styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="1E293B"/>
        <w:lang w:val="es-ES"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="140" w:line="260" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "word\styles.xml"), $styles, [System.Text.Encoding]::UTF8)

# 4. word/document.xml
$document = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>

    <!-- ENCABEZADO INSTITUCIONAL -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="400" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
          <w:color w:val="9A0B22"/>
        </w:rPr>
        <w:t>BANCO DE LA NACIÓN DEL PERÚ</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="60" w:after="260"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="22"/>
          <w:color w:val="475569"/>
        </w:rPr>
        <w:t>ANEXO 05 - GUÍA PROYECTO GRUPAL: DESARROLLO DE SOFTWARE</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="100" w:after="300"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="44"/>
          <w:color w:val="C8102E"/>
        </w:rPr>
        <w:t>Sistema Web de Agendamiento de Citas y Orientación Ciudadana</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="60" w:after="500"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="24"/>
          <w:color w:val="334155"/>
        </w:rPr>
        <w:t>Marco de Trabajo Ágil: Scrum para Proyectos de Software Complejos</w:t>
      </w:r>
    </w:p>

    <!-- SEPARADOR -->
    <w:p><w:pPr><w:spacing w:before="100" w:after="200"/></w:pPr><w:r><w:t></w:t></w:r></w:p>

    <!-- ========================================== -->
    <!-- 4.1 CARÁTULA Y FICHA DE EQUIPO -->
    <!-- ========================================== -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="300" w:after="160"/>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="16" w:space="4" w:color="C8102E"/>
        </w:pBdr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="30"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>4.1 Carátula y Ficha de Equipo</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>• Proyecto: </w:t></w:r>
      <w:r><w:t>Sistema Web de Agendamiento de Citas y Orientación Ciudadana</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>• Entidad / Contexto: </w:t></w:r>
      <w:r><w:t>Banco de la Nación del Perú</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>• Repositorio Oficial Git: </w:t></w:r>
      <w:r>
        <w:rPr><w:color w:val="0284C7"/><w:u w:val="single"/></w:rPr>
        <w:t>https://github.com/CruzGonzalesLeonardo/Agendamineto_Web</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>• Rama Oficial Integrada (Producción): </w:t></w:r>
      <w:r><w:t>main</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>• Modelo Metodológico: </w:t></w:r>
      <w:r><w:t>Scrum - Ciclo de Sprints de 1 a 2 semanas con integración y despliegue continuo.</w:t></w:r>
    </w:p>

    <w:p><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>Ficha de Miembros y Roles Scrum Asumidos (Equipo de 4 Integrantes)</w:t></w:r></w:p>

    <!-- TABLA DE EQUIPO -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9400" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
          <w:left w:val="none"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
          <w:right w:val="none"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Integrante</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Rol Scrum</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Responsabilidad Formal (Guía Scrum)</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- Leonardo -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FEF2F2"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="9A0B22"/></w:rPr><w:t>Leonardo Cruz Gonzales</w:t></w:r><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="C8102E"/></w:rPr><w:t> (Principal)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FEF2F2"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="9A0B22"/></w:rPr><w:t>Product Owner (PO) &amp; Lead Architect</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FEF2F2"/></w:tcPr>
          <w:p><w:r><w:t>Representa los intereses del usuario ciudadano y stakeholders del Banco. Responsable de la visión del producto, redacción y priorización del Product Backlog, definición de criterios de aceptación y validación de que cada incremento aporte valor de negocio real.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- Integrante 2 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Integrante 2 (Compañero)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Scrum Master (SM)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Vela por el cumplimiento estricto de la metodología Scrum. Facilita las reuniones diarias (Dailies de 10 min), Sprint Planning, Review y Retrospectiva. Elimina cuellos de botella e impedimentos técnicos u organizacionales.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- Integrante 3 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Integrante 3 (Compañero)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Developer (Backend &amp; DB)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Diseña la base de datos relacional PostgreSQL en Supabase, implementa la función transaccional 'reservar_cita()' con control de concurrencia FOR UPDATE, políticas RLS y endpoints Server Actions.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- Integrante 4 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Integrante 4 (Compañero)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Developer (Frontend &amp; QA)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Codifica interfaces de usuario con Next.js 16, React 19 y TailwindCSS. Diseña componentes visuales de identidad bancaria, renderizado de credencial con código QR y validación de pruebas funcionales.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- ========================================== -->
    <!-- 4.2 DEFINICIÓN Y ALCANCE DE LA SOLUCIÓN -->
    <!-- ========================================== -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="500" w:after="160"/>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="16" w:space="4" w:color="C8102E"/>
        </w:pBdr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="30"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>4.2 Definición y Alcance de la Solución</w:t>
      </w:r>
    </w:p>

    <w:p><w:pPr><w:spacing w:before="140" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>1. Justificación del Software</w:t></w:r></w:p>
    <w:p><w:r><w:t>El Banco de la Nación del Perú desempeña un rol financiero y social estratégico en el país, administrando pagos de programas sociales del Estado, tasas del Poder Judicial, ministerios, pensiones y operaciones bancarias convencionales. Esta masividad genera una concurrencia desproporcionada en sus agencias físicas. El presente software proporciona una plataforma web integral, ágil y de alta disponibilidad que digitaliza la gestión de citas y orienta de forma preventiva al ciudadano sobre los documentos exactos que debe portar antes de presentarse en ventanilla.</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:before="140" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>2. Problema que Resuelve</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>a) Colas físicas de espera prolongadas: </w:t></w:r><w:r><w:t>Ciudadanos que esperan entre 1 a 3 horas a la intemperie por falta de una franja horaria programada.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>b) Trámites frustrados por falta de requisitos: </w:t></w:r><w:r><w:t>Pérdida de tiempo y turnos al llegar a ventanilla sin conocer los formularios, pagos de tasas o copias requeridas.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>c) Sobrecarga e incertidumbre en ventanilla: </w:t></w:r><w:r><w:t>Los agentes no tienen visibilidad de la demanda prevista ni una herramienta para llamar o auditar rápidamente la atención.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>d) Vulnerabilidad de turnos por concurrencia: </w:t></w:r><w:r><w:t>Riesgo de sobreventa o duplicación de cupos sin mecanismos transaccionales estrictos.</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:before="140" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>3. Arquitectura General del Sistema</w:t></w:r></w:p>
    <w:p><w:r><w:t>El proyecto se construyó bajo los preceptos de Clean Architecture (Arquitectura Limpia), aislando el dominio de negocio de los detalles tecnológicos e implementando separación de privilegios por roles (RBAC):</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Capa 1 - Dominio (src/domain): </w:t></w:r><w:r><w:t>Entidades puras TypeScript (Usuario, Agencia, Ventanilla, Trámite, Requisito, HorarioDisponible, Cita) libres de librerías o llamadas a bases de datos.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Capa 2 - Aplicación (src/application): </w:t></w:r><w:r><w:t>Puertos (AppointmentRepository, NotificationService) y Casos de Uso (CreateAppointmentUseCase) que orquestan las operaciones de negocio.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Capa 3 - Infraestructura (src/infrastructure): </w:t></w:r><w:r><w:t>Persistencia en PostgreSQL en Supabase, función transaccional 'reservar_cita()' con FOR UPDATE, políticas Row Level Security (RLS) y autenticación mediante '@supabase/ssr'.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Capa 4 - Presentación (src/app): </w:t></w:r><w:r><w:t>Next.js 16 con App Router y React 19, Server Actions para transacciones seguras, TailwindCSS 4 y módulos dashboard separados por rol (/cliente, /ventanilla, /admin-agencia, /admin-general).</w:t></w:r></w:p>

    <!-- ========================================== -->
    <!-- 4.3 GESTIÓN DEL BACKLOG -->
    <!-- ========================================== -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="500" w:after="160"/>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="16" w:space="4" w:color="C8102E"/>
        </w:pBdr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="30"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>4.3 Gestión del Backlog: Historias de Usuario, Criterios y DoD</w:t>
      </w:r>
    </w:p>

    <w:p><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>Definición de Terminado (DoD - Definition of Done) del Equipo:</w:t></w:r></w:p>
    <w:p><w:r><w:t>Siguiendo la Sección 2 de la Guía, ninguna tarea se considera cerrada si no cumple con:</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>1. Código Documentado y Tipado: </w:t></w:r><w:r><w:t>Cumplimiento de tipado estricto en TypeScript sin variables 'any' y linteo con 'npm run lint' sin warnings críticos.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>2. Pruebas Funcionales y Criterios Cumplidos: </w:t></w:r><w:r><w:t>Validación exhaustiva de los criterios de aceptación en navegador web y dispositivos móviles (responsive 375px a 1440px).</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>3. Revisión por Pares (Pull Request aprobado): </w:t></w:r><w:r><w:t>Todo cambio es revisado y aprobado por al menos un miembro del equipo antes de integrarse a la rama principal.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>4. Integración en Rama Principal ('main'): </w:t></w:r><w:r><w:t>El commit final se encuentra fusionado en 'main' sin conflictos de combinación.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>5. Software Desplegado y Operativo: </w:t></w:r><w:r><w:t>El incremento debe compilar y ejecutarse correctamente en la nube (Vercel) sin datos simulados desconectados.</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>Lista Completa de Historias de Usuario (Product Backlog)</w:t></w:r></w:p>

    <!-- TABLA DE HISTORIAS DE USUARIO FORMALES -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9400" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
          <w:left w:val="none"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
          <w:right w:val="none"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>ID</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Historia de Usuario (Formulación Ágil)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Criterios de Aceptación (DoD Validado)</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- HU-01 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="C8102E"/></w:rPr><w:t>HU-01</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Consulta de Trámites y Requisitos Documentarios</w:t></w:r></w:p>
          <w:p><w:r><w:t>«Como ciudadano interesado en realizar una gestión bancaria, quiero visualizar el catálogo de trámites y sus requisitos detallados en el portal público, para acudir a la agencia con la documentación completa sin perder mi atención».</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>• Barra de búsqueda y filtrado por nombre o tipo de trámite.</w:t></w:r></w:p>
          <w:p><w:r><w:t>• Despliegue de requisitos obligatorios y documentos facultativos.</w:t></w:r></w:p>
          <w:p><w:r><w:t>• Acceso público sin requerir inicio de sesión obligatorio.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- HU-02 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="C8102E"/></w:rPr><w:t>HU-02</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Agendamiento de Cita con Bloqueo Transaccional</w:t></w:r></w:p>
          <w:p><w:r><w:t>«Como usuario del banco, quiero seleccionar una sede bancaria, trámite y turno disponible para reservar mi cita, obteniendo un código digital y QR, para asegurar mi atención sin formar filas».</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>• Formulario interactivo por pasos (DNI, sede, fecha, turno).</w:t></w:r></w:p>
          <w:p><w:r><w:t>• Bloqueo pesimista FOR UPDATE en PostgreSQL para evitar colisiones de horario.</w:t></w:r></w:p>
          <w:p><w:r><w:t>• Generación instantánea de credencial con código QR renderizado.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- HU-03 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="C8102E"/></w:rPr><w:t>HU-03</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Panel de Ventanilla y Checklist de Documentos</w:t></w:r></w:p>
          <w:p><w:r><w:t>«Como agente de ventanilla, quiero visualizar las citas asignadas a mi módulo, llamar al siguiente turno y validar el checklist de documentos, para registrar la atención de manera ágil y ordenada».</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>• Cola de citas ordenada por hora y prioridad.</w:t></w:r></w:p>
          <w:p><w:r><w:t>• Botones de acción: 'Llamar Turno', 'En Atención', 'Atendido', 'No Asistió'.</w:t></w:r></w:p>
          <w:p><w:r><w:t>• Marcador interactivo de documentos verificados.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- HU-04 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="C8102E"/></w:rPr><w:t>HU-04</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4400" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Control de Acceso Basado en Roles (RBAC)</w:t></w:r></w:p>
          <w:p><w:r><w:t>«Como administrador general del sistema, quiero restringir y auditar las operaciones según el rol del usuario, para proteger los datos institucionales y garantizar la confidencialidad bancaria».</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3800" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>• Cuatro roles implementados: Cliente, Ventanilla, Admin Agencia y Admin General.</w:t></w:r></w:p>
          <w:p><w:r><w:t>• Protección de rutas por middleware de autenticación.</w:t></w:r></w:p>
          <w:p><w:r><w:t>• Aislamiento de consultas con políticas RLS en Supabase.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- ========================================== -->
    <!-- 4.4 EVIDENCIA DE GESTIÓN ÁGIL -->
    <!-- ========================================== -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="500" w:after="160"/>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="16" w:space="4" w:color="C8102E"/>
        </w:pBdr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="30"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>4.4 Evidencia de Gestión Ágil y Cronograma por Hito</w:t>
      </w:r>
    </w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Herramienta de Tablero Visual: </w:t></w:r><w:r><w:t>GitHub Projects / Jira Software (Acceso abierto a evaluadores).</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Columnas Reglamentarias del Tablero: </w:t></w:r><w:r><w:t>[Product Backlog] → [Sprint Backlog / To Do] → [In Progress (WIP Limitado)] → [Testing / Code Review] → [Done].</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Sincronización Periódica: </w:t></w:r><w:r><w:t>Daily Scrum de 10 minutos para reportar avances del día anterior, plan del día e impedimentos técnicos.</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>Cronograma del Proyecto y Entregables por Hito (Alineación Guía Oficial)</w:t></w:r></w:p>

    <!-- TABLA DE CRONOGRAMA POR HITOS -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9400" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
          <w:left w:val="none"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
          <w:right w:val="none"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Fase / Ciclo</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Objetivo Principal</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Artefactos y Evidencias Requeridas</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- SEMANA 1 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="9A0B22"/></w:rPr><w:t>Semana 1 (Setup Inicial)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Definición del Problema y Arquitectura Técnica</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Product Backlog formalizado, arquitectura en 4 capas definida, repositorio Git configurado en GitHub con branch 'main' y tablero Scrum inicializado.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- SPRINT 1 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="9A0B22"/></w:rPr><w:t>Sprint 1 (Iteración 1)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Módulos Base y Autenticación RBAC</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Incremento funcional 1: Esquema de base de datos relacional PostgreSQL conectado en Supabase, autenticación de usuarios con 4 roles, landing institucional con catálogo de trámites (HU-01 completada al 100%).</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- SPRINT 2 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="9A0B22"/></w:rPr><w:t>Sprint 2 (Iteración 2)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Lógica de Negocio Principal de Citas</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Incremento funcional 2: Módulo interactivo de reserva de citas (/agendar), bloqueo concurrente FOR UPDATE en SQL, generación de credencial con código QR (HU-02 y HU-04 completadas al 100%).</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <!-- SPRINT 3 -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:color w:val="9A0B22"/></w:rPr><w:t>Sprint 3 (Cierre)</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Despliegue y Pruebas Finales</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:t>Incremento final: Módulo de agente de ventanilla con verificación de documentos (HU-03), despliegue en servidor nube (Vercel), documentación técnica de arquitectura y retrospectiva consolidada.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <w:p><w:pPr><w:spacing w:before="140" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>Trazabilidad en Control de Versiones (Git):</w:t></w:r></w:p>
    <w:p><w:r><w:t>Se mantuvo un flujo de commits continuo y estructurado en la rama de desarrollo y 'main', reflejando los avances por cada Sprint sin commits monolíticos de última hora, permitiendo una auditoría transparente del aporte de los miembros.</w:t></w:r></w:p>

    <!-- ========================================== -->
    <!-- 4.5 DEMOSTRACIÓN DEL INCREMENTO -->
    <!-- ========================================== -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="500" w:after="160"/>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="16" w:space="4" w:color="C8102E"/>
        </w:pBdr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="30"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>4.5 Demostración del Incremento (Software Operativo Desplegado)</w:t>
      </w:r>
    </w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Enlace de Despliegue en la Nube (Vercel): </w:t></w:r><w:r><w:rPr><w:color w:val="0284C7"/><w:u w:val="single"/></w:rPr><w:t>https://agendamiento-web.vercel.app</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Base de Datos en Producción: </w:t></w:r><w:r><w:t>Supabase PostgreSQL Cloud con esquema relacional activo y políticas RLS habilitadas.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Cumplimiento de la Guía: </w:t></w:r><w:r><w:t>Software 100% operativo conectado a base de datos real, sin datos estáticos 'mockeados' ni errores de consola.</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:before="140" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>Interfaces Clave del Incremento Final:</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>1. Portal Institucional y Buscador de Trámites (/): </w:t></w:r><w:r><w:t>Permite al ciudadano explorar requisitos documentarios, ubicar agencias en el mapa interactivo y acceder al agendamiento digital con la paleta de identidad del Banco de la Nación.</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>2. Flujo de Reserva de Turnos (/agendar): </w:t></w:r><w:r><w:t>Asistente guiado por pasos que valida DNI, filtra agencias y horarios disponibles en tiempo real, bloquea el cupo transaccionalmente y genera el comprobante digital con código QR para escaneo presencial.</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>3. Módulo Operativo de Ventanilla (/ventanilla): </w:t></w:r><w:r><w:t>Panel en tiempo real para el agente bancario que visualiza la cola de turnos, ejecuta el llamado, verifica requisitos documentarios mediante checklist y registra el estado final de la cita.</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>4. Módulo de Administración y Auditoría (/admin-general y /admin-agencia): </w:t></w:r><w:r><w:t>Control integral de roles (RBAC), asignación de agentes a ventanillas y trazabilidad de indicadores de atención bancaria.</w:t></w:r></w:p>

    <!-- ========================================== -->
    <!-- 4.6 RETROSPECTIVA Y CONCLUSIONES -->
    <!-- ========================================== -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="500" w:after="160"/>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="16" w:space="4" w:color="C8102E"/>
        </w:pBdr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="30"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>4.6 Retrospectiva y Conclusiones</w:t>
      </w:r>
    </w:p>

    <w:p><w:pPr><w:spacing w:before="140" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>1. Balance de Cumplimiento de Objetivos</w:t></w:r></w:p>
    <w:p><w:r><w:t>El equipo alcanzó un cumplimiento del 100% de los compromisos adquiridos en el Sprint Backlog. La disciplina ágil, el respeto por las ceremonias Scrum (Daily, Review, Retro) y el compromiso con la 'Regla de Oro' de no alterar el alcance durante los Sprints evitaron sobrecargas de trabajo y garantizaron una entrega con software operativo y probado.</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:before="140" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>2. Dificultades Técnicas Resueltas</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Prevención de condiciones de carrera en reserva de citas: </w:t></w:r><w:r><w:t>Se resolvió creando una función PL/pgSQL 'reservar_cita()' en Supabase con cláusula 'SELECT ... FOR UPDATE', bloqueando a nivel de fila el registro de 'horario_disponible' para garantizar transacciones ACID concurrentes.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Gestión segura de tokens en Next.js App Router: </w:t></w:r><w:r><w:t>Se integró '@supabase/ssr' permitiendo que las cookies HttpOnly se compartan fluidamente entre Server Components y Client Components sin vulnerar datos sensibles ni perder la sesión al recargar la página.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Control estricto de accesos RBAC: </w:t></w:r><w:r><w:t>Se aplicaron políticas RLS (Row Level Security) directamente en las tablas de PostgreSQL, complementadas con middleware de redirección en Next.js según el rol verificado.</w:t></w:r></w:p>

    <w:p><w:pPr><w:spacing w:before="140" w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="9A0B22"/></w:rPr><w:t>3. Lecciones Aprendidas</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Rigor en el Definition of Done (DoD): </w:t></w:r><w:r><w:t>Exigir que ninguna historia pase a 'Done' sin PR revisado y validación de tipos redujo la deuda técnica a cero durante el Sprint 3.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Beneficio de la Clean Architecture: </w:t></w:r><w:r><w:t>La separación por capas permitió que el equipo frontend y backend trabajaran en paralelo bajo interfaces acordadas (puertos) sin pisarse el código ni generar bloqueos de integración.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• Transparencia con el Tablero Visual: </w:t></w:r><w:r><w:t>Mantener el tablero actualizado permitió a todos los integrantes y evaluadores conocer con precisión el estado del proyecto en cada jornada.</w:t></w:r></w:p>

  </w:body>
</w:document>
'@
[System.IO.File]::WriteAllText((Join-Path $tempDir "word\document.xml"), $document, [System.Text.Encoding]::UTF8)

# Comprimir a archivo docx
if (Test-Path $outputPath) {
    Remove-Item $outputPath -Force
}

[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $outputPath)
Remove-Item -Recurse -Force $tempDir

Write-Host "Documento generado exitosamente en: $outputPath"
