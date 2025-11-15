// src/pages/ReservaPage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx'; // (Revisa la ruta ../../)

const API_RESERVAS_URL = 'http://127.0.0.1:8002';

// Función para obtener la fecha de "hoy" en formato YYYY-MM-DD
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

export default function ReservaPage() {
  const { id_cancha } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [disponibilidad, setDisponibilidad] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // --- Estado para la hora actual y comparación ---
  const [now, setNow] = useState(new Date()); 

  // --- Efecto: Cargar disponibilidad ---
  useEffect(() => {
    if (!id_cancha || !selectedDate) return;
    
    setNow(new Date()); // Actualizamos la hora actual al cargar
    
    const fetchDisponibilidad = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `${API_RESERVAS_URL}/disponibilidad/`,
          { params: { id_cancha: id_cancha, fecha: selectedDate } }
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
  }, [id_cancha, selectedDate]); 

  // --- ¡NUEVO! Acción: Manejar la reserva (BLOQUEA Y REDIRIGE) ---
  const handleReservar = async (id_horario) => {
    if (!user) {
      alert("Debes iniciar sesión para reservar.");
      navigate('/login');
      return;
    }

    try {
      // 1. Llamamos al endpoint de BLOQUEO (puerto 8002)
      // Esto congela el horario con estado 'en_checkout'
      const response = await axios.post(
        `${API_RESERVAS_URL}/reservas/bloquear-horario`,
        { id_horario: id_horario },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // 2. Si el bloqueo es exitoso, actualizamos la UI a 'en_checkout'
      setDisponibilidad((prev) =>
        prev.map((horario) =>
          horario.id_horario === id_horario
            ? { ...horario, estado: 'en_checkout' } // ¡Cambiamos a estado temporal!
            : horario
        )
      );

      // 3. Redirigimos al Checkout
      alert(`Horario bloqueado temporalmente. Serás dirigido al Checkout para pagar.`);
      navigate(`/checkout/${id_horario}`); // Redirige a la nueva ruta

    } catch (err) {
      console.error("Error al intentar bloquear:", err);
      // Si el servidor falla (400 - ya reservado), mostramos el error
      setError(err.response?.data?.detail || "Error: Este horario ya no está disponible.");
      // Opcional: Forzar recarga para mostrar el estado real (reservado/en_checkout)
      // fetchDisponibilidad(); 
    }
  };

  // --- Función de Lógica de Deshabilitación (isHorarioPasado) ---
  const isHorarioPasado = (horario) => {
    const esHoy = selectedDate === getTodayString();
    if (!esHoy) return false; 
    
    const horaInicioBloque = horario.hora_inicio;
    const horaActual = now.toTimeString().split(' ')[0];
    
    return horaInicioBloque < horaActual;
  };

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
          min={getTodayString()}
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
          {disponibilidad.map((horario) => {
            
            // --- LÓGICA DE ESTADO ---
            const estaReservado = horario.estado === 'reservado';
            const estaEnCheckout = horario.estado === 'en_checkout';
            const estaPasado = isHorarioPasado(horario);
            const estaDeshabilitado = estaReservado || estaEnCheckout || estaPasado;
            
            let label = 'Disponible';
            let colorClass = 'bg-green-500 hover:bg-green-600';

            if (estaReservado) {
              label = 'Reservado';
              colorClass = 'bg-red-600 opacity-50';
            } else if (estaEnCheckout) {
              label = 'Pagando...';
              colorClass = 'bg-yellow-500 opacity-70';
            } else if (estaPasado) {
              label = 'Pasado';
              colorClass = 'bg-red-400 opacity-30';
            }

            return (
              <button
                key={horario.id_horario}
                onClick={() => handleReservar(horario.id_horario)}
                disabled={estaDeshabilitado} 
                className={`
                  p-4 rounded-lg font-bold text-center text-white
                  ${!estaDeshabilitado 
                    ? `${colorClass} transform hover:scale-105` 
                    : `${colorClass} cursor-not-allowed`
                  }
                  transition-all duration-200
                `}
              >
                {horario.hora_inicio.slice(0, 5)} {/* Muestra ej. 19:00 */}
                <span className="block text-xs font-normal">
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}