# 🚀 Guía Rápida de Deploy

## Pasos para Desplegar el Sistema de Notificaciones

### 1. Verificar que estás en el directorio correcto
```bash
cd /Users/fatimapacheco/Documents/cloud/cloud-hack
pwd
# Debe mostrar: /Users/fatimapacheco/Documents/cloud/cloud-hack
```

### 2. Verificar que Serverless Framework está instalado
```bash
sls --version
# Si no está instalado: npm install -g serverless
```

### 3. Verificar credenciales de AWS
```bash
aws configure list
# Debe mostrar tu AWS Access Key ID y región (us-east-1)
```

### 4. Deploy del Backend
```bash
sls deploy --verbose
```

**Tiempo estimado**: 2-3 minutos

**Output esperado**:
```
✔ Service deployed to stack cloud-hack-dev (120s)

endpoints:
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/incidentes
  GET - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/incidentes
  PUT - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/incidentes/{id}
  ...

websocket endpoints:
  wss://xxxxx.execute-api.us-east-1.amazonaws.com/dev

functions:
  createIncident: cloud-hack-dev-createIncident
  listIncidents: cloud-hack-dev-listIncidents
  ...
  websocketConnect: cloud-hack-dev-websocketConnect
  websocketDisconnect: cloud-hack-dev-websocketDisconnect
  websocketDefault: cloud-hack-dev-websocketDefault
```

### 5. Verificar que las Lambda Functions se actualizaron
```bash
aws lambda list-functions --query 'Functions[?contains(FunctionName, `cloud-hack`)].FunctionName'
```

### 6. Verificar DynamoDB Tables
```bash
aws dynamodb list-tables --query 'TableNames[?contains(@, `cloud-hack`)]'
```

**Debe mostrar**:
- `cloud-hack-dev-incidentes`
- `cloud-hack-dev-connections`
- `cloud-hack-dev-especialidades`

### 7. Abrir Frontend en Navegador
```bash
# Desde VS Code, click derecho en frontend/index.html > Open with Live Server
# O simplemente abrir el archivo en Chrome/Firefox
open frontend/index.html
```

### 8. Testing del Sistema

#### Test 1: Verificar Auto-Conexión WebSocket
1. Abrir DevTools (F12)
2. Ir a la pestaña Console
3. Buscar mensaje: `🔄 Conectando automáticamente...`
4. Verificar que aparece: `✅ WebSocket connected successfully!`
5. Verificar en la UI: "🔔 Notificaciones Activas"

#### Test 2: Login y Crear Incidente
1. **Login como Estudiante**:
   - Email: `estudiante@unal.edu.co`
   - Password: `password123`
2. **Crear un incidente**:
   - Título: "Test de Notificaciones"
   - Descripción: "Probando el sistema de notificaciones"
   - Ubicación: "Aula 301"
   - Especialidad: "Mantenimiento"
3. Verificar que el incidente se crea correctamente

#### Test 3: Cambiar Estado (Notificación a Estudiante)
1. **Abrir otra ventana/tab del navegador** (o usar modo incógnito)
2. **Login como Admin**:
   - Email: `admin@unal.edu.co`
   - Password: `admin123`
3. **Cambiar estado del incidente**:
   - Seleccionar el incidente "Test de Notificaciones"
   - Cambiar estado a "En Revisión"
4. **Volver a la ventana del Estudiante**
5. **Verificar**:
   - ✅ Aparece notificación toast verde
   - ✅ Dice "📢 Estado Actualizado"
   - ✅ Muestra: `reportado → en_revision`
   - ✅ La lista se actualiza automáticamente

#### Test 4: Asignar Tarea (Notificación a Trabajador)
1. **Abrir otra ventana/tab del navegador**
2. **Login como Trabajador**:
   - Email: `trabajador@unal.edu.co`
   - Password: `worker123`
3. **Desde ventana de Admin**:
   - Seleccionar el incidente "Test de Notificaciones"
   - Asignar a: `trabajador@unal.edu.co`
4. **Volver a la ventana del Trabajador**
5. **Verificar**:
   - ✅ Aparece notificación toast naranja
   - ✅ Dice "🔔 Nueva Tarea Asignada"
   - ✅ Muestra título, creador y descripción
   - ✅ La lista se actualiza automáticamente

#### Test 5: Auto-Reconexión
1. En DevTools Console, ejecutar:
   ```javascript
   ws.close()
   ```
2. **Verificar**:
   - ✅ Aparece mensaje: "❌ WebSocket disconnected"
   - ✅ Después de 3 segundos: "🔄 Reconectando..."
   - ✅ Estado vuelve a "🔔 Notificaciones Activas"

### 9. Verificar Logs en AWS CloudWatch
```bash
# Ver logs de la función de notificaciones
sls logs -f updateIncident --tail

# Ver logs de WebSocket connect
sls logs -f websocketConnect --tail

# Ver logs de WebSocket disconnect
sls logs -f websocketDisconnect --tail
```

### 10. Troubleshooting

#### Problema: WebSocket no conecta
**Solución**:
1. Verificar que el URL de WebSocket en `frontend/index.html` coincide con el output de `sls deploy`
2. Verificar en DevTools > Network > WS que la conexión se está intentando
3. Revisar logs: `sls logs -f websocketConnect --tail`

#### Problema: Notificaciones no llegan
**Solución**:
1. Verificar que el email del usuario está siendo enviado en la conexión WebSocket
2. Revisar en DevTools Console si hay errores de JSON
3. Verificar logs: `sls logs -f updateIncident --tail`
4. Verificar que ConnectionsTable tiene el email guardado:
   ```bash
   aws dynamodb scan --table-name cloud-hack-dev-connections
   ```

#### Problema: "502 Bad Gateway" en API
**Solución**:
1. Verificar logs de CloudWatch: `sls logs -f createIncident --tail`
2. Verificar que las variables de entorno están configuradas
3. Re-deploy: `sls deploy`

#### Problema: No se pueden crear usuarios
**Solución**:
1. Verificar que la tabla de usuarios existe
2. Crear usuario manualmente con Postman:
   ```bash
   POST https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/usuarios
   {
     "email": "test@unal.edu.co",
     "nombre": "Test User",
     "rol": "estudiante",
     "password": "test123"
   }
   ```

---

## 📊 Checklist Final

Antes de considerar el deploy exitoso, verificar:

- [ ] `sls deploy` ejecutado sin errores
- [ ] WebSocket conecta automáticamente
- [ ] Estado muestra "🔔 Notificaciones Activas"
- [ ] Botón "Connect WebSocket" está oculto
- [ ] Notificaciones toast aparecen con estilos correctos
- [ ] Cambio de estado notifica al estudiante
- [ ] Asignación de tarea notifica al trabajador
- [ ] Auto-reconexión funciona después de desconexión
- [ ] Lista de incidentes se actualiza automáticamente
- [ ] Notificaciones tienen animaciones suaves

---

## 🎉 ¡Deploy Completo!

Si todos los checkboxes están marcados, el sistema de notificaciones en tiempo real está **100% funcional en producción** ✅

---

## 📞 Comandos Útiles

```bash
# Ver estado del stack
sls info

# Ver logs en tiempo real
sls logs -f updateIncident --tail

# Eliminar todo el stack (¡cuidado!)
sls remove

# Desplegar solo una función
sls deploy function -f updateIncident

# Ver costos estimados
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost
```

---

**Última actualización**: Enero 2024
