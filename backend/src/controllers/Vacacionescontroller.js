const { getPool, sql } = require('../config/db');
const { registrarEventoHistorial } = require('./historialController');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const getFeriados = (anio) => [
  new Date(anio, 0, 1),
  new Date(anio, 0, 6),
  new Date(anio, 0, 21),
  new Date(anio, 1, 27),
  new Date(anio, 4, 1),
  new Date(anio, 7, 16),
  new Date(anio, 8, 24),
  new Date(anio, 10, 6),
  new Date(anio, 11, 25),
];

const calcularFechaFin = (fechaInicio, diasHabiles) => {
  const fecha = new Date(fechaInicio);
  let diasContados = 0;
  while (diasContados < diasHabiles) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;
    const feriados = getFeriados(fecha.getFullYear());
    const esFeriado = feriados.some(f =>
      f.getDate() === fecha.getDate() &&
      f.getMonth() === fecha.getMonth() &&
      f.getFullYear() === fecha.getFullYear()
    );
    if (esFeriado) continue;
    diasContados++;
  }
  return fecha;
};

const calcularDiasVacaciones = (aniosServicio) => {
  if (aniosServicio < 5)  return 15;
  if (aniosServicio < 10) return 20;
  if (aniosServicio < 15) return 25;
  return 30;
};

const calcularAnios = (fechaIngreso) => {
  if (!fechaIngreso) return 0;
  const hoy = new Date();
  const ingreso = new Date(fechaIngreso);
  let anios = hoy.getFullYear() - ingreso.getFullYear();
  const mes = hoy.getMonth() - ingreso.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < ingreso.getDate())) anios--;
  return Math.max(0, anios);
};

const calcularAniosDesdeTiempoEnEstado = (valor, unidad) => {
  const numero = Number(valor);
  if (!numero || numero < 0) return null;
  const u = String(unidad || '').trim().toLowerCase();
  if (u === 'meses') {
    return Math.floor(numero / 12);
  }
  if (u === 'años' || u === 'anos' || u === 'año') {
    return Math.floor(numero);
  }
  return null;
};

const obtenerAniosServicioDesdeEmpleado = (empleadoInfo) => {
  const aniosIngreso = empleadoInfo.FechaIngreso ? calcularAnios(empleadoInfo.FechaIngreso) : 0;
  const aniosEstado = calcularAniosDesdeTiempoEnEstado(empleadoInfo.TiempoEnEstadoValor, empleadoInfo.TiempoEnEstadoUnidad) || 0;

  if (!empleadoInfo.FechaIngreso && !empleadoInfo.TiempoEnEstadoValor) {
    return null;
  }

  return {
    total: aniosIngreso + aniosEstado,
    ingreso: aniosIngreso,
    estado: aniosEstado
  };
};


const obtenerDiasTomados = async (pool, empleadoId, anio = null) => {
  const anioFiltro = Number.isInteger(anio) ? anio : new Date().getFullYear();
  const result = await pool.request()
    .input('empleadoId', sql.Int, empleadoId)
    .input('anio', sql.Int, anioFiltro)
    .query("SELECT ISNULL(SUM(DiasCorresponden), 0) as total FROM VacacionesEmpleados WHERE EmpleadoId = @empleadoId AND YEAR(FechaInicio) = @anio AND (Cancelada = 0 OR Cancelada IS NULL)");
  return Number(result.recordset[0].total || 0);
};

const obtenerPeriodosTomados = async (pool, empleadoId, anio = null) => {
  const anioFiltro = Number.isInteger(anio) ? anio : new Date().getFullYear();
  const result = await pool.request()
    .input('empleadoId', sql.Int, empleadoId)
    .input('anio', sql.Int, anioFiltro)
    .query("SELECT COUNT(*) as total FROM VacacionesEmpleados WHERE EmpleadoId = @empleadoId AND YEAR(FechaInicio) = @anio AND (Cancelada = 0 OR Cancelada IS NULL)");
  return Number(result.recordset[0].total || 0);
};

