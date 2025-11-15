// src/pages/HomePage.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // Para saber si estamos logueados
import { Link } from 'react-router-dom'; // Para futuros enlaces a detalles

export default function HomePage() {
  const { user } = useAuth(); // Obtenemos el usuario logueado del contexto
  const [canchas, setCanchas] = useState([]); // Todas las canchas que cargamos
  const [sedes, setSedes] = useState([]);     // Todas las sedes para el filtro
  const [selectedSede, setSelectedSede] = useState(''); // La sede seleccionada por el usuario
  const [loading, setLoading] = useState(true); // Para mostrar un estado de carga
  const [error, setError] = useState(null);   // Para manejar errores de la API

  // --- Efecto para cargar sedes y canchas al iniciar ---
  useEffect(() => {
    const fetchSedesAndCanchas = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Cargar Sedes
        const sedesResponse = await axios.get('http://127.0.0.1:8001/sedes/');
        setSedes(sedesResponse.data);

        // 2. Cargar Canchas (sin filtrar inicialmente)
        // La API de Canchas ya puede recibir 'id_sede'
        const canchasResponse = await axios.get(`http://127.0.0.1:8001/canchas/${selectedSede ? `?id_sede=${selectedSede}` : ''}`);
        setCanchas(canchasResponse.data);

      } catch (err) {
        console.error("Error cargando datos:", err);
        setError("No pudimos cargar las canchas o sedes. Inténtalo más tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchSedesAndCanchas();
  }, [selectedSede]); // Este efecto se ejecuta cada vez que cambia 'selectedSede'

  // --- Función para manejar el cambio en el selector de sedes ---
  const handleSedeChange = (e) => {
    setSelectedSede(e.target.value);
  };

  // --- Renderizado del componente ---
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Sección Hero: El encabezado visual impactante */}
      <section className="relative h-96 bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1549727409-f30d52924153?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Cancha de deporte iluminada"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight drop-shadow-lg animate-fade-in-down">
            Encuentra tu Cancha Perfecta
          </h1>
          <p className="mt-4 text-xl md:text-2xl font-light drop-shadow-md animate-fade-in-up">
            Reserva tu espacio para la pasión del deporte.
          </p>
        </div>
      </section>

      {/* Contenido Principal: Filtros y Galería de Canchas */}
      <div className="container mx-auto px-4 py-12">
        {/* Sección de Mensaje de Bienvenida / Estado del Usuario */}
        {user ? (
          <p className="mb-8 text-center text-lg md:text-xl font-medium text-blue-300 animate-fade-in">
            ¡Bienvenido de nuevo, <span className="font-semibold text-blue-100">{user.sub}</span>! Explora las canchas disponibles.
          </p>
        ) : (
          <p className="mb-8 text-center text-lg md:text-xl font-medium text-gray-400 animate-fade-in">
            Inicia sesión para reservar y disfrutar de todas las funcionalidades.
            <Link to="/login" className="ml-2 text-blue-400 hover:underline">Ir a Login</Link>
          </p>
        )}

        {/* Sección de Filtro por Sedes */}
        <div className="mb-10 text-center animate-slide-in-right">
          <label htmlFor="sede-select" className="block text-2xl font-semibold mb-4 text-blue-300">
            Filtrar por Sede:
          </label>
          <select
            id="sede-select"
            className="w-full md:w-1/3 p-3 rounded-lg bg-gray-800 border border-gray-700 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ease-in-out"
            value={selectedSede}
            onChange={handleSedeChange}
          >
            <option value="">Todas las Sedes</option>
            {sedes.map((sede) => (
              <option key={sede.id_sede} value={sede.id_sede}>
                {sede.nombre} - {sede.distrito}
              </option>
            ))}
          </select>
        </div>

        {/* Indicadores de Estado: Carga, Error, Sin Canchas */}
        {loading && (
          <p className="text-center text-xl text-blue-400 animate-pulse">Cargando canchas...</p>
        )}
        {error && (
          <p className="text-center text-xl text-red-500">{error}</p>
        )}
        {!loading && !error && canchas.length === 0 && (
          <p className="text-center text-xl text-gray-500">
            No hay canchas disponibles para esta sede.
          </p>
        )}

        {/* Galería de Canchas (cuando hay datos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
          {canchas.map((cancha) => (
            <div
              key={cancha.id_cancha}
              className="bg-gray-800 rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-300 ease-in-out border border-gray-700 hover:border-blue-500 animate-fade-in"
            >
              {/* Imagen de la Cancha */}
              <img
                src={cancha.url_foto || 'https://via.placeholder.com/400x250/2563eb/e0e7ff?text=Cancha+Placeholder'}
                alt={`Imagen de ${cancha.nombre}`}
                className="w-full h-56 object-cover"
              />
              <div className="p-6">
                {/* Nombre y Sede */}
                <h3 className="text-3xl font-bold mb-2 text-blue-400">{cancha.nombre}</h3>
                {cancha.sede && (
                  <p className="text-lg text-gray-400 mb-3">
                    <i className="fas fa-map-marker-alt mr-2 text-blue-300"></i>
                    {cancha.sede.nombre} - {cancha.sede.distrito}
                  </p>
                )}
                {/* Detalles de la Cancha */}
                <p className="text-gray-300 mb-4 text-base leading-relaxed">{cancha.descripcion}</p>
                <div className="flex items-center justify-between mt-4 border-t border-gray-700 pt-4">
                  <span className="text-xl font-semibold text-green-400">
                    S/. {cancha.precio_hora.toFixed(2)} / hora
                  </span>
                  <span className="text-sm text-gray-400 flex items-center">
                    <i className="fas fa-futbol mr-2 text-yellow-400"></i>
                    {cancha.tipo_superficie}
                  </span>
                </div>
                {/* Botón de Reserva (solo si está logueado) */}
               {user && (
  <Link
    to={`/reservar/${cancha.id_cancha}`} // <-- ¡LA MAGIA! Enlace dinámico
    className="mt-6 block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 ease-in-out transform hover:scale-105"
  >
    Reservar Ahora
  </Link>
)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}