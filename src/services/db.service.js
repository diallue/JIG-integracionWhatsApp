const enlacesGuardados = new Map();

async function guardarEnlaceCurso(nombreCurso, enlace) {
  const clave = nombreCurso.toLowerCase().trim();
  enlacesGuardados.set(clave, enlace);
  console.log(`[DB] Enlace guardado para: ${clave}`);
  return true;
}

async function obtenerEnlaceCurso(nombreCurso) {
  const clave = nombreCurso.toLowerCase().trim();
  return enlacesGuardados.get(clave);
}

module.exports = {
  guardarEnlaceCurso,
  obtenerEnlaceCurso
};