const sincronizarEstadoEmpleadoVacaciones = async (empleadoId) => {
  const pool = getPool();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0); // Comparación solo por fecha

  const result = await pool.request()
    .input('empleadoId', sql.Int, empleadoId)
    .query(`SELECT * FROM VacacionesEmpleados WHERE EmpleadoId = @empleadoId AND (Cancelada = 0 OR Cancelada IS NULL)`);

  const activeVacs = result.recordset.filter(v => {
    const inicio = new Date(v.FechaInicio);
    const fin = new Date(v.FechaFin);
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    return inicio <= hoy && fin >= hoy;
  });

  if (activeVacs.length > 0) {
    await pool.request()
      .input('empleadoId', sql.Int, empleadoId)
      .query("UPDATE Empleados SET Estatus = 'Vacaciones', Vacaciones = 0 WHERE Id = @empleadoId");
  } else {
    await pool.request()
      .input('empleadoId', sql.Int, empleadoId)
      .query("UPDATE Empleados SET Estatus = 'Activo', Vacaciones = 0 WHERE Id = @empleadoId");
  }
};
const fmtFecha = (f) => {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const calcularDiasHabilesEntre = (fechaInicio, fechaFin) => {
  if (!fechaInicio || !fechaFin) return 0;
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  if (fin < inicio) return 0;

  let dias = 0;
  const day = new Date(inicio);
  while (day <= fin) {
    const diaSemana = day.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      const feriados = getFeriados(day.getFullYear());
      const esFeriado = feriados.some(f =>
        f.getDate() === day.getDate() &&
        f.getMonth() === day.getMonth() &&
        f.getFullYear() === day.getFullYear()
      );
      if (!esFeriado) dias++;
    }
    day.setDate(day.getDate() + 1);
  }
  return dias;
};

