const express = require('express');
const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

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
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).end();
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
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "0",
          parameters: [
            {
              type: "payload",
              payload: "OPCION_SI"
            }
          ]
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "1",
          parameters: [
            {
              type: "payload",
              payload: "OPCION_NO"
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

app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
