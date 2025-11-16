# 🚀 GUÍA RÁPIDA DE USO - Sistema de Notificaciones

## 📦 Resumen de la Implementación

Has implementado exitosamente un **sistema de notificaciones en tiempo real** que alerta a los estudiantes cuando el estado de sus incidentes cambia.

## 📝 Archivos Modificados y Creados

### Backend (Python/Lambda)
- ✅ `src/connect.py` - Modificado para guardar email del usuario
- ✅ `src/app.py` - Agregada lógica de notificaciones y endpoint `/completar`
- ✅ `serverless.yml` - Agregados endpoints de completar

### Frontend (JavaScript)
- ✨ `frontend/notification-manager.js` - NUEVO sistema completo de notificaciones

### Documentación
- 📄 `ESTADO_NOTIFICATIONS.md` - Documentación técnica completa
- 📄 `TESTING_NOTIFICATIONS.md` - Guía detallada de pruebas
- 📄 `IMPLEMENTATION_COMPLETE.md` - Resumen de implementación
- 📄 `test-notifications.sh` - Script de prueba automática
- 📄 `QUICK_USAGE.md` - Esta guía

## 🎯 Cambios Principales

### 1. Estados del Incidente
```
pendiente → en atención → completado
   ↓            ↓              ↓
 Crear      Asignar       Completar
```

### 2. Notificaciones Automáticas
Cada vez que el estado cambia, el estudiante creador recibe una notificación:
```json
{
  "action": "estado_change",
  "mensaje": "Tu incidente 'X' cambió de estado: pendiente → en atención"
}
```

### 3. Nuevo Endpoint
```bash
PUT /incidentes/{id}/completar
```
Permite a trabajadores completar sus incidentes asignados.

## 🔧 Cómo Usar

### Paso 1: Desplegar Backend

```bash
cd /Users/fatimapacheco/Documents/cloud/cloud-hack

# Desplegar a AWS
serverless deploy --stage prod

# O usar el script de deploy existente
./deploy.sh
```

Después del deploy, guarda las URLs que aparecen:
```
endpoints:
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/incidentes
  WebSocket - wss://yyyyy.execute-api.us-east-1.amazonaws.com/prod
```

### Paso 2: Configurar Variables de Entorno

```bash
export API_URL="https://xxxxx.execute-api.us-east-1.amazonaws.com/prod"
export WS_URL="wss://yyyyy.execute-api.us-east-1.amazonaws.com/prod"
export ESTUDIANTE_EMAIL="tu-estudiante@ejemplo.com"
export TRABAJADOR_EMAIL="tu-trabajador@ejemplo.com"
export ADMIN_EMAIL="tu-admin@ejemplo.com"
```

### Paso 3: Probar el Sistema

**Opción A: Script Automático**
```bash
chmod +x test-notifications.sh
./test-notifications.sh
```

**Opción B: Prueba Manual**

1. **Conectar WebSocket** (en terminal separada):
   ```bash
   npm install -g wscat
   wscat -c "$WS_URL?email=$ESTUDIANTE_EMAIL"
   ```

2. **Crear incidente**:
   ```bash
   curl -X POST $API_URL/incidentes \
     -H "Content-Type: application/json" \
     -H "X-User-Email: $ESTUDIANTE_EMAIL" \
     -d '{
       "titulo": "Prueba de notificación",
       "descripcion": "Test del sistema",
       "tipo": "Test"
     }'
   ```
   Guarda el `id` del incidente.

3. **Asignar incidente**:
   ```bash
   curl -X PUT $API_URL/incidentes/{id}/asignar \
     -H "Content-Type: application/json" \
     -H "X-User-Email: $ADMIN_EMAIL" \
     -d '{"trabajador_email": "'$TRABAJADOR_EMAIL'"}'
   ```
   ✅ Deberías ver la notificación en el WebSocket

4. **Completar incidente**:
   ```bash
   curl -X PUT $API_URL/incidentes/{id}/completar \
     -H "Content-Type: application/json" \
     -H "X-User-Email: $TRABAJADOR_EMAIL"
   ```
   ✅ Deberías ver la segunda notificación

### Paso 4: Integrar en el Frontend

**Agregar a tu HTML:**
```html
<!-- En el <head> o antes del </body> -->
<script src="notification-manager.js"></script>
<script>
  // Obtener email del usuario (desde login, localStorage, etc.)
  const userEmail = localStorage.getItem('userEmail');
  
  if (userEmail) {
    // Inicializar el sistema de notificaciones
    const wsUrl = 'wss://yyyyy.execute-api.us-east-1.amazonaws.com/prod';
    const notificationManager = new IncidentNotificationManager(wsUrl, userEmail);
    
    // Conectar
    notificationManager.connect();
    
    // Guardar en ventana para debugging
    window.notificationManager = notificationManager;
  }
</script>
```

