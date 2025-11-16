# Guía de Pruebas - Sistema de Notificaciones de Estado

## 🧪 Pruebas del Sistema

### Prerrequisitos
1. Tener desplegada la aplicación en AWS
2. Tener usuarios registrados:
   - 1 estudiante
   - 1 trabajador  
   - 1 admin

### Configuración Inicial

```bash
# URLs de ejemplo (reemplazar con tus URLs reales)
export API_URL="https://xxx.execute-api.us-east-1.amazonaws.com/prod"
export WS_URL="wss://yyy.execute-api.us-east-1.amazonaws.com/prod"

export ESTUDIANTE_EMAIL="estudiante@test.com"
export TRABAJADOR_EMAIL="trabajador@test.com"
export ADMIN_EMAIL="admin@test.com"
```

## 📝 Escenario de Prueba Completo

### Paso 1: Estudiante crea un incidente

```bash
curl -X POST $API_URL/incidentes \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $ESTUDIANTE_EMAIL" \
  -d '{
    "titulo": "Fuga de agua en baño",
    "descripcion": "Hay una fuga considerable en el baño del segundo piso",
    "tipo": "Plomería",
    "piso": "2",
    "lugar_especifico": "Baño principal",
    "Nivel_Riesgo": "alto"
  }'
```

**Resultado esperado:**
```json
{
  "id": "abc-123-def",
  "titulo": "Fuga de agua en baño",
  "estado": "pendiente",  ← Estado inicial
  "creado_por": "estudiante@test.com",
  "Fecha_creacion": "2024-11-16T10:30:00Z",
  ...
}
```

**Guarda el ID del incidente para los siguientes pasos:**
```bash
export INCIDENTE_ID="abc-123-def"
```

### Paso 2: Estudiante se conecta por WebSocket

**Opción A: Usando wscat (herramienta CLI)**
```bash
# Instalar wscat si no lo tienes
npm install -g wscat

# Conectarse con el email del estudiante
wscat -c "$WS_URL?email=$ESTUDIANTE_EMAIL"
```

**Opción B: Usando JavaScript en el navegador**
```javascript
// Abrir la consola del navegador y ejecutar:
const ws = new WebSocket('wss://yyy.execute-api.us-east-1.amazonaws.com/prod?email=estudiante@test.com');

ws.onopen = () => console.log('✅ Conectado');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Notificación recibida:', data);
  
  if (data.action === 'estado_change') {
    console.log(`🔔 ${data.mensaje}`);
  }
};

ws.onerror = (error) => console.error('❌ Error:', error);
```

**Resultado esperado:**
```
✅ Conectado
```

### Paso 3: Admin asigna el incidente a un trabajador

```bash
curl -X PUT $API_URL/incidentes/$INCIDENTE_ID/asignar \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $ADMIN_EMAIL" \
  -d '{
    "trabajador_email": "trabajador@test.com"
  }'
```

**Resultado esperado en el WebSocket del estudiante:**
```json
{
  "action": "estado_change",
  "incidente_id": "abc-123-def",
  "titulo": "Fuga de agua en baño",
  "old_estado": "pendiente",
  "new_estado": "en atención",  ← Cambió automáticamente
  "timestamp": "2024-11-16T10:35:00Z",
  "mensaje": "Tu incidente 'Fuga de agua en baño' cambió de estado: pendiente → en atención"
}
```

### Paso 4: Trabajador completa el incidente

```bash
curl -X PUT $API_URL/incidentes/$INCIDENTE_ID/completar \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $TRABAJADOR_EMAIL"
```

**Resultado esperado en el WebSocket del estudiante:**
```json
{
  "action": "estado_change",
  "incidente_id": "abc-123-def",
  "titulo": "Fuga de agua en baño",
  "old_estado": "en atención",
  "new_estado": "completado",  ← Estado final
  "timestamp": "2024-11-16T11:00:00Z",
  "mensaje": "Tu incidente 'Fuga de agua en baño' cambió de estado: en atención → completado"
}
```

## 🎯 Casos de Prueba Adicionales

### Caso 1: Admin cambia estado manualmente

```bash
# Admin puede cambiar el estado directamente
curl -X PUT $API_URL/incidentes/$INCIDENTE_ID \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $ADMIN_EMAIL" \
  -d '{
    "estado": "completado"
  }'
```

**Debe enviar notificación** ✅

### Caso 2: Estudiante no conectado

1. Estudiante NO se conecta por WebSocket
2. Admin asigna el incidente
3. No se recibe notificación en tiempo real (normal)
4. Estudiante puede ver el cambio al hacer GET del incidente:

```bash
curl -X GET $API_URL/incidentes \
  -H "X-User-Email: $ESTUDIANTE_EMAIL"
```

### Caso 3: Múltiples conexiones del mismo usuario

1. Abrir dos pestañas del navegador
2. Conectarse desde ambas con el mismo email
3. Ambas deben recibir la notificación

### Caso 4: Solo el creador recibe notificaciones

1. Estudiante A crea incidente
2. Estudiante B se conecta por WebSocket
3. Admin cambia estado del incidente de A
4. Solo A debe recibir notificación (B no)

## 📊 Verificación de Estados

### Consultar estado actual del incidente

