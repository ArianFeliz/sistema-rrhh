import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';

const Navbar = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const esActivo = (r) => location.pathname === r;

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        {/* Logo */}
        <Link to="/dashboard" style={s.logo}>
  <img src={logo} alt="Logo" style={s.logoImg} />
</Link>

        {/* Links */}
        <div style={s.links}>
          {[
            { to: '/dashboard', label: 'Dashboard' },
            { to: '/empleados', label: 'Empleados' },
          ].map(({ to, label }) => (
            <Link key={to} to={to} style={{
              ...s.link,
              ...(esActivo(to) ? s.linkActivo : {}),
            }}>
              {label}
              {esActivo(to) && <div style={s.linkDot} />}
            </Link>
          ))}
        </div>

        {/* Usuario */}
        <div style={s.right}>
          <div style={s.adminChip}>
            <div style={s.avatar}>
              {admin?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div style={s.adminTexts}>
              <span style={s.adminNombre}>{admin?.nombre}</span>
              <span style={s.adminRol}>Administrador</span>
            </div>
          </div>

          <button onClick={handleLogout} style={s.btnLogout} title="Cerrar sesión">
            ⏏ Salir
          </button>
        </div>
      </div>
    </nav>
  );
};

const s = {
  nav: {
  position: 'sticky', top: 0, zIndex: 100,
  backgroundColor: 'var(--navy)',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
  width: '100%',  // 👈 agrega esto
},
inner: {
  width: '100%',
  display: 'flex', alignItems: 'center',
  padding: '0 24px', height: '85px', gap: '32px',
},
  logo: {
    display: 'flex', alignItems: 'center',
    gap: '10px', textDecoration: 'none', marginRight: '8px',
  },
  logoImg: {
  height: '80px',
  width: 'auto',
  objectFit: 'contain',
  filter: 'brightness(0) invert(1)', // lo pone blanco para que se vea en el fondo azul
},
  links: { display: 'flex', gap: '4px', flex: 1 },
  link: {
    position: 'relative',
    color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
    fontSize: '14px', fontWeight: '600', padding: '8px 14px',
    borderRadius: 'var(--radius-sm)', transition: 'all 0.2s',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
  },
  linkActivo: {
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  linkDot: {
    width: '4px', height: '4px', borderRadius: '50%',
    backgroundColor: 'var(--accent)',
  },
  right: { display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' },
  adminChip: {
    display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: 'rgba(255,255,255,0.07)',
    padding: '7px 14px 7px 8px', borderRadius: '99px',
  },
  avatar: {
    width: '30px', height: '30px', borderRadius: '50%',
    backgroundColor: 'var(--accent)', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: '800',
  },
  adminTexts: { display: 'flex', flexDirection: 'column' },
  adminNombre: { fontSize: '13px', fontWeight: '700', color: 'white', lineHeight: 1.2 },
  adminRol: { fontSize: '11px', color: 'rgba(255,255,255,0.45)' },
  btnLogout: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5', padding: '8px 14px',
    borderRadius: 'var(--radius-sm)', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer',
  },
};

export default Navbar;