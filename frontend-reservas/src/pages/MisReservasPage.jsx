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
        // Si el usuario no está logueado, lo mandamos al login
        if (!user || !token) {
            navigate('/login');
            return;
        }

        const fetchReservas = async () => {
            setLoading(true);
            try {
                // Llamamos al endpoint que acabamos de crear (puerto 8002)
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

    if (loading) return <div className="text-center p-10 text-lg">Cargando historial...</div>;
    if (error) return <div className="text-center p-10 text-red-600 border border-red-300 bg-red-50 m-10">{error}</div>;

    return (
        <div className="container mx-auto p-6 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Mi Historial de Reservas</h1>
            
            {reservas.length === 0 ? (
                <div className="text-center p-10 border-2 border-gray-300 rounded-lg bg-gray-100">
                    <p className="text-xl text-gray-600">Aún no tienes reservas creadas.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {reservas.map((reserva) => (
                        <div 
                            key={reserva.id_reserva} 
                            className={`p-6 rounded-xl shadow-lg border-l-4 
                                ${reserva.estado_reserva === 'confirmada' ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}
                            `}
                        >
                            <p className="text-lg font-bold flex justify-between items-center">
                                Reserva #{reserva.id_reserva}
                                <span className={`text-sm px-3 py-1 rounded-full text-white 
                                    ${reserva.estado_reserva === 'confirmada' ? 'bg-green-600' : 'bg-yellow-600'}
                                `}>
                                    {reserva.estado_reserva.toUpperCase()}
                                </span>
                            </p>
                            <p className="text-gray-700 mt-2">
                                <span className="font-semibold">Fecha:</span> {reserva.fecha_reserva}
                            </p>
                            <p className="text-gray-700">
                                <span className="font-semibold">Horario:</span> {reserva.hora_inicio}
                            </p>
                            <p className="text-gray-900 mt-3 font-bold">Monto pagado: S/. {reserva.monto_pagado}</p>
                            {/* Aquí puedes añadir botones de Cancelar o Ver Detalle */}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}