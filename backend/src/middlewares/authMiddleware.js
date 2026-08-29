const jwt = require('jsonwebtoken');
require('dotenv').config();

const verificarJWT = (req, res, next) => {
  // El token viene en el header: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extraemos solo el token

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // Guardamos los datos del admin en el request
    next(); // Continuamos al controller
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Inicia sesión nuevamente' });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
};

module.exports = { verificarJWT };