# Chat (fase 3)

Un mensaje es de una persona a otra, dentro de un negocio. WhatsApp sigue en la página pública.

## API

Todas las rutas exigen `Authorization: Bearer`.

| Método | Ruta | Qué hace |
| ------ | ---- | -------- |
| GET | `/api/messages/conversations` | Hilos del usuario |
| GET | `/api/messages/conversations/:businessId/:peerId` | Historial (máximo 100) y marca como leídos los recibidos |
| POST | `/api/messages` | `{ businessId, receiverId, text }`. Inserta con RLS y avisa por socket |

El socket está en el mismo puerto de la API. El cliente envía `auth.token` con el access token. El evento es `message:new`.

Si `REDIS_URL` está definida, Socket.io publica entre procesos con Redis. Si Redis no responde, el chat sigue en ese proceso.

`purge_expired_messages` borra, con la service role, los mensajes más viejos que `chat_retention_days` del negocio. La API la llama cada hora.
