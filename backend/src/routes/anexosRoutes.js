const express = require('express');
const router = express.Router();
const { verificarJWT } = require('../middlewares/authMiddleware');
const { upload, subirAnexo, obtenerAnexos, eliminarAnexo, verAnexo } = require('../controllers/anexosController');

router.get('/ver/:filename', verAnexo); // sin JWT para poder abrir en nueva pestaña
router.use(verificarJWT);
router.get('/:id', obtenerAnexos);
router.post('/:id', upload.single('archivo'), subirAnexo);
router.delete('/:id/anexo/:anexoId', eliminarAnexo);

module.exports = router;