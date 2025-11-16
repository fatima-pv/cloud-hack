# 🔍 Troubleshooting: Error 404 "Incidente no encontrado"

## ❌ Error Observado

```
127.0.0.1:5501 says
❌ Error: Incidente no encontrado
```

Status: **404 (Not Found)**

---

## 🔎 Diagnóstico

El error 404 al editar un incidente puede tener varias causas:

### 1. **El incidente no existe en DynamoDB**
- El incidente fue eliminado
- El ID es incorrecto
- La base de datos está vacía

### 2. **Problema de permisos**
- El usuario no tiene permisos para ver ese incidente
- El endpoint está filtrando el incidente (estudiantes/trabajadores)

### 3. **ID mal formado**
- El ID que se pasa no coincide con el ID en la base de datos
- Caracteres especiales en el ID

---

## ✅ Solución Implementada

He agregado **logs detallados** en todo el flujo de edición para diagnosticar el problema exacto.

### Logs Agregados

#### 1. Al hacer click en "Editar"
```javascript
console.log('🔍 Attempting to edit incident with ID:', incidentId);
```

#### 2. Al obtener la lista de incidentes
```javascript
console.log('📋 Total incidents retrieved:', incidents.length);
console.log('🔍 Looking for ID:', id);
```

#### 3. Al encontrar (o no) el incidente
```javascript
if (found) {
    console.log('✅ Incident found:', found);
} else {
    console.warn('⚠️ Incident NOT found in list');
    console.log('Available IDs:', incidents.map(i => i.id));
}
```

#### 4. Al enviar el formulario de edición
```javascript
console.log('📝 Submitting edit for incident ID:', incidentId);
console.log('📡 Calling PUT:', editUrl);
console.log('📨 Edit response:', { status, ok, data });
```

---

## 🧪 Cómo Diagnosticar AHORA

### Paso 1: Refresca la Página

```bash
# Si el frontend está corriendo en un servidor local
# Refresca el navegador: Cmd + R (macOS) o F5 (Windows)
```

### Paso 2: Abre la Consola del Navegador

**Chrome/Firefox:** `Cmd + Option + I` (macOS) o `F12` (Windows)

### Paso 3: Intenta Editar un Incidente

1. Como admin, haz click en **"Editar"** en cualquier incidente
2. Observa la consola

### Paso 4: Revisa los Logs

Deberías ver algo como esto:

#### ✅ Caso EXITOSO (el incidente existe):
```
🔍 Attempting to edit incident with ID: abc-123-xyz
🔎 Fetching incident by ID: abc-123-xyz
📋 Total incidents retrieved: 5
🔍 Looking for ID: abc-123-xyz
✅ Incident found: { id: "abc-123-xyz", titulo: "Problema", ... }
📦 Incident data retrieved: { id: "abc-123-xyz", ... }
```

#### ❌ Caso FALLIDO (el incidente NO existe):
```
🔍 Attempting to edit incident with ID: abc-123-xyz
🔎 Fetching incident by ID: abc-123-xyz
📋 Total incidents retrieved: 5
🔍 Looking for ID: abc-123-xyz
⚠️ Incident NOT found in list
Available IDs: ["def-456", "ghi-789", "jkl-012"]
❌ Incident not found in list. ID: abc-123-xyz
```

---

## 🔧 Posibles Soluciones

### Solución 1: Verificar IDs en DynamoDB

1. Ve a AWS Console → DynamoDB → ReportsTable
2. Verifica los IDs de los incidentes
3. Copia un ID exacto
4. Compáralo con el log `Available IDs: [...]`

### Solución 2: Crear un Nuevo Incidente

Si no hay incidentes en la base de datos:

1. **Login como estudiante** (`estudiante@utec.edu.pe`)
2. **Crea un nuevo incidente** usando el formulario
3. **Logout** y **login como admin**
4. Intenta editar el incidente recién creado

### Solución 3: Verificar Permisos del Usuario

El admin debería ver TODOS los incidentes. Si no los ve:

1. Verifica que estás logueado como **admin** (`admin@admin.utec.edu.pe`)
2. El campo `tipo` en DynamoDB debe ser `"admin"`
3. Verifica el log: `📋 Total incidents retrieved: X`
   - Si es 0, no hay incidentes o hay un problema de permisos

### Solución 4: Revisar la URL del Endpoint

En la consola, busca:
```
📡 Calling PUT: https://eb28n1jcdh.execute-api.us-east-1.amazonaws.com/dev/incidentes/{id}
```

Verifica que:
- El ID está presente (no es `undefined` o `null`)
- La URL es correcta
- No hay caracteres extraños

---

## 📝 Checklist de Verificación

Comparte esta información de la consola:

- [ ] `🔍 Attempting to edit incident with ID:` → ¿Qué ID muestra?
- [ ] `📋 Total incidents retrieved:` → ¿Cuántos incidentes hay?
- [ ] `Available IDs:` → ¿Qué IDs están disponibles?
- [ ] ¿Se muestra `✅ Incident found` o `⚠️ Incident NOT found`?
- [ ] `📡 Calling PUT:` → ¿Cuál es la URL completa?
- [ ] `📨 Edit response:` → ¿Qué status y error devuelve?

---

## 🎯 Próximos Pasos

1. **Refresca el navegador** para cargar el código actualizado
2. **Abre la consola** (`Cmd + Option + I`)
3. **Intenta editar un incidente**
4. **Copia TODOS los logs** que aparezcan
5. **Comparte los logs** para diagnosticar el problema exacto

---

## 💡 Datos Adicionales

### Flujo Completo de Edición

```
1. Click "Editar" → editIncident(id) se llama
2. getIncidentById(id) → Obtiene TODOS los incidentes
3. Busca el incidente con ese ID en la lista
4. Si no lo encuentra → Error: "No se pudo obtener el incidente"
5. Si lo encuentra → Abre el modal con los datos
6. Usuario edita y hace submit
7. fetch PUT /incidentes/{id} → Envía al backend
8. Backend busca en DynamoDB
9. Si no existe → 404 "Incidente no encontrado"
10. Si existe → 200 OK con el incidente actualizado
```

### Posible Escenario

**Es posible que el error 404 venga del backend, NO del frontend.**

Esto significaría:
- El frontend SÍ encontró el incidente en la lista
- El modal se abrió correctamente
- Pero al hacer PUT, el backend dice que no existe

**¿Por qué podría pasar esto?**
- El incidente se eliminó entre el GET y el PUT
- Hay un problema con cómo se guarda el ID en DynamoDB
- El ID tiene caracteres especiales que se escapan incorrectamente

---

## 🚀 Prueba Rápida

### Opción 1: Crear y Editar Inmediatamente

```
1. Login como estudiante
2. Crea un incidente NUEVO
3. Logout
4. Login como admin
5. Edita ese incidente inmediatamente
```

Si funciona → El problema es con incidentes antiguos

Si NO funciona → Comparte los logs completos

---

**Los logs te dirán exactamente dónde está el problema.** 🔍

Refresca la página, abre la consola, intenta editar, y comparte los logs que aparezcan.
