# JIG-integracionWhatsApp

Proyecto de integracion con WhatsApp para Logrono Deporte.

## Variables de entorno recomendadas

Crea un archivo `.env` con estas claves antes de arrancar la app:

```env
PORT=3000
VERIFY_TOKEN=tu_token_meta
WHATSAPP_TOKEN=tu_token_wa
PHONE_NUMBER_ID=tu_phone_number_id
ADMIN_API_TOKEN=token_administracion_seguro
PIN_ADMIN=PIN_que_usas_para_admin
RESEND_API_KEY=tu_api_key_resend
URL_API_RESERVAS=https://tu-api/reservas/api_whatsapp/reservar
```

## Seguridad

- Las rutas administrativas requieren autenticacion con `Authorization: Bearer <ADMIN_API_TOKEN>` o `x-admin-key`.
- Se activa `helmet` y rate limiting global para mayor proteccion HTTP.
- Se valida el email y los datos de entrada antes de procesarlos.
- El servidor avisa claramente si faltan variables criticas.
