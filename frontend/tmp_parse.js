const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('src/pages/Empleados.jsx', 'utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('ok');
} catch (e) {
  console.error('Error:', e.message);
  console.error('Loc:', e.loc);
}
