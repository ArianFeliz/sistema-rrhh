const { getPool } = require('../config/db');
const { registrarCambios } = require('./historialController');

const calcularAnios = (fechaInicio) => {
  if (!fechaInicio) return 0;
  const hoy = new Date();
  const ingreso = new Date(fechaInicio);
  let anios = hoy.getFullYear() - ingreso.getFullYear();
  const mes = hoy.getMonth() - ingreso.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < ingreso.getDate())) anios--;
  return Math.max(0, anios);
};

const formatearTiempoEnEstado = (fechaInicio, estatus) => {
  if (!fechaInicio) return '—';
  const anios = calcularAnios(fechaInicio);
  return `${anios} año${anios === 1 ? '' : 's'} en ${estatus || 'el estado'}`;
};

const sincronizarEstadosVacaciones = async () => {
  const pool = getPool();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  await pool.query(
    `UPDATE "Empleados" SET "Estatus" = 'Vacaciones', "Vacaciones" = 0
     WHERE "Id" IN (
       SELECT DISTINCT "EmpleadoId" FROM "VacacionesEmpleados"
       WHERE ("Cancelada" = false OR "Cancelada" IS NULL)
         AND "FechaInicio" <= $1
         AND "FechaFin" >= $1
     )`,
    [hoy]
  );

  await pool.query(
    `UPDATE "Empleados" SET "Estatus" = 'Activo', "Vacaciones" = 0
     WHERE "Estatus" = 'Vacaciones'
       AND "Id" NOT IN (
         SELECT DISTINCT "EmpleadoId" FROM "VacacionesEmpleados"
         WHERE ("Cancelada" = false OR "Cancelada" IS NULL)
           AND "FechaInicio" <= $1
           AND "FechaFin" >= $1
       )`,
    [hoy]
  );
};

// ─── OBTENER TODOS LOS EMPLEADOS ──────────────────────────────────────────────
const obtenerEmpleados = async (req, res) => {
  try {
    await sincronizarEstadosVacaciones();
    const pool = getPool();

    const { buscar, estatus } = req.query;

    let query = 'SELECT * FROM "Empleados" WHERE 1=1';
    const params = [];

    if (buscar) {
      params.push(`%${buscar}%`);
      const idx = params.length;
      query += ` AND (
         "Nombre" ILIKE $${idx} OR
         "Apellidos" ILIKE $${idx} OR
         "Cedula" ILIKE $${idx} OR
         "NumeroRH" ILIKE $${idx} OR
         "Expediente" ILIKE $${idx}
      )`;
    }

    if (estatus) {
      params.push(estatus);
      query += ` AND "Estatus" = $${params.length}`;
    }

    query += ' ORDER BY "NumeroRH" ASC';

    const resultado = await pool.query(query, params);

    res.json({
      total: resultado.rows.length,
      empleados: resultado.rows
    });

  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
};

// ─── OBTENER UN EMPLEADO POR ID ───────────────────────────────────────────────
const obtenerEmpleadoPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = getPool();
    const resultado = await pool.query('SELECT * FROM "Empleados" WHERE "Id" = $1', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    await sincronizarEstadosVacaciones();

    const hoy = new Date();
    const periodoEnCurso = await pool.query(
      `SELECT COUNT(*) as total FROM "VacacionesEmpleados"
       WHERE "EmpleadoId" = $1
         AND ("Cancelada" = false OR "Cancelada" IS NULL)
         AND "FechaInicio" <= $2
         AND "FechaFin" >= $2`,
      [id, hoy]
    );

    if (Number(periodoEnCurso.rows[0].total) > 0) {
      await pool.query("UPDATE \"Empleados\" SET \"Estatus\" = 'Vacaciones', \"Vacaciones\" = 0 WHERE \"Id\" = $1", [id]);
    } else {
      await pool.query("UPDATE \"Empleados\" SET \"Estatus\" = 'Activo', \"Vacaciones\" = 0 WHERE \"Id\" = $1", [id]);
    }

    const empleadoActualizado = await pool.query('SELECT * FROM "Empleados" WHERE "Id" = $1', [id]);

    res.json(empleadoActualizado.rows[0]);

  } catch (error) {
    console.error('Error al obtener empleado:', error);
    res.status(500).json({ error: 'Error al obtener el empleado' });
  }
};