// ─── REGISTRAR VACACIONES ─────────────────────────────────────────────────────
const registrarVacaciones = async (req, res) => {
  const { id } = req.params;
  const { FechaInicio, DiasSolicitados, Observaciones } = req.body;
  if (!FechaInicio) return res.status(400).json({ error: 'La fecha de inicio es obligatoria' });

  try {
    const pool = getPool();
    const emp = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT Id, Nombre, Apellidos, TiempoEnEstadoValor, TiempoEnEstadoUnidad, FechaIngreso FROM Empleados WHERE Id = @id');
    if (emp.recordset.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
    const empleado = emp.recordset[0];

    const aniosInfo = obtenerAniosServicioDesdeEmpleado(empleado);
    if (aniosInfo === null) {
      return res.status(400).json({ error: 'Fecha de ingreso o tiempo en estado (valor + unidad) es obligatorio para calcular vacaciones' });
    }
    const aniosServicio = aniosInfo.total;
    const aniosIngreso = aniosInfo.ingreso;
    const aniosEstado = aniosInfo.estado;

    const fechaInicio = new Date(FechaInicio);
    if (Number.isNaN(fechaInicio.getTime())) return res.status(400).json({ error: 'Fecha de inicio inválida' });

    const anioVacaciones = fechaInicio.getFullYear();
    const periodosAnio = await obtenerPeriodosTomados(pool, id, anioVacaciones);
    if (periodosAnio >= 3) return res.status(400).json({ error: `Limite de 3 períodos de vacaciones alcanzado para el año ${anioVacaciones}` });

    const hoy = new Date();
    const periodoEnCurso = await pool.request()
      .input('id', sql.Int, id)
      .input('hoy', sql.Date, hoy)
      .query("SELECT COUNT(*) as total FROM VacacionesEmpleados WHERE EmpleadoId = @id AND (Cancelada = 0 OR Cancelada IS NULL) AND FechaInicio <= @hoy AND FechaFin >= @hoy");
    if (periodoEnCurso.recordset[0].total > 0) {
      return res.status(400).json({ error: 'Ya hay un período de vacaciones en curso. Cancela o elimina antes de registrar uno nuevo.' });
    }

    if (DiasSolicitados === undefined || DiasSolicitados === '' || DiasSolicitados === null) {
      return res.status(400).json({ error: 'Días solicitados es obligatorio' });
    }

    const diasCorresponden = calcularDiasVacaciones(aniosServicio);
    const diasTomados = await obtenerDiasTomados(pool, id, anioVacaciones);
    const diasDisponibles = Math.max(0, diasCorresponden - diasTomados);

    const diasSeleccionados = Number(DiasSolicitados);
    if (!Number.isInteger(diasSeleccionados) || diasSeleccionados <= 0) {
      return res.status(400).json({ error: 'Días solicitados debe ser un número entero mayor a 0' });
    }
    if (diasSeleccionados > diasDisponibles) {
      return res.status(400).json({ error: `No le corresponden ${diasSeleccionados} días. Disponibles: ${diasDisponibles}.` });
    }

    const fechaFin = calcularFechaFin(fechaInicio, diasSeleccionados);

    await pool.request()
      .input('EmpleadoId',       sql.Int,     id)
      .input('FechaInicio',      sql.Date,    fechaInicio)
      .input('FechaFin',         sql.Date,    fechaFin)
      .input('DiasCorresponden', sql.Int,     diasSeleccionados)
      .input('AniosServicio',    sql.Int,     aniosServicio)
      .input('Observaciones',    sql.NVarChar,Observaciones || null)
      .query(`INSERT INTO VacacionesEmpleados (EmpleadoId, FechaInicio, FechaFin, DiasCorresponden, AniosServicio, Observaciones, Cancelada)
              VALUES (@EmpleadoId, @FechaInicio, @FechaFin, @DiasCorresponden, @AniosServicio, @Observaciones, 0)`);

    await registrarEventoHistorial(id, 'Vacaciones', `Nuevo período de ${diasSeleccionados} días`, `Registrado ${diasSeleccionados} días ${fmtFecha(fechaInicio)} - ${fmtFecha(fechaFin)}`);
    await sincronizarEstadoEmpleadoVacaciones(id);

    res.status(201).json({
      mensaje: 'Vacaciones registradas correctamente',
      diasCorresponden,
      diasTomados: diasTomados + diasSeleccionados,
      diasDisponibles: diasCorresponden - (diasTomados + diasSeleccionados),
      aniosServicio,
      aniosIngreso,
      aniosEstado,
      fechaFin: fechaFin.toISOString().split('T')[0]
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al registrar vacaciones' });
  }
};

// ─── OBTENER HISTORIAL ────────────────────────────────────────────────────────
const obtenerVacaciones = async (req, res) => {
  try {
    await sincronizarEstadoEmpleadoVacaciones(req.params.id);
    const pool = getPool();
    const resultado = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT * FROM VacacionesEmpleados WHERE EmpleadoId = @id ORDER BY FechaInicio DESC`);

    const hoy = new Date();
    const vacaciones = resultado.recordset.map(v => {
      const fechaInicio = new Date(v.FechaInicio);
      const fechaFin = new Date(v.FechaFin);
      let estado = 'Activa';

      if (v.Cancelada === 1 || v.Cancelada === true) {
        estado = 'Cancelada';
      } else if (fechaInicio > hoy) {
        estado = 'Programada';
      } else if (fechaFin < hoy) {
        estado = 'Completada';
      } else {
        estado = 'Activa';
      }

      return { ...v, Estado: estado };
    });

    const historialAnualObj = {};
    vacaciones.forEach(v => {
      const anio = new Date(v.FechaInicio).getFullYear();
      if (!historialAnualObj[anio]) {
        historialAnualObj[anio] = { año: anio, periodos: 0, dias: 0 };
      }
      historialAnualObj[anio].periodos += 1;
      historialAnualObj[anio].dias += Number(v.DiasCorresponden || 0);
    });

    const historialAnual = Object.values(historialAnualObj).sort((a, b) => b.año - a.año);

    const añoActual = new Date().getFullYear();
    const diasTomadosAñoActual = await obtenerDiasTomados(pool, req.params.id, añoActual);
    const periodosAñoActual = await obtenerPeriodosTomados(pool, req.params.id, añoActual);
    const diasCorrespondenAnioActual = calcularDiasVacaciones(calcularAnios((await pool.request().input('id', sql.Int, req.params.id).query('SELECT FechaIngreso FROM Empleados WHERE Id = @id')).recordset[0]?.FechaIngreso));

    res.json({
      vacaciones,
      historialAnual,
      añoActual,
      diasTomadosAñoActual,
      periodosAñoActual,
      diasCorrespondenAnioActual,
      diasDisponiblesAñoActual: Math.max(0, diasCorrespondenAnioActual - diasTomadosAñoActual),
      mensaje: 'Si una vacación está programada en el futuro, al llegar la fecha se marca como activa automáticamente en la consulta',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener vacaciones' });
  }
};

// ─── CANCELAR VACACIONES ──────────────────────────────────────────────────────
const cancelarVacacion = async (req, res) => {
  try {
    const pool = getPool();
    const vac = await pool.request()
      .input('id', sql.Int, req.params.vacacionId)
      .query('SELECT * FROM VacacionesEmpleados WHERE Id = @id');

    if (vac.recordset.length === 0) {
      return res.status(404).json({ error: 'Registro de vacaciones no encontrado' });
    }

    const vacacion = vac.recordset[0];
    const hoy = new Date();
    const fechaInicio = new Date(vacacion.FechaInicio);
    const fechaFinPrevista = new Date(vacacion.FechaFin);
    const fechaCorte = hoy < fechaFinPrevista ? hoy : fechaFinPrevista;
    const diasUsados = calcularDiasHabilesEntre(fechaInicio, fechaCorte);

    // Ajustar los días correspondientes al tiempo efectivamente tomado y marcar cancelado
    await pool.request()
      .input('id', sql.Int, req.params.vacacionId)
      .input('diasUsados', sql.Int, diasUsados)
      .input('fechaFin', sql.Date, fechaCorte)
      .query(`UPDATE VacacionesEmpleados
              SET Cancelada = 1,
                  FechaCancelacion = GETDATE(),
                  DiasCorresponden = @diasUsados,
                  FechaFin = @fechaFin
              WHERE Id = @id`);

    await registrarEventoHistorial(vacacion.EmpleadoId, 'Vacaciones', `Período cancelado ${fmtFecha(fechaInicio)} - ${fmtFecha(fechaFinPrevista)}`, `Cancelado el ${fmtFecha(fechaCorte)} (${diasUsados} días usados)`);
    await sincronizarEstadoEmpleadoVacaciones(vacacion.EmpleadoId);

    res.json({
      mensaje: 'Vacaciones canceladas; días efectivamente consumidos actualizados.',
      diasUsados,
      fechaCorte: fechaCorte.toISOString().split('T')[0]
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cancelar vacaciones' });
  }
};

// ─── REACTIVAR VACACIONES ─────────────────────────────────────────────────────
const reactivarVacacion = async (req, res) => {
  try {
    const pool = getPool();
    // Verificar límite de 3 activas
    const vac = await pool.request()
      .input('id', sql.Int, req.params.vacacionId)
      .query('SELECT EmpleadoId FROM VacacionesEmpleados WHERE Id = @id');
    if (vac.recordset.length === 0) return res.status(404).json({ error: 'No encontrada' });
    const empId = vac.recordset[0].EmpleadoId;
    const hoy = new Date();

    const enCurso = await pool.request()
      .input('empId', sql.Int, empId)
      .input('hoy', sql.Date, hoy)
      .input('id', sql.Int, req.params.vacacionId)
      .query(`SELECT COUNT(*) as total FROM VacacionesEmpleados
              WHERE EmpleadoId = @empId
                AND (Cancelada = 0 OR Cancelada IS NULL)
                AND Id != @id
                AND FechaInicio <= @hoy
                AND FechaFin >= @hoy`);

    if (enCurso.recordset[0].total > 0) {
      return res.status(400).json({ error: 'Ya existe un período de vacaciones en curso. Cancela o espera que termine antes de reactivar otra.' });
    }

    const infoVacacion = await pool.request()
      .input('id', sql.Int, req.params.vacacionId)
      .query('SELECT FechaInicio FROM VacacionesEmpleados WHERE Id = @id');
    if (infoVacacion.recordset.length === 0) return res.status(404).json({ error: 'Registro de vacaciones no encontrado' });

    const anioReactivacion = new Date(infoVacacion.recordset[0].FechaInicio).getFullYear();
    const periodosAnio = await obtenerPeriodosTomados(pool, empId, anioReactivacion);
    if (periodosAnio >= 3) return res.status(400).json({ error: `Ya tiene 3 períodos de vacaciones activos para el año ${anioReactivacion}` });

    await pool.request()
      .input('id', sql.Int, req.params.vacacionId)
      .query(`UPDATE VacacionesEmpleados SET Cancelada = 0, FechaCancelacion = NULL WHERE Id = @id`);

    const vacacion = await pool.request().input('id', sql.Int, req.params.vacacionId).query('SELECT FechaInicio, FechaFin, DiasCorresponden FROM VacacionesEmpleados WHERE Id = @id');
    if (vacacion.recordset.length > 0) {
      const v = vacacion.recordset[0];
      await registrarEventoHistorial(empId, 'Vacaciones', `Período reactivado`, `${v.DiasCorresponden} días ${fmtFecha(v.FechaInicio)} - ${fmtFecha(v.FechaFin)}`);
    }

    await sincronizarEstadoEmpleadoVacaciones(empId);
    res.json({ mensaje: 'Vacaciones reactivadas' });
  } catch (e) {
    res.status(500).json({ error: 'Error al reactivar vacaciones' });
  }
};

// ─── ELIMINAR VACACIONES ──────────────────────────────────────────────────────
const eliminarVacaciones = async (req, res) => {
  try {
    const pool = getPool();
    const vac = await pool.request()
      .input('id', sql.Int, req.params.vacacionId)
      .query('SELECT EmpleadoId FROM VacacionesEmpleados WHERE Id = @id');
    if (vac.recordset.length === 0) {
      return res.status(404).json({ error: 'Registro de vacaciones no encontrado' });
    }
    const empleadoId = vac.recordset[0].EmpleadoId;

    const vacacion = await pool.request().input('id', sql.Int, req.params.vacacionId).query('SELECT FechaInicio, FechaFin, DiasCorresponden FROM VacacionesEmpleados WHERE Id = @id');
    if (vacacion.recordset.length > 0) {
      const v = vacacion.recordset[0];
      await registrarEventoHistorial(empleadoId, 'Vacaciones', `Período eliminado`, `${v.DiasCorresponden} días ${fmtFecha(v.FechaInicio)} - ${fmtFecha(v.FechaFin)}`);
    }

    await pool.request()
      .input('id', sql.Int, req.params.vacacionId)
      .query('DELETE FROM VacacionesEmpleados WHERE Id = @id');

    await sincronizarEstadoEmpleadoVacaciones(empleadoId);
    res.json({ mensaje: 'Vacaciones eliminadas' });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar vacaciones' });
  }
};

// ─── PREVIEW ─────────────────────────────────────────────────────────────────
const calcularPreview = async (req, res) => {
  const { id } = req.params;
  const { FechaInicio, DiasSolicitados } = req.query;
  if (!FechaInicio) return res.status(400).json({ error: 'Fecha de inicio requerida' });

  try {
    const pool = getPool();
    const emp = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT FechaIngreso, TiempoEnEstadoValor, TiempoEnEstadoUnidad FROM Empleados WHERE Id = @id');
    if (emp.recordset.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });

    const empleadoInfo = emp.recordset[0];

    // Priorizar datos de entrada explicita (desde formulario) si están presentes
    if (req.query.FechaIngreso) {
      empleadoInfo.FechaIngreso = req.query.FechaIngreso;
    }
    if (req.query.TiempoEnEstadoValor) {
      empleadoInfo.TiempoEnEstadoValor = req.query.TiempoEnEstadoValor;
    }
    if (req.query.TiempoEnEstadoUnidad) {
      empleadoInfo.TiempoEnEstadoUnidad = req.query.TiempoEnEstadoUnidad;
    }

    const aniosInfo = obtenerAniosServicioDesdeEmpleado(empleadoInfo);
    if (aniosInfo === null) {
      return res.status(400).json({ error: 'Fecha de ingreso o tiempo en estado (valor + unidad) es obligatorio para calcular preview de vacaciones' });
    }
    const aniosServicio = aniosInfo.total;
    const aniosIngreso = aniosInfo.ingreso;
    const aniosEstado = aniosInfo.estado;
    const anioPreview = new Date(FechaInicio).getFullYear();
    const diasCorresponden = calcularDiasVacaciones(aniosServicio);
    const diasTomados = await obtenerDiasTomados(pool, id, anioPreview);
    const periodosAnio = await obtenerPeriodosTomados(pool, id, anioPreview);
    const diasDisponibles = Math.max(0, diasCorresponden - diasTomados);

    if (periodosAnio >= 3) {
      return res.status(400).json({ error: `Limite de 3 períodos de vacaciones alcanzado para el año ${anioPreview}` });
    }

    console.log(`[vacaciones/preview/FIXED] empleadoId=${id}, FechaIngreso=${empleadoInfo.FechaIngreso}, aniosServicio=${aniosServicio} (ingreso=${aniosIngreso}, estado=${aniosEstado}), diasCorresponden=${diasCorresponden}, diasTomados=${diasTomados}, diasDisponibles=${diasDisponibles}`);


    const hoy = new Date();
    const periodoEnCurso = await pool.request()
      .input('id', sql.Int, id)
      .input('hoy', sql.Date, hoy)
      .query("SELECT COUNT(*) as total FROM VacacionesEmpleados WHERE EmpleadoId = @id AND (Cancelada = 0 OR Cancelada IS NULL) AND FechaInicio <= @hoy AND FechaFin >= @hoy");
    if (periodoEnCurso.recordset[0].total > 0) {
      return res.status(400).json({ error: 'Ya hay un período de vacaciones en curso. Cancela o elimina antes de registrar uno nuevo.' });
    }

    const tieneSolicitados = DiasSolicitados !== undefined && DiasSolicitados !== null && DiasSolicitados !== '';
    let diasSeleccionados = 0;

    if (!tieneSolicitados) {
      return res.json({
        aniosServicio,
        aniosIngreso,
        aniosEstado,
        diasCorresponden,
        diasTomados,
        diasDisponibles,
        diasSeleccionados: 0,
        fechaInicio: FechaInicio,
        fechaFin: null,
        mensaje: 'Ingresa la cantidad de días solicitados para calcular la fecha de regreso.'
      });
    }

    diasSeleccionados = Number(DiasSolicitados);
    if (!Number.isInteger(diasSeleccionados) || diasSeleccionados <= 0) {
      return res.status(400).json({ error: 'Días solicitados debe ser un número entero mayor a 0' });
    }

    if (diasSeleccionados > diasDisponibles) {
      return res.status(400).json({ error: `No le corresponden ${diasSeleccionados} días. Disponibles: ${diasDisponibles}.` });
    }

    const fechaInicio = new Date(FechaInicio);
    const fechaFin = calcularFechaFin(fechaInicio, diasSeleccionados);

    res.json({
      aniosServicio,
      aniosIngreso,
      aniosEstado,
      diasCorresponden,
      diasTomados,
      diasDisponibles,
      diasSeleccionados,
      fechaInicio: fechaInicio.toISOString().split('T')[0],
      fechaFin: fechaFin.toISOString().split('T')[0],
      mensaje: 'Usa este resumen para confirmar la solicitud de vacaciones.'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al calcular preview' });
  }
};

// ─── IMPRIMIR REPORTE PDF ─────────────────────────────────────────────────────
const imprimirVacaciones = async (req, res) => {
  try {
    const pool = getPool();
    const emp = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Empleados WHERE Id = @id');
    if (emp.recordset.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
    const empleado = emp.recordset[0];

    const vacs = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM VacacionesEmpleados WHERE EmpleadoId = @id ORDER BY FechaInicio DESC');
    const vacaciones = vacs.recordset;

    const logoPath = path.join(__dirname, '../templates/logo.png');
    const logoBase64 = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}` : '';

    const filas = vacaciones.map((v, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fb'}">
        <td>${fmtFecha(v.FechaInicio)}</td>
        <td>${fmtFecha(v.FechaFin)}</td>
        <td style="text-align:center">${v.DiasCorresponden}</td>
        <td style="text-align:center">${v.AniosServicio}</td>
        <td>${v.Observaciones || '—'}</td>
        <td style="text-align:center">
          <span style="padding:3px 10px; border-radius:12px; font-size:10px; font-weight:700;
            background:${v.Cancelada ? '#fef2f2' : '#ecfdf5'};
            color:${v.Cancelada ? '#e74c3c' : '#27ae60'}">
            ${v.Cancelada ? 'Cancelada' : 'Activa'}
          </span>
        </td>
      </tr>
    `).join('');

    const aniosServicio = calcularAnios(empleado.FechaIngreso);
    const diasCorresponden = calcularDiasVacaciones(aniosServicio);
    const activas = vacaciones.filter(v => v.Cancelada !== 1 && v.Cancelada !== true).length;
const canceladas = vacaciones.filter(v => v.Cancelada === 1 || v.Cancelada === true).length;

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 30px 40px; }
  .header { display:flex; align-items:center; gap:20px; border-bottom:2px solid #000; padding-bottom:14px; margin-bottom:16px; }
  .header img { height:75px; width:auto; }
  .header-info strong { font-size:13px; display:block; margin-bottom:4px; }
  .header-info { font-size:11px; line-height:1.8; }
  .titulo { text-align:center; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:14px; }
  .datos { border:1px solid #000; margin-bottom:16px; }
  .dato-fila { display:flex; border-bottom:1px solid #ccc; }
  .dato-fila:last-child { border-bottom:none; }
  .dato-label { font-weight:700; padding:5px 10px; width:160px; border-right:1px solid #ccc; background:#f1f1f1; }
  .dato-valor { padding:5px 10px; }
  .resumen { display:flex; gap:16px; margin-bottom:16px; }
  .card { flex:1; border:1px solid #ccc; border-radius:6px; padding:10px 14px; background:#f8f9fb; }
  .card-label { font-size:10px; color:#666; text-transform:uppercase; letter-spacing:0.5px; }
  .card-valor { font-size:16px; font-weight:800; color:#1a2744; margin-top:2px; }
  table { width:100%; border-collapse:collapse; }
  th { background:#1a2744; color:white; padding:8px 10px; text-align:left; font-size:10px; }
  td { padding:7px 10px; font-size:10px; border-bottom:1px solid #eee; }
  .footer { position:fixed; bottom:10px; left:0; right:0; text-align:center; font-size:9px; color:#888; border-top:1px solid #ccc; padding-top:8px; }
</style>
</head>
<body>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}"/>` : ''}
    <div class="header-info">
      <strong>Dirección General de Minería</strong>
      Gobierno de la República Dominicana<br>
      RNC: 4-01-03720-3 · Tel: 809-685-8191<br>
      info@mineria.gob.do · www.mineria.gob.do
    </div>
  </div>

  <div class="titulo">Historial de Vacaciones del Empleado</div>

  <div class="datos">
    <div class="dato-fila"><div class="dato-label">Nombre Completo</div><div class="dato-valor">${empleado.Nombre} ${empleado.Apellidos}</div></div>
    <div class="dato-fila"><div class="dato-label">N° RH</div><div class="dato-valor">${empleado.NumeroRH || '—'}</div></div>
    <div class="dato-fila"><div class="dato-label">Cédula</div><div class="dato-valor">${empleado.Cedula || '—'}</div></div>
    <div class="dato-fila"><div class="dato-label">Cargo Actual</div><div class="dato-valor">${empleado.CargoActual || '—'}</div></div>
    <div class="dato-fila"><div class="dato-label">Fecha Ingreso</div><div class="dato-valor">${fmtFecha(empleado.FechaIngreso)}</div></div>
    <div class="dato-fila"><div class="dato-label">Años de Servicio</div><div class="dato-valor">${aniosServicio} años → ${diasCorresponden} días de vacaciones</div></div>
    <div class="dato-fila"><div class="dato-label">Fecha del Reporte</div><div class="dato-valor">${new Date().toLocaleDateString('es-DO', { day:'2-digit', month:'long', year:'numeric' })}</div></div>
  </div>

  <div class="resumen">
    <div class="card"><div class="card-label">Total Períodos</div><div class="card-valor">${vacaciones.length}</div></div>
    <div class="card"><div class="card-label">Activos</div><div class="card-valor" style="color:#27ae60">${activas}</div></div>
    <div class="card"><div class="card-label">Cancelados</div><div class="card-valor" style="color:#e74c3c">${canceladas}</div></div>
    <div class="card"><div class="card-label">Períodos Usados</div><div class="card-valor" style="color:#1a2744">${vacaciones.length} de 3</div></div>
    <div class="card"><div class="card-label">Períodos Disponibles</div><div class="card-valor" style="color:#1a2744">${Math.max(0, 3 - vacaciones.length)} de 3</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Fecha Inicio</th>
        <th>Fecha Fin</th>
        <th style="text-align:center">Días</th>
        <th style="text-align:center">Años Serv.</th>
        <th>Observaciones</th>
        <th style="text-align:center">Estatus</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="footer">
    Documento generado electrónicamente · Sistema RRHH · Dirección General de Minería · ${new Date().toLocaleString('es-DO')}
  </div>
</body>
</html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '15mm', left: '10mm', right: '10mm' } });
    await browser.close();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=vacaciones_${req.params.id}.pdf`);
    res.send(pdf);
  } catch (e) {
    console.error('Error en imprimirVacaciones:', e);
    res.status(500).json({ error: e.message || 'Error al generar PDF' });
  }
};

module.exports = { registrarVacaciones, obtenerVacaciones, cancelarVacacion, reactivarVacacion, eliminarVacaciones, calcularPreview, imprimirVacaciones };