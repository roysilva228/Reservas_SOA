// src/App.jsx

import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ReservaPage from './pages/ReservaPage';
import MisReservasPage from './pages/MisReservasPage';
import CheckoutPage from './pages/CheckoutPage'; 
// --- Imports de Admin ---
import AdminRoute from './components/AdminRoute';
import DashboardPage from './pages/admin/DashboardPage';
import GestionarSedesPage from './pages/admin/GestionarSedesPage';
import GestionarCanchasPage from './pages/admin/GestionarCanchasPage'; 
import GenerarHorariosPage from './pages/admin/GenerarHorariosPage';
import ConfirmarPagosPage from './pages/admin/ConfirmarPagosPage'; // <--- IMPORTANTE: Importar la nueva página

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
      {/* ----- Menú de Navegación Mejorado ----- */}
      <nav className="flex items-center justify-between bg-gray-900 px-6 py-4 text-white shadow-lg">
        {/* Lado Izquierdo: Logo y Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 hover:from-blue-300 hover:to-green-300 transition-all">
            CanchaApp
          </Link>
          
          <div className="hidden md:flex gap-4 text-sm font-medium">
            <Link to="/" className="hover:text-blue-400 transition-colors">Canchas</Link>
            
            {user && (
              <Link to="/mis-reservas" className="hover:text-blue-400 transition-colors">Mis Reservas</Link>
            )}

            {user && user.rol === 'admin' && (
              <Link to="/admin" className="text-yellow-400 hover:text-yellow-300 font-bold transition-colors">
                PANEL ADMIN
              </Link>
            )}
          </div>
        </div>

        {/* Lado Derecho: Perfil de Usuario */}
        <div>
          {user ? (
            <div className="flex items-center gap-4">
              {/* Información del Usuario */}
              <div className="flex flex-col items-end leading-tight">
                {/* Saludo Personalizado */}
                <span className="font-bold text-gray-100 capitalize">
                  Hola, {user.nombre || user.sub}
                </span>
                
                {/* Etiqueta de Rol (Oculta para clientes normales) */}
                {user.rol !== 'cliente' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    user.rol === 'admin' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-600 text-white'
                  }`}>
                    {user.rol}
                  </span>
                )}
              </div>

              {/* Botón Salir */}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors shadow-md"
              >
                Salir
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
               <Link to="/login" className="text-gray-300 hover:text-white font-medium px-3 py-2 transition-colors">
                Ingresar
              </Link>
              <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md">
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ----- Definición de las Rutas ----- */}
      <Routes>
        {/* --- Rutas Públicas --- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reservar/:id_cancha" element={<ReservaPage />} />
        <Route path="/checkout/:id_horario" element={<CheckoutPage />} /> 
        <Route path="/mis-reservas" element={<MisReservasPage />} /> 

        {/* --- Ruta Protegida de Admin --- */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<DashboardPage />} />
          <Route path="gestionar-sedes" element={<GestionarSedesPage />} />
          <Route path="gestionar-canchas" element={<GestionarCanchasPage />} />
          <Route path="generar-horarios" element={<GenerarHorariosPage />} />
          {/* RUTA NUEVA AGREGADA: */}
          <Route path="confirmar-pagos" element={<ConfirmarPagosPage />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App