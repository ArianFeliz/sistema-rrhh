const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_SERVER,  
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS'        // 👈 Nombre de la instancia sin el servidor
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }

};

let pool;

const conectarDB = async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado a SQL Server exitosamente');
    return pool;
  } catch (error) {
    console.error('❌ Error al conectar a SQL Server:', error.message);
    process.exit(1);
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('La base de datos no está conectada.');
  }
  return pool;
};

module.exports = { conectarDB, getPool, sql };
