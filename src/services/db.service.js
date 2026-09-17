const enlacesGuardados = new Map();
const estadosUsuarios = new Map();
const datosTemporales = new Map();

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

async function setEstadoUsuario(telefono, estado) {
  estadosUsuarios.set(telefono, estado);
}

async function getEstadoUsuario(telefono) {
  return estadosUsuarios.get(telefono);
}

async function clearEstadoUsuario(telefono) {
  estadosUsuarios.delete(telefono);
  datosTemporales.delete(telefono);
}

async function guardarDatoTemporal(telefono, clave, valor) {
  const datos = datosTemporales.get(telefono) || {};
  datos[clave] = valor;
  datosTemporales.set(telefono, datos);
}

async function getDatosTemporales(telefono) {
  return datosTemporales.get(telefono) || {};
}

module.exports = {
  guardarEnlaceCurso,
  obtenerEnlaceCurso,
  setEstadoUsuario,
  getEstadoUsuario,
  clearEstadoUsuario,
  guardarDatoTemporal,
  getDatosTemporales
};