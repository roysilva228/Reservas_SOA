import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API_CANCHAS } from '../../config'; // <-- Importamos config

export default function GestionarSedesPage() {
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', direccion: '', distrito: '', url_foto_sede: '',
  });
  const [editId, setEditId] = useState(null);
  const { token } = useAuth();

  const fetchSedes = async () => {
    setLoading(true);
    try {
      // Usamos API_CANCHAS
      const response = await axios.get(`${API_CANCHAS}/sedes/`);
      setSedes(response.data);
    } catch (err) {
      setError('No se pudieron cargar las sedes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSedes(); }, []);

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const config = { headers: { 'Authorization': `Bearer ${token}` } };
    try {
      // Usamos API_CANCHAS
      if (editId) { await axios.put(`${API_CANCHAS}/sedes/${editId}`, formData, config); } 
      else { await axios.post(`${API_CANCHAS}/sedes/`, formData, config); }
      setFormData({ nombre: '', direccion: '', distrito: '', url_foto_sede: '' });
      setEditId(null);
      fetchSedes();
    } catch (err) { setError('Error al guardar la sede.'); }
  };

  const handleEdit = (sede) => {
    setEditId(sede.id_sede);
    setFormData({ nombre: sede.nombre, direccion: sede.direccion, distrito: sede.distrito || '', url_foto_sede: sede.url_foto_sede || '', });
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id_sede) => {
    if (!window.confirm('¿Eliminar sede?')) return;
    try {
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      // Usamos API_CANCHAS
      await axios.delete(`${API_CANCHAS}/sedes/${id_sede}`, config);
      fetchSedes();
    } catch (err) { setError('Error al eliminar.'); }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Gestionar Sedes</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 space-y-4">
        <h2 className="text-2xl font-semibold mb-4">{editId ? 'Editando Sede' : 'Crear Nueva Sede'}</h2>
        {error && <p className="text-red-500 bg-red-100 p-3 rounded">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700">Nombre de Sede</label><input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" required /></div>
          <div><label className="block text-sm font-medium text-gray-700">Distrito</label><input type="text" name="distrito" value={formData.distrito} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" /></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700">Dirección</label><input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" required /></div>
        <div><label className="block text-sm font-medium text-gray-700">URL de Foto (Opcional)</label><input type="text" name="url_foto_sede" value={formData.url_foto_sede} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" placeholder="https://ejemplo.com/foto.jpg" /></div>
        <div className="flex space-x-4"><button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">{editId ? 'Actualizar Sede' : 'Guardar Sede'}</button>{editId && (<button type="button" onClick={() => { setEditId(null); setFormData({ nombre: '', direccion: '', distrito: '', url_foto_sede: '' }); }} className="rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Cancelar Edición</button>)}</div>
      </form>
      <h2 className="text-2xl font-semibold mb-4">Sedes Existentes</h2>
      {loading ? <p>Cargando sedes...</p> : (
        <div className="bg-white p-6 rounded-lg shadow-md"><ul className="divide-y divide-gray-200">{sedes.map((sede) => (<li key={sede.id_sede} className="py-4 flex items-center justify-between"><div><p className="text-lg font-semibold text-gray-900">{sede.nombre} ({sede.distrito})</p><p className="text-sm text-gray-600">{sede.direccion}</p></div><div className="space-x-2"><button onClick={() => handleEdit(sede)} className="rounded-md bg-yellow-500 px-3 py-1 text-white hover:bg-yellow-600">Editar</button><button onClick={() => handleDelete(sede.id_sede)} className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">Eliminar</button></div></li>))}</ul></div>
      )}
    </div>
  );
}