import React from 'react';
import { jsPDF } from "jspdf";

export default function ReciboModal({ reserva, onClose }) {
  // Si no hay reserva, no mostramos nada
  if (!reserva) return null;

  // Validación de seguridad para fechas y horas
  const fechaSegura = reserva.fecha_reserva || new Date().toISOString();
  const dateObj = new Date(fechaSegura);
  const dateString = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isConfirmed = reserva.estado_reserva === 'confirmada';
  
  // Uso de ?. para evitar crashes si el dato viene nulo
  const horaInicio = reserva.hora_inicio ? reserva.hora_inicio.slice(0,5) : "--:--";
  const horaFin = reserva.hora_fin ? reserva.hora_fin.slice(0,5) : "--:--";
  const monto = reserva.monto_pagado || "0.00";

  // --- LÓGICA PARA GENERAR PDF ---
  const handleDownloadPDF = () => {
    try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [80, 150]
        });

        // Encabezado
        doc.setFillColor(30, 64, 175); 
        doc.rect(0, 0, 80, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("DeportivaMas", 40, 12, { align: "center" });

        // Cuerpo
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        let y = 30;
        
        // Estado
        doc.setFontSize(8);
        doc.setTextColor(isConfirmed ? 34 : 202, isConfirmed ? 197 : 138, isConfirmed ? 94 : 4);
        doc.text(isConfirmed ? "PAGO EXITOSO" : "PAGO PENDIENTE", 40, y, { align: "center" });
        y += 10;

        // Detalles
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text("Reserva:", 5, y);
        doc.text(`#${reserva.id_reserva}`, 75, y, { align: "right" });
        y += 7;

        doc.text("Cancha:", 5, y);
        // Validamos si existe el ID de cancha
        doc.text(`#${reserva.id_cancha_fk || '?' }`, 75, y, { align: "right" }); 
        y += 7;

        doc.text("Fecha:", 5, y);
        doc.setFontSize(9);
        doc.text(dateObj.toLocaleDateString(), 75, y, { align: "right" });
        doc.setFontSize(10);
        y += 7;

        doc.text("Hora:", 5, y);
        doc.text(`${horaInicio} - ${horaFin}`, 75, y, { align: "right" });
        y += 10;

        // Línea
        doc.setDrawColor(200, 200, 200);
        doc.line(5, y, 75, y);
        y += 7;

        // Total
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL", 5, y);
        doc.text(`S/. ${monto}`, 75, y, { align: "right" });

        // Pie
        y += 15;
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Gracias por tu preferencia.", 40, y, { align: "center" });
        doc.text("www.deportivamas.com", 40, y + 4, { align: "center" });

        doc.save(`Recibo_Reserva_${reserva.id_reserva}.pdf`);
    } catch (err) {
        console.error("Error generando PDF", err);
        alert("Hubo un error al generar el PDF. Revisa la consola.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold">&times;</button>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">⚽ DeportivaMas</h2>
          <p className="text-blue-100 text-xs mt-1 uppercase tracking-wider">Comprobante Digital</p>
        </div>

        <div className="p-6 bg-gray-50">
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase">Estado</span>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${isConfirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {isConfirmed ? 'Pagado' : 'Pendiente'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Reserva N°</span>
                <span className="font-bold text-gray-800">#{reserva.id_reserva}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Fecha</span>
                <span className="font-bold text-gray-800 text-right capitalize">{dateString}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Horario</span>
                <span className="font-bold text-gray-800">{horaInicio} - {horaFin}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-end">
              <span className="text-gray-600 font-medium">Total Pagado</span>
              <span className="text-2xl font-extrabold text-blue-600">S/. {monto}</span>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-white flex flex-col gap-3">
          <button 
            onClick={handleDownloadPDF}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95"
          >
            <span>📥</span> Descargar PDF
          </button>
          <button 
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}