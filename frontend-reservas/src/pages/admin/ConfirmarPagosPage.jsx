import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_RESERVAS } from '../../config';
import { useAuth } from '../../context/AuthContext';

export default function ConfirmarPagosPage() {
  const { token } = useAuth();
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Función para cargar la lista
  const fetchPendientes = async () => {
    try {
      const res = await axios.get(`${API_RESERVAS}/reservas/admin/pendientes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendientes(res.data);
    } catch (err) {
      console.error(err);
      alert("Error cargando pagos pendientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
  }, [token]);

  // Función para confirmar un pago individual
  const handleConfirmar = async (idReserva) => {
    if(!window.confirm(`¿Confirmar que la reserva #${idReserva} ha pagado?`)) return;

    try {
      await axios.post(`${API_RESERVAS}/reservas/admin/confirmar-pago/${idReserva}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Recargar la lista para quitar al que ya pagó
      fetchPendientes();
      alert("✅ Pago registrado exitosamente");
    } catch (err) {
      alert("Error al confirmar el pago");
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando deudores...</div>;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Caja: Pagos Pendientes en Sede</h1>
      
      {pendientes.length === 0 ? (
        <div className="bg-green-50 p-10 rounded-xl text-center border border-green-200">
          <h2 className="text-2xl font-bold text-green-700">¡Todo al día! 🎉</h2>
          <p className="text-green-600">No hay pagos pendientes por cobrar en este momento.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-600"># Reserva</th>
                <th className="p-4 font-semibold text-gray-600">Usuario ID</th>
                <th className="p-4 font-semibold text-gray-600">Fecha y Hora</th>
                <th className="p-4 font-semibold text-gray-600">Monto</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendientes.map((reserva) => (
                <tr key={reserva.id_reserva} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gray-800">#{reserva.id_reserva}</td>
                  <td className="p-4 text-gray-600">{reserva.id_usuario_fk}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{reserva.fecha_reserva}</div>
                    <div className="text-sm text-gray-500">{reserva.hora_inicio} - {reserva.hora_fin}</div>
                  </td>
                  <td className="p-4 font-bold text-red-600">S/. {reserva.monto_pagado}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleConfirmar(reserva.id_reserva)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm text-sm transition-all active:scale-95"
                    >
                      💵 Confirmar Cobro
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}