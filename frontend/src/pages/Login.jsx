import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';

const Login = () => {
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.admin);
      toast.success(`Bienvenido, ${data.admin.nombre}`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      {/* Panel izquierdo decorativo */}
      <div style={s.panel}>
        <div style={s.panelInner}>
          <div style={s.logoMarca}>
  <img src={logo} alt="Logo" style={s.logoImgLogin} />
</div>
          <h1 style={s.panelTitle}>Gestión de Recursos Humanos</h1>
          <p style={s.panelSub}>
            Administra tu equipo de trabajo de forma eficiente, segura y profesional.
          </p>
          <div style={s.features}>
            {['Registro completo de empleados','Búsqueda y filtros en tiempo real','Generación de constancias PDF','Control de cargos y salarios'].map(f => (
              <div key={f} style={s.featureItem}>
                <span style={s.featureCheck}>✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Decoración geométrica */}
        <div style={s.geo1} />
        <div style={s.geo2} />
        <div style={s.geo3} />
      </div>

      {/* Panel derecho — Formulario */}
      <div style={s.formPanel}>
        <div style={s.formCard} className="anim-scale">
          <div style={s.formTop}>
            <h2 style={s.formTitle}>Iniciar Sesión</h2>
            <p style={s.formSub}>Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.campo}>
              <label style={s.label}>Usuario</label>
              <div style={s.inputWrap}>
                <input
                  type="text"
                  name="usuario"
                  value={form.usuario}
                  onChange={handleChange}
                  placeholder="Ingresa tu usuario"
                  style={s.input}
                  required
                />
              </div>
            </div>

            <div style={s.campo}>
              <label style={s.label}>Contraseña</label>
              <div style={s.inputWrap}>
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Ingresa tu contraseña"
                  style={{...s.input, paddingRight: '48px'}}
                  required
                />
<button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>
  {showPass ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )}
</button>
              </div>
            </div>

            <button type="submit" style={s.btnSubmit} disabled={loading}>
              {loading ? (
                <span style={s.loadingRow}>
                  <span style={s.spinner} /> Iniciando sesión...
                </span>
              ) : 'Iniciar Sesión →'}
            </button>
          </form>

          <p style={s.footer}>Sistema de Recursos Humanos © 2026</p>
        </div>
      </div>
    </div>
  );
};

const s = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
  },
  // Panel izquierdo
  panel: {
    flex: '0 0 45%',
    backgroundColor: 'var(--navy)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    padding: '60px',
  },
  panelInner: { position: 'relative', zIndex: 2 },
  logoMarca: {
    display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px',
  },
  logoIcon: { fontSize: '32px' },
  logoText: {
    fontSize: '20px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px',
  },
  panelTitle: {
    fontSize: '36px', fontWeight: '800', color: 'white',
    lineHeight: 1.2, marginBottom: '6px', letterSpacing: '-0.5px',
  },
  panelSub: {
    fontSize: '16px', color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.7, marginBottom: '30px', maxWidth: '100%',
  },
  features: { display: 'flex', flexDirection: 'column', gap: '14px' },
  featureItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    color: 'rgba(255,255,255,0.85)', fontSize: '15px',
  },
  featureCheck: {
    width: '22px', height: '22px', borderRadius: '50%',
    backgroundColor: 'rgba(59,130,246,0.3)', color: '#60a5fa',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700', flexShrink: 0,
  },
  // Geometría decorativa
  geo1: {
    position: 'absolute', width: '300px', height: '300px',
    borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)',
    top: '-80px', right: '-80px',
  },
  geo2: {
    position: 'absolute', width: '200px', height: '200px',
    borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)',
    bottom: '60px', right: '20px',
  },
  geo3: {
    position: 'absolute', width: '120px', height: '120px',
    borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.08)',
    bottom: '200px', left: '-40px',
  },
  // Panel derecho
  formPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    backgroundColor: 'var(--bg)',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 'var(--radius-xl)',
    padding: '48px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: 'var(--shadow-lg)',
  },
  formTop: { marginBottom: '36px' },
  formTitle: {
    fontSize: '26px', fontWeight: '800',
    color: 'var(--navy)', marginBottom: '6px', letterSpacing: '-0.5px',
  },
  formSub: { color: 'var(--text-soft)', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '22px' },
  campo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '700', color: 'var(--text)', letterSpacing: '0.3px' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: {
    position: 'absolute', left: '14px', fontSize: '16px', zIndex: 1,
  },
    input: {
  width: '100%', padding: '13px 14px', // quita el padding izquierdo grande
  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
  fontSize: '15px', outline: 'none', color: 'var(--text)',
  transition: 'border-color 0.2s',
  backgroundColor: '#fafbfc',

  },
  eyeBtn: {
    position: 'absolute', right: '12px', background: 'none',
    border: 'none', fontSize: '16px', cursor: 'pointer', padding: '4px',
  },
  btnSubmit: {
    width: '100%', padding: '15px',
    backgroundColor: 'var(--navy)', color: 'white',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontSize: '16px', fontWeight: '700', cursor: 'pointer',
    marginTop: '8px', letterSpacing: '0.3px',
    transition: 'background 0.2s',
  },
  loadingRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  spinner: {
    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  footer: {
    textAlign: 'center', color: 'var(--text-muted)',
    fontSize: '12px', marginTop: '32px',
  },
  logoImgLogin: {
  height: '150px',
  width: 'auto',
  objectFit: 'contain',
},
};

export default Login;