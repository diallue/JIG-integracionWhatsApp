require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { validateRequiredEnv } = require('./src/config/env');

validateRequiredEnv();

const app = express();

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, prueba de nuevo más tarde.' }
}));

app.use('/', require('./src/routes/webhook.routes'));
app.use('/api', require('./src/routes/api.routes'));

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  return next(err);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor arrancado en el puerto ${port}`);
});