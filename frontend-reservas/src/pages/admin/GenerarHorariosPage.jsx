// src/pages/admin/GenerarHorariosPage.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext.jsx';

const API_CANCHAS_URL = 'http://127.0.0.1:8001';
const API_RESERVAS_URL = 'http://127.0.0.1:8002';

export default function GenerarHorariosPage() {
  const [sedes, setSedes] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [selectedSede, setSelectedSede] = useState('');
  
  const [formData, setFormData] = useState({
    id_cancha: '',
    fecha_inicio: '',
    fecha_fin: '',
    hora_inicio: '18:00',
    hora_fin: '23:00',
    intervalo_minutos: 60,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { token } = useAuth();

  // Cargar sedes al inicio
  useEffect(() => {
    axios.get(`${API_CANCHAS_URL}/sedes/`)
      .then(res => setSedes(res.data))
      .catch(err => setError('No se pudieron cargar las sedes.'));
  }, []);

  // Cargar canchas cuando se selecciona una sede
  useEffect(() => {
    if (selectedSede) {
      axios.get(`${API_CANCHAS_URL}/canchas/?id_sede=${selectedSede}`)
        .then(res => setCanchas(res.data))
        .catch(err => setError('No se pudieron cargar las canchas.'));
    } else {
      setCanchas([]); 
    }
  }, [selectedSede]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const response = await axios.post(
        `${API_RESERVAS_URL}/disponibilidad/generar-bloque`,
        formData,
        config
      );
      setSuccess(`✅ Éxito: ${response.data.detail}`); 
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al generar horarios.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      
      {/* Encabezado de la página */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-gray-800">Generar Horarios en Lote</h1>
        <p className="text-gray-500 mt-2">Crea bloques de disponibilidad masiva para tus canchas en segundos.</p>
      </div>
      
      {/* Tarjeta Principal */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        
        {/* Barra de estado (Error/Éxito) */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 mb-0 rounded-r">
            <div className="flex">
              <div className="flex-shrink-0 text-red-500">⚠️</div>
              <div className="ml-3 text-sm text-red-700 font-medium">{error}</div>
            </div>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 m-6 mb-0 rounded-r">
            <div className="flex">
              <div className="flex-shrink-0 text-green-500">🎉</div>
              <div className="ml-3 text-sm text-green-700 font-medium">{success}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* SECCIÓN 1: UBICACIÓN (Con fondo gris sutil para separar) */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span>📍</span> Selección de Espacio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Sede */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">1. Selecciona la Sede</label>
                <select
                  value={selectedSede}
                  onChange={(e) => setSelectedSede(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 transition-all"
                >
                  <option value="">-- Selecciona Sede --</option>
                  {sedes.map((sede) => (
                    <option key={sede.id_sede} value={sede.id_sede}>{sede.nombre}</option>
                  ))}
                </select>
              </div>

              {/* 2. Cancha */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">2. Selecciona la Cancha</label>
                <select
                  name="id_cancha"
                  value={formData.id_cancha}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 transition-all disabled:bg-gray-200 disabled:cursor-not-allowed"
                  required
                  disabled={!selectedSede || canchas.length === 0}
                >
                  <option value="">-- Selecciona Cancha --</option>
                  {canchas.map((cancha) => (
                    <option key={cancha.id_cancha} value={cancha.id_cancha}>{cancha.nombre}</option>
                  ))}
                </select>
                {selectedSede && canchas.length === 0 && (
                    <p className="text-xs text-red-400 mt-1">No hay canchas en esta sede.</p>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: TIEMPO (Diseño limpio) */}
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span>📅</span> Configuración de Tiempo
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Fechas */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">3. Fecha Inicio</label>
                <input
                  type="date"
                  name="fecha_inicio"
                  value={formData.fecha_inicio}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">4. Fecha Fin</label>
                <input
                  type="date"
                  name="fecha_fin"
                  value={formData.fecha_fin}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Horas */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Hora Apertura</label>
                <input
                  type="time"
                  name="hora_inicio"
                  value={formData.hora_inicio}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Hora Cierre</label>
                <input
                  type="time"
                  name="hora_fin"
                  value={formData.hora_fin}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5"
                  required
                />
              </div>
               <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Duración Bloque</label>
                <select
                  name="intervalo_minutos"
                  value={formData.intervalo_minutos}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5"
                >
                    <option value="60">1 Hora (60 min)</option>
                    <option value="90">1.5 Horas (90 min)</option>
                    <option value="30">Media Hora (30 min)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Botón de Acción */}
          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </>
              ) : (
                <>🚀 Generar Horarios Masivos</>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
                Esto creará automáticamente todos los bloques de tiempo en la base de datos.
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}