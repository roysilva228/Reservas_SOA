// src/pages/admin/GenerarHorariosPage.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext.jsx'; // (Revisa la ruta ../../)

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
      setCanchas([]); // Limpia las canchas si no hay sede
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
      setSuccess(response.data.detail); // Ej: "120 bloques creados"
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al generar horarios.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Generar Horarios en Lote</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 space-y-4">
        {error && <p className="text-red-500 bg-red-100 p-3 rounded">{error}</p>}
        {success && <p className="text-green-500 bg-green-100 p-3 rounded">{success}</p>}
        
        {/* 1. Filtro de Sede */}
        <div>
          <label className="block text-sm font-medium text-gray-700">1. Selecciona la Sede</label>
          <select
            value={selectedSede}
            onChange={(e) => setSelectedSede(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
          >
            <option value="">-- Primero selecciona una sede --</option>
            {sedes.map((sede) => (
              <option key={sede.id_sede} value={sede.id_sede}>{sede.nombre}</option>
            ))}
          </select>
        </div>

        {/* 2. Filtro de Cancha (depende del paso 1) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">2. Selecciona la Cancha</label>
          <select
            name="id_cancha"
            value={formData.id_cancha}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
            required
            disabled={!selectedSede || canchas.length === 0}
          >
            <option value="">-- Selecciona una cancha --</option>
            {canchas.map((cancha) => (
              <option key={cancha.id_cancha} value={cancha.id_cancha}>{cancha.nombre}</option>
            ))}
          </select>
        </div>

        {/* 3. Rango de Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">3. Desde la Fecha</label>
            <input
              type="date"
              name="fecha_inicio"
              value={formData.fecha_inicio}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">4. Hasta la Fecha</label>
            <input
              type="date"
              name="fecha_fin"
              value={formData.fecha_fin}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              required
            />
          </div>
        </div>

        {/* 4. Rango de Horas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">5. Hora de Apertura</label>
            <input
              type="time"
              name="hora_inicio"
              value={formData.hora_inicio}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">6. Hora de Cierre</label>
            <input
              type="time"
              name="hora_fin"
              value={formData.hora_fin}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              required
            />
          </div>
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-green-600 px-4 py-3 text-white font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Generando...' : 'Generar Horarios'}
          </button>
        </div>
      </form>
    </div>
  );
}