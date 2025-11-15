// src/pages/admin/GestionarCanchasPage.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://127.0.0.1:8001'; // URL de tu servicio de canchas

export default function GestionarCanchasPage() {
  const [canchas, setCanchas] = useState([]);
  const [sedes, setSedes] = useState([]); // ¡Para el "scroll"!
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo_superficie: '',
    precio_hora: 0.0,
    url_foto: '',
    id_sede_fk: '', // ¡La clave para el "scroll"!
  });
  const [editId, setEditId] = useState(null);
  const { token } = useAuth(); // Token de Admin

  // --- Cargar Sedes y Canchas al iniciar ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // Usamos Promise.all para cargar ambas cosas a la vez
      const [sedesRes, canchasRes] = await Promise.all([
        axios.get(`${API_URL}/sedes/`), // Llama a las sedes
        axios.get(`${API_URL}/canchas/`), // Llama a las canchas
      ]);
      
      setSedes(sedesRes.data);
      setCanchas(canchasRes.data);
      
      // Si hay sedes, pre-selecciona la primera en el formulario
      if (sedesRes.data.length > 0) {
        setFormData(prev => ({ ...prev, id_sede_fk: sedesRes.data[0].id_sede }));
      }
      
    } catch (err) {
      setError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Se ejecuta solo una vez al cargar

  // --- Manejadores del Formulario ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      // Convierte los números a tipo 'float' o 'int'
      [name]: (name === 'precio_hora' || name === 'id_sede_fk') ? parseFloat(value) : value 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const config = {
      headers: { 'Authorization': `Bearer ${token}` }
    };
    
    // Aseguramos que el ID de sede sea un número
    const dataToSend = {
      ...formData,
      id_sede_fk: parseInt(formData.id_sede_fk, 10),
      precio_hora: parseFloat(formData.precio_hora)
    };

    try {
      if (editId) {
        // --- Modo Actualizar (PUT) ---
        // (Nota: El PUT para canchas no está implementado en el backend, ¡pero el POST sí!)
        // await axios.put(`${API_URL}/canchas/${editId}`, dataToSend, config);
        alert("La función de 'Actualizar' cancha aún no está implementada.");
      } else {
        // --- Modo Crear (POST) ---
        await axios.post(`${API_URL}/canchas/`, dataToSend, config);
      }
      
      // Limpiar formulario y recargar lista
      setFormData({ nombre: '', descripcion: '', tipo_superficie: '', precio_hora: 0.0, url_foto: '', id_sede_fk: sedes[0]?.id_sede || '' });
      setEditId(null);
      fetchData(); // Recargar la lista de canchas
      
    } catch (err) {
      setError('Error al guardar la cancha. ' + (err.response?.data?.detail || ''));
    }
  };
  
  // (Las funciones de Editar y Borrar Cancha las dejamos pendientes,
  // ¡pero el formulario de CREAR ya es funcional!)

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestionar Canchas</h1>
      
      {/* --- Formulario de Crear / Editar Cancha --- */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 space-y-4">
        <h2 className="text-2xl font-semibold mb-4">{editId ? 'Editando Cancha' : 'Crear Nueva Cancha'}</h2>
        
        {error && <p className="text-red-500 bg-red-100 p-3 rounded">{error}</p>}
        
        {/* --- ¡¡TU IDEA DEL "SCROLL"!! --- */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Sede</label>
          <select
            name="id_sede_fk"
            value={formData.id_sede_fk}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
            required
          >
            <option value="" disabled>-- Selecciona una sede --</option>
            {sedes.map((sede) => (
              <option key={sede.id_sede} value={sede.id_sede}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </div>
        {/* --- FIN DEL "SCROLL" --- */}

        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre de Cancha</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de Superficie</label>
            <input
              type="text"
              name="tipo_superficie"
              value={formData.tipo_superficie}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              placeholder="Ej: Grass sintético"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Precio por Hora (S/.)</label>
            <input
              type="number"
              step="0.01"
              name="precio_hora"
              value={formData.precio_hora}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">URL de Foto (Opcional)</label>
          <input
            type="text"
            name="url_foto"
            value={formData.url_foto}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
            placeholder="https://ejemplo.com/foto.jpg"
          />
        </div>
        
        <div className="flex space-x-4">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {editId ? 'Actualizar Cancha' : 'Guardar Cancha'}
          </button>
        </div>
      </form>

      {/* --- Lista de Canchas Existentes --- */}
      <h2 className="text-2xl font-semibold mb-4">Canchas Existentes</h2>
      {loading ? (
        <p>Cargando canchas...</p>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <ul className="divide-y divide-gray-200">
            {canchas.map((cancha) => (
              <li key={cancha.id_cancha} className="py-4">
                <p className="text-lg font-semibold text-gray-900">{cancha.nombre}</p>
                <p className="text-sm text-gray-600">
                  {/* ¡Mostramos la sede a la que pertenece! */}
                  Sede: {cancha.sede ? cancha.sede.nombre : 'No asignada'}
                </p>
                <p className="text-sm text-gray-500">Precio: S/. {cancha.precio_hora.toFixed(2)}</p>
                <div className="space-x-2 mt-2">
                  <button disabled className="rounded-md bg-yellow-300 px-3 py-1 text-white opacity-50">
                    Editar (Próx.)
                  </button>
                  <button disabled className="rounded-md bg-red-300 px-3 py-1 text-white opacity-50">
                    Eliminar (Próx.)
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
