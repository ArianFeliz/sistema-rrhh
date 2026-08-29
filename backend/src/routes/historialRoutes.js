const express = require('express');
const { getPool } = require('../config/db');
const { verificarJWT } = require('../middlewares/authMiddleware');
const { obtenerHistorial, imprimirHistorial, eliminarHistorialItem, eliminarHistorialEmpleado, eliminarHistorialBulk } = require('../controllers/historialController');

const router = express.Router();

router.get('/:id/imprimir', verificarJWT, imprimirHistorial);
router.get('/:id/fechas', verificarJWT, async (req, res) => {
  try {
    const pool = getPool();
    const resultado = await pool.query(
      `SELECT DISTINCT CAST("FechaHora" AS DATE) as "Fecha"
       FROM "HistorialEmpleados"
       WHERE "EmpleadoId" = $1
       ORDER BY "Fecha" DESC`,
      [req.params.id]
    );
    res.json({ fechas: resultado.rows.map(r => r.Fecha) });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener fechas' });
  }
});
router.get('/:id', verificarJWT, obtenerHistorial);
router.delete('/:id', verificarJWT, eliminarHistorialItem);
router.delete('/empleado/:id', verificarJWT, eliminarHistorialEmpleado);
router.post('/empleado/:id/bulk', verificarJWT, eliminarHistorialBulk);

module.exports = router;