const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarEmailInvitacion(emailAlumno, enlaceGrupo, nombreCurso) {
  try {
    const { error } = await resend.emails.send({
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
module.exports = { enviarEmailInvitacion };