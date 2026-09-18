const URL_API_RESERVAS = process.env.URL_API_RESERVAS || "https://siding-rover-wanting.ngrok-free.dev/api_whatsapp/reservar";

async function enviarReservaAPI(telefono, datosReserva) {
  console.log(`-> Conectando con la API independiente para ${telefono}...`);
  
  try {
    const response = await fetch(URL_API_RESERVAS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        telefono: telefono,
        nombre: datosReserva.nombre || "Cliente WhatsApp", 
        fecha: datosReserva.fecha, 
        hora: datosReserva.hora,
        plazas: datosReserva.plazas || 1
      })
    });

    const data = await response.json();
    
    if (data.success) {
        console.log(`-> ¡Éxito! Localizador generado: ${data.localizador}`);
        return data.localizador;
    } else {
        console.error("-> API rechazó la reserva:", data.error);
        return false;
    }
    
  } catch (error) {
    console.error("-> Error de red al contactar la API:", error.message);
    return false;
  }
}

module.exports = { enviarReservaAPI };