// ─── CREAR EMPLEADO ────────────────────────────────────────────────────────────
const crearEmpleado = async (req, res) => {
  const {
    NumeroRH, Cedula, Nombre, Apellidos, Sexo,
    FechaNacimiento, Edad, NumeroTelefonico, Correo,
    FechaIngreso, FechaSalida, GrupoOcupacional,
    AFP, ARS, Vacaciones, LicenciasMedicas, Faltas, Estatus,
    TiempoEnEstadoValor, TiempoEnEstadoUnidad,
    CargoInicial, SalarioInicial, CargoActual, SalarioActual,
    Itinerario, SalarioItinerario, Expediente, SalarioTotal
  } = req.body;

  // Validaciones obligatorias
  if (!Nombre || !Apellidos || !Cedula) {
    return res.status(400).json({
      error: 'Nombre, Apellidos y Cédula son campos obligatorios'
    });
  }

  try {
    const pool = getPool();

    // Verificar cédula duplicada
    const existeCedula = await pool.query('SELECT "Id" FROM "Empleados" WHERE "Cedula" = $1', [Cedula]);

    // Verificar que el NumeroRH no esté en uso
    if (NumeroRH) {
      const existeRH = await pool.query('SELECT "Id" FROM "Empleados" WHERE "NumeroRH" = $1', [NumeroRH]);
      if (existeRH.rows.length > 0) {
        return res.status(409).json({ error: 'Ya existe un empleado con ese Número RH' });
      }
    }

    if (Expediente) {
      const existeExp = await pool.query('SELECT "Id" FROM "Empleados" WHERE "Expediente" = $1', [Expediente]);
      if (existeExp.rows.length > 0) {
        return res.status(409).json({ error: 'Ya existe un empleado con ese número de expediente' });
      }
    }

    if (existeCedula.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un empleado con esa cédula' });
    }

    const tiempoEnEstadoValorParsed = Number.isInteger(Number(TiempoEnEstadoValor)) ? Number(TiempoEnEstadoValor) : null;
    const tiempoEnEstadoUnidadParsed = TiempoEnEstadoUnidad && ['meses', 'años', 'anos'].includes(TiempoEnEstadoUnidad.toLowerCase()) ? TiempoEnEstadoUnidad.toLowerCase() : null;

    const resultado = await pool.query(
      `INSERT INTO "Empleados" (
          "NumeroRH", "Cedula", "Nombre", "Apellidos", "Sexo", "FechaNacimiento", "Edad",
          "NumeroTelefonico", "Correo", "FechaIngreso", "FechaSalida", "GrupoOcupacional",
          "AFP", "ARS", "Vacaciones", "LicenciasMedicas", "Faltas", "Estatus", "TiempoEnEstadoValor", "TiempoEnEstadoUnidad",
          "CargoInicial", "SalarioInicial", "CargoActual", "SalarioActual",
          "Itinerario", "SalarioItinerario", "Expediente", "SalarioTotal"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24,
          $25, $26, $27, $28
        )
        RETURNING *`,
      [
        NumeroRH || null, Cedula, Nombre, Apellidos, Sexo || null, FechaNacimiento || null, Edad || null,
        NumeroTelefonico || null, Correo || null, FechaIngreso || null, FechaSalida || null, GrupoOcupacional || null,
        AFP || null, ARS || null, Vacaciones || 0, LicenciasMedicas || 0, Faltas || 0, Estatus || 'Activo', tiempoEnEstadoValorParsed, tiempoEnEstadoUnidadParsed,
        CargoInicial || null, SalarioInicial || null, CargoActual || null, SalarioActual || null,
        Itinerario || null, SalarioItinerario || null, Expediente || null, SalarioTotal || null
      ]
    );

    res.status(201).json({
      mensaje: 'Empleado creado exitosamente',
      empleado: resultado.rows[0]
    });

  } catch (error) {
    console.error('Error al crear empleado:', error);
    res.status(500).json({ error: 'Error al crear el empleado' });
  }
};

