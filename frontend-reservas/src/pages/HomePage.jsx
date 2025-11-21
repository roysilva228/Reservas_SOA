// src/pages/HomePage.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; 
import { Link } from 'react-router-dom';

// 1. IMPORTAMOS LA CONFIGURACIÓN CENTRALIZADA
import { API_CANCHAS } from '../config';

import imagenFondo from '../assets/Banner.webp'; 

export default function HomePage() {
  const { user } = useAuth();
  const [canchas, setCanchas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [selectedSede, setSelectedSede] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // YA NO DEFINIMOS LA URL AQUÍ MANUALMENTE
    // const API_URL = 'http://127.0.0.1:8001'; <-- ESTO SE VA

    const fetchSedesAndCanchas = async () => {
      setLoading(true);
      setError(null);
      try {
        // 2. USAMOS LA CONSTANTE IMPORTADA
        const sedesResponse = await axios.get(`${API_CANCHAS}/sedes/`);
        setSedes(sedesResponse.data);

        const params = {};
        if (selectedSede) {
          params.id_sede = selectedSede;
        }
        
        // 2. USAMOS LA CONSTANTE IMPORTADA
        const canchasResponse = await axios.get(`${API_CANCHAS}/canchas/`, { params });
        setCanchas(canchasResponse.data);

      } catch (err) {
        console.error("Error cargando datos:", err);
        setError("No pudimos cargar las canchas o sedes. Inténtalo más tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchSedesAndCanchas();
  }, [selectedSede]);

  const handleSedeChange = (e) => {
    setSelectedSede(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* --- SECCIÓN HERO VIBRANTE --- */}
      <section 
        className="relative h-[500px] flex items-center justify-center overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${imagenFondo})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-gray-50"></div>
        
        <div className="relative z-10 text-center px-4 mt-10">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-xl animate-fade-in-down">
            Tu deporte, <span className="text-yellow-400">tu cancha.</span>
          </h1>
          <p className="mt-6 text-xl md:text-2xl font-medium text-white drop-shadow-md animate-fade-in-up max-w-2xl mx-auto">
            Reserva en segundos y juega por horas. La mejor experiencia deportiva empieza aquí.
          </p>
          
          {!user && (
             <Link to="/register" className="mt-8 inline-block bg-green-500 hover:bg-green-600 text-white text-lg font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300">
                ¡Regístrate Gratis!
             </Link>
          )}
        </div>
      </section>

      {/* Contenido Principal */}
      <div className="container mx-auto px-4 py-12 -mt-20 relative z-20">
        
        {user && (
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-md mb-8 text-center border-l-4 border-blue-500 animate-fade-in">
            <p className="text-lg text-gray-700">
              Hola, <span className="font-bold text-blue-600 capitalize">{user.nombre || 'Campeón'}</span>. ¡Es un buen día para jugar!
            </p>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-lg mb-10 flex flex-col md:flex-row items-center justify-between border border-gray-100">
          <label htmlFor="sede-select" className="text-2xl font-bold text-gray-800 mb-4 md:mb-0 flex items-center gap-2">
            <span className="text-blue-500">📍</span> Explorar Sedes
          </label>
          <div className="w-full md:w-1/3">
            <select
              id="sede-select"
              className="w-full p-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-700 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
        </div>

        {loading && (
          <div className="flex justify-center py-20">
             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          </div>
        )}
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg text-center border border-red-200">
            {error}
          </div>
        )}
        
        {!loading && !error && canchas.length === 0 && (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
             <p className="text-2xl text-gray-400 font-light">No encontramos canchas en esta sede 😔</p>
             <button onClick={() => setSelectedSede('')} className="mt-4 text-blue-500 underline hover:text-blue-700">Ver todas las sedes</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {canchas.map((cancha) => (
            <div
              key={cancha.id_cancha}
              className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100 flex flex-col"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={cancha.url_foto || 'https://via.placeholder.com/400x250/2563eb/e0e7ff?text=Cancha+Placeholder'}
                  alt={`Imagen de ${cancha.nombre}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md">
                   {cancha.tipo_superficie || 'General'}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                        {cancha.nombre}
                    </h3>
                    {cancha.sede && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                        <span className="text-red-500">Ubicación:</span>
                        {cancha.sede.nombre}
                    </p>
                    )}
                </div>
                
                <p className="text-gray-600 text-sm mb-6 line-clamp-3 flex-1">
                    {cancha.descripcion || "¡Disfruta de un gran partido en nuestras instalaciones de primera calidad!"}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Precio por hora</p>
                     <span className="text-2xl font-extrabold text-gray-800">
                        S/. {cancha.precio_hora.toFixed(2)}
                     </span>
                  </div>
                  
                  {user ? (
                    <Link
                      to={`/reservar/${cancha.id_cancha}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1"
                    >
                      Reservar
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="text-blue-500 font-semibold hover:text-blue-700 underline decoration-2 underline-offset-4"
                    >
                      Inicia sesión
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}