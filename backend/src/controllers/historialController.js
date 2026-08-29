const { getPool } = require('../config/db');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const camposLaborales = [
  'NumeroRH', 'Cedula', 'Nombre', 'Apellidos', 'Sexo',
  'FechaNacimiento', 'Edad', 'NumeroTelefonico', 'Correo',
  'CargoInicial', 'CargoActual', 'SalarioInicial', 'SalarioActual',
  'SalarioItinerario', 'Itinerario', 'GrupoOcupacional',
  'FechaIngreso', 'FechaSalida', 'Estatus', 'AFP', 'ARS',
  'Vacaciones', 'LicenciasMedicas', 'Faltas',
  'TiempoEnEstadoValor', 'TiempoEnEstadoUnidad',
  'Expediente', 'SalarioTotal'
];

const registrarCambios = async (empleadoId, datosAnteriores, datosNuevos, usuarioAdmin) => {
  try {
    const pool = getPool();
    for (const campo of camposLaborales) {
      const formatVal = (val) => {
        if (!val) return '';
        if (val instanceof Date) return val.toISOString().split('T')[0];
        return String(val).split('T')[0];
      };
      const anterior = formatVal(datosAnteriores[campo]);
      const nuevo = formatVal(datosNuevos[campo]);
      if (anterior !== nuevo) {
        await pool.query(
          `INSERT INTO "HistorialEmpleados" ("EmpleadoId", "Campo", "ValorAnterior", "ValorNuevo", "UsuarioAdmin")
           VALUES ($1, $2, $3, $4, $5)`,
          [empleadoId, campo, anterior, nuevo, usuarioAdmin || 'Admin']
        );
      }
    }
  } catch (e) {
    console.error('Error registrando historial:', e);
  }
};

