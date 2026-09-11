const express = require('express');
const app = express();

app.use(express.json());

app.use('/', require('./src/routes/webhook.routes'));

app.use('/api', require('./src/routes/api.routes'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor arrancado en el puerto ${port}`);
});