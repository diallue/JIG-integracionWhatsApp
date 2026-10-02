const { Resend } = require('resend');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function enviarEmailInvitacion(emailAlumno, enlaceGrupo, nombreCurso) {
  if (!process.env.RESEND_API_KEY || !resend) {
    throw new Error('RESEND_API_KEY no configurada. No se puede enviar el email.');
  }

  if (!emailAlumno || !enlaceGrupo || !nombreCurso) {
    throw new Error('Faltan datos para enviar el email de invitaci?n.');
  }

  const asunto = `Bienvenido al curso de ${nombreCurso} - Logro?o Deporte`;
  const cuerpo = `
    ?Hola!
    
    Te confirmamos tu inscripci?n en el curso de ${nombreCurso}.
    
    Para facilitar la comunicaci?n con el monitor y el resto de compa?eros, 
    hemos creado un grupo oficial de WhatsApp. Puedes unirte haciendo clic en el siguiente enlace:
    
    ${enlaceGrupo}
    
    ?Te esperamos!
    Logro?o Deporte.
  `;

  console.log(`[EMAIL ENVIADO a ${emailAlumno}]:`);
  console.log(`Asunto: ${asunto}`);

  const { data, error } = await resend.emails.send({
    from: 'Logro?o Deporte <onboarding@resend.dev>',
    to: emailAlumno,
    subject: asunto,
    text: cuerpo
  });

  if (error) {
    throw new Error(error.message || 'Error inesperado al enviar el email.');
  }

  return data;
}

module.exports = { enviarEmailInvitacion };
