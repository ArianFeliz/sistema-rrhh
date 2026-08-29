const express = require('express');
const router = express.Router();
const { login, registrarAdmin, verificarToken } = require('../controllers/authController');
const { verificarJWT } = require('../middlewares/authMiddleware');

// POST /api/auth/login
router.post('/login', login);

// 👇 Sin verificarJWT temporalmente para crear el primer admin
router.post('/registro',  registrarAdmin);

// GET /api/auth/verificar
router.get('/verificar', verificarJWT, verificarToken);

module.exports = router;