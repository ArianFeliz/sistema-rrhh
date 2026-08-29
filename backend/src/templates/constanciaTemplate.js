const fs = require('fs');
const path = require('path');

// ─── LOGO EN BASE64 ───────────────────────────────────────────────────────────
const logoBase64 = (() => {
  try {
    const logoPath = path.join(__dirname, 'logo.png');
    return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  } catch {
    return null;
  }
})();

const footerBase64 = (() => {
  try {
    const footerPath = path.join(__dirname, 'FT.png'); // ← mismo folder que logo
    return `data:image/png;base64,${fs.readFileSync(footerPath).toString('base64')}`;
  } catch {
    return null;
  }
})();

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const formatFecha = (fecha) => {
  if (!fecha) return 'N/A';
  if (typeof fecha === 'string') return fecha.split('T')[0];
  if (fecha instanceof Date) return fecha.toLocaleDateString('es-DO');
  return 'N/A';
};

const formatSalario = (s) =>
  `${Number(s || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })} DOP`;

// ─── EXPEDIENTE COMPLETO ──────────────────────────────────────────────────────
const generarExpedienteHTML = (empleado) => {
  const hoy = new Date().toLocaleDateString('es-DO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const logoHTML = logoBase64
    ? `<img src="${logoBase64}" style="height:80px;width:auto;object-fit:contain;" />`
    : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
       font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000000;
  background: white;
  padding: 14mm 16mm 0mm; /* 🔥 quita padding inferior */
  width: 215.9mm;
}
    }

    /* ── HEADER ── */
    .header {
      display: flex;
  align-items: center; /* centra verticalmente todo */
  justify-content: space-between;
  border: 1px solid #0f1e3d;
  padding: 12px 20px;
  background: #ffffff;
    }
    .header-logo {
       width: 120px;
  height: 90px; /* misma altura visual del header */
  display: flex;
  align-items: center; /* centra el logo dentro */
  justify-content: center;
    }

    .header-logo img {
  max-height: 80px;
  width: auto;
  object-fit: contain;
}
    .header-center {
      flex: 1;
      text-align: center;
      padding: 0 16px;
    }
    .header-center h1 {
      font-size: 16px;
      font-weight: 800;
      color: #0f1e3d;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 3px;
    }
    .header-center p {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
      min-width: 130px;
      font-size: 10px;
      color: #334155;
      line-height: 1.8;
    }
    .header-right strong {
      display: block;
      font-size: 12px;
      font-weight: 800;
      color: #000000;
    }

    /* ── TÍTULO DOCUMENTO ── */
    .doc-titulo {
      background: #0f1e3d;
      color: white;
      text-align: center;
      padding: 8px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 3px;
      text-transform: uppercase;
      border-left: 1px solid #0f1e3d;
      border-right: 1px solid #0f1e3d;
    }

    

    .seccion-titulo {
      background: #f1f1f1;
      color: #000000;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 6px 12px;
    }

    .seccion-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .campo {
      display: flex;
      padding: 6px 12px;
      border-bottom: 1px solid #f1f1f1;
      gap: 8px;
      align-items: center;
      min-height: 28px;
    }

    .campo:nth-child(odd) {
      border-right: 1px solid #f1f1f1;
    }

    .campo:last-child,
    .campo:nth-last-child(2):nth-child(odd) {
      border-bottom: none;
    }

    .campo label {
      font-weight: 700;
      white-space: nowrap;
      min-width: 120px;
      font-size: 10px;
      color: #000000;
    }

    .campo span {
      font-size: 10.5px;
      color: #000000;
      font-weight: 500;
    }

    /* ── SALARIO TOTAL ── */
    .salario-total {
      background: #f1f1f1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
    }

    .salario-total label {
      font-weight: 800;
      font-size: 12px;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .salario-total span {
      font-size: 15px;
      font-weight: 800;
      color: #000000;
    }

    /* ── OBSERVACIONES ── */
    .observaciones {
      padding: 8px 12px;
      min-height: 50px;
    }

    .observaciones label {
      font-weight: 700;
      font-size: 10px;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* ── FIRMAS ── */

    
    .firmas-section {
      padding: 50px 40px 40px; /* antes 20 → ahora 40 */
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
    }

    .firma-bloque {
      text-align: center;
      min-width: 160px;
    }

    .firma-espacio {
      height: 38px;
      border-bottom: 1.5px solid #0f1e3d;
      margin-bottom: 6px;
    }

    .firma-nombre {
      font-size: 11px;
      font-weight: 700;
      color: #000000;
    }

    .firma-cargo {
      font-size: 10px;
      color: #000000;
      margin-top: 2px;
    }

    /* ── FOOTER ── */
    .doc-footer{
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 24px; /* 🔥 altura real */
  background: #f8fafc;
  text-align: center;
  line-height: 24px;
  font-size: 9px;
  color: #000;
}
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-logo">${logoHTML}</div>
    <div class="header-center">
      <h1>Dirección General de Minería</h1>
      <p>Gobierno de la República Dominicana</p>
      <p>RNC: 4-01-03720-3 &nbsp;·&nbsp; Tel: 809-685-8191</p>
      <p>info@mineria.gob.do &nbsp;·&nbsp; www.mineria.gob.do</p>
    </div>
    <div class="header-right">
      <strong>Código: ${empleado.NumeroRH || '—'}</strong>
      <span>Fecha: ${hoy}</span>
    </div>
  </div>

  <!-- TÍTULO -->
  <div class="doc-titulo">Expediente del Empleado</div>

  <!-- DATOS PERSONALES -->
  <div class="seccion">
    <div class="seccion-titulo">Datos Personales</div>
    <div class="seccion-grid">
      <div class="campo"><label>Nombre:</label><span>${empleado.Nombre || '—'}</span></div>
      <div class="campo"><label>Apellidos:</label><span>${empleado.Apellidos || '—'}</span></div>
      <div class="campo"><label>Cédula:</label><span>${empleado.Cedula || '—'}</span></div>
      <div class="campo"><label>Sexo:</label><span>${empleado.Sexo || '—'}</span></div>
      <div class="campo"><label>Fecha Nacimiento:</label><span>${formatFecha(empleado.FechaNacimiento)}</span></div>
      <div class="campo"><label>Edad:</label><span>${empleado.Edad || '—'} años</span></div>
      <div class="campo"><label>Teléfono:</label><span>${empleado.NumeroTelefonico || '—'}</span></div>
      <div class="campo"><label>Correo:</label><span>${empleado.Correo || '—'}</span></div>
    </div>
  </div>

  <!-- DATOS LABORALES -->
  <div class="seccion">
    <div class="seccion-titulo">Datos Laborales</div>
    <div class="seccion-grid">
      <div class="campo"><label>Número RH:</label><span>${empleado.NumeroRH || '—'}</span></div>
      <div class="campo"><label>Expediente:</label><span>${empleado.Expediente || '—'}</span></div>
      <div class="campo"><label>Fecha Ingreso:</label><span>${formatFecha(empleado.FechaIngreso)}</span></div>
      <div class="campo"><label>Fecha Salida:</label><span>${formatFecha(empleado.FechaSalida)}</span></div>
      <div class="campo"><label>Grupo Ocupacional:</label><span>${empleado.GrupoOcupacional || '—'}</span></div>
      <div class="campo"><label>Estatus:</label><span>${empleado.Estatus || '—'}</span></div>
      <div class="campo"><label>AFP:</label><span>${empleado.AFP || '—'}</span></div>
      <div class="campo"><label>ARS:</label><span>${empleado.ARS || '—'}</span></div>
      <div class="campo"><label>Vacaciones:</label><span>${empleado.Vacaciones || '0'} días</span></div>
      <div class="campo"><label>Licencias Médicas:</label><span>${empleado.LicenciasMedicas || '0'} días</span></div>
      <div class="campo"><label>Faltas:</label><span>${empleado.Faltas || '0'}</span></div>
    </div>
  </div>

  <!-- CARGOS Y SALARIOS -->
  <div class="seccion">
    <div class="seccion-titulo">Cargos y Salarios</div>
    <div class="seccion-grid">
      <div class="campo"><label>Cargo Inicial:</label><span>${empleado.CargoInicial || '—'}</span></div>
      <div class="campo"><label>Salario Inicial:</label><span>${formatSalario(empleado.SalarioInicial)}</span></div>
      <div class="campo"><label>Cargo Actual:</label><span>${empleado.CargoActual || '—'}</span></div>
      <div class="campo"><label>Salario Actual:</label><span>${formatSalario(empleado.SalarioActual)}</span></div>
      <div class="campo"><label>Itinerario:</label><span>${empleado.Itinerario || '—'}</span></div>
      <div class="campo"><label>Salario Itinerario:</label><span>${formatSalario(empleado.SalarioItinerario)}</span></div>
      <div class="campo"><label></label><span></span></div>
    </div>
  </div>

  <!-- SALARIO TOTAL -->
  <div class="salario-total">
    <label>Salario Total</label>
    <span>${formatSalario(empleado.SalarioTotal)}</span>
  </div>

  <!-- OBSERVACIONES -->
  <div class="observaciones">
    <label>Observaciones:</label>
  </div>

  <!-- FIRMAS -->
  <div class="firmas-section">
    <div class="firma-bloque">
      <div class="firma-espacio"></div>
      <div class="firma-nombre">Supervisor</div>
      <div class="firma-cargo">Departamento de RRHH</div>
    </div>
    <div class="firma-bloque">
      <div class="firma-espacio"></div>
      <div class="firma-nombre">Director General</div>
      <div class="firma-cargo">Dirección General de Minería</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="doc-footer">
    Documento generado electrónicamente &nbsp;·&nbsp; Sistema de RRHH &nbsp;·&nbsp; Dirección General de Minería &nbsp;·&nbsp; ${new Date().toLocaleString('es-DO')}
  </div>

</body>
</html>`;
};

const generarCartaTrabajoHTML = (empleado) => {

  /* ====== FECHA LEGAL EN LETRAS ====== */
  const fecha = new Date();
  const dia = fecha.getDate();
  const mes = fecha.toLocaleDateString('es-DO', { month: 'long' });
  const anio = fecha.getFullYear();

  const diasLetras = [
    '', 'uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez',
    'once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte',
    'veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve','treinta','treinta y uno'
  ];

  const anioLetras = (y)=>{
    if(y===2024) return 'dos mil veinticuatro';
    if(y===2025) return 'dos mil veinticinco';
    if(y===2026) return 'dos mil veintiséis';
    if(y===2027) return 'dos mil veintisiete';
    if(y===2028) return 'dos mil veintiocho';
    if(y===2029) return 'dos mil veintinueve';
    if(y===2030) return 'dos mil treinta';
    return y;
  };

  const fechaLegal = `a los ${diasLetras[dia]} (${dia}) días del mes de ${mes} del año ${anioLetras(anio)} (${anio})`;

  /* ====== LOGO ====== */
  const logoHTML = logoBase64
    ? `<img src="${logoBase64}" style="height:210px;" />`
    : '';

  /* ====== FOOTER ====== */
  const footerHTML = footerBase64
  ? `<img src="${footerBase64}" style="width:100%; display:block;" />`
  : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>

  body{
    font-family: "Cambria Math", Cambria, serif;
    background:white;
    margin:0;
    padding:0;
    color:#000;
  }

  /* CONTENEDOR */
  .page{
    max-width:560px;
    margin:0 auto;
    padding:80px 70px 180px; /* espacio extra para footer */
    text-align:center;
  }

  .logo{
    margin-bottom:75px;
  }

  .titulo{
    font-size:16px;
    font-weight:bold;
    margin-bottom:30px;
  }

  /* TEXTO JUSTIFICADO PERO BLOQUE CENTRADO */
  .texto{
    font-size:14.5px;
    line-height:1.35;
    text-align:justify;
    margin:0 auto 20px;
  }

  .firma{
    margin-top:60px;
    text-align:center;
    font-size:14.5px;
  }

  .firma strong{
    font-size:15px;
  }

  .ref{
    max-width:560px;
    margin:40px auto 0;
    font-size:12px;
    text-align:left;
  }

  /* FOOTER INSTITUCIONAL */
  .footer{
    position:fixed;
    bottom:0;
    left:0;
    width:100%;
  }

</style>
</head>

<body>

<div class="page">

  <div class="logo">${logoHTML}</div>

  <div class="titulo">A QUIEN PUEDA INTERESAR</div>

  <div class="texto">
    Hacemos constar que el señor <strong>${empleado.Nombre} ${empleado.Apellidos}</strong>,
    portador de la Cédula de Identidad y Electoral No. <strong>${empleado.Cedula}</strong>,
    es servidor público de esta Dirección General de Minería, devengando un salario de
    <strong>RD$${Number(empleado.SalarioActual || 0).toLocaleString('es-DO',{minimumFractionDigits:2})}</strong>
    desde el <strong>${formatFecha(empleado.FechaIngreso)}</strong> hasta la fecha,
    desempeñando el cargo de <strong>${empleado.CargoActual}</strong>.
  </div>

  <div class="texto">
    Dada en Santo Domingo de Guzmán, Distrito Nacional, Capital de la República Dominicana,
    a solicitud del Sr. <strong>${empleado.Nombre} ${empleado.Apellidos}</strong>,
    en calidad de servidor público, ${fechaLegal}.
  </div>

  <div class="firma">
    Atentamente,<br><br><br>
    <strong>Petra María Cruz Acosta.</strong><br>
    Enc. De Recursos Humanos
  </div>


</div>

<div class="footer">
  ${footerHTML}
</div>

</body>
</html>
`;
};
// ─── CONSTANCIAS ──────────────────────────────────────────────────────────────
const generarConstanciaHTML = (empleado, tipo = 'trabajo') => {
  if (tipo === 'expediente') return generarExpedienteHTML(empleado);
  if (tipo === 'carta') return generarCartaTrabajoHTML(empleado);

  const hoy = new Date().toLocaleDateString('es-DO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const formatSal = (s) =>
    `RD$ ${Number(s || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

  const logoHTML = logoBase64
    ? `<img src="${logoBase64}" style="height:70px;width:auto;object-fit:contain;" />`
    : '';

  const textos = {
    trabajo: {
      titulo: 'CONSTANCIA DE TRABAJO',
      cuerpo: `Por medio de la presente, hacemos constar que el/la ciudadano/a 
        <strong>${empleado.Nombre} ${empleado.Apellidos}</strong>, 
        portador/a de la Cédula No. <strong>${empleado.Cedula}</strong>, 
        labora en nuestra institución en el cargo de 
        <strong>${empleado.CargoActual || 'No especificado'}</strong>, 
        desde el <strong>${formatFecha(empleado.FechaIngreso)}</strong>, 
        devengando un salario de <strong>${formatSal(empleado.SalarioActual)}</strong>.`
    },
    salario: {
      titulo: 'CONSTANCIA DE SALARIO',
      cuerpo: `Por medio de la presente, hacemos constar que el/la ciudadano/a 
        <strong>${empleado.Nombre} ${empleado.Apellidos}</strong>, 
        portador/a de la Cédula No. <strong>${empleado.Cedula}</strong>, 
        ocupa el cargo de <strong>${empleado.CargoActual || 'No especificado'}</strong>, 
        recibiendo un salario mensual de <strong>${formatSal(empleado.SalarioActual)}</strong>,
        para un salario total de <strong>${formatSal(empleado.SalarioTotal)}</strong>.`
    },
    residencia: {
      titulo: 'CONSTANCIA DE BUENOS OFICIOS',
      cuerpo: `Por medio de la presente, hacemos constar que el/la ciudadano/a 
        <strong>${empleado.Nombre} ${empleado.Apellidos}</strong>, 
        portador/a de la Cédula No. <strong>${empleado.Cedula}</strong>, 
        labora con nosotros desde el <strong>${formatFecha(empleado.FechaIngreso)}</strong>, 
        siendo una persona de buenos oficios y excelente conducta.`
    }
  };

  const { titulo, cuerpo } = textos[tipo] || textos.trabajo;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, serif; color: #1a1a2e; background: white; padding: 60px; font-size: 14px; line-height: 1.8; }
    .documento { max-width: 720px; margin: 0 auto; border: 2px solid #0f1e3d; padding: 50px; position: relative; min-height: 900px; display: flex; flex-direction: column; }
    .corner { position: absolute; width: 28px; height: 28px; border-color: #3b82f6; border-style: solid; }
    .corner-tl { top: 10px; left: 10px; border-width: 2px 0 0 2px; }
    .corner-tr { top: 10px; right: 10px; border-width: 2px 2px 0 0; }
    .corner-bl { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; }
    .corner-br { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; }
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 3px solid #0f1e3d; margin-bottom: 32px; }
    .empresa h1 { font-size: 20px; color: #0f1e3d; font-weight: 700; }
    .empresa p { color: #64748b; font-size: 12px; margin-top: 4px; }
    .doc-titulo { text-align: center; margin-bottom: 32px; }
    .doc-titulo h2 { font-size: 18px; color: #0f1e3d; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; }
    .lineas { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 8px; }
    .linea-bar { height: 2px; width: 60px; background: #3b82f6; }
    .ref { text-align: right; font-size: 12px; color: #94a3b8; margin-bottom: 24px; }
    .cuerpo { flex: 1; font-size: 15px; line-height: 2; color: #334155; text-align: justify; }
    .cuerpo p { margin-bottom: 20px; }
    .datos-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px 24px; border-radius: 0 8px 8px 0; margin: 28px 0; }
    .datos-box h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 12px; }
    .datos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .dato { font-size: 13px; }
    .dato span { color: #64748b; }
    .dato strong { color: #1e293b; }
    .cierre { font-size: 15px; line-height: 2; color: #334155; text-align: justify; margin-bottom: 60px; }
    .firma-section { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }
    .firma-bloque { text-align: center; min-width: 200px; }
    .firma-linea { border-top: 1.5px solid #0f1e3d; padding-top: 8px; font-size: 13px; color: #1e293b; font-weight: 600; }
    .firma-cargo { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="documento">
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>
    <div class="header">
      <div class="empresa">
        <h1>Dirección General de Minería</h1>
        <p>Gobierno de la República Dominicana</p>
        <p>RNC: 4-01-03720-3 · Tel: 809-685-8191</p>
        <p>Santo Domingo, República Dominicana</p>
      </div>
      ${logoHTML}
    </div>
    <div class="doc-titulo">
      <h2>${titulo}</h2>
      <div class="lineas"><div class="linea-bar"></div><div class="linea-bar"></div></div>
    </div>
    <div class="ref">Ref: RRHH-${String(empleado.Id).padStart(4,'0')}-${new Date().getFullYear()} &nbsp;|&nbsp; Fecha: ${hoy}</div>
    <div class="cuerpo">
      <p>A quien pueda interesar:</p>
      <p>${cuerpo}</p>
      <div class="datos-box">
        <h4>Datos del Empleado</h4>
        <div class="datos-grid">
          <div class="dato"><span>N° RH: </span><strong>${empleado.NumeroRH || '—'}</strong></div>
          <div class="dato"><span>Cédula: </span><strong>${empleado.Cedula}</strong></div>
          <div class="dato"><span>Cargo: </span><strong>${empleado.CargoActual || '—'}</strong></div>
          <div class="dato"><span>Estatus: </span><strong>${empleado.Estatus}</strong></div>
          <div class="dato"><span>AFP: </span><strong>${empleado.AFP || '—'}</strong></div>
          <div class="dato"><span>ARS: </span><strong>${empleado.ARS || '—'}</strong></div>
        </div>
      </div>
    </div>
    <div class="cierre">
      <p>La presente constancia se expide a solicitud de la parte interesada, para los fines que estime conveniente.</p>
      <p>Dado en Santo Domingo, República Dominicana, a los ${hoy}.</p>
    </div>
    <div class="firma-section">
      <div class="firma-bloque"><div class="firma-linea">Recursos Humanos</div><div class="firma-cargo">Departamento de RRHH</div></div>
      <div class="firma-bloque"><div class="firma-linea">Director General</div><div class="firma-cargo">Dirección General de Minería</div></div>
    </div>
    <div class="footer">Documento generado electrónicamente · Sistema RRHH · Dirección General de Minería · ${new Date().toLocaleString('es-DO')}</div>
  </div>
</body>
</html>`;
};

module.exports = { generarConstanciaHTML };