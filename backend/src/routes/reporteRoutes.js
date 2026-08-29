const express = require('express');
const { generarReporte } = require('../controllers/reporteController');
const { verificarJWT } = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/', verificarJWT, generarReporte);

module.exports = router;