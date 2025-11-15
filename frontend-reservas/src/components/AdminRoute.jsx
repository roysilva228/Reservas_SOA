// src/components/AdminRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminRoute() {
  const { user, token } = useAuth();

  // 1. ¿Está logueado Y el token existe?
  if (!user || !token) {
    // Si no está logueado, lo botamos al Login
    return <Navigate to="/login" replace />;
  }

  // 2. ¿Es admin?
  if (user.rol !== 'admin') {
    // Si está logueado pero NO es admin, lo botamos a la página de inicio
    return <Navigate to="/" replace />;
  }

  // 3. ¡Es admin! Lo dejamos pasar.
  // <Outlet /> es el comando de React Router para "renderizar la página que esté adentro"
  return <Outlet />;
}