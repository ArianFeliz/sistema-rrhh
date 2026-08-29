import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Dashboard = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, activos: 0, inactivos: 0, tasa: 0 });
  const [ultimosEmpleados, setUltimosEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await api.get('/empleados');
        const activos = data.empleados.filter(e => e.Estatus === 'Activo').length;
        const total = data.total;
        setStats({
          total,
          activos,
          inactivos: total - activos,
          tasa: total === 0 ? 0 : Math.round((activos / total) * 100),
        });
        setUltimosEmpleados(data.empleados.slice(0, 8));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const fecha = new Date().toLocaleDateString('es-DO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const cards = [
    {
      label: 'Total Empleados', valor: stats.total, color: '#3b82f6', bg: '#eff6ff',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      )
    },
    {
      label: 'Activos', valor: stats.activos, color: '#10b981', bg: '#f0fdf4',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      )
    },
    {
      label: 'Inactivos', valor: stats.inactivos, color: '#ef4444', bg: '#fef2f2',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      )
    },
    {
      label: 'Tasa Actividad', valor: `${stats.tasa}%`, color: '#8b5cf6', bg: '#f5f3ff',
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      )
    },
  ];

  const estatusStyle = (estatus) => {
    const map = {
      'Activo':     { bg: '#f0fdf4', color: '#10b981' },
      'Inactivo':   { bg: '#fef2f2', color: '#ef4444' },
      'Suspendido': { bg: '#fff7ed', color: '#f97316' },
      'Vacaciones': { bg: '#eff6ff', color: '#3b82f6' },
    };
    return map[estatus] || { bg: '#f1f5f9', color: '#64748b' };
  };

  return (
    <div style={s.pagina}>
      <Navbar />

      <div style={s.contenido}>

        {/* Header */}
        <div style={s.header} className="anim-fade-up">
          <div>
            <p style={s.fechaText}>{fecha}</p>
            <h2 style={s.titulo}>Bienvenido, {admin?.nombre?.split(' ')[0]} </h2>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={s.cardsGrid}>
          {cards.map((c, i) => (
            <div
              key={c.label}
              className="anim-fade-up"
              style={{
                ...s.card,
                animationDelay: `${i * 80}ms`,
                cursor: i === 0 ? 'pointer' : 'default',
              }}
              onClick={() => i === 0 ? navigate('/empleados') : null}
            >
              <div style={{...s.cardIconBox, backgroundColor: c.bg}}>
                {c.icon}
              </div>
              <div style={s.cardBody}>
                <p style={s.cardLabel}>{c.label}</p>
                <p style={{...s.cardValor, color: loading ? '#ccc' : c.color}}>
                  {loading ? '...' : c.valor}
                </p>
              </div>
              <div style={{...s.cardAccent, backgroundColor: c.color}} />
            </div>
          ))}
        </div>

        {/* Panel empleados ancho completo */}
        <div style={s.panel} className="anim-fade-up">
          <div style={s.panelHeader}>
            <h3 style={s.panelTitulo}>Últimos Empleados Registrados</h3>
            <button style={s.panelBtn} onClick={() => navigate('/empleados')}>
              Ver todos →
            </button>
          </div>

          {loading ? (
            <p style={s.empty}>Cargando...</p>
          ) : ultimosEmpleados.length === 0 ? (
            <p style={s.empty}>No hay empleados registrados aún.</p>
          ) : (
            <table style={s.tabla}>
              <thead>
                <tr>
                  {['N° RH', 'Empleado', 'Cédula', 'Cargo Actual', 'Itinerario', 'Salario Actual', 'Estatus', ''].map(col => (
                    <th key={col} style={s.th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ultimosEmpleados.map((emp, i) => {
                  const est = estatusStyle(emp.Estatus);
                  return (
                    <tr key={emp.Id} style={i % 2 === 0 ? s.trPar : s.trImpar}>
                      <td style={s.td}>
                        <span style={s.numeroRH}>{emp.NumeroRH || '—'}</span>
                      </td>
                      <td style={s.td}>
                        <div style={s.empCell}>
                          <div style={s.empAvatar}>
                            {emp.Nombre?.charAt(0)}{emp.Apellidos?.charAt(0)}
                          </div>
                          <div>
                            <div style={s.empNombre}>{emp.Nombre} {emp.Apellidos}</div>
                            <div style={s.empSub}>{emp.Correo || 'Sin correo'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>{emp.Cedula || '—'}</td>
                      <td style={s.td}>{emp.CargoActual || '—'}</td>
                      <td style={s.td}>{emp.Itinerario || '—'}</td>
                      <td style={s.td}>
                        {emp.SalarioActual
                          ? `RD$ ${Number(emp.SalarioActual).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td style={s.td}>
                        <span style={{...s.badge, backgroundColor: est.bg, color: est.color}}>
                          {emp.Estatus}
                        </span>
                      </td>
                      <td style={s.td}>
                        <button style={s.btnVer} onClick={() => navigate('/empleados')}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Av. México, esq. Leopoldo Navarro, Gazcue,<br/>Santo Domingo, República Dominicana.</span>
          </div>
          <div style={s.footerDivider} />
          <div style={s.footerItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
            </svg>
            <span>809-685-8191</span>
          </div>
          <div style={s.footerDivider} />
          <div style={s.footerItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>info@mineria.gob.do</span>
          </div>
          <div style={s.footerDivider} />
          <div style={s.footerItem}>
            <span style={{fontWeight:'700'}}>RNC:</span>
            <span>4-01-03720-3</span>
          </div>
          <div style={s.footerDivider} />
          <div style={s.footerItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
            <span>www.mineria.gob.do</span>
          </div>
          <div style={s.footerDivider} />
          <div style={s.footerItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
            <span>@mineriard</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

const s = {
  pagina: {
    minHeight: '100vh', width: '100%',
    backgroundColor: 'var(--bg)',
    display: 'flex', flexDirection: 'column',
  },
  contenido: {
    padding: '36px 40px',
    width: '100%',
    flex: 1,
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '32px',
  },
  fechaText: {
    fontSize: '13px', color: 'var(--text-muted)',
    textTransform: 'capitalize', marginBottom: '4px',
  },
  titulo: {
    fontSize: '28px', fontWeight: '800',
    color: 'var(--navy)', letterSpacing: '-0.5px',
    marginBottom: '-12px',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px', marginBottom: '28px',
  },
  card: {
    backgroundColor: 'white', borderRadius: 'var(--radius-lg)',
    padding: '24px', boxShadow: 'var(--shadow-sm)',
    display: 'flex', alignItems: 'center', gap: '16px',
    position: 'relative', overflow: 'hidden',
    border: '1px solid var(--border)',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  cardIconBox: {
    width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: '13px', color: 'var(--text-soft)', marginBottom: '4px', fontWeight: '500' },
  cardValor: { fontSize: '32px', fontWeight: '800', lineHeight: 1, letterSpacing: '-1px' },
  cardAccent: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: '4px', borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
  },
  panel: {
    backgroundColor: 'white', borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 24px', borderBottom: '1px solid var(--border)',
  },
  panelTitulo: { fontSize: '15px', fontWeight: '700', color: 'var(--navy)' },
  panelBtn: {
    background: 'none', border: 'none', color: 'var(--accent)',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
  empty: { padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' },

  tabla: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px', textAlign: 'left', fontSize: '12px',
    fontWeight: '700', color: 'white', backgroundColor: '#0f1e3d',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  td: { padding: '14px 16px', fontSize: '13px', color: 'var(--text)', verticalAlign: 'middle' },
  trPar: { backgroundColor: 'white' },
  trImpar: { backgroundColor: '#f8fafc' },

  empCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  empAvatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    backgroundColor: 'var(--navy)', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700', flexShrink: 0,
  },
  empNombre: { fontSize: '13px', fontWeight: '700', color: 'var(--text)' },
  empSub: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' },

  numeroRH: {
    fontSize: '12px', fontWeight: '700', color: '#0f1e3d',
    backgroundColor: '#e8edf5', padding: '3px 8px', borderRadius: '6px',
  },
  badge: {
    padding: '4px 10px', borderRadius: '99px',
    fontSize: '12px', fontWeight: '600',
  },
  btnVer: {
    padding: '6px 14px', borderRadius: '6px', border: 'none',
    backgroundColor: '#0f1e3d', color: 'white',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
  },

  footer: {
    backgroundColor: '#0f1e3d',
    color: 'white',
    width: '100%',
    marginTop: 'auto',
  },
  footerInner: {
    display: 'flex', alignItems: 'center',
    flexWrap: 'wrap', padding: '14px 32px',
    justifyContent: 'space-between',
  },
  footerItem: {
    display: 'flex', alignItems: 'center',
    gap: '8px', fontSize: '12px',
    color: 'rgba(255,255,255,0.85)', padding: '6px 0',
  },
  footerDivider: {
    width: '1px', height: '32px',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
};

export default Dashboard;