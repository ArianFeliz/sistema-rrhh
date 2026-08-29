const { getPool, sql } = require('../config/db');
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

  await pool.request()
    .input('hoy', sql.Date, hoy)
    .query(`UPDATE Empleados SET Estatus = 'Vacaciones', Vacaciones = 0
            WHERE Id IN (
              SELECT DISTINCT EmpleadoId FROM VacacionesEmpleados
              WHERE (Cancelada = 0 OR Cancelada IS NULL)
                AND FechaInicio <= @hoy
                AND FechaFin >= @hoy
            )`);

  await pool.request()
    .input('hoy', sql.Date, hoy)
    .query(`UPDATE Empleados SET Estatus = 'Activo', Vacaciones = 0
            WHERE Estatus = 'Vacaciones'
              AND Id NOT IN (
                SELECT DISTINCT EmpleadoId FROM VacacionesEmpleados
                WHERE (Cancelada = 0 OR Cancelada IS NULL)
                  AND FechaInicio <= @hoy
                  AND FechaFin >= @hoy
              )`);
};

// ─── OBTENER TODOS LOS EMPLEADOS ──────────────────────────────────────────────
const obtenerEmpleados = async (req, res) => {
  try {
    await sincronizarEstadosVacaciones();
    const pool = getPool();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Mantener el estado sincronizado con períodos de vacaciones en curso
    await pool.request()
      .input('hoy', sql.Date, hoy)
      .query(`UPDATE Empleados SET Estatus = 'Vacaciones', Vacaciones = 0
              WHERE Id IN (
                SELECT DISTINCT EmpleadoId FROM VacacionesEmpleados
                WHERE (Cancelada = 0 OR Cancelada IS NULL)
                  AND FechaInicio <= @hoy
                  AND FechaFin >= @hoy
              )`);

    await pool.request()
      .input('hoy', sql.Date, hoy)
      .query(`UPDATE Empleados SET Estatus = 'Activo', Vacaciones = 0
              WHERE Estatus = 'Vacaciones'
                AND Id NOT IN (
                  SELECT DISTINCT EmpleadoId FROM VacacionesEmpleados
                  WHERE (Cancelada = 0 OR Cancelada IS NULL)
                    AND FechaInicio <= @hoy
                    AND FechaFin >= @hoy
                )`);

    const { buscar, estatus } = req.query;

    let query = 'SELECT * FROM Empleados WHERE 1=1';
    const request = pool.request();

    if (buscar) {
      query += ` AND (
         Nombre LIKE @buscar OR
    Apellidos LIKE @buscar OR
    Cedula LIKE @buscar OR
    NumeroRH LIKE @buscar OR
    Expediente LIKE @buscar
      )`;
      request.input('buscar', sql.VarChar, `%${buscar}%`);
    }

    if (estatus) {
      query += ' AND Estatus = @estatus';
      request.input('estatus', sql.VarChar, estatus);
    }

    query += ' ORDER BY NumeroRH ASC';

    const resultado = await request.query(query);

    res.json({
      total: resultado.recordset.length,
      empleados: resultado.recordset
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
    const resultado = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Empleados WHERE Id = @id');

    if (resultado.recordset.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const empleado = resultado.recordset[0];
    await sincronizarEstadosVacaciones();

    const hoy = new Date();
    const periodoEnCurso = await pool.request()
      .input('id', sql.Int, id)
      .input('hoy', sql.Date, hoy)
      .query(`SELECT COUNT(*) as total FROM VacacionesEmpleados
              WHERE EmpleadoId = @id
                AND (Cancelada = 0 OR Cancelada IS NULL)
                AND FechaInicio <= @hoy
                AND FechaFin >= @hoy`);

    if (periodoEnCurso.recordset[0].total > 0) {
      await pool.request()
        .input('id', sql.Int, id)
        .query("UPDATE Empleados SET Estatus = 'Vacaciones', Vacaciones = 0 WHERE Id = @id");
    } else {
      await pool.request()
        .input('id', sql.Int, id)
        .query("UPDATE Empleados SET Estatus = 'Activo', Vacaciones = 0 WHERE Id = @id");
    }

    const empleadoActualizado = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Empleados WHERE Id = @id');

    res.json(empleadoActualizado.recordset[0]);

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
    const existeCedula = await pool.request()
      .input('cedula', sql.VarChar, Cedula)
      .query('SELECT Id FROM Empleados WHERE Cedula = @cedula');

      // Verificar que el NumeroRH no esté en uso
if (NumeroRH) {
  const existeRH = await pool.request()
    .input('numeroRH', sql.VarChar, NumeroRH)
    .query('SELECT Id FROM Empleados WHERE NumeroRH = @numeroRH');

  if (existeRH.recordset.length > 0) {
    return res.status(409).json({ error: 'Ya existe un empleado con ese Número RH' });
  }
}

if (Expediente) {
  const existeExp = await pool.request()
    .input('expediente', sql.VarChar, Expediente)
    .query('SELECT Id FROM Empleados WHERE Expediente = @expediente');

  if (existeExp.recordset.length > 0) {
    return res.status(409).json({ error: 'Ya existe un empleado con ese número de expediente' });
  }
}

    if (existeCedula.recordset.length > 0) {
      return res.status(409).json({ error: 'Ya existe un empleado con esa cédula' });
    }

    const tiempoEnEstadoValorParsed = Number.isInteger(Number(TiempoEnEstadoValor)) ? Number(TiempoEnEstadoValor) : null;
    const tiempoEnEstadoUnidadParsed = TiempoEnEstadoUnidad && ['meses', 'años', 'anos'].includes(TiempoEnEstadoUnidad.toLowerCase()) ? TiempoEnEstadoUnidad.toLowerCase() : null;

    const resultado = await pool.request()
      .input('NumeroRH',               sql.VarChar,      NumeroRH || null)
      .input('Cedula',                 sql.VarChar,      Cedula)
      .input('Nombre',                 sql.VarChar,      Nombre)
      .input('Apellidos',              sql.VarChar,      Apellidos)
      .input('Sexo',                   sql.VarChar,      Sexo || null)
      .input('FechaNacimiento',        sql.Date,         FechaNacimiento || null)
      .input('Edad',                   sql.Int,          Edad || null)
      .input('NumeroTelefonico',       sql.VarChar,      NumeroTelefonico || null)
      .input('Correo',                 sql.VarChar,      Correo || null)
      .input('FechaIngreso',           sql.Date,         FechaIngreso || null)
      .input('FechaSalida',            sql.Date,         FechaSalida || null)
      .input('GrupoOcupacional',       sql.VarChar,      GrupoOcupacional || null)
      .input('AFP',                    sql.VarChar,      AFP || null)
      .input('ARS',                    sql.VarChar,      ARS || null)
      .input('Vacaciones',             sql.Int,          Vacaciones || 0)
      .input('LicenciasMedicas',       sql.Int,          LicenciasMedicas || 0)
      .input('Faltas',                 sql.Int,          Faltas || 0)
      .input('Estatus',                sql.VarChar,      Estatus || 'Activo')
      .input('TiempoEnEstadoValor',    sql.Int,          tiempoEnEstadoValorParsed)
      .input('TiempoEnEstadoUnidad',   sql.VarChar,      tiempoEnEstadoUnidadParsed)
      .input('CargoInicial',           sql.VarChar,      CargoInicial || null)
      .input('SalarioInicial',    sql.Decimal(10,2),SalarioInicial || null)
      .input('CargoActual',       sql.VarChar,      CargoActual || null)
      .input('SalarioActual',     sql.Decimal(10,2),SalarioActual || null)
      .input('Itinerario',        sql.VarChar,      Itinerario || null)
      .input('SalarioItinerario', sql.Decimal(10,2),SalarioItinerario || null)
      .input('Expediente',        sql.VarChar,      Expediente || null)
      .input('SalarioTotal',      sql.Decimal(10,2),SalarioTotal || null)
      .query(`
        INSERT INTO Empleados (
          NumeroRH, Cedula, Nombre, Apellidos, Sexo, FechaNacimiento, Edad,
          NumeroTelefonico, Correo, FechaIngreso, FechaSalida, GrupoOcupacional,
          AFP, ARS, Vacaciones, LicenciasMedicas, Faltas, Estatus, TiempoEnEstadoValor, TiempoEnEstadoUnidad,
          CargoInicial, SalarioInicial, CargoActual, SalarioActual,
          Itinerario, SalarioItinerario, Expediente, SalarioTotal
        )
        OUTPUT INSERTED.*
        VALUES (
          @NumeroRH, @Cedula, @Nombre, @Apellidos, @Sexo, @FechaNacimiento, @Edad,
          @NumeroTelefonico, @Correo, @FechaIngreso, @FechaSalida, @GrupoOcupacional,
          @AFP, @ARS, @Vacaciones, @LicenciasMedicas, @Faltas, @Estatus, @TiempoEnEstadoValor, @TiempoEnEstadoUnidad,
          @CargoInicial, @SalarioInicial, @CargoActual, @SalarioActual,
          @Itinerario, @SalarioItinerario, @Expediente, @SalarioTotal
        )
      `);

    res.status(201).json({
      mensaje: 'Empleado creado exitosamente',
      empleado: resultado.recordset[0]
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

    const existe = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT Id FROM Empleados WHERE Id = @id');

    if (existe.recordset.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const cedulaDuplicada = await pool.request()
      .input('cedula', sql.VarChar, Cedula)
      .input('id', sql.Int, id)
      .query('SELECT Id FROM Empleados WHERE Cedula = @cedula AND Id != @id');

    if (NumeroRH) {
      const existeRH = await pool.request()
        .input('numeroRH', sql.VarChar, NumeroRH)
        .input('id', sql.Int, id)
        .query('SELECT Id FROM Empleados WHERE NumeroRH = @numeroRH AND Id != @id');

      if (existeRH.recordset.length > 0) {
        return res.status(409).json({ error: 'Ese Número RH ya pertenece a otro empleado' });
      }
    }

    if (NumeroRH) {
  const existeRH = await pool.request()
    .input('numeroRH', sql.VarChar, NumeroRH)
    .input('id', sql.Int, id)
    .query('SELECT Id FROM Empleados WHERE NumeroRH = @numeroRH AND Id != @id');

  if (existeRH.recordset.length > 0) {
    return res.status(409).json({ error: 'Ese Número RH ya pertenece a otro empleado' });
  }
}

    // 👈 PASO 2: obtener datos anteriores ANTES del UPDATE
    const anterior = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Empleados WHERE Id = @id');
    const datosAnteriores = anterior.recordset[0];

    if (cedulaDuplicada.recordset.length > 0) {
      return res.status(409).json({ error: 'Esa cédula ya pertenece a otro empleado' });
    }

    const resultado = await pool.request()
      .input('id',               sql.Int,           id)
      .input('NumeroRH',         sql.VarChar,       NumeroRH || null)
      .input('Cedula',           sql.VarChar,       Cedula)
      .input('Nombre',           sql.VarChar,       Nombre)
      .input('Apellidos',        sql.VarChar,       Apellidos)
      .input('Sexo',             sql.VarChar,       Sexo || null)
      .input('FechaNacimiento',  sql.Date,          FechaNacimiento || null)
      .input('Edad',             sql.Int,           Edad || null)
      .input('NumeroTelefonico', sql.VarChar,       NumeroTelefonico || null)
      .input('Correo',           sql.VarChar,       Correo || null)
      .input('FechaIngreso',     sql.Date,          FechaIngreso || null)
      .input('FechaSalida',      sql.Date,          FechaSalida || null)
      .input('GrupoOcupacional', sql.VarChar,       GrupoOcupacional || null)
      .input('AFP',              sql.VarChar,       AFP || null)
      .input('ARS',              sql.VarChar,       ARS || null)
      .input('Vacaciones',             sql.Int,          Vacaciones || 0)
      .input('LicenciasMedicas',        sql.Int,          LicenciasMedicas || 0)
      .input('Faltas',                  sql.Int,          Faltas || 0)
      .input('Estatus',                 sql.VarChar,      Estatus || 'Activo')
      .input('TiempoEnEstadoValor',     sql.Int,          Number.isInteger(Number(TiempoEnEstadoValor)) ? Number(TiempoEnEstadoValor) : null)
      .input('TiempoEnEstadoUnidad',    sql.VarChar,      TiempoEnEstadoUnidad && ['meses','años','anos'].includes(TiempoEnEstadoUnidad.toLowerCase()) ? TiempoEnEstadoUnidad.toLowerCase() : null)
      .input('CargoInicial',            sql.VarChar,      CargoInicial || null)
      .input('SalarioInicial',   sql.Decimal(10,2), SalarioInicial || null)
      .input('CargoActual',      sql.VarChar,       CargoActual || null)
      .input('SalarioActual',    sql.Decimal(10,2), SalarioActual || null)
      .input('Itinerario',       sql.VarChar,       Itinerario || null)
      .input('SalarioItinerario',sql.Decimal(10,2), SalarioItinerario || null)
      .input('Expediente',       sql.VarChar,       Expediente || null)
      .input('SalarioTotal',     sql.Decimal(10,2), SalarioTotal || null)
      .query(`
        UPDATE Empleados SET
          NumeroRH          = @NumeroRH,
          Cedula            = @Cedula,
          Nombre            = @Nombre,
          Apellidos         = @Apellidos,
          Sexo              = @Sexo,
          FechaNacimiento   = @FechaNacimiento,
          Edad              = @Edad,
          NumeroTelefonico  = @NumeroTelefonico,
          Correo            = @Correo,
          FechaIngreso      = @FechaIngreso,
          FechaSalida       = @FechaSalida,
          GrupoOcupacional  = @GrupoOcupacional,
          AFP               = @AFP,
          ARS               = @ARS,
          Vacaciones        = @Vacaciones,
          LicenciasMedicas  = @LicenciasMedicas,
          Faltas            = @Faltas,
          Estatus           = @Estatus,
          TiempoEnEstadoValor = @TiempoEnEstadoValor,
          TiempoEnEstadoUnidad = @TiempoEnEstadoUnidad,
          CargoInicial      = @CargoInicial,
          SalarioInicial    = @SalarioInicial,
          CargoActual       = @CargoActual,
          SalarioActual     = @SalarioActual,
          Itinerario        = @Itinerario,
          SalarioItinerario = @SalarioItinerario,
          Expediente        = @Expediente,
          SalarioTotal      = @SalarioTotal
        OUTPUT INSERTED.*
        WHERE Id = @id
      `);


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

    const existe = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT Id, Nombre, Apellidos FROM Empleados WHERE Id = @id');

    if (existe.recordset.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const empleado = existe.recordset[0];

    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Empleados WHERE Id = @id');

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
    const resultado = await pool.request()
      .query(`SELECT NumeroRH FROM Empleados WHERE NumeroRH LIKE 'RH-%' ORDER BY NumeroRH ASC`);

    const numerosUsados = resultado.recordset
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