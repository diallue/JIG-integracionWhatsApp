const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarEmailInvitacion(emailAlumno, enlaceGrupo, nombreCurso) {
  const asunto = `Bienvenido al curso de ${nombreCurso} - Logroño Deporte`;
  const cuerpo = `
    ¡Hola!
    
    Te confirmamos tu inscripción en el curso de ${nombreCurso}.
    
    Para facilitar la comunicación con el monitor y el resto de compañeros, 
    hemos creado un grupo oficial de WhatsApp. Puedes unirte haciendo clic en el siguiente enlace:
    
    ${enlaceGrupo}
    
    ¡Te esperamos!
    Logroño Deporte.
  `;

  console.log(`[EMAIL ENVIADO a ${emailAlumno}]:`);
  console.log(`Asunto: ${asunto}`);
  console.log(`Cuerpo: ${cuerpo}`);
  
  return true;
}

module.exports = { enviarEmailInvitacion };