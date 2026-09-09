const express = require('express');
const router = express.Router();
const { colaInscripciones } = require('../utils/queue');
const { crearGrupoCurso } = require('../services/whatsapp.service');
const { enviarEmailInvitacion } = require('../services/email.service');

router.post('/inscribir-alumno', async (req, res) => {
  colaInscripciones.set(req.body.nombreCurso, { emailAlumno: req.body.email });
  await crearGrupoCurso(req.body.nombreCurso);
  res.json({ status: "Procesando inscripción..." });
});

router.get('/mock-webhook', async (req, res) => {
  const nombreCurso = "Pádel L-X";
  colaInscripciones.set(nombreCurso, { emailAlumno: "diallue@unirioja.es" });
  
  const mockPayload = {
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ field: 'group_lifecycle_update', value: { action: 'created', subject: `Logroño Deporte - ${nombreCurso}`, invite_link: 'https://chat.whatsapp.com/FALSO' } }] }]
  };
  
  await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mockPayload) });
  res.json({ status: "Simulación ejecutada" });
});

module.exports = router;