const app = require('./src/app');
const { conectarDB } = require('./src/config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Primero conectamos la base de datos, luego arrancamos el servidor
const iniciarServidor = async () => {
  try {
    // 1. Conectar a SQL Server
    await conectarDB();
    
    // 2. Arrancar Express solo si la DB conectó bien
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();