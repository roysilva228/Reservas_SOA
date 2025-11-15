// src/pages/admin/DashboardPage.jsx
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">
        Panel de Administración
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Bienvenido, Admin. Desde aquí podrás gestionar el sitio.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* --- ¡AQUÍ ESTÁ LA CORRECCIÓN! --- */}
        {/* Convertimos la tarjeta en un enlace a la nueva página */}
        <Link 
          to="/admin/gestionar-sedes" 
          className="block bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-2xl font-semibold mb-2 text-blue-600">Gestionar Sedes</h2>
          <p>Crear, editar o eliminar sedes.</p>
        </Link>
        {/* --- FIN DE LA CORRECCIÓN --- */}

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold mb-2">Gestionar Canchas</h2>
          <p>Añadir nuevas canchas a las sedes.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold mb-2">Generar Horarios</h2>
          <p>Abrir la agenda de disponibilidad.</p>
        </div>
      </div>
    </div>
  );
}