**El sistema automáticamente:**
- ✅ Conecta al WebSocket con el email del usuario
- ✅ Muestra notificaciones visuales cuando llegan
- ✅ Muestra notificaciones del navegador (si está permitido)
- ✅ Reproduce sonidos (opcional)
- ✅ Guarda historial en localStorage
- ✅ Se reconecta automáticamente si se pierde la conexión

## 📱 Endpoints Disponibles

### Crear Incidente
```bash
POST /incidentes
Headers: X-User-Email: estudiante@ejemplo.com
Body: {
  "titulo": "...",
  "descripcion": "...",
  "tipo": "..."
}
```
Estado inicial: `pendiente`

### Listar Incidentes
```bash
GET /incidentes
Headers: X-User-Email: usuario@ejemplo.com
```
- Estudiantes: ven solo los suyos
- Trabajadores: ven solo los asignados
- Admin: ve todos

### Asignar Incidente
```bash
PUT /incidentes/{id}/asignar
Headers: X-User-Email: admin@ejemplo.com
Body: {
  "trabajador_email": "trabajador@ejemplo.com"
}
```
Estado cambia a: `en atención`
Notificación: ✅ Enviada al creador

### Completar Incidente (NUEVO)
```bash
PUT /incidentes/{id}/completar
Headers: X-User-Email: trabajador@ejemplo.com
```
Estado cambia a: `completado`
Notificación: ✅ Enviada al creador

### Actualizar Incidente
```bash
PUT /incidentes/{id}
Headers: X-User-Email: admin@ejemplo.com
Body: {
  "estado": "completado"  // O cualquier otro campo
}
```
Si el estado cambia, notificación: ✅ Enviada al creador

## 🎨 Personalizar Notificaciones

### Cambiar estilo de notificaciones
Edita los estilos en `frontend/notification-manager.js` (al final del archivo)

### Cambiar sonido
```javascript
playNotificationSound() {
  const audio = new Audio('/tu-sonido.mp3');
  audio.volume = 0.3;
  audio.play();
}
```

### Cambiar duración de notificación
```javascript
// Cambiar de 10 segundos a otro valor
setTimeout(() => {
  notification.remove();
}, 15000);  // 15 segundos
```

## 🔍 Debugging

### Ver estado de conexión WebSocket
```javascript
// En consola del navegador
console.log(window.notificationManager.ws.readyState);
// 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
```

### Ver notificaciones guardadas
```javascript
// Ver historial de notificaciones
const notifications = JSON.parse(localStorage.getItem('notifications'));
console.log(notifications);
```

### Verificar conexiones activas (DynamoDB)
```bash
aws dynamodb scan \
  --table-name ConnectionsTable-prod \
  --region us-east-1
```

### Ver logs de Lambda
```bash
aws logs tail /aws/lambda/cloud-hack-incidentes-prod-api --follow
```

## ⚠️ Troubleshooting

### No recibo notificaciones
1. ✅ Verificar que WebSocket esté conectado
2. ✅ Verificar que la URL incluya `?email=...`
3. ✅ Verificar que seas el creador del incidente
4. ✅ Ver logs de Lambda para errores

### Estado no cambia
1. ✅ Verificar permisos del usuario
2. ✅ Verificar que el ID del incidente sea correcto
3. ✅ Ver respuesta del API para mensajes de error

### Errores de CORS
1. ✅ Re-desplegar: `serverless deploy`
2. ✅ Verificar que `serverless.yml` tenga CORS en OPTIONS
3. ✅ Verificar headers en la petición

## 📚 Documentación Completa

- **Implementación técnica**: `ESTADO_NOTIFICATIONS.md`
- **Guía de pruebas detallada**: `TESTING_NOTIFICATIONS.md`
- **Resumen de cambios**: `IMPLEMENTATION_COMPLETE.md`

## 🎉 ¡Listo para Producción!

Tu sistema ahora tiene:
- ✅ Estados de incidentes claros
- ✅ Notificaciones en tiempo real
- ✅ Trazabilidad completa
- ✅ Interfaz de usuario mejorada
- ✅ Sistema escalable

**¡Felicitaciones! 🚀**

---

## 🆘 ¿Necesitas ayuda?

1. Revisa `TESTING_NOTIFICATIONS.md` para casos de prueba específicos
2. Verifica los logs en CloudWatch
3. Prueba con curl/Postman antes de integrar en frontend
4. Asegúrate de que todos los usuarios estén registrados en UsersTable

**Nota**: No olvides actualizar las URLs en el frontend después del deploy.
