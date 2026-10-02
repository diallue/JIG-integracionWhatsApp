function normalizeToken(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/^Bearer\s+/i, '');
}

function requireAdminAuth(req, res, next) {
  const expectedToken = (process.env.ADMIN_API_TOKEN || process.env.PIN_ADMIN || '').trim();

  if (!expectedToken) {
    return res.status(500).json({
      error: 'No se ha configurado un token de administración. Define ADMIN_API_TOKEN o PIN_ADMIN antes de usar rutas protegidas.'
    });
  }

  const providedToken = normalizeToken(
    req.headers.authorization || req.headers['x-admin-key'] || req.headers['x-api-key'] || ''
  );

  if (!providedToken || providedToken !== expectedToken) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  return next();
}

module.exports = { requireAdminAuth };
