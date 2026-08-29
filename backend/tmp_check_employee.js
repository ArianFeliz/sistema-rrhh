const { conectarDB } = require('./src/config/db');
const sql = require('mssql');
(async () => {
  try {
    const pool = await conectarDB();
    const id = 1;
    const r = await pool.request().input('id', sql.Int, id).query('SELECT Id, Nombre, FechaIngreso, TiempoEnEstadoValor, TiempoEnEstadoUnidad FROM Empleados WHERE Id=@id');
    console.log(r.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();