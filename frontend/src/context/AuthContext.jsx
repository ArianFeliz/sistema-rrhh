import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 🔥 CARGAR DESDE EL INICIO + BLOQUEO
  const [admin, setAdmin] = useState(() => {
    const token = sessionStorage.getItem('token');
    const savedAdmin = sessionStorage.getItem('admin');
    const bloqueado = sessionStorage.getItem('bloqueado');

    // 🔥 SI ESTÁ BLOQUEADO → NO DEJAR ENTRAR
    if (bloqueado === 'true') return null;

    return token && savedAdmin ? JSON.parse(savedAdmin) : null;
  });

  const login = (token, adminData) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('admin', JSON.stringify(adminData));
    sessionStorage.removeItem('bloqueado'); // 🔥 LIMPIA BLOQUEO
    setAdmin(adminData);
  };

  const logout = () => {
    setAdmin(null); // 🔥 SOLO VISUAL (NO BORRA NADA)
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);