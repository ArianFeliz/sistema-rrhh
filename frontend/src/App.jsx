import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AutoLogout from './components/AutoLogout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Empleados from './pages/Empleados';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
         
<Route path="/dashboard" element={
  <ProtectedRoute>
    <div>
      <AutoLogout />
      <Dashboard />
    </div>
  </ProtectedRoute>
} />

         
          <Route path="/empleados" element={
            <ProtectedRoute>
              <Empleados />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;