const obtenerHistorial = async (req, res) => {
  try {
    const pool = getPool();
    const resultado = await pool.query(
      `SELECT h.*, e."Nombre", e."Apellidos", e."NumeroRH"
       FROM "HistorialEmpleados" h
       JOIN "Empleados" e ON h."EmpleadoId" = e."Id"
       WHERE h."EmpleadoId" = $1
       ORDER BY h."FechaHora" DESC`,
      [req.params.id]
    );
    res.json({ historial: resultado.rows });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

const imprimirHistorial = async (req, res) => {
  try {
    const pool = getPool();
    const fecha = req.query.fecha;
    let queryH = `
      SELECT h.*, e."Nombre", e."Apellidos", e."NumeroRH", e."Cedula", e."CargoActual"
      FROM "HistorialEmpleados" h
      JOIN "Empleados" e ON h."EmpleadoId" = e."Id"
      WHERE h."EmpleadoId" = $1
    `;
    const params = [req.params.id];
    if (fecha) {
      params.push(fecha);
      queryH += ` AND CAST(h."FechaHora" AS DATE) = $2`;
    }
    queryH += ' ORDER BY h."FechaHora" DESC';
    const resultado = await pool.query(queryH, params);

    const historial = resultado.rows;
    const emp = historial[0] || {};

    const logoPath = path.join(__dirname, '../templates/logo.png');
    const logoBase64 = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
      : '';

    const formatFecha = (f) => {
      if (!f) return '—';
      const d = new Date(new Date(f).getTime() + (4 * 60 * 60 * 1000));
      return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const formatHora = (f) => {
      if (!f) return '';
      const d = new Date(new Date(f).getTime() + (4 * 60 * 60 * 1000));
      return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatValor = (val) => {
      if (!val) return '—';
      const d = new Date(val);
      if (!isNaN(d.getTime()) && String(val).includes('-') && String(val).length >= 10) {
        return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
      }
      return val;
    };
    const formatearCampo = (campo) => {
      if (!campo) return '—';
      return campo.replace(/([a-z])([A-Z])/g, '$1 $2');
    };
    const filas = historial.map((h, i) => `
  <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fb'}">
    <td>${formatFecha(h.FechaHora)}<br><small>${formatHora(h.FechaHora)}</small></td>
    <td><strong>${formatearCampo(h.Campo)}</strong></td>
    <td><strong>${formatValor(h.ValorAnterior)}</strong></td>
    <td><strong>${formatValor(h.ValorNuevo)}</strong></td>
  </tr>
`).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
  font-family: Arial, sans-serif; 
  font-size: 12px; 
  color: #000; 
  padding: 30px 40px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
    .header { display: flex; align-items: center; gap: 20px; border-bottom: 2px solid #000; padding-bottom: 14px; margin-bottom: 20px; }
    .header img { height: 80px; width: auto; }
    .header-info { font-size: 11px; line-height: 1.8; }
    .header-info strong { font-size: 14px; display: block; }
    .titulo { 
  text-align: center; 
  font-size: 14px; 
  font-weight: 800; 
  text-transform: uppercase; 
  letter-spacing: 2px; 
  margin-bottom: 20px; 
}
    .datos { border: 1px solid #000; margin-bottom: 20px; }
    .dato-fila { display: flex; border-bottom: 1px solid #ccc; }
    .dato-fila:last-child { border-bottom: none; }
    .dato-label { font-weight: 700; padding: 5px 10px; width: 160px; border-right: 1px solid #ccc; background: #f1f1f1; font-size: 11px; }
    .dato-valor { padding: 5px 10px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #1a2744; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
    td { padding: 7px 10px; font-size: 11px; border-bottom: 1px solid #eee; }
    small { color: #666; font-size: 10px; }
    .footer { 
  margin-top: auto;
  text-align: center; 
  font-size: 10px; 
  color: #666; 
  border-top: 1px solid #ccc; 
  padding-top: 10px; 
}
  </style>
</head>
<body>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" />` : ''}
    <div class="header-info">
      <strong>Dirección General de Minería</strong>
      Gobierno de la República Dominicana<br>
      RNC: 4-01-03720-3 · Tel: 809-685-8191<br>
      info@mineria.gob.do · www.mineria.gob.do
    </div>
  </div>

  <div class="titulo">Historial de Cambios del Empleado</div>

  <div class="datos">
    <div class="dato-fila"><div class="dato-label">Nombre Completo</div><div class="dato-valor">${emp.Nombre} ${emp.Apellidos}</div></div>
    <div class="dato-fila"><div class="dato-label">N° RH</div><div class="dato-valor">${emp.NumeroRH || '—'}</div></div>
    <div class="dato-fila"><div class="dato-label">Cédula</div><div class="dato-valor">${emp.Cedula || '—'}</div></div>
    <div class="dato-fila"><div class="dato-label">Cargo Actual</div><div class="dato-valor">${emp.CargoActual || '—'}</div></div>
    <div class="dato-fila"><div class="dato-label">Fecha del Reporte</div><div class="dato-valor">${new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}</div></div>
  </div>

  <table>
   <thead>
  <tr>
    <th>Fecha y Hora</th>
    <th>Campo Modificado</th>
    <th>Valor Anterior</th>
    <th>Valor Nuevo</th>
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
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=historial_${req.params.id}.pdf`);
    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

const eliminarHistorialItem = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('DELETE FROM "HistorialEmpleados" WHERE "Id" = $1', [req.params.id]);

    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro de historial no encontrado' });
    res.json({ message: 'Registro de historial eliminado' });
  } catch (e) {
    console.error('Error al eliminar historial:', e);
    res.status(500).json({ error: 'Error al eliminar historial' });
  }
};

const eliminarHistorialEmpleado = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('DELETE FROM "HistorialEmpleados" WHERE "EmpleadoId" = $1', [req.params.id]);

    res.json({ message: 'Historial del empleado eliminado', eliminados: result.rowCount });
  } catch (e) {
    console.error('Error al eliminar historial completo del empleado:', e);
    res.status(500).json({ error: 'Error al eliminar historial del empleado' });
  }
};

const eliminarHistorialBulk = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ error: 'No se proporcionaron IDs para eliminar' });

    const pool = getPool();
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');

    const result = await pool.query(`DELETE FROM "HistorialEmpleados" WHERE "Id" IN (${placeholders})`, ids);
    res.json({ message: 'Historial eliminado en lote', eliminados: result.rowCount });
  } catch (e) {
    console.error('Error al eliminar historial en lote:', e);
    res.status(500).json({ error: 'Error al eliminar historial en lote' });
  }
};

const registrarEventoHistorial = async (empleadoId, campo, valorAnterior, valorNuevo, usuarioAdmin = 'Admin') => {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO "HistorialEmpleados" ("EmpleadoId", "Campo", "ValorAnterior", "ValorNuevo", "UsuarioAdmin")
       VALUES ($1, $2, $3, $4, $5)`,
      [empleadoId, campo, valorAnterior, valorNuevo, usuarioAdmin]
    );
  } catch (e) {
    console.error('Error al registrar evento de historial:', e);
  }
};

module.exports = {
  registrarCambios,
  registrarEventoHistorial,
  obtenerHistorial,
  imprimirHistorial,
  eliminarHistorialItem,
  eliminarHistorialEmpleado,
  eliminarHistorialBulk
};