const { conectarDB } = require('./src/config/db');
const { calcularPreview } = require('./src/controllers/Vacacionescontroller');

const req = {
  params: { id: 16 },
  query: { FechaInicio: new Date().toISOString().split('T')[0], DiasSolicitados: '' }
};

const res = {
  status(code) { this._status = code; return this; },
  json(obj) { console.log('STATUS', this._status || 200, JSON.stringify(obj, null, 2)); return obj; }
};

(async () => {
  await conectarDB();
  await calcularPreview(req, res);
  process.exit(0);
})();