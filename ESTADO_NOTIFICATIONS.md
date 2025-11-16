# Sistema de Notificaciones de Cambio de Estado

## 📋 Descripción General

El sistema ahora incluye **notificaciones en tiempo real** vía WebSocket que alertan a los estudiantes cuando el estado de sus incidentes cambia.

## 🔄 Flujo de Estados

Los incidentes pasan por los siguientes estados:

1. **Pendiente** - Estado inicial cuando el estudiante crea un incidente
2. **En atención** - Cuando un admin asigna el incidente a un trabajador
3. **Completado** - Cuando el trabajador o admin marca el incidente como resuelto

## 🔔 Notificaciones

### ¿Cuándo se envían?

Las notificaciones se envían automáticamente al **estudiante que creó el incidente** en los siguientes casos:

1. **Admin asigna el incidente** → Estado cambia de "pendiente" a "en atención"
2. **Admin cambia manualmente el estado** → Cualquier cambio de estado
3. **Trabajador completa el incidente** → Estado cambia a "completado"

### Estructura de la Notificación

```json
{
  "action": "estado_change",
  "incidente_id": "uuid-del-incidente",
  "titulo": "Título del incidente",
  "old_estado": "pendiente",
  "new_estado": "en atención",
  "timestamp": "2024-11-16T12:34:56.789Z",
  "mensaje": "Tu incidente 'Fuga de agua' cambió de estado: pendiente → en atención"
}
```

## 🔌 Conexión WebSocket con Email

Para recibir notificaciones, el cliente debe conectarse al WebSocket pasando su email:

```javascript
const ws = new WebSocket('wss://your-api-gateway.amazonaws.com/prod?email=estudiante@ejemplo.com');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.action === 'estado_change') {
    // Mostrar notificación al usuario
    console.log(`🔔 ${data.mensaje}`);
    alert(data.mensaje);
  }
};
```

## 📍 Endpoints Actualizados

### POST /incidentes
- Crea un incidente con estado inicial **"pendiente"**
- Solo accesible por estudiantes

### PUT /incidentes/{id}
- Admin puede cambiar cualquier campo, incluyendo el estado
- Si el estado cambia, se envía notificación al creador

### PUT /incidentes/{id}/asignar
- Admin asigna el incidente a un trabajador
- Cambia automáticamente el estado a **"en atención"**
- Envía notificación al estudiante creador

### PUT /incidentes/{id}/completar (NUEVO)
- Trabajadores pueden marcar como completado sus incidentes asignados
- Admin puede completar cualquier incidente
- Cambia el estado a **"completado"**
- Envía notificación al estudiante creador

**Request:**
```bash
PUT /incidentes/{id}/completar
Headers:
  X-User-Email: trabajador@ejemplo.com
```

**Response:**
```json
{
  "id": "uuid",
  "titulo": "Fuga de agua",
  "estado": "completado",
  "fecha_completado": "2024-11-16T12:34:56.789Z",
  "completado_por": "trabajador@ejemplo.com",
  ...
}
```

## 🏗️ Estructura de Datos

### Campos Nuevos en Incidentes

```javascript
{
  "estado": "pendiente" | "en atención" | "completado",
  "fecha_completado": "ISO datetime",
  "completado_por": "email del usuario que lo completó",
  "ultima_modificacion": "ISO datetime",
  "modificado_por": "email del usuario que lo modificó"
}
```

### Tabla de Conexiones (ConnectionsTable)

```javascript
{
  "connectionId": "abc123...",
  "userEmail": "estudiante@ejemplo.com"  // Nuevo campo
}
```

## 🧪 Ejemplo de Prueba

### 1. Estudiante crea incidente
```bash
curl -X POST https://api.com/incidentes \
  -H "X-User-Email: estudiante@ejemplo.com" \
  -d '{
    "titulo": "Fuga de agua",
    "descripcion": "Hay una fuga en el baño",
    "tipo": "Plomería"
  }'
```
**Estado:** `pendiente`

### 2. Estudiante se conecta por WebSocket
```javascript
const ws = new WebSocket('wss://api.com/prod?email=estudiante@ejemplo.com');
```

### 3. Admin asigna el incidente
```bash
curl -X PUT https://api.com/incidentes/{id}/asignar \
  -H "X-User-Email: admin@ejemplo.com" \
  -d '{"trabajador_email": "trabajador@ejemplo.com"}'
```
**Estado:** `en atención`
**Notificación enviada:** ✅

### 4. Trabajador completa el incidente
```bash
curl -X PUT https://api.com/incidentes/{id}/completar \
  -H "X-User-Email: trabajador@ejemplo.com"
```
**Estado:** `completado`
**Notificación enviada:** ✅

## 🎯 Beneficios

1. **Transparencia**: Los estudiantes saben exactamente en qué estado está su incidente
2. **Tiempo real**: No necesitan refrescar la página, reciben notificaciones instantáneas
3. **Experiencia mejorada**: Comunicación activa sobre el progreso de sus reportes
4. **Trazabilidad**: Se registra quién y cuándo se modificó cada incidente

## 🔒 Seguridad

- Solo el estudiante creador recibe notificaciones de SU incidente
- Las conexiones WebSocket se filtran por email del usuario
- Solo usuarios autenticados pueden crear/modificar incidentes
- Validación de permisos en cada endpoint

## 📝 Notas Técnicas

- Las notificaciones solo se envían si el usuario está conectado por WebSocket
- Si el usuario no está conectado, el cambio se guarda pero no se notifica en tiempo real
- El usuario puede ver el historial de cambios consultando el incidente posteriormente
- Las conexiones antiguas (GoneException) se eliminan automáticamente
