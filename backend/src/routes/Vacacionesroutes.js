const express = require('express');
const router = express.Router();
const { verificarJWT } = require('../middlewares/authMiddleware');
const {
  registrarVacaciones,
  obtenerVacaciones,
  cancelarVacacion,
  reactivarVacacion,
  eliminarVacaciones,
  calcularPreview,
  imprimirVacaciones
} = require('../controllers/Vacacionescontroller');

router.use(verificarJWT);

router.get('/:id/preview', calcularPreview);
router.get('/:id/imprimir', imprimirVacaciones);
router.get('/:id', obtenerVacaciones);
router.post('/:id', registrarVacaciones);
router.put('/:id/vacacion/:vacacionId/cancelar', cancelarVacacion);
router.put('/:id/vacacion/:vacacionId/reactivar', reactivarVacacion);
router.delete('/:id/vacacion/:vacacionId', eliminarVacaciones);

module.exports = router;