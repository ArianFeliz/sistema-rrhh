const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
require('dotenv').config();

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { usuario, password } = req.body;

  // Validación básica
  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const pool = getPool();

    // Buscar el usuario en la base de datos
    const resultado = await pool.query(
      'SELECT * FROM "Administradores" WHERE "Usuario" = $1',
      [usuario]
    );

    // Si no existe el usuario
    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const admin = resultado.rows[0];

    // Comparar la contraseña ingresada con el hash guardado
    const passwordValida = await bcrypt.compare(password, admin.Password);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Crear el token JWT
    const token = jwt.sign(
      {
        id: admin.Id,
        usuario: admin.Usuario,
        nombre: admin.Nombre
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      mensaje: 'Login exitoso',
      token,
      admin: {
        id: admin.Id,
        usuario: admin.Usuario,
        nombre: admin.Nombre,
        email: admin.Email
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── REGISTRAR ADMIN (solo para setup inicial) ───────────────────────────────
const registrarAdmin = async (req, res) => {
  const { usuario, password, nombre, email } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const pool = getPool();

    // Verificar si el usuario ya existe
    const existe = await pool.query(
      'SELECT "Id" FROM "Administradores" WHERE "Usuario" = $1',
      [usuario]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    // Encriptar la contraseña (salt rounds = 10, es el nivel de seguridad)
    const hashPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO "Administradores" ("Usuario", "Password", "Nombre", "Email")
       VALUES ($1, $2, $3, $4)`,
      [usuario, hashPassword, nombre || null, email || null]
    );

    res.status(201).json({ mensaje: 'Administrador creado exitosamente' });

  } catch (error) {
    console.error('Error al registrar admin:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── VERIFICAR TOKEN (para el frontend) ──────────────────────────────────────
const verificarToken = async (req, res) => {
  // Si llega aquí, el middleware ya validó el token
  res.json({
    valido: true,
    usuario: req.admin
  });
};

module.exports = { login, registrarAdmin, verificarToken };