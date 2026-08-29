const puppeteer = require('puppeteer');
const { getPool, sql } = require('../config/db');
const { generarConstanciaHTML } = require('../templates/constanciaTemplate');

const generarConstancia = async (req, res) => {
  const { id } = req.params;
  const { tipo = 'trabajo' } = req.query;

  const tiposValidos = ['trabajo', 'salario', 'residencia', 'expediente', 'carta'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de constancia inválido' });
  }

  try {
    const pool = getPool();
    const resultado = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Empleados WHERE Id = @id');

    if (resultado.recordset.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const empleado = resultado.recordset[0];
    const html = generarConstanciaHTML(empleado, tipo);

   const browser = await puppeteer.launch({
  headless: true,  // cambia 'new' por true
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
});

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();

    const nombreArchivo = `constancia_${tipo}_${empleado.Nombre}_${empleado.Apellidos}.pdf`
      .replace(/\s+/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(pdf);

  } catch (error) {
    console.error('Error al generar constancia:', error);
    res.status(500).json({ error: 'Error al generar el PDF' });
  }
};

module.exports = { generarConstancia };