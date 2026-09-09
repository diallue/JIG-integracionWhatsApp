const express = require('express');
const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

const colaInscripciones = new Map(); 

app.post('/inscribir-alumno', async (req, res) => {
  const { email, nombreCurso } = req.body;
  
  colaInscripciones.set(nombreCurso, { emailAlumno: email });

  await crearGrupoCurso(nombreCurso);
  
  res.json({ status: "Procesando inscripción, esperando a Meta..." });
});

app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

app.post('/', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  
  res.status(200).end();

  try {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const field = change?.field;

      if (field === 'messages') {
        const message = value?.messages?.[0];
        
        if (message && message.type === 'text') {
          const textoRecibido = message.text.body
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
            
          const telefonoUsuario = message.from;
          console.log(`[MENSAJE ENTRANTE] De: ${telefonoUsuario} | Texto limpio: ${textoRecibido}`);
          
          const intencionHorario = /\b(horario|horarios|hora|horas|clase|clases|calendario|turno|turnos|agenda)\b/;
          
          if (intencionHorario.test(textoRecibido)) {
            enviarPlantillaHorarios(telefonoUsuario);
          } else {
            console.log("Mensaje genérico recibido, no requiere respuesta automatizada.");
          }
        }
      }

      else if (field === 'group_lifecycle_update') {
        const action = value?.action;
        const inviteLink = value?.invite_link;
        const groupSubject = value?.subject; 

        if ((action === 'created' || inviteLink) && groupSubject) {
          console.log(`[WEBHOOK] Enlace recibido para: ${groupSubject}`);
          
          const nombreCurso = groupSubject.replace("Logroño Deporte - ", "");
          
          const datosPendientes = colaInscripciones.get(nombreCurso);
          
          if (datosPendientes) {
             console.log(`Enviando enlace automáticamente a ${datosPendientes.emailAlumno}`);
             
             enviarEmailInvitacion(datosPendientes.emailAlumno, inviteLink, nombreCurso);
             
             colaInscripciones.delete(nombreCurso);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error procesando el payload del webhook:", error);
  }
});

app.post('/nueva-inscripcion', async (req, res) => {
  const { telefono, curso } = req.body;

  if (!telefono || !curso) {
    return res.status(400).json({ error: "Faltan datos de teléfono o curso" });
  }

  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
  
  const payload = {
  messaging_product: "whatsapp",
  to: telefono,
  type: "template",
  template: {
    name: "plantilla_por_defecto",
    language: { code: "es" },
    components: [
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: curso
          }
        ]
      }
    ]
  }
};

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      res.status(200).json({ status: "Mensaje enviado con éxito al alumno" });
    } else {
      console.error("DETALLE COMPLETO DE META:", JSON.stringify(data, null, 2));
      res.status(response.status).json({ error: "Fallo en Meta", detalles: data });
    }
  } catch (error) {
    console.error("Error en la petición:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Ruta temporal para probar la creación de grupos de Logroño Deporte
app.get('/test-grupo', async (req, res) => {
  console.log("Enviando petición a Meta para crear el grupo...");
  
  const resultado = await crearGrupoCurso("Pádel L-X 19:00");
  
  res.json({ 
    status: "Petición enviada a Meta", 
    aviso: "Revisa la pestaña Logs en Render. El enlace de invitación debería llegar por webhook en unos segundos.",
    respuesta_meta: resultado 
  });
});

// Ruta temporal para probar el envío de correos
app.get('/test-email', async (req, res) => {
  const miCorreoPersonal = "diallue@unirioja.es";
  
  const enlaceSimulado = "https://chat.whatsapp.com/ENLACE_DE_PRUEBA";
  
  console.log(`Enviando email de prueba a: ${miCorreoPersonal}`);
  
  await enviarEmailInvitacion(miCorreoPersonal, enlaceSimulado, "Pádel L-X (Prueba)");
  
  res.json({ 
    status: "Orden de email ejecutada", 
    destino: miCorreoPersonal,
    aviso: "Revisa tu bandeja de entrada o la carpeta de Spam."
  });
});

app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});

async function enviarMensajeTexto(destinatario, texto) {
  const url = `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: destinatario,
    type: "text",
    text: { 
      preview_url: true,
      body: texto 
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log("[AUTOMATIZACIÓN ENVIADA]:", result);
  } catch (error) {
    console.error("[ERROR HTTP]:", error);
  }
}

async function enviarPlantillaHorarios(destinatario) {
  const url = `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    to: destinatario,
    type: "template",
    template: { 
      name: "respuesta_horarios",
      language: { code: "es" } 
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log("[PLANTILLA DE HORARIOS ENVIADA]:", result);
  } catch (error) {
    console.error("[ERROR HTTP]:", error);
  }
}

async function crearGrupoCurso(nombreCurso) {
  const url = `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/groups`;
  
  const payload = {
    messaging_product: "whatsapp",
    subject: `Logroño Deporte - ${nombreCurso}`,
    description: `Grupo oficial de coordinación para el curso de ${nombreCurso}.`
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log("[PETICIÓN DE GRUPO ENVIADA]:", result);
    return result; 
  } catch (error) {
    console.error("[ERROR HTTP CREANDO GRUPO]:", error);
  }
}

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarEmailInvitacion(emailAlumno, enlaceGrupo, nombreCurso) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Logroño Deporte <onboarding@resend.dev>',
      to: emailAlumno,
      subject: `🔗 Enlace de WhatsApp - Curso: ${nombreCurso}`,
      html: `<p>Únete al grupo oficial aquí: <a href="${enlaceGrupo}">Unirme</a></p>`
    });

    if (error) console.error("Error de la API:", error);
    else console.log("[EMAIL ENVIADO A TRAVÉS DE HTTP/API]");
  } catch (err) {
    console.error("Error en la petición:", err);
  }
}
