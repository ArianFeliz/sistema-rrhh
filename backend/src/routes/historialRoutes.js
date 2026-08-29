const express = require('express');
const { sql, getPool } = require('../config/db');
const { verificarJWT } = require('../middlewares/authMiddleware');
const { obtenerHistorial, imprimirHistorial, eliminarHistorialItem, eliminarHistorialEmpleado, eliminarHistorialBulk } = require('../controllers/historialController');

const router = express.Router();

router.get('/:id/imprimir', verificarJWT, imprimirHistorial);
router.get('/:id/fechas', verificarJWT, async (req, res) => {
  try {
    const pool = getPool();
    const resultado = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT DISTINCT CAST(FechaHora AS DATE) as Fecha
        FROM HistorialEmpleados
        WHERE EmpleadoId = @id
        ORDER BY Fecha DESC
      `);
    res.json({ fechas: resultado.recordset.map(r => r.Fecha) });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener fechas' });
  }
});
router.get('/:id', verificarJWT, obtenerHistorial);
router.delete('/:id', verificarJWT, eliminarHistorialItem);
router.delete('/empleado/:id', verificarJWT, eliminarHistorialEmpleado);
router.post('/empleado/:id/bulk', verificarJWT, eliminarHistorialBulk);

module.exports = router;