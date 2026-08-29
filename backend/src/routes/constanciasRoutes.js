const express = require('express');
const router = express.Router();
const { generarConstancia } = require('../controllers/constanciasController');
const { verificarJWT } = require('../middlewares/authMiddleware');

router.get('/:id', verificarJWT, generarConstancia);

module.exports = router;