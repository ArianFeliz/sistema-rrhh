import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TIEMPO_LIMITE = 30 * 60 * 1000; // 30 minutos
const AVISO_ANTES = 1 * 60 * 1000;   // 1 minuto antes

export default function AutoLogout() {
  const navigate = useNavigate();

  const timeoutLogout = useRef(null);
  const timeoutAviso = useRef(null);

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [contador, setContador] = useState(10);

 const cerrarSesion = () => {
  sessionStorage.setItem('bloqueado', 'true');
  window.location.href = '/login'; // 🔥 reemplazo temporal
};

  const iniciarTimers = () => {
    clearTimeout(timeoutLogout.current);
    clearTimeout(timeoutAviso.current);

    timeoutAviso.current = setTimeout(() => {
      setMostrarAviso(true);
      iniciarContador();
    }, TIEMPO_LIMITE - AVISO_ANTES);

    timeoutLogout.current = setTimeout(() => {
      cerrarSesion();
    }, TIEMPO_LIMITE);
  };

  const iniciarContador = () => {
    let tiempo = 10;

    const interval = setInterval(() => {
      tiempo--;
      setContador(tiempo);

      if (tiempo <= 0) clearInterval(interval);
    }, 1000);
  };

  const resetTimer = () => {
    setMostrarAviso(false);
    setContador(10);
    iniciarTimers();
  };

  useEffect(() => {
    const eventos = ['mousedown', 'keydown', 'touchstart'];

    eventos.forEach(e => window.addEventListener(e, resetTimer));

    iniciarTimers();

    return () => {
      eventos.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(timeoutLogout.current);
      clearTimeout(timeoutAviso.current);
    };
  }, []);

  return (
    <>
      {mostrarAviso && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            width: '300px'
          }}>
            <h3>⚠️ Sesión por inactividad</h3>
            <p>Se cerrará en {contador} segundos...</p>

            <button onClick={resetTimer} style={{
              marginTop: '10px',
              padding: '8px 16px',
              border: 'none',
              background: '#29009b',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>
              Seguir activo
            </button>
          </div>
        </div>
      )}
    </>
  );
}