import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_USUARIOS } from '../config'; // <-- Importamos config

export default function RegisterPage() {
  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loadingDNI, setLoadingDNI] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null); // <--- NUEVO ESTADO PARA ALERTA DE ÉXITO

  const navigate = useNavigate();

  const handleConsultarDNI = async () => {
    if (dni.length !== 8) {
      setError('El DNI debe tener 8 dígitos.');
      return;
    }
    setLoadingDNI(true);
    setError(null);
    try {
      // Usamos API_USUARIOS
      const response = await axios.get(`${API_USUARIOS}/usuarios/consultar-dni?dni=${dni}`);
      setNombre(response.data.first_name || '');
      setApellido(`${response.data.first_last_name || ''} ${response.data.second_last_name || ''}`);
    } catch (err) {
      console.error("Error consultando DNI:", err);
      setError("No se pudo consultar el DNI. Verifica el número.");
      setNombre('');
      setApellido('');
    } finally {
      setLoadingDNI(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingRegister(true);
    setError(null);
    setSuccessMsg(null); // Limpiamos mensajes previos

    try {
      // Usamos API_USUARIOS
      await axios.post(`${API_USUARIOS}/usuarios/registrar`, {
        nombre: nombre,
        apellido: apellido,
        email: email,
        password: password,
      });
      
      // --- CAMBIO: ALERTA DE ÉXITO Y REDIRECCIÓN ---
      setSuccessMsg("¡Registro exitoso! Redirigiendo al login...");
      
      setTimeout(() => {
        navigate('/login');
      }, 2000); // Espera 2 segundos antes de redirigir
      // ---------------------------------------------

    } catch (err) {
      console.error("Error en el registro:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail); 
      } else {
        setError('Ocurrió un error en el registro.');
      }
    } finally {
      setLoadingRegister(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-900">Crear Cuenta</h2>
        
        {/* --- CAMBIO: MOSTRAR ALERTA DE ÉXITO --- */}
        {successMsg && (
            <div className="mb-4 p-4 rounded-md bg-green-100 border-l-4 border-green-500 text-green-700 text-center font-bold animate-pulse">
                {successMsg}
            </div>
        )}
        {/* --------------------------------------- */}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="dni" className="mb-2 block text-sm font-medium text-gray-700">DNI</label>
            <div className="flex space-x-2">
              <input
                type="text" id="dni" maxLength="8" className="w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={dni} onChange={(e) => setDni(e.target.value)}
              />
              <button type="button" onClick={handleConsultarDNI} disabled={loadingDNI} className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50">
                {loadingDNI ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="nombre" className="mb-2 block text-sm font-medium text-gray-700">Nombres</label>
              <input type="text" id="nombre" className="w-full rounded-md border border-gray-300 p-3 bg-gray-100 shadow-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} readOnly />
            </div>
            <div>
              <label htmlFor="apellido" className="mb-2 block text-sm font-medium text-gray-700">Apellidos</label>
              <input type="text" id="apellido" className="w-full rounded-md border border-gray-300 p-3 bg-gray-100 shadow-sm" value={apellido} onChange={(e) => setApellido(e.target.value)} readOnly />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">Email</label>
            <input type="email" id="email" className="w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">Contraseña</label>
            <input type="password" id="password" className="w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          
          {/* Alerta de Error */}
          {error && <div className="rounded-md border border-red-400 bg-red-100 p-3 text-center text-sm text-red-700">{error}</div>}
          
          <button type="submit" disabled={loadingRegister} className="w-full rounded-md bg-blue-600 p-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50">
            {loadingRegister ? 'Registrando...' : 'Crear Cuenta'}
          </button>
          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-blue-600 hover:underline">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}