const URL_API_RESERVAS = process.env.URL_API_RESERVAS || "https://tu-api-mock.com/reservar";

async function enviarReservaAPI(telefono, datosReserva) {
  console.log(`-> Enviando datos a la API de reservas para el número ${telefono}...`);
  
  try {
    const response = await fetch(URL_API_RESERVAS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telefono: telefono,
        fecha: datosReserva.fecha,
        hora: datosReserva.hora,
        origen: 'whatsapp_bot'
      })
    });

    const data = await response.json();
    return true;
    
  } catch (error) {
    console.error("-> Error al conectar con la API de reservas:", error.message);
    return false;
  }
}

module.exports = { enviarReservaAPI };