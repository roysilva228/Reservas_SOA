// src/pages/ReservaPage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API_RESERVAS_URL = 'http://127.0.0.1:8002';
const API_CANCHAS_URL = 'http://127.0.0.1:8001'; // Agregamos esto para traer info de la cancha

// Función para obtener la fecha de "hoy" en formato YYYY-MM-DD
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

export default function ReservaPage() {
  const { id_cancha } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Estados
  const [canchaInfo, setCanchaInfo] = useState(null); // Para guardar nombre, foto, precio
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(new Date()); 

  // --- 1. Cargar Información de la Cancha (Nombre, Foto, Precio) ---
  useEffect(() => {
    const fetchCanchaInfo = async () => {
        try {
            const res = await axios.get(`${API_CANCHAS_URL}/canchas/${id_cancha}`);
            setCanchaInfo(res.data);
        } catch (err) {
            console.error("Error cargando info de cancha:", err);
            setError("No pudimos encontrar los detalles de la cancha.");
        }
    };
    fetchCanchaInfo();
  }, [id_cancha]);

  // --- 2. Cargar Disponibilidad (Horarios) ---
  useEffect(() => {
    if (!id_cancha || !selectedDate) return;
    
    setNow(new Date()); 
    
    const fetchDisponibilidad = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_RESERVAS_URL}/disponibilidad/`,
          { params: { id_cancha: id_cancha, fecha: selectedDate } }
        );
        setDisponibilidad(response.data);
      } catch (err) {
        console.error("Error cargando disponibilidad:", err);
        // No mostramos error fatal, solo lista vacía si falla
      } finally {
        setLoading(false);
      }
    };

    fetchDisponibilidad();
  }, [id_cancha, selectedDate]); 

  // --- Acción: Reservar ---
  const handleReservar = async (id_horario) => {
    if (!user) {
      alert("Debes iniciar sesión para reservar.");
      navigate('/login');
      return;
    }

    try {
      await axios.post(
        `${API_RESERVAS_URL}/reservas/bloquear-horario`,
        { id_horario: id_horario },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Actualizar UI optimista
      setDisponibilidad((prev) =>
        prev.map((horario) =>
          horario.id_horario === id_horario ? { ...horario, estado: 'en_checkout' } : horario
        )
      );

      navigate(`/checkout/${id_horario}`); 

    } catch (err) {
      alert(err.response?.data?.detail || "Error: Este horario ya no está disponible.");
    }
  };

  // --- Lógica de validación de hora ---
  const isHorarioPasado = (horario) => {
    const esHoy = selectedDate === getTodayString();
    if (!esHoy) return false; 
    const horaInicioBloque = horario.hora_inicio;
    const horaActual = now.toTimeString().split(' ')[0];
    return horaInicioBloque < horaActual;
  };

  if (error) return <div className="p-10 text-center text-red-500 font-bold">{error}</div>;
  if (!canchaInfo && loading) return <div className="p-10 text-center text-gray-500">Cargando experiencia...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- COLUMNA IZQUIERDA: INFO CANCHA --- */}
            <div className="lg:col-span-1">
                {canchaInfo && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden sticky top-6">
                        <div className="h-48 overflow-hidden relative">
                             <img 
                                src={canchaInfo.url_foto || 'https://via.placeholder.com/400x250?text=Cancha'} 
                                alt={canchaInfo.nombre} 
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 rounded-bl-lg font-bold text-sm">
                                {canchaInfo.tipo_superficie}
                            </div>
                        </div>
                        <div className="p-6">
                            <h2 className="text-2xl font-extrabold text-gray-800 mb-2">{canchaInfo.nombre}</h2>
                            <p className="text-gray-500 text-sm mb-4 flex items-center gap-2">
                                <span>📍</span> {canchaInfo.sede ? canchaInfo.sede.nombre : 'Sede Principal'}
                            </p>
                            <p className="text-gray-600 text-sm mb-6 italic">
                                "{canchaInfo.descripcion || 'La mejor cancha para tu partido.'}"
                            </p>
                            <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                <span className="text-sm text-gray-400 font-medium uppercase">Precio x Hora</span>
                                <span className="text-3xl font-bold text-green-600">S/. {canchaInfo.precio_hora}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- COLUMNA DERECHA: CALENDARIO Y HORARIOS --- */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Selector de Fecha */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Selecciona una fecha</h3>
                        <p className="text-sm text-gray-500">Busca disponibilidad para tu partido</p>
                    </div>
                    <input
                        type="date"
                        className="block w-full sm:w-auto px-4 py-2 rounded-lg border-gray-300 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={getTodayString()}
                    />
                </div>

                {/* Grilla de Horarios */}
                <div className="bg-white p-8 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
                        Horarios Disponibles para el <span className="text-blue-600">{selectedDate}</span>
                    </h3>

                    {loading ? (
                        <div className="py-10 text-center text-gray-400 animate-pulse">Buscando espacios libres...</div>
                    ) : disponibilidad.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-gray-400 text-lg">😕 No hay horarios disponibles para esta fecha.</p>
                            <button onClick={() => setSelectedDate(getTodayString())} className="text-blue-500 text-sm mt-2 hover:underline">Ver hoy</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {disponibilidad.map((horario) => {
                                const reservado = horario.estado === 'reservado';
                                const checkout = horario.estado === 'en_checkout';
                                const pasado = isHorarioPasado(horario);
                                const disabled = reservado || checkout || pasado;

                                return (
                                    <button
                                        key={horario.id_horario}
                                        onClick={() => handleReservar(horario.id_horario)}
                                        disabled={disabled}
                                        className={`
                                            relative group py-3 px-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center
                                            ${disabled 
                                                ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-60' 
                                                : 'bg-white border-blue-100 hover:border-blue-500 hover:shadow-md hover:-translate-y-1'
                                            }
                                        `}
                                    >
                                        <span className={`text-lg font-bold ${disabled ? 'text-gray-400' : 'text-gray-800 group-hover:text-blue-600'}`}>
                                            {horario.hora_inicio.slice(0, 5)}
                                        </span>
                                        
                                        {/* Etiqueta de Estado */}
                                        <span className={`text-[10px] font-bold uppercase mt-1 px-2 py-0.5 rounded-full
                                            ${!disabled ? 'bg-green-100 text-green-700' : 
                                              pasado ? 'bg-gray-200 text-gray-500' :
                                              reservado ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}
                                        `}>
                                            {!disabled ? 'Disponible' : 
                                              pasado ? 'Finalizado' :
                                              reservado ? 'Ocupado' : 'En Proceso'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}