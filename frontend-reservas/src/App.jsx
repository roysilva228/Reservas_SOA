// src/App.jsx

import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ReservaPage from './pages/ReservaPage';
import MisReservasPage from './pages/MisReservasPage';
import CheckoutPage from './pages/CheckoutPage'; // Asegúrate de que esta ruta exista
// --- Imports de Admin ---
import AdminRoute from './components/AdminRoute';
import DashboardPage from './pages/admin/DashboardPage';
import GestionarSedesPage from './pages/admin/GestionarSedesPage';
import GestionarCanchasPage from './pages/admin/GestionarCanchasPage'; 
import GenerarHorariosPage from './pages/admin/GenerarHorariosPage';

// Importa el hook de autenticación
import { useAuth } from './context/AuthContext.jsx'; 

function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      {/* ----- Menú de Navegación Inteligente ----- */}
      <nav className="flex items-center justify-between bg-gray-800 p-4 text-white">
        {/* Lado Izquierdo */}
        <div>
          <Link to="/" className="mr-4 text-xl font-bold hover:text-blue-400">CanchaApp</Link>
          <Link to="/" className="mr-4 hover:text-blue-400">Canchas</Link>
          
          {/* Enlace a Mis Reservas - AHORA AQUÍ EN LA NAVEGACIÓN */}
          {user && (
            <Link to="/mis-reservas" className="mr-4 hover:text-blue-400">Mis Reservas</Link>
          )}

          {user && user.rol === 'admin' && (
            <Link to="/admin" className="mr-4 rounded bg-yellow-500 px-3 py-1 font-bold text-gray-900 hover:bg-yellow-400">
              PANEL ADMIN
            </Link>
          )}
        </div>

        {/* Lado Derecho (Condicional) */}
        <div>
          {user ? (
            <div className="flex items-center">
              <span className="mr-4">Hola, {user.sub} ({user.rol})</span>
              <button
                onClick={handleLogout}
                className="rounded bg-red-500 px-3 py-1 hover:bg-red-600"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <Link to="/login" className="rounded bg-blue-500 px-3 py-1 hover:text-blue-600">
              Login
            </Link>
          )}
        </div>
      </nav>

      {/* ----- Definición de las Rutas ----- */}
      <Routes>
        {/* --- Rutas Públicas (INCLUYE MIS RESERVAS Y CHECKOUT) --- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reservar/:id_cancha" element={<ReservaPage />} />
        <Route path="/checkout/:id_horario" element={<CheckoutPage />} /> 
        
        {/* AHORA ES UNA RUTA PÚBLICA NORMAL, FUERA DEL BLOQUE ADMIN */}
        <Route path="/mis-reservas" element={<MisReservasPage />} /> 

        {/* --- Ruta Protegida de Admin --- */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<DashboardPage />} />
          <Route path="gestionar-sedes" element={<GestionarSedesPage />} />
          <Route path="gestionar-canchas" element={<GestionarCanchasPage />} />
          <Route path="generar-horarios" element={<GenerarHorariosPage />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App