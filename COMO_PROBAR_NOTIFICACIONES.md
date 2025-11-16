# 🔔 CÓMO PROBAR LAS NOTIFICACIONES EN TIEMPO REAL

## ✅ Lo que ya está implementado:

1. **Backend** - ✅ Función `_notify_user_estado_change()` envía notificaciones WebSocket
2. **Backend** - ✅ Se llama automáticamente cuando el admin cambia el estado
3. **WebSocket** - ✅ Guarda el email del usuario al conectarse
4. **Frontend** - ✅ Se conecta al WebSocket con el email del usuario
5. **Frontend** - ✅ Muestra notificaciones toast visuales
6. **Frontend** - ✅ Actualiza la lista automáticamente

## 🧪 PASOS PARA PROBAR:

### 1️⃣ Desplegar los cambios
```bash
cd /Users/fatimapacheco/Documents/cloud/cloud-hack
sls deploy
```

### 2️⃣ Abrir DOS ventanas del navegador

**Ventana 1 - Estudiante:**
1. Abre `frontend/index.html`
2. Inicia sesión como estudiante (email: fatima@test.com o el que uses)
3. Crea un incidente
4. **IMPORTANTE**: Haz clic en "Connect WebSocket" en la parte de abajo
5. Verás "Connected" en verde

**Ventana 2 - Admin:**
1. Abre `frontend/index.html` en modo incógnito (o otro navegador)
2. Inicia sesión como admin
3. **IMPORTANTE**: También conecta el WebSocket

### 3️⃣ Cambiar el estado del incidente

**En la ventana del Admin:**
1. Busca el incidente que creó el estudiante
2. Haz clic en "Editar" ✏️
3. Cambia el estado a "ASIGNADO" o "EN PROGRESO"
4. Guarda los cambios

### 4️⃣ Ver la notificación

**En la ventana del Estudiante:**
- 🎉 **¡Deberías ver una notificación en la esquina superior derecha!**
- La notificación mostrará:
  ```
  🔔 ¡Estado Actualizado!
  Tu incidente 'Título' cambió de estado: pendiente → asignado
  ```
- También aparecerá en el log de WebSocket
- La lista de incidentes se actualizará automáticamente

## 🎯 Lo que verás:

### Notificación Toast (Esquina superior derecha)
```
┌─────────────────────────────────────┐
│ 🔔  ¡Estado Actualizado!        × │
│                                     │
│ Tu incidente 'Fuga de agua'         │
│ cambió de estado:                   │
│ pendiente → asignado                │
│                                     │
│ Incidente: Fuga de agua             │
└─────────────────────────────────────┘
```

### Log de WebSocket
```
[10:47:32] 🔔 Tu incidente 'Fuga de agua' cambió de estado: pendiente → asignado
```

## 🔍 Troubleshooting

### ❌ No aparece la notificación

**Verificar:**
1. ✅ ¿El estudiante tiene el WebSocket conectado? (debe decir "Connected" en verde)
2. ✅ ¿El email del estudiante está guardado en localStorage? (abre DevTools → Application → Local Storage)
3. ✅ ¿El incidente fue creado por ese estudiante?

**En la consola del navegador (F12) deberías ver:**
```javascript
Connecting to wss://6qtk3h60si.execute-api.us-east-1.amazonaws.com/dev?email=fatima@test.com...
✅ WebSocket connected successfully!
```

### ❌ Error de conexión WebSocket

**Verificar que los endpoints estén actualizados en `index.html`:**
- Línea ~106: REST API URL
- Línea ~110: WebSocket URL

**Deben coincidir con el output de `sls deploy`**

### ❌ El backend no envía la notificación

**Verificar en CloudWatch Logs:**
```bash
sls logs -f api --tail
```

Deberías ver:
```
Error sending notification: ... (si hay error)
```

## 📊 Flujo completo:

```
1. Estudiante se conecta al WebSocket
   ↓
   ConnectionsTable guarda: { connectionId: "abc123", userEmail: "fatima@test.com" }

2. Admin cambia estado del incidente
   ↓
   Backend (app.py) detecta cambio de estado
   ↓
   _notify_user_estado_change() busca conexiones con email del creador
   ↓
   Envía mensaje WebSocket a esa conexión específica

3. Frontend del estudiante recibe mensaje
   ↓
   showEstadoChangeNotification() muestra toast
   ↓
   loadIncidents() actualiza la lista
```

## ✅ Checklist antes de probar:

- [ ] `sls deploy` ejecutado correctamente
- [ ] Endpoints actualizados en `index.html`
- [ ] Estudiante autenticado
- [ ] Admin autenticado (en otra ventana)
- [ ] Ambos tienen WebSocket conectado (verde)
- [ ] Incidente creado por el estudiante
- [ ] Admin hace cambio de estado

## 🎉 ¡Listo!

Si todo está bien, deberías ver la notificación aparecer en tiempo real cuando el admin cambie el estado del incidente.

## 📝 Nota adicional:

También puedes pedir permiso para notificaciones del navegador:
```javascript
Notification.requestPermission()
```

Y verás notificaciones incluso si la pestaña está en segundo plano.
