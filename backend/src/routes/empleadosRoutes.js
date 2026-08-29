const express = require('express');
const router = express.Router();
const {
  obtenerEmpleados,
  obtenerEmpleadoPorId,
  crearEmpleado,
  actualizarEmpleado,
  eliminarEmpleado,
  obtenerSiguienteRH
} = require('../controllers/empleadosController');
const { verificarJWT } = require('../middlewares/authMiddleware');

// Todas las rutas de empleados requieren autenticación
router.use(verificarJWT);

// GET    /api/empleados          → Obtener todos (con búsqueda opcional)
// GET    /api/empleados/:id      → Obtener uno por ID
// POST   /api/empleados          → Crear nuevo
// PUT    /api/empleados/:id      → Actualizar
// DELETE /api/empleados/:id      → Eliminar

router.get('/', obtenerEmpleados);
router.get('/siguiente-rh', obtenerSiguienteRH);
router.get('/:id', obtenerEmpleadoPorId);
router.post('/', crearEmpleado);
router.put('/:id', actualizarEmpleado);
router.delete('/:id', eliminarEmpleado);

module.exports = router;