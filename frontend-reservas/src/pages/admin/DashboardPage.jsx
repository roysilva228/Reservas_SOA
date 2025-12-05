// src/pages/admin/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_RESERVAS } from '../../config';
import { useAuth } from '../../context/AuthContext';

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    ingresos_totales: 0,
    total_reservas: 0,
    monto_por_cobrar: 0,
    hora_punta: "..."
  });
  const [loading, setLoading] = useState(true);

  // Cargar estadísticas al entrar
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_RESERVAS}/reservas/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error("Error cargando estadísticas:", err);
        // Si falla, mantenemos los valores en 0
      } finally {
        setLoading(false);
      }
    };
    
    if (token) fetchStats();
  }, [token]);

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">Cargando panel de control...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-2">
        Panel de Administración 📊
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Bienvenido. Aquí tienes el resumen operativo de DeportivaMas.
      </p>

      {/* --- SECCIÓN DE MÉTRICAS (KPIs) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Tarjeta 1: Ingresos Totales */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ingresos Confirmados</span>
          <span className="text-3xl font-extrabold text-green-600 mt-2">
            S/. {stats.ingresos_totales.toFixed(2)}
          </span>
        </div>
        
        {/* Tarjeta 2: Por Cobrar (Alerta para el admin) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-yellow-400 flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Por Cobrar (En Sede)</span>
          <span className="text-3xl font-extrabold text-yellow-600 mt-2">
            S/. {stats.monto_por_cobrar.toFixed(2)}
          </span>
        </div>

        {/* Tarjeta 3: Total Reservas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Partidos</span>
          <span className="text-3xl font-extrabold text-blue-600 mt-2">
            {stats.total_reservas}
          </span>
        </div>

        {/* Tarjeta 4: Hora Punta */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hora Más Solicitada</span>
          <span className="text-3xl font-extrabold text-purple-600 mt-2">
            {stats.hora_punta}
          </span>
        </div>
      </div>

      {/* --- SECCIÓN DE ACCIONES RÁPIDAS --- */}
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Gestión del Negocio</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* OPCIÓN 1: GESTIONAR PAGOS (NUEVA) */}
        <Link 
          to="/admin/confirmar-pagos" 
          className="group block bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl border border-yellow-200 hover:shadow-lg transition-all transform hover:-translate-y-1"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-yellow-100 rounded-lg text-2xl">💰</div>
            <span className="bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Prioridad</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 group-hover:text-yellow-700 transition-colors">Confirmar Pagos</h2>
          <p className="text-gray-600 mt-2 text-sm">
            Ver lista de clientes que pagarán en sede y registrar su cobro.
          </p>
        </Link>

        {/* OPCIÓN 2: GENERAR HORARIOS */}
        <Link 
          to="/admin/generar-horarios" 
          className="group block bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all transform hover:-translate-y-1"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-blue-50 rounded-lg text-2xl">📅</div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">Generar Horarios</h2>
          <p className="text-gray-600 mt-2 text-sm">
            Abrir la agenda y crear bloques de disponibilidad masiva.
          </p>
        </Link>

        {/* OPCIÓN 3: GESTIONAR CANCHAS */}
        <Link 
          to="/admin/gestionar-canchas" 
          className="group block bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-green-300 hover:shadow-md transition-all transform hover:-translate-y-1"
        >
           <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-green-50 rounded-lg text-2xl">⚽</div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">Gestionar Canchas</h2>
          <p className="text-gray-600 mt-2 text-sm">
            Añadir nuevas canchas, editar precios o fotos.
          </p>
        </Link>

         {/* OPCIÓN 4: GESTIONAR SEDES */}
         <Link 
          to="/admin/gestionar-sedes" 
          className="group block bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all transform hover:-translate-y-1"
        >
           <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-purple-50 rounded-lg text-2xl">📍</div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">Gestionar Sedes</h2>
          <p className="text-gray-600 mt-2 text-sm">
            Administrar ubicaciones y distritos disponibles.
          </p>
        </Link>

      </div>
    </div>
  );
}