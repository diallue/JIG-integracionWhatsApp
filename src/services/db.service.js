const enlacesGuardados = new Map();
const estadosUsuarios = new Map();
const datosTemporales = new Map();
const alumnosPermitidos = ['12345678A', '87654321B', '1111', '2222'];

function normalizarCurso(nombreCurso) {
  return String(nombreCurso || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '');
}

async function guardarEnlaceCurso(nombreCurso, enlace) {
  const clave = normalizarCurso(nombreCurso);
  const enlaceValido = typeof enlace === 'string' ? enlace.trim() : '';

  if (!clave || !enlaceValido) {
    return false;
  }

  enlacesGuardados.set(clave, enlaceValido);
  console.log(`[DB] Enlace guardado para: ${clave}`);
  return true;
}

async function obtenerEnlaceCurso(nombreCurso) {
  const clave = normalizarCurso(nombreCurso);
  return enlacesGuardados.get(clave) || null;
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

async function validarAlumno(identificador) {
  const valor = String(identificador || '').trim().toUpperCase();
  return alumnosPermitidos.includes(valor);
}

module.exports = {
  guardarEnlaceCurso,
  obtenerEnlaceCurso,
  setEstadoUsuario,
  getEstadoUsuario,
  clearEstadoUsuario,
  guardarDatoTemporal,
  getDatosTemporales,
  validarAlumno
};
