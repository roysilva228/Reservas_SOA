// src/pages/CheckoutPage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_RESERVAS_URL = 'http://127.0.0.1:8002';
const API_CANCHAS_URL = 'http://127.0.0.1:8001';

export default function CheckoutPage() {
    const { id_horario } = useParams(); // ID del bloque de horario seleccionado
    const navigate = useNavigate();
    const { user, token } = useAuth();

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [horarioData, setHorarioData] = useState(null); 
    const [metodoPago, setMetodoPago] = useState('presencial'); // Por defecto: pago presencial

    // --- Efecto: Validar y Obtener Detalle del Horario (SIMULADO) ---
    useEffect(() => {
        if (!user || !token || !id_horario) {
            navigate('/login');
            return;
        }

        const fetchDetalle = async () => {
            // NOTA: En un sistema real, haríamos una sola llamada para obtener todos los detalles
            // de la cancha y el horario. Aquí simulamos la data para simplificar,
            // pero el precio debe venir de la base de datos.
            
            try {
                // Simulación para obtener el precio de la cancha (se podría mejorar)
                const horarioID = parseInt(id_horario, 10);

                // SIMULAMOS DATOS DE PRUEBA:
                setHorarioData({
                    id_horario: horarioID,
                    cancha_nombre: "Cancha Principal Miraflores",
                    fecha: "2025-11-15",
                    hora_inicio: "19:00",
                    hora_fin: "20:00",
                    monto: 120.50, // Precio ficticio
                    sede: "CanchaApp Miraflores"
                });

            } catch (err) {
                 setError('No se pudo cargar el detalle del horario. Por favor, vuelve a la página anterior.');
            } finally {
                 setLoading(false);
            }
        };

        fetchDetalle();

    }, [id_horario, user, token, navigate]);

    // --- Acción: Finalizar la Reserva y Pago ---
    const handleCheckout = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const dataToSend = {
            id_horario: horarioData.id_horario,
            metodo_pago: metodoPago, // 'presencial' u 'online'
        };

        try {
            // Llamamos al endpoint de reserva modificado (puerto 8002)
            const response = await axios.post(`${API_RESERVAS_URL}/reservas/crear`, dataToSend, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Éxito: La reserva se creó como PENDIENTE o CONFIRMADA
            alert(`¡Reserva Iniciada! Estado: ${response.data.estado_reserva.toUpperCase()}. Te redirigiremos a tu historial.`);
            
            // Redirigir al historial (Página 'Mis Reservas')
            navigate('/mis-reservas');

        } catch (err) {
            console.error('Error durante el checkout:', err);
            setError(err.response?.data?.detail || 'Error al procesar el pago/reserva.');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !horarioData) {
        return <div className="text-center p-10">Cargando detalles de checkout...</div>;
    }

    return (
        <div className="container mx-auto max-w-4xl p-6 min-h-screen bg-gray-50">
            <h1 className="text-4xl font-bold text-gray-800 mb-6">Finalizar Reserva</h1>
            
            <div className="flex flex-col md:flex-row gap-8">
                {/* --- Columna Izquierda: Resumen de la Reserva --- */}
                <div className="md:w-1/2 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <h2 className="text-2xl font-semibold mb-4 text-blue-600 border-b pb-2">Resumen del Pedido</h2>
                    
                    <div className="space-y-3 text-gray-700">
                        <p className="flex justify-between">
                            <span className="font-medium">Cancha:</span>
                            <span className="font-semibold">{horarioData.cancha_nombre}</span>
                        </p>
                        <p className="flex justify-between">
                            <span className="font-medium">Sede:</span>
                            <span>{horarioData.sede}</span>
                        </p>
                        <p className="flex justify-between">
                            <span className="font-medium">Fecha/Hora:</span>
                            <span>{horarioData.fecha} @ {horarioData.hora_inicio} - {horarioData.hora_fin}</span>
                        </p>
                        
                        <div className="border-t pt-4 mt-4">
                            <p className="flex justify-between text-2xl font-bold text-green-600">
                                <span>TOTAL A PAGAR:</span>
                                <span>S/. {horarioData.monto.toFixed(2)}</span>
                            </p>
                        </div>
                    </div>
                    
                    <Link to="/" className="mt-4 inline-block text-blue-500 hover:underline text-sm">
                        ← Volver a la página principal
                    </Link>

                </div>

                {/* --- Columna Derecha: Métodos de Pago --- */}
                <div className="md:w-1/2">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">Selecciona el Pago</h2>
                    
                    {error && <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded mb-4">{error}</div>}

                    <form onSubmit={handleCheckout} className="space-y-4">
                        
                        {/* Opción 1: Pago Presencial (Modo Físico) */}
                        <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${metodoPago === 'presencial' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-300 bg-white'}`}>
                            <input
                                type="radio"
                                name="metodoPago"
                                value="presencial"
                                checked={metodoPago === 'presencial'}
                                onChange={() => setMetodoPago('presencial')}
                                className="mr-3"
                            />
                            <span className="font-bold text-gray-900">Pago Presencial (Modo IPD/Físico)</span>
                            <p className="text-sm text-gray-600 mt-1">Paga en efectivo o con tarjeta en la sede antes de empezar. Tu reserva queda como **Pendiente** hasta la confirmación del Admin.</p>
                        </label>

                        {/* Opción 2: Pago Online (Simulado) */}
                        <label className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${metodoPago === 'online' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-300 bg-white'}`}>
                            <input
                                type="radio"
                                name="metodoPago"
                                value="online"
                                checked={metodoPago === 'online'}
                                onChange={() => setMetodoPago('online')}
                                className="mr-3"
                            />
                            <span className="font-bold text-gray-900">Pago con Tarjeta (Simulado)</span>
                            <p className="text-sm text-gray-600 mt-1">Simulación de pago inmediato. La reserva se confirma al instante.</p>
                        </label>
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-green-600 p-3 text-white text-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Procesando...' : `Reservar y ${metodoPago === 'presencial' ? 'Pagar en Sede' : 'Confirmar Pago'}`}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}