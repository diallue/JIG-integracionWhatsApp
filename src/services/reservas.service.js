const URL_API_RESERVAS = process.env.URL_API_RESERVAS || "https://pruebareservas.jig.es/reservas/api_whatsapp/reservar";

const https = require('https'); 

async function enviarReservaAPI(telefono, datosReserva) {
  console.log(`-> Conectando con la API independiente para ${telefono}...`);
  
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  
  try {
    const response = await fetch(URL_API_RESERVAS, {
      method: 'POST',
      dispatcher: agent,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsAppBot/1.0'
      },
      body: JSON.stringify({
        telefono: telefono,
        nombre: datosReserva.nombre || "Cliente WhatsApp", 
        fecha: datosReserva.fecha, 
        hora: datosReserva.hora,
        plazas: datosReserva.plazas || 1
      })
    });

    const rawText = await response.text();
    
    try {
        const data = JSON.parse(rawText);
        
        if (data.success) {
            console.log(`-> ¡Éxito! Localizador generado: ${data.localizador}`);
            return data.localizador;
        } else {
            console.error("-> ❌ API rechazó la reserva:", data.error);
            return false;
        }
    } catch (parseError) {
        console.error("-> ❌ El servidor no devolvió JSON. Devolvió este HTML/Texto:");
        console.error(rawText.substring(0, 800) + "...");
        return false;
    }
    
  } catch (error) {
    console.error("-> ❌ Error de red al contactar la API:", error.message);
    
    if (error.message.includes('fetch failed')) {
         console.log("-> Reintentando con configuración de Node.js Legacy...");
         return await enviarReservaAPILegacy(telefono, datosReserva, agent);
    }
    
    return false;
  }
}

async function enviarReservaAPILegacy(telefono, datosReserva, agent) {
    try {
        const response = await fetch(URL_API_RESERVAS, {
            method: 'POST',
            agent: agent, // Sintaxis antigua
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'WhatsAppBot/1.0'
            },
            body: JSON.stringify({
              telefono: telefono,
              nombre: datosReserva.nombre || "Cliente WhatsApp", 
              fecha: datosReserva.fecha, 
              hora: datosReserva.hora,
              plazas: datosReserva.plazas || 1
            })
          });
          const rawText = await response.text();
          const data = JSON.parse(rawText);
          return data.success ? data.localizador : false;
    } catch (e) {
        console.error("-> ❌ Fallo también en Legacy:", e.message);
        return false;
    }
}

module.exports = { enviarReservaAPI };