const actualizarEmpleado = async (req, res) => {
  const { id } = req.params;
  const {
    NumeroRH, Cedula, Nombre, Apellidos, Sexo,
    FechaNacimiento, Edad, NumeroTelefonico, Correo,
    FechaIngreso, FechaSalida, GrupoOcupacional,
    AFP, ARS, Vacaciones, LicenciasMedicas, Faltas, Estatus,
    TiempoEnEstadoValor, TiempoEnEstadoUnidad,
    CargoInicial, SalarioInicial, CargoActual, SalarioActual,
    Itinerario, SalarioItinerario, Expediente, SalarioTotal
  } = req.body;

  if (!Nombre || !Apellidos || !Cedula) {
    return res.status(400).json({
      error: 'Nombre, Apellidos y Cédula son campos obligatorios'
    });
  }

  try {
    const pool = getPool();

    const existe = await pool.query('SELECT "Id" FROM "Empleados" WHERE "Id" = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const cedulaDuplicada = await pool.query(
      'SELECT "Id" FROM "Empleados" WHERE "Cedula" = $1 AND "Id" != $2',
      [Cedula, id]
    );

    if (NumeroRH) {
      const existeRH = await pool.query(
        'SELECT "Id" FROM "Empleados" WHERE "NumeroRH" = $1 AND "Id" != $2',
        [NumeroRH, id]
      );
      if (existeRH.rows.length > 0) {
        return res.status(409).json({ error: 'Ese Número RH ya pertenece a otro empleado' });
      }
    }

    // Obtener datos anteriores ANTES del UPDATE
    const anterior = await pool.query('SELECT * FROM "Empleados" WHERE "Id" = $1', [id]);
    const datosAnteriores = anterior.rows[0];

    if (cedulaDuplicada.rows.length > 0) {
      return res.status(409).json({ error: 'Esa cédula ya pertenece a otro empleado' });
    }

    await pool.query(
      `UPDATE "Empleados" SET
          "NumeroRH"          = $1,
          "Cedula"            = $2,
          "Nombre"            = $3,
          "Apellidos"         = $4,
          "Sexo"              = $5,
          "FechaNacimiento"   = $6,
          "Edad"              = $7,
          "NumeroTelefonico"  = $8,
          "Correo"            = $9,
          "FechaIngreso"      = $10,
          "FechaSalida"       = $11,
          "GrupoOcupacional"  = $12,
          "AFP"               = $13,
          "ARS"               = $14,
          "Vacaciones"        = $15,
          "LicenciasMedicas"  = $16,
          "Faltas"            = $17,
          "Estatus"           = $18,
          "TiempoEnEstadoValor" = $19,
          "TiempoEnEstadoUnidad" = $20,
          "CargoInicial"      = $21,
          "SalarioInicial"    = $22,
          "CargoActual"       = $23,
          "SalarioActual"     = $24,
          "Itinerario"        = $25,
          "SalarioItinerario" = $26,
          "Expediente"        = $27,
          "SalarioTotal"      = $28
        WHERE "Id" = $29`,
      [
        NumeroRH || null, Cedula, Nombre, Apellidos, Sexo || null, FechaNacimiento || null, Edad || null,
        NumeroTelefonico || null, Correo || null, FechaIngreso || null, FechaSalida || null, GrupoOcupacional || null,
        AFP || null, ARS || null, Vacaciones || 0, LicenciasMedicas || 0, Faltas || 0, Estatus || 'Activo',
        Number.isInteger(Number(TiempoEnEstadoValor)) ? Number(TiempoEnEstadoValor) : null,
        TiempoEnEstadoUnidad && ['meses', 'años', 'anos'].includes(TiempoEnEstadoUnidad.toLowerCase()) ? TiempoEnEstadoUnidad.toLowerCase() : null,
        CargoInicial || null, SalarioInicial || null, CargoActual || null, SalarioActual || null,
        Itinerario || null, SalarioItinerario || null, Expediente || null, SalarioTotal || null,
        id
      ]
    );

    await registrarCambios(id, datosAnteriores, req.body, req.admin?.usuario);

    res.json({ mensaje: 'Empleado actualizado correctamente' });

  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    res.status(500).json({ error: 'Error al actualizar el empleado' });
  }
};

// ─── ELIMINAR EMPLEADO ─────────────────────────────────────────────────────────
const eliminarEmpleado = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = getPool();

    const existe = await pool.query('SELECT "Id", "Nombre", "Apellidos" FROM "Empleados" WHERE "Id" = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const empleado = existe.rows[0];

    await pool.query('DELETE FROM "Empleados" WHERE "Id" = $1', [id]);

    res.json({
      mensaje: `Empleado ${empleado.Nombre} ${empleado.Apellidos} eliminado exitosamente`
    });

  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    res.status(500).json({ error: 'Error al eliminar el empleado' });
  }
};

const obtenerSiguienteRH = async (req, res) => {
  try {
    const pool = getPool();
    const resultado = await pool.query(
      `SELECT "NumeroRH" FROM "Empleados" WHERE "NumeroRH" LIKE 'RH-%' ORDER BY "NumeroRH" ASC`
    );

    const numerosUsados = resultado.rows
      .map(r => parseInt(r.NumeroRH.replace('RH-', '')))
      .filter(n => !isNaN(n));

    // Buscar el número más bajo que no esté en uso
    let siguiente = 1;
    while (numerosUsados.includes(siguiente)) {
      siguiente++;
    }

    const numeroFormateado = `RH-${String(siguiente).padStart(3, '0')}`;
    res.json({ numeroRH: numeroFormateado });

  } catch (error) {
    console.error('Error al obtener siguiente RH:', error);
    res.status(500).json({ error: 'Error al generar número RH' });
  }
};

module.exports = {
  obtenerEmpleados,
  obtenerEmpleadoPorId,
  crearEmpleado,
  actualizarEmpleado,
  eliminarEmpleado,
  obtenerSiguienteRH
};