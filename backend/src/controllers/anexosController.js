const { getPool } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Carpeta donde se guardan los archivos
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Tipo de archivo no permitido'));
};

const upload = multer({ storage, fileFilter });

const subirAnexo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
    const { id } = req.params;
    const pool = getPool();
    await pool.query(
      `INSERT INTO "AnexosEmpleados" ("EmpleadoId", "NombreOriginal", "NombreArchivo", "TipoArchivo", "TipoDocumento")
       VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        req.file.originalname,
        req.file.filename,
        path.extname(req.file.originalname).toLowerCase(),
        req.body.tipoDocumento || null
      ]
    );

    res.json({ mensaje: 'Anexo subido correctamente', archivo: req.file.filename });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al subir el anexo' });
  }
};

const obtenerAnexos = async (req, res) => {
  try {
    const pool = getPool();
    const resultado = await pool.query(
      'SELECT * FROM "AnexosEmpleados" WHERE "EmpleadoId" = $1 ORDER BY "FechaSubida" DESC',
      [req.params.id]
    );
    res.json({ anexos: resultado.rows });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener anexos' });
  }
};

const eliminarAnexo = async (req, res) => {
  try {
    const pool = getPool();
    const resultado = await pool.query(
      'SELECT "NombreArchivo" FROM "AnexosEmpleados" WHERE "Id" = $1',
      [req.params.anexoId]
    );
    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Anexo no encontrado' });
    const archivo = resultado.rows[0].NombreArchivo;
    const filePath = path.join(uploadsDir, archivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await pool.query('DELETE FROM "AnexosEmpleados" WHERE "Id" = $1', [req.params.anexoId]);
    res.json({ mensaje: 'Anexo eliminado' });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar el anexo' });
  }
};

const verAnexo = (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.sendFile(filePath);
};

module.exports = { upload, subirAnexo, obtenerAnexos, eliminarAnexo, verAnexo };