```bash
curl -X GET $API_URL/incidentes \
  -H "X-User-Email: $ESTUDIANTE_EMAIL" | jq '.[] | select(.id=="'$INCIDENTE_ID'") | {id, titulo, estado, asignado_a, fecha_asignacion, fecha_completado}'
```

### Verificar conexiones WebSocket activas

```bash
# Escanear tabla de conexiones en DynamoDB
aws dynamodb scan \
  --table-name ConnectionsTable-prod \
  --region us-east-1
```

## 🐛 Troubleshooting

### No recibo notificaciones

1. **Verificar conexión WebSocket:**
   ```javascript
   // En consola del navegador
   console.log(ws.readyState); 
   // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
   ```

2. **Verificar email en la conexión:**
   ```bash
   # Debe incluir ?email=... en la URL
   wscat -c "wss://xxx.amazonaws.com/prod?email=estudiante@test.com"
   ```

3. **Verificar logs de Lambda:**
   ```bash
   aws logs tail /aws/lambda/cloud-hack-incidentes-prod-api --follow
   ```

### Errores comunes

**Error: "No autenticado"**
- Falta el header `X-User-Email`
- Solución: Agregar `-H "X-User-Email: user@example.com"`

**Error: "Solo estudiantes pueden crear incidentes"**
- El usuario no es de tipo 'estudiante'
- Verificar tipo de usuario en DynamoDB

**Error: "Solo puedes completar incidentes asignados a ti"**
- Trabajador intenta completar un incidente no asignado a él
- Solo admin puede completar cualquier incidente

## 📈 Métricas de Prueba

### Checklist de Validación

- [ ] Incidente se crea con estado "pendiente"
- [ ] Estudiante puede conectarse por WebSocket con email
- [ ] Asignación cambia estado a "en atención"
- [ ] Notificación se envía al estudiante correcto
- [ ] Trabajador puede completar incidente asignado
- [ ] Completar cambia estado a "completado"
- [ ] Notificación de completado se envía
- [ ] Admin puede cambiar estado manualmente
- [ ] Solo el creador recibe notificaciones de su incidente
- [ ] Múltiples conexiones del mismo usuario funcionan

## 🎨 Prueba Visual (Frontend)

Si has integrado el `notification-manager.js`:

1. Abrir `index.html` en el navegador
2. Hacer login como estudiante
3. Crear un incidente
4. Abrir otra pestaña y hacer login como admin
5. Asignar el incidente
6. En la pestaña del estudiante, ver la notificación visual aparece
7. Volver a la pestaña admin y completar el incidente
8. Ver segunda notificación en pestaña del estudiante

## 📝 Script de Prueba Automática

```bash
#!/bin/bash

echo "🧪 Iniciando prueba completa del sistema de notificaciones..."

# 1. Crear incidente
echo "📝 Paso 1: Creando incidente..."
RESPONSE=$(curl -s -X POST $API_URL/incidentes \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $ESTUDIANTE_EMAIL" \
  -d '{
    "titulo": "Test incidente",
    "descripcion": "Test automático",
    "tipo": "Test"
  }')

INCIDENTE_ID=$(echo $RESPONSE | jq -r '.id')
ESTADO_INICIAL=$(echo $RESPONSE | jq -r '.estado')

echo "✅ Incidente creado: $INCIDENTE_ID"
echo "   Estado inicial: $ESTADO_INICIAL"

if [ "$ESTADO_INICIAL" != "pendiente" ]; then
  echo "❌ ERROR: Estado inicial debería ser 'pendiente'"
  exit 1
fi

sleep 2

# 2. Asignar incidente
echo "📝 Paso 2: Asignando incidente..."
RESPONSE=$(curl -s -X PUT $API_URL/incidentes/$INCIDENTE_ID/asignar \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $ADMIN_EMAIL" \
  -d "{\"trabajador_email\": \"$TRABAJADOR_EMAIL\"}")

ESTADO_ASIGNADO=$(echo $RESPONSE | jq -r '.estado')

echo "✅ Incidente asignado"
echo "   Nuevo estado: $ESTADO_ASIGNADO"

if [ "$ESTADO_ASIGNADO" != "en atención" ]; then
  echo "❌ ERROR: Estado debería ser 'en atención'"
  exit 1
fi

sleep 2

# 3. Completar incidente
echo "📝 Paso 3: Completando incidente..."
RESPONSE=$(curl -s -X PUT $API_URL/incidentes/$INCIDENTE_ID/completar \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $TRABAJADOR_EMAIL")

ESTADO_FINAL=$(echo $RESPONSE | jq -r '.estado')

echo "✅ Incidente completado"
echo "   Estado final: $ESTADO_FINAL"

if [ "$ESTADO_FINAL" != "completado" ]; then
  echo "❌ ERROR: Estado final debería ser 'completado'"
  exit 1
fi

echo ""
echo "🎉 ¡Todas las pruebas pasaron exitosamente!"
echo "   - Estado inicial: pendiente ✅"
echo "   - Después de asignar: en atención ✅"
echo "   - Después de completar: completado ✅"
```

Guardar como `test-notifications.sh` y ejecutar:
```bash
chmod +x test-notifications.sh
./test-notifications.sh
```
