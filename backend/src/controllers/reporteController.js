const { sql, getPool } = require('../config/db');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const generarReporte = async (req, res) => {
  try {
    const pool = getPool();
    const { estatus, cargo, itinerario, AFP, ARS, grupoOcupacional, salarioMin, salarioMax } = req.query;

    let query = 'SELECT * FROM Empleados WHERE 1=1';
    const request = pool.request();

    if (estatus) { query += ' AND Estatus = @estatus'; request.input('estatus', sql.VarChar, estatus); }
    if (cargo) { query += ' AND CargoActual LIKE @cargo'; request.input('cargo', sql.VarChar, `%${cargo}%`); }
    if (itinerario) { query += ' AND Itinerario LIKE @itinerario'; request.input('itinerario', sql.VarChar, `%${itinerario}%`); }
    if (AFP) { query += ' AND AFP LIKE @AFP'; request.input('AFP', sql.VarChar, `%${AFP}%`); }
    if (ARS) { query += ' AND ARS LIKE @ARS'; request.input('ARS', sql.VarChar, `%${ARS}%`); }
    if (grupoOcupacional) { query += ' AND GrupoOcupacional LIKE @grupoOcupacional'; request.input('grupoOcupacional', sql.VarChar, `%${grupoOcupacional}%`); }
    if (salarioMin) { query += ' AND SalarioActual >= @salarioMin'; request.input('salarioMin', sql.Decimal(10,2), salarioMin); }
    if (salarioMax) { query += ' AND SalarioActual <= @salarioMax'; request.input('salarioMax', sql.Decimal(10,2), salarioMax); }

    const limite = req.query.limite ? parseInt(req.query.limite) : null;
query += ' ORDER BY NumeroRH ASC';
if (limite) query = query.replace('SELECT *', `SELECT TOP ${limite} *`);
    const resultado = await request.query(query);
    const empleados = resultado.recordset;

    const logoPath = path.join(__dirname, '../templates/logo.png');
    const logoBase64 = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}` : '';

    const salarioPromedio = empleados.length > 0
      ? (empleados.reduce((s, e) => s + (Number(e.SalarioActual) || 0), 0) / empleados.length).toLocaleString('es-DO', { minimumFractionDigits: 2 })
      : '0.00';

    const filas = empleados.map((e, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fb'}">
        <td>${e.NumeroRH || '—'}</td>
        <td>${e.Nombre} ${e.Apellidos}</td>
        <td>${e.Cedula || '—'}</td>
        <td>${e.CargoActual || '—'}</td>
        <td>${e.Itinerario || '—'}</td>
        <td>${e.GrupoOcupacional || '—'}</td>
        <td>${e.Estatus || '—'}</td>
        <td>RD$ ${Number(e.SalarioActual || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const filtrosAplicados = [
      estatus && `Estatus: ${estatus}`,
      cargo && `Cargo: ${cargo}`,
      itinerario && `Itinerario: ${itinerario}`,
      AFP && `AFP: ${AFP}`,
      ARS && `ARS: ${ARS}`,
      grupoOcupacional && `Grupo Ocupacional: ${grupoOcupacional}`,
      salarioMin && `Salario mínimo: RD$ ${Number(salarioMin).toLocaleString()}`,
      salarioMax && `Salario máximo: RD$ ${Number(salarioMax).toLocaleString()}`,
    ].filter(Boolean).join(' · ') || 'Todos los empleados';

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
.titulo { text-align:center; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:14px; }  .resumen { display:flex; gap:16px; margin-bottom:16px; }
  .card { flex:1; border:1px solid #ccc; border-radius:6px; padding:10px 14px; background:#f8f9fb; }
  .card-label { font-size:10px; color:#666; text-transform:uppercase; letter-spacing:0.5px; }
  .card-valor { font-size:16px; font-weight:800; color:#1a2744; margin-top:2px; }
  .filtros { font-size:10px; color:#555; margin-bottom:12px; background:#f1f1f1; padding:6px 10px; border-radius:4px; }
  table { width:100%; border-collapse:collapse; }
  th { background:#1a2744; color:white; padding:8px 10px; text-align:left; font-size:10px; }
  td { padding:7px 10px; font-size:10px; border-bottom:1px solid #eee; }
.footer { position:fixed; bottom:10px; left:0; right:0; text-align:center; font-size:9px; color:#888; border-top:1px solid #ccc; padding-top:8px; }margin-top:30px; text-align:center; font-size:9px; color:#888; border-top:1px solid #ccc; padding-top:8px; }
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

  <div class="titulo">Reporte General de Empleados</div>

  <div class="resumen">
    <div class="card"><div class="card-label">Total Empleados</div><div class="card-valor">${empleados.length}</div></div>
    <div class="card"><div class="card-label">Activos</div><div class="card-valor">${empleados.filter(e => e.Estatus === 'Activo').length}</div></div>
    <div class="card"><div class="card-label">Inactivos</div><div class="card-valor">${empleados.filter(e => e.Estatus === 'Inactivo').length}</div></div>
    <div class="card"><div class="card-label">Salario Promedio</div><div class="card-valor">RD$ ${salarioPromedio}</div></div>
  </div>

  <div class="filtros"><strong>Filtros aplicados:</strong> ${filtrosAplicados}</div>

  <table>
    <thead>
      <tr>
        <th>N° RH</th><th>Nombre Completo</th><th>Cédula</th><th>Cargo Actual</th>
        <th>Itinerario</th><th>Grupo Ocupacional</th><th>Estatus</th><th>Salario Actual</th>
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
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_empleados.pdf');
    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
};

module.exports = { generarReporte };