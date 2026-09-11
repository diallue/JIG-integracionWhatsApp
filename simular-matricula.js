const URL_API = "https://JIG-integracionWhatsApp.onrender.com/api/inscribir-alumno";

async function probarInscripcion() {
  const datosMatricula = {
    email: "diallue@unirioja.es",
    nombreCurso: "Pilates Avanzado"
  };

  console.log(`Enviando matrícula de prueba a: ${URL_API}...`);

  try {
    const respuesta = await fetch(URL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosMatricula)
    });

    const resultado = await respuesta.json();
    
    console.log("-----------------------------------");
    console.log("CÓDIGO HTTP:", respuesta.status);
    console.log("RESPUESTA:", resultado);
    console.log("-----------------------------------");
    
  } catch (error) {
    console.error("Error al conectar con el servidor:", error.message);
  }
}

probarInscripcion();