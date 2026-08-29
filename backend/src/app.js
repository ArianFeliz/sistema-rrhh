const express = require('express');
const cors = require('cors');
require('dotenv').config();

const constanciasRoutes = require('./routes/constanciasRoutes');
const authRoutes        = require('./routes/authRoutes');
const empleadosRoutes   = require('./routes/empleadosRoutes');
const historialRoutes   = require('./routes/historialRoutes');
const reporteRoutes     = require('./routes/reporteRoutes');
const anexosRoutes      = require('./routes/anexosRoutes');
const vacacionesRoutes = require('./routes/Vacacionesroutes');

const app = express();

// ─── MIDDLEWARES GLOBALES ────────────────────────────────────────────────────

const origenesPermitidos = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: origenesPermitidos,
  credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── RUTAS ───────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/empleados',   empleadosRoutes);
app.use('/api/constancias', constanciasRoutes);
app.use('/api/historial',   historialRoutes);
app.use('/api/reporte',     reporteRoutes);
app.use('/api/anexos',      anexosRoutes);
app.use('/api/vacaciones', vacacionesRoutes);

// Ruta raíz de prueba
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API Sistema RRHH funcionando correctamente',
    version: '1.0.0',
    endpoints: ['/api/auth', '/api/empleados', '/api/historial', '/api/reporte', '/api/anexos']
  });
});

// ─── MANEJO DE RUTAS NO ENCONTRADAS ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── MANEJO GLOBAL DE ERRORES ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    detalle: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;