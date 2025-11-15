// src/pages/ReservaPage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // Para enviar el token

// Función para obtener la fecha de "hoy" en formato YYYY-MM-DD
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

export default function ReservaPage() {
  // --- Hooks ---
  const { id_cancha } = useParams(); // Obtiene el "id_cancha" de la URL
  const { user, token } = useAuth(); // Obtiene el usuario y su token del "bolsillo"
  const navigate = useNavigate();

  // --- Estados ---
  const [disponibilidad, setDisponibilidad] = useState([]); // Array de horarios
  const [selectedDate, setSelectedDate] = useState(getTodayString()); // Calendario
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Efecto: Cargar disponibilidad ---
  // Se ejecuta al cargar la página y cada vez que 'selectedDate' o 'id_cancha' cambian
  useEffect(() => {
    if (!id_cancha || !selectedDate) return;

    const fetchDisponibilidad = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Llama al NUEVO servicio (puerto 8002)
        const response = await axios.get(
          `http://127.0.0.1:8002/disponibilidad/`,
          {
            params: {
              id_cancha: id_cancha,
              fecha: selectedDate,
            },
          }
        );
        setDisponibilidad(response.data);
      } catch (err) {
        console.error("Error cargando disponibilidad:", err);
        setError("No se pudo cargar la disponibilidad para esta fecha.");
      } finally {
        setLoading(false);
      }
    };

    fetchDisponibilidad();
  }, [id_cancha, selectedDate]); // Dependencias del efecto

  // --- Acción: Manejar la reserva ---
  const handleReservar = async (id_horario) => {
    if (!user) {
      alert("Debes iniciar sesión para reservar.");
      navigate('/login');
      return;
    }

    try {
      // 2. Llama al endpoint de crear reserva (puerto 8002)
      // ¡¡IMPORTANTE: Enviamos el token en los headers!!
      const response = await axios.post(
        'http://127.0.0.1:8002/reservas/crear',
        {
          id_horario: id_horario, // El 'body' que espera la API
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`, // El "pase VIP"
          },
        }
      );

      // ¡Éxito!
      alert(`¡Reserva confirmada! (ID: ${response.data.id_reserva})`);

      // 3. Refrescar la lista de disponibilidad
      // Cambiamos el estado del horario reservado a "reservado"
      setDisponibilidad((prev) =>
        prev.map((horario) =>
          horario.id_horario === id_horario
            ? { ...horario, estado: 'reservado' }
            : horario
        )
      );

    } catch (err) {
      console.error("Error al crear la reserva:", err);
      // Mostramos el error que nos da el backend
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("No se pudo completar la reserva.");
      }
    }
  };

  // --- Renderizado de la Página ---
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">
        Reservar Cancha (ID: {id_cancha})
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Selecciona la fecha y la hora que deseas reservar.
      </p>

      {/* 1. Selector de Fecha */}
      <div className="mb-6">
        <label
          htmlFor="fecha-reserva"
          className="block text-lg font-medium text-gray-700 mb-2"
        >
          Selecciona una fecha:
        </label>
        <input
          type="date"
          id="fecha-reserva"
          className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg shadow-sm"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={getTodayString()} // No se pueden reservar días pasados
        />
      </div>

      {/* 2. Lista de Horarios */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Horarios Disponibles
        </h2>
        {loading && <p className="text-blue-500">Cargando horarios...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && disponibilidad.length === 0 && (
          <p className="text-gray-500">
            No hay horarios cargados para este día. Por favor, selecciona otra fecha.
          </p>
        )}

        {/* La "Agenda" */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {disponibilidad.map((horario) => (
            <button
              key={horario.id_horario}
              onClick={() => handleReservar(horario.id_horario)}
              disabled={horario.estado !== 'disponible'} // Deshabilitado si no está disponible
              className={`
                p-4 rounded-lg font-bold text-center text-white
                ${horario.estado === 'disponible' 
                  ? 'bg-green-500 hover:bg-green-600 transform hover:scale-105' 
                  : 'bg-red-400 opacity-50 cursor-not-allowed'
                }
                transition-all duration-200
              `}
            >
              {horario.hora_inicio.slice(0, 5)} {/* Muestra ej. 19:00 */}
              <span className="block text-xs font-normal">
                {horario.estado === 'disponible' ? 'Disponible' : 'Reservado'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}