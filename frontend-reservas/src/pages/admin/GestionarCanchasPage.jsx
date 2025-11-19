// src/pages/admin/GestionarCanchasPage.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://127.0.0.1:8001'; // URL de tu servicio de canchas

export default function GestionarCanchasPage() {
  const [canchas, setCanchas] = useState([]);
  const [sedes, setSedes] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para controlar la subida de imagen
  const [uploading, setUploading] = useState(false); 

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo_superficie: '',
    precio_hora: 0.0,
    url_foto: '',
    id_sede_fk: '', 
  });
  const [editId, setEditId] = useState(null);
  const { token } = useAuth(); 

  // --- Cargar Sedes y Canchas al iniciar ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sedesRes, canchasRes] = await Promise.all([
        axios.get(`${API_URL}/sedes/`), 
        axios.get(`${API_URL}/canchas/`), 
      ]);
      
      setSedes(sedesRes.data);
      setCanchas(canchasRes.data);
      
      // Si no estamos editando, pre-selecciona la primera sede por defecto
      if (!editId && sedesRes.data.length > 0) {
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
  }, []); 

  // --- Manejadores del Formulario ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: (name === 'precio_hora' || name === 'id_sede_fk') ? parseFloat(value) : value 
    });
  };

  // --- Manejar selección de archivo (IMAGEN) ---
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null); 

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/subir-imagen/`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, url_foto: res.data.url }));
    } catch (err) {
      console.error("Error subiendo imagen:", err);
      setError('Error al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  // --- Acción: Guardar (Crear o Editar) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const config = {
      headers: { 'Authorization': `Bearer ${token}` }
    };
    
    const dataToSend = {
      ...formData,
      id_sede_fk: parseInt(formData.id_sede_fk, 10),
      precio_hora: parseFloat(formData.precio_hora)
    };

    try {
      if (editId) {
        // --- MODO ACTUALIZAR (PUT) ---
        await axios.put(`${API_URL}/canchas/${editId}`, dataToSend, config);
        alert("¡Cancha actualizada correctamente!");
      } else {
        // --- MODO CREAR (POST) ---
        await axios.post(`${API_URL}/canchas/`, dataToSend, config);
        alert("¡Cancha creada exitosamente!");
      }
      
      // Limpiar formulario y recargar
      handleCancelEdit(); 
      fetchData(); 
      
    } catch (err) {
      setError('Error al guardar la cancha. ' + (err.response?.data?.detail || ''));
    }
  };

  // --- Acción: Preparar Edición ---
  const handleEdit = (cancha) => {
    setEditId(cancha.id_cancha);
    setFormData({
      nombre: cancha.nombre,
      descripcion: cancha.descripcion || '',
      tipo_superficie: cancha.tipo_superficie || '',
      precio_hora: cancha.precio_hora,
      url_foto: cancha.url_foto || '',
      id_sede_fk: cancha.id_sede_fk || (sedes[0]?.id_sede || ''),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Subir al formulario
  };

  // --- Acción: Cancelar Edición ---
  const handleCancelEdit = () => {
    setEditId(null);
    setFormData({ 
      nombre: '', 
      descripcion: '', 
      tipo_superficie: '', 
      precio_hora: 0.0, 
      url_foto: '', 
      id_sede_fk: sedes[0]?.id_sede || '' 
    });
  };

  // --- Acción: Eliminar ---
  const handleDelete = async (id_cancha) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta cancha? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      await axios.delete(`${API_URL}/canchas/${id_cancha}`, config);
      fetchData(); // Recargar la lista
    } catch (err) {
      setError('Error al eliminar la cancha. ' + (err.response?.data?.detail || ''));
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestionar Canchas</h1>
      
      {/* --- Formulario --- */}
      <form onSubmit={handleSubmit} className={`p-6 rounded-lg shadow-md mb-8 space-y-4 border-t-4 ${editId ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-blue-500'}`}>
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            {editId ? '✏️ Editando Cancha' : '➕ Crear Nueva Cancha'}
        </h2>
        
        {error && <p className="text-red-700 bg-red-100 p-3 rounded border border-red-200">{error}</p>}
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Sede</label>
          <select
            name="id_sede_fk"
            value={formData.id_sede_fk}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white"
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

        {/* Subida de Imagen */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Foto de la Cancha</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          {uploading && <p className="text-blue-500 text-sm mt-2 animate-pulse">Subiendo imagen...</p>}
          
          {formData.url_foto && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Vista previa:</p>
              <img src={formData.url_foto} alt="Vista previa" className="h-40 w-full md:w-64 object-cover rounded-lg border border-gray-300 shadow-sm"/>
            </div>
          )}
        </div>
        
        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={uploading}
            className={`rounded-md px-6 py-2 text-white font-bold transition-colors disabled:opacity-50 ${editId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {editId ? 'Guardar Cambios' : 'Crear Cancha'}
          </button>
          
          {editId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-md bg-gray-500 px-6 py-2 text-white font-bold hover:bg-gray-600"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* --- Lista --- */}
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Canchas Existentes</h2>
      {loading ? (
        <div className="text-center p-10 text-gray-500">Cargando canchas...</div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md">
          {canchas.length === 0 ? (
             <p className="text-gray-500 text-center">No hay canchas registradas aún.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
                {canchas.map((cancha) => (
                <li key={cancha.id_cancha} className="py-4">
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                    {/* Miniatura */}
                    <div className="flex-shrink-0 w-full md:w-32 h-24 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                        {cancha.url_foto ? (
                            <img src={cancha.url_foto} alt={cancha.nombre} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs">Sin foto</div>
                        )}
                    </div>
                    
                    <div className="flex-1">
                        <p className="text-lg font-bold text-gray-900">{cancha.nombre}</p>
                        <p className="text-sm text-gray-600">
                        <span className="font-semibold">Sede:</span> {cancha.sede ? cancha.sede.nombre : 'No asignada'}
                        </p>
                        <p className="text-sm text-gray-500">Precio: S/. {cancha.precio_hora.toFixed(2)}</p>
                        <p className="text-xs text-gray-400 mt-1">{cancha.descripcion}</p>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex space-x-2 mt-2 md:mt-0">
                        <button 
                            onClick={() => handleEdit(cancha)}
                            className="rounded-md bg-yellow-400 px-3 py-1 text-white font-semibold hover:bg-yellow-500 transition-colors shadow-sm"
                        >
                            Editar
                        </button>
                        <button 
                            onClick={() => handleDelete(cancha.id_cancha)}
                            className="rounded-md bg-red-500 px-3 py-1 text-white font-semibold hover:bg-red-600 transition-colors shadow-sm"
                        >
                            Eliminar
                        </button>
                    </div>
                    </div>
                </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}