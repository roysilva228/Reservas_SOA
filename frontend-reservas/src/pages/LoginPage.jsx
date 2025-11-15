// src/pages/LoginPage.jsx

import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// 1. Importa nuestro hook personalizado
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  // 2. Trae la función 'login' desde el contexto
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post('http://127.0.0.1:8000/usuarios/login', {
        email: email,
        password: password,
      });

      const token = response.data.access_token;
      
      // 3. ¡Aquí está el cambio!
      // En lugar de console.log, llamamos a nuestra función global
      login(token);

      // Redirigir al usuario a la página de inicio
      navigate('/');

    } catch (err) {
      console.error('Error en el login:', err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Ocurrió un error. Inténtalo de nuevo.');
      }
    }
  };

  // ...el resto del return (el formulario) se queda EXACTAMENTE IGUAL...
  // (No necesitas copiar esta parte si ya la tienes)
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-900">
          Iniciar Sesión
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-4">
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {/* Password */}
          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              className="w-full rounded-md border border-gray-300 p-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {/* Error */}
          {error && (
            <div className="mb-4 rounded-md border border-red-400 bg-red-100 p-3 text-center text-sm text-red-700">
              {error}
            </div>
          )}
          {/* Botón */}
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 p-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}