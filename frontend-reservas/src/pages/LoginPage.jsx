import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_USUARIOS } from '../config';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  
  // --- NUEVO ESTADO: Mostrar contraseña ---
  const [showPassword, setShowPassword] = useState(false); 

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post(`${API_USUARIOS}/usuarios/login`, {
        email: email,
        password: password,
      });

      const token = response.data.access_token;
      login(token);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-900">
          Iniciar Sesión
        </h2>
        
        <form onSubmit={handleSubmit}>
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
          
          {/* --- CAMBIO AQUÍ: Input de contraseña con botón de ojo --- */}
          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} // Alterna el tipo
                id="password"
                className="w-full rounded-md border border-gray-300 p-3 pr-10 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-600 focus:outline-none"
              >
                {/* Ícono simple de Ojo / Ojo tachado */}
                {showPassword ? (
                  <span title="Ocultar">🙈</span> 
                ) : (
                  <span title="Mostrar">👁️</span>
                )}
              </button>
            </div>
          </div>
          {/* ------------------------------------------------------- */}

          {error && (
            <div className="mb-4 rounded-md border border-red-400 bg-red-100 p-3 text-center text-sm text-red-700">
              {error}
            </div>
          )}
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