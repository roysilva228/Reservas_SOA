// src/App.jsx

import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ReservaPage from './pages/ReservaPage';

// --- 1. Importa el Bouncer y el Dashboard ---
import AdminRoute from './components/AdminRoute';
import DashboardPage from './pages/admin/DashboardPage';
// --- ¡AQUÍ FALTABA ESTE IMPORT! ---
import GestionarSedesPage from './pages/admin/GestionarSedesPage';

// Importa el hook de autenticación
import { useAuth } from './context/AuthContext.jsx'; // (Asegúrate de que esta ruta sea correcta, ej. ../context/AuthContext.jsx)

function App() {
  // Trae el 'user' y la función 'logout' del bolsillo
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Función de "Logout" para el botón
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
        {/* --- Rutas Públicas --- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reservar/:id_cancha" element={<ReservaPage />} />

        {/* --- Ruta Protegida de Admin --- */}
        <Route path="/admin" element={<AdminRoute />}>
          {/* La ruta "hija" (índice) es el Dashboard */}
          <Route index element={<DashboardPage />} />
          
          {/* --- ¡AQUÍ FALTABA ESTA RUTA! --- */}
          <Route path="gestionar-sedes" element={<GestionarSedesPage />} />
          {/* Próximamente: <Route path="gestionar-canchas" element={<... />} /> */}
        </Route>
        
      </Routes>
    </div>
  )
}

export default App