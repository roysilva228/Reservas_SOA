import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_RESERVAS, API_CANCHAS } from '../config'; // <-- Importamos config

export default function CheckoutPage() {
    const { id_horario } = useParams(); 
    const navigate = useNavigate();
    const { user, token } = useAuth();

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [horarioData, setHorarioData] = useState(null); 
    const [metodoPago, setMetodoPago] = useState('presencial'); 

    useEffect(() => {
        if (!user || !token || !id_horario) {
            navigate('/login');
            return;
        }
        const fetchDetalle = async () => {
            try {
                // AQUÍ PODRÍAS HACER UN FETCH REAL A API_RESERVAS/detalle-horario SI LO IMPLEMENTAS
                // POR AHORA MANTENEMOS LA SIMULACIÓN PARA QUE NO SE ROMPA
                const horarioID = parseInt(id_horario, 10);
                setHorarioData({
                    id_horario: horarioID,
                    cancha_nombre: "Cancha Principal Miraflores",
                    fecha: "2025-11-15",
                    hora_inicio: "19:00",
                    hora_fin: "20:00",
                    monto: 120.50, 
                    sede: "CanchaApp Miraflores"
                });
            } catch (err) {
                 setError('No se pudo cargar el detalle del horario.');
            } finally {
                 setLoading(false);
            }
        };
        fetchDetalle();
    }, [id_horario, user, token, navigate]);

    const handleCheckout = async (e) => {
        e.preventDefault();
        setError(null);
        setProcessingPayment(true);

        const dataToSend = {
            id_horario: horarioData.id_horario,
            metodo_pago: metodoPago, 
        };

        try {
            // Usamos API_RESERVAS
            const response = await axios.post(`${API_RESERVAS}/reservas/crear`, dataToSend, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setTimeout(() => {
                const estado = response.data.estado_reserva.toUpperCase();
                alert(`¡Proceso Exitoso! Tu reserva está: ${estado}`);
                navigate('/mis-reservas');
            }, 2000);

        } catch (err) {
            console.error('Error checkout:', err);
            setError(err.response?.data?.detail || 'Error al procesar la reserva.');
            setProcessingPayment(false);
        }
    };

    if (loading || !horarioData) {
        return <div className="min-h-screen flex justify-center items-center bg-gray-50"><p className="text-lg text-gray-500 animate-pulse">Cargando detalles...</p></div>;
    }

    return (
        <div className="container mx-auto max-w-4xl p-6 min-h-screen bg-gray-50">
            <h1 className="text-4xl font-bold text-gray-800 mb-8">Finalizar Reserva</h1>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/2 bg-white p-8 rounded-2xl shadow-lg border border-gray-100 h-fit">
                    <h2 className="text-2xl font-bold mb-6 text-blue-600 border-b pb-4">Resumen del Pedido</h2>
                    <div className="space-y-4 text-gray-700 text-lg">
                        <div className="flex justify-between"><span className="font-medium text-gray-500">Cancha</span><span className="font-bold text-gray-900">{horarioData.cancha_nombre}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-gray-500">Sede</span><span className="font-semibold">{horarioData.sede}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-gray-500">Fecha</span><span className="font-semibold">{horarioData.fecha}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-gray-500">Horario</span><span className="font-semibold text-blue-600">{horarioData.hora_inicio} - {horarioData.hora_fin}</span></div>
                        <div className="border-t border-dashed border-gray-300 pt-6 mt-6"><div className="flex justify-between items-center"><span className="text-xl font-bold text-gray-800">Total a Pagar</span><span className="text-3xl font-extrabold text-green-600">S/. {horarioData.monto.toFixed(2)}</span></div></div>
                    </div>
                    <Link to="/" className="mt-8 inline-block text-gray-500 hover:text-blue-600 hover:underline text-sm transition-colors">← Cancelar y volver</Link>
                </div>
                <div className="md:w-1/2">
                    <h2 className="text-2xl font-semibold mb-6 text-gray-800">Método de Pago</h2>
                    {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 shadow-sm"><p className="font-bold">Error</p><p>{error}</p></div>}
                    <form onSubmit={handleCheckout} className="space-y-5">
                        <label className={`relative flex items-start p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${metodoPago === 'presencial' ? 'border-blue-500 bg-blue-50/50 shadow-md ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <input type="radio" name="metodoPago" value="presencial" checked={metodoPago === 'presencial'} onChange={() => setMetodoPago('presencial')} className="mt-1 mr-4 h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500" />
                            <div><span className="block font-bold text-gray-900 text-lg">Pago en Sede</span><span className="block text-sm text-gray-500 mt-1">Reserva ahora y paga en efectivo o tarjeta al llegar a la cancha.</span></div>
                        </label>
                        <label className={`relative flex items-start p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${metodoPago === 'online' ? 'border-blue-500 bg-blue-50/50 shadow-md ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <input type="radio" name="metodoPago" value="online" checked={metodoPago === 'online'} onChange={() => setMetodoPago('online')} className="mt-1 mr-4 h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500" />
                            <div><span className="block font-bold text-gray-900 text-lg">Tarjeta de Crédito / Débito</span><span className="block text-sm text-gray-500 mt-1">Pago seguro inmediato. Confirmación automática.</span></div>
                        </label>
                        <button type="submit" disabled={processingPayment} className={`w-full rounded-xl p-4 text-white text-lg font-bold shadow-lg transition-all transform active:scale-95 flex justify-center items-center gap-2 ${processingPayment ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'}`}>
                            {processingPayment ? ( <>Procesando Pago...</> ) : ( `Confirmar y Pagar S/. ${horarioData.monto.toFixed(2)}` )}
                        </button>
                        <p className="text-center text-xs text-gray-400">Al confirmar, aceptas nuestros términos y condiciones de uso.</p>
                    </form>
                </div>
            </div>
        </div>
    );
}