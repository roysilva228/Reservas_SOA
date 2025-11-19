// src/pages/MisReservasPage.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_RESERVAS_URL = 'http://127.0.0.1:8002';

export default function MisReservasPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Efecto: Cargar Reservas ---
    useEffect(() => {
        if (!user || !token) {
            navigate('/login');
            return;
        }

        const fetchReservas = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_RESERVAS_URL}/reservas/mi-historial`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setReservas(response.data);
            } catch (err) {
                console.error("Error al cargar historial:", err);
                setError('No se pudo cargar tu historial de reservas. Inténtalo de nuevo.');
            } finally {
                setLoading(false);
            }
        };

        fetchReservas();
    }, [user, token, navigate]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-blue-200 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
        </div>
    );

    if (error) return (
        <div className="container mx-auto p-6 mt-10">
             <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-red-700 text-center shadow-sm">
                <p className="font-bold">Error</p>
                <p>{error}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                {/* Encabezado */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Mis Reservas</h1>
                        <p className="text-gray-500 mt-2">Historial de tus partidos y actividades.</p>
                    </div>
                    
                    {/* Resumen rápido (opcional) */}
                    <div className="mt-4 md:mt-0 bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Reservas</span>
                        <div className="text-2xl font-bold text-blue-600 text-center">{reservas.length}</div>
                    </div>
                </div>
                
                {reservas.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-200">
                        <div className="text-6xl mb-4">⚽</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Aún no tienes reservas</h3>
                        <p className="text-gray-500 mb-6">¿Listo para jugar? Reserva tu primera cancha ahora.</p>
                        <button 
                            onClick={() => navigate('/')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:-translate-y-1"
                        >
                            Explorar Canchas
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reservas.map((reserva) => {
                            const isConfirmed = reserva.estado_reserva === 'confirmada';
                            const dateObj = new Date(reserva.fecha_reserva);
                            // Formatear fecha bonita (ej: "Lun, 15 Nov")
                            const dateString = dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

                            return (
                                <div 
                                    key={reserva.id_reserva} 
                                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col"
                                >
                                    {/* Cabecera de la Tarjeta */}
                                    <div className={`h-2 w-full ${isConfirmed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                    
                                    <div className="p-6 flex flex-row justify-between items-start">
                                        {/* Info Principal */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reserva #{reserva.id_reserva}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                                                    isConfirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {reserva.estado_reserva}
                                                </span>
                                            </div>
                                            
                                            <h3 className="text-2xl font-bold text-gray-800 capitalize mb-1">
                                                {dateString}
                                            </h3>
                                            <div className="flex items-center text-gray-600 font-medium text-lg">
                                                <span className="mr-2">🕒</span> {reserva.hora_inicio.slice(0,5)}
                                            </div>
                                        </div>

                                        {/* Precio / Monto */}
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400 uppercase font-bold">Pagado</p>
                                            <p className="text-xl font-extrabold text-gray-900">S/. {reserva.monto_pagado}</p>
                                        </div>
                                    </div>

                                    {/* Footer de la tarjeta (Acciones o Info extra) */}
                                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                                        <span className="text-sm text-gray-500">
                                            {isConfirmed ? '✅ Pago exitoso' : '⏳ Pago en proceso'}
                                        </span>
                                        {/* Aquí podrías poner un botón "Ver Detalle" o "Cancelar" en el futuro */}
                                        <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold">Ver recibo →</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}