// src/pages/admin/GestionarCanchasPage.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://127.0.0.1:8001'; 

export default function GestionarCanchasPage() {
  const [canchas, setCanchas] = useState([]);
  const [filteredCanchas, setFilteredCanchas] = useState([]);
  const [sedes, setSedes] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para Modal y Carga
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const [generatingAI, setGeneratingAI] = useState(false);

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

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sedesRes, canchasRes] = await Promise.all([
        axios.get(`${API_URL}/sedes/`), 
        axios.get(`${API_URL}/canchas/`), 
      ]);
      setSedes(sedesRes.data);
      setCanchas(canchasRes.data);
      setFilteredCanchas(canchasRes.data); // Inicialmente mostramos todas
    } catch (err) {
      setError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); 

  // --- FILTRO DE BÚSQUEDA ---
  useEffect(() => {
    const results = canchas.filter(cancha =>
      cancha.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCanchas(results);
  }, [searchTerm, canchas]);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: (name === 'precio_hora' || name === 'id_sede_fk') ? parseFloat(value) : value 
    });
  };

  const handleGenerateDescription = async () => {
    if (!formData.nombre || !formData.tipo_superficie) {
      alert("Escribe un nombre y superficie primero.");
      return;
    }
    setGeneratingAI(true);
    try {
      const sedeSeleccionada = sedes.find(s => s.id_sede === parseInt(formData.id_sede_fk));
      const nombreSede = sedeSeleccionada ? sedeSeleccionada.nombre : "nuestra sede";
      const response = await axios.post(`${API_URL}/canchas/generar-descripcion-ia`, {
        nombre: formData.nombre,
        tipo_superficie: formData.tipo_superficie,
        sede: nombreSede
      });
      setFormData(prev => ({ ...prev, descripcion: response.data.descripcion }));
    } catch (err) {
      console.error(err);
      alert("Error al generar descripción.");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/subir-imagen/`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, url_foto: res.data.url }));
    } catch (err) {
      alert('Error al subir imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const config = { headers: { 'Authorization': `Bearer ${token}` } };
    const dataToSend = {
      ...formData,
      id_sede_fk: parseInt(formData.id_sede_fk, 10),
      precio_hora: parseFloat(formData.precio_hora)
    };

    try {
      if (editId) {
        await axios.put(`${API_URL}/canchas/${editId}`, dataToSend, config);
      } else {
        await axios.post(`${API_URL}/canchas/`, dataToSend, config);
      }
      closeModal();
      fetchData();
    } catch (err) {
      alert('Error al guardar.');
    }
  };

  // --- MODAL ACTIONS ---
  const openCreateModal = () => {
    setEditId(null);
    setFormData({ 
      nombre: '', descripcion: '', tipo_superficie: '', precio_hora: 0.0, url_foto: '', id_sede_fk: sedes[0]?.id_sede || '' 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cancha) => {
    setEditId(cancha.id_cancha);
    setFormData({
      nombre: cancha.nombre,
      descripcion: cancha.descripcion || '',
      tipo_superficie: cancha.tipo_superficie || '',
      precio_hora: cancha.precio_hora,
      url_foto: cancha.url_foto || '',
      id_sede_fk: cancha.id_sede_fk || (sedes[0]?.id_sede || ''),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleDelete = async (id_cancha) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta cancha?')) return;
    try {
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      await axios.delete(`${API_URL}/canchas/${id_cancha}`, config);
      fetchData();
    } catch (err) {
      alert('Error al eliminar.');
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* ENCABEZADO Y BOTÓN DE CREAR */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestionar Canchas</h1>
          <p className="text-gray-500 text-sm">Administra el inventario de espacios deportivos.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
        >
          <span>+</span> Nueva Cancha
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="🔍 Buscar cancha por nombre..." 
          className="w-full md:w-1/3 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLA DE CANCHAS (Diseño Admin) */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Foto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre & Sede</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Superficie</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio / Hora</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-10 text-gray-500">Cargando...</td></tr>
            ) : filteredCanchas.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-10 text-gray-500">No se encontraron canchas.</td></tr>
            ) : (
              filteredCanchas.map((cancha) => (
                <tr key={cancha.id_cancha} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-12 w-16 rounded-md overflow-hidden bg-gray-200 border border-gray-300">
                      {cancha.url_foto ? (
                        <img src={cancha.url_foto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center h-full text-xs text-gray-400">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{cancha.nombre}</div>
                    <div className="text-xs text-gray-500">{cancha.sede ? cancha.sede.nombre : 'Sin Sede'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {cancha.tipo_superficie || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                    S/. {cancha.precio_hora.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openEditModal(cancha)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                    <button onClick={() => handleDelete(cancha.id_cancha)} className="text-red-600 hover:text-red-900">Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE FORMULARIO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100">
            {/* Header Modal */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editId ? '✏️ Editar Cancha' : '✨ Nueva Cancha'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            {/* Body Modal */}
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sede</label>
                        <select name="id_sede_fk" value={formData.id_sede_fk} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 p-2 focus:ring-blue-500 border" required>
                            <option value="" disabled>-- Selecciona --</option>
                            {sedes.map(s => <option key={s.id_sede} value={s.id_sede}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 p-2 border" required />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Superficie</label>
                        <input type="text" name="tipo_superficie" value={formData.tipo_superficie} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 p-2 border" placeholder="Ej: Grass" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Precio (S/.)</label>
                        <input type="number" step="0.01" name="precio_hora" value={formData.precio_hora} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 p-2 border" required />
                    </div>
                </div>

                {/* Descripción con IA */}
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <label className="block text-sm font-medium text-gray-700">Descripción</label>
                        <button type="button" onClick={handleGenerateDescription} disabled={generatingAI} className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-full hover:opacity-90 transition-opacity flex gap-1">
                            {generatingAI ? '🧠 Pensando...' : '✨ IA Mágica'}
                        </button>
                    </div>
                    <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows="3" className="w-full rounded-md border-gray-300 p-2 border focus:ring-purple-500" placeholder="Descripción..." />
                </div>

                {/* Imagen */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                     <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" id="file-upload" />
                     <label htmlFor="file-upload" className="cursor-pointer block">
                        {uploading ? <p className="text-blue-500 animate-pulse">Subiendo...</p> : 
                         formData.url_foto ? (
                            <img src={formData.url_foto} alt="Preview" className="h-32 mx-auto object-cover rounded-md shadow-sm" />
                         ) : (
                            <div className="text-gray-500">
                                <p className="text-2xl mb-1">📷</p>
                                <span className="text-sm font-medium text-blue-600 hover:underline">Sube una foto</span>
                            </div>
                         )
                        }
                     </label>
                </div>

                {/* Footer Modal */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancelar</button>
                    <button type="submit" disabled={uploading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md disabled:opacity-50">
                        {editId ? 'Guardar Cambios' : 'Crear Cancha'}
                    </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}