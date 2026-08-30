# Sistema de Gestión de Recursos Humanos

Sistema web para digitalizar la administración del personal de una empresa: registro de empleados, control de vacaciones, historial de cambios y generación de documentos oficiales en PDF.

**Demo en vivo:** [https://sistema-rrhh-jet.vercel.app](https://sistema-rrhh-jet.vercel.app)
*(Usuario: `admin` / Contraseña: `Admin123`. El backend está en un plan gratuito y puede tardar hasta 50 segundos en responder la primera vez que se usa tras un rato inactivo)*

## Qué hace

**Empleados**
Registro completo de cada trabajador: datos personales, cargo inicial y actual, salarios, itinerario, AFP, ARS, grupo ocupacional. Incluye búsqueda en tiempo real y filtros por estatus (activo, inactivo, suspendido, vacaciones).

**Vacaciones**
Calcula automáticamente los días de vacaciones que le corresponden a cada empleado según su antigüedad, respetando los días feriados dominicanos al calcular las fechas de regreso. Permite registrar, cancelar y reactivar períodos.

**Historial de cambios**
Cada vez que se modifica cualquier dato del expediente de un empleado, queda registrado quién lo cambió, cuándo, y cuál era el valor anterior y el nuevo.

**Documentos en PDF**
Genera constancias de trabajo, salario, residencia y expediente completo, además de reportes generales filtrables (por cargo, estatus, salario, AFP, ARS, etc.) — todo listo para imprimir o descargar.

**Anexos**
Cada empleado puede tener documentos adjuntos (cédula, contratos, certificados) subidos directamente desde su ficha.

**Dashboard**
Vista general con el total de empleados, activos, inactivos y tasa de actividad, además de los últimos registros.

## Cómo está hecho

- **Frontend:** React + Vite
- **Backend:** Node.js con Express
- **Base de datos:** PostgreSQL, alojada en Neon (originalmente se desarrolló con SQL Server corriendo local, y se migró a PostgreSQL para poder desplegarlo en la nube)
- **PDFs:** generados con Puppeteer a partir de plantillas HTML
- **Autenticación:** JWT, con cierre de sesión automático por inactividad
- **Despliegue:** frontend en Vercel, backend en Render, base de datos en Neon

## Estructura

```
sistema-rrhh/
├── backend/          # API (Express + PostgreSQL)
├── frontend/         # Interfaz (React)
└── database/         # Estructura de la base de datos
```