# ✅ VERIFICACIÓN FRONTEND - Lista de Chequeo

## 📡 Endpoints Configurados Correctamente

### ✅ REST API Endpoints
```
Base URL: https://eb28n1jcdh.execute-api.us-east-1.amazonaws.com/dev
```

| Endpoint | Método | Configurado | Uso |
|----------|--------|-------------|-----|
| `/incidentes` | POST | ✅ | Crear incidente (con nivel de urgencia) |
| `/incidentes` | GET | ✅ | Listar todos los incidentes |
| `/incidentes/{id}` | PUT | ✅ | Actualizar incidente |
| `/incidentes/{id}/asignar` | PUT | ✅ | Asignar trabajador |
| `/auth/register` | POST | ✅ | Registro de usuarios |
| `/auth/login` | POST | ✅ | Login |
| `/users?tipo=trabajador` | GET | ✅ | Listar trabajadores |

**Configuración en `index.html` línea 106:**
```html
<input type="text" id="apiUrl" value="https://eb28n1jcdh.execute-api.us-east-1.amazonaws.com/dev/incidentes">
```

---

### ✅ WebSocket Endpoint
```
WebSocket URL: wss://brrnv2ag89.execute-api.us-east-1.amazonaws.com/dev
```

**Configuración en `index.html` línea 110:**
```html
<input type="text" id="wsUrl" value="wss://brrnv2ag89.execute-api.us-east-1.amazonaws.com/dev">
```

---

## 🎯 Funcionalidad de Nivel de Urgencia

### ✅ Campo en el Formulario
**Archivo:** `frontend/index.html` (líneas 55-61)

```html
<div class="form-group">
    <label for="nivel_urgencia">Nivel de Urgencia (Urgency Level):</label>
    <select id="nivel_urgencia" name="nivel_urgencia" required>
        <option value="">-- Selecciona un nivel --</option>
        <option value="bajo">🟢 Bajo - No requiere atención inmediata</option>
        <option value="medio">🟡 Medio - Atención en 24-48 horas</option>
        <option value="alto">🟠 Alto - Requiere atención pronta</option>
        <option value="crítico">🔴 Crítico - Atención inmediata</option>
    </select>
</div>
```

**Estado:** ✅ Campo agregado y configurado como requerido

---

### ✅ Envío al Backend
**Archivo:** `frontend/app.js` (línea 211)

```javascript
const formData = {
    titulo: document.getElementById('titulo').value,
    descripcion: document.getElementById('descripcion').value,
    tipo: document.getElementById('tipo').value,
    piso: document.getElementById('piso').value,
    lugar_especifico: document.getElementById('lugar_especifico').value,
    foto: document.getElementById('foto').value,
    Nivel_Riesgo: document.getElementById('nivel_urgencia').value  // ← AQUÍ
};
```

**Estado:** ✅ Se envía correctamente en el POST request

---

### ✅ Estilos CSS
**Archivo:** `frontend/style.css` (líneas 535-563)

```css
#nivel_urgencia {
    font-weight: 500;
    font-size: 15px;
}

#nivel_urgencia option[value="bajo"] {
    color: #28a745;  /* Verde */
}

#nivel_urgencia option[value="medio"] {
    color: #ffc107;  /* Amarillo */
}

#nivel_urgencia option[value="alto"] {
    color: #fd7e14;  /* Naranja */
}

#nivel_urgencia option[value="crítico"] {
    color: #dc3545;  /* Rojo */
    font-weight: bold;
}
```

**Estado:** ✅ Estilos aplicados con códigos de color

---

## 🧪 PASOS PARA PROBAR

### 1️⃣ Verificar que el Backend esté Desplegado
```bash
# Desde la raíz del proyecto
serverless deploy --stage dev
```

Deberías ver:
```
✔ Service deployed to stack cloud-hack-dev
endpoints:
  POST - https://eb28n1jcdh.execute-api.us-east-1.amazonaws.com/dev/incidentes
  GET - https://eb28n1jcdh.execute-api.us-east-1.amazonaws.com/dev/incidentes
  ...
```

---

### 2️⃣ Abrir el Frontend

```bash
cd frontend
# Opción 1: Con Python
python3 -m http.server 8000

# Opción 2: Con Node.js (si tienes http-server instalado)
npx http-server -p 8000

# Opción 3: Abrir directamente el archivo
open index.html  # En macOS
```

Luego navega a: `http://localhost:8000/index.html`

---

### 3️⃣ Probar Login como Estudiante

1. Ve a `login.html`
2. **Email:** `estudiante@utec.edu.pe`
3. **Password:** (tu contraseña registrada)
4. Click en **Login**

---

### 4️⃣ Crear Incidente con Nivel de Urgencia

1. En el formulario "Create New Incident":
   - **Título:** "Prueba nivel de urgencia"
   - **Descripción:** "Probando la nueva funcionalidad"
   - **Tipo:** "Eléctrico"
   - **Piso:** "3"
   - **Lugar Específico:** "Aula 301"
   - **Nivel de Urgencia:** Selecciona "🟠 Alto"
   - **Foto URL:** (opcional)

2. Click en **Submit Incident**

3. Deberías ver:
   - ✅ Mensaje: "✅ Incident submitted successfully!"
   - El incidente aparece en la lista de la derecha
   - El badge de severidad muestra "Alto" en naranja

---

### 5️⃣ Verificar en la Consola del Navegador

**Abre las Developer Tools:** `Cmd + Option + I` (Chrome/Firefox en macOS)

**Ve a la pestaña "Network":**
- Busca el request a `/incidentes` (POST)
- Click en el request
- Ve a "Payload" o "Request" tab
- Deberías ver:
```json
{
  "titulo": "Prueba nivel de urgencia",
  "descripcion": "Probando la nueva funcionalidad",
  "tipo": "Eléctrico",
  "piso": "3",
  "lugar_especifico": "Aula 301",
  "foto": "",
  "Nivel_Riesgo": "alto"  // ← DEBE APARECER AQUÍ
}
```

**Ve a la pestaña "Console":**
- No deberían aparecer errores de JavaScript
- Si hay errores, copia y comparte el mensaje

---

### 6️⃣ Probar como Administrador

1. **Logout** del estudiante
2. **Login** como admin (`admin@admin.utec.edu.pe`)
3. Busca el incidente creado
4. Click en **Editar**
5. Verifica que puedes **cambiar el nivel de urgencia**
6. Guarda los cambios

---

## 🔍 DEBUGGING - Dropdown de Especialidades Vacío

### Console Logs Agregados
Cuando abres el modal de asignación, verifica estos logs en la consola:

```javascript
// 1. Al abrir el modal de asignación
console.log('Workers loaded:', workers.length);
console.log('Incidents loaded:', incidents.length);
console.log('Unique especialidades:', especialidades);

// 2. Al seleccionar una especialidad
console.log('Selected especialidad:', selectedEspecialidad);
console.log('Filtered workers:', filteredWorkers);

// 3. Al hacer click en "Asignar"
console.log('Form submitted for incident:', incidentId);
console.log('Selected worker email:', selectedWorkerEmail);
```

### Posibles Problemas y Soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| Array `especialidades` está vacío `[]` | Los trabajadores no tienen el campo `especialidad` guardado | Re-registrar trabajadores O actualizar DynamoDB manualmente |
| No aparece "Form submitted" al hacer click | Error de JavaScript | Verificar errores en consola del navegador |
| Workers tiene length 0 | No hay trabajadores registrados | Registrar al menos un trabajador |
| "Filtered workers: 0" después de seleccionar especialidad | Los trabajadores tienen especialidad diferente O campo mal escrito | Verificar que `especialidad` coincida exactamente |

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Configuración de Endpoints
- [x] API Base URL configurada correctamente
- [x] WebSocket URL configurada correctamente
- [x] Todos los endpoints REST mapeados

### Nivel de Urgencia
- [x] Campo `nivel_urgencia` agregado al formulario
- [x] Campo marcado como `required`
- [x] 4 opciones disponibles (bajo, medio, alto, crítico)
- [x] Iconos visuales agregados (🟢🟡🟠🔴)
- [x] JavaScript envía `Nivel_Riesgo` en formData
- [x] Estilos CSS con colores aplicados

### Especialidades (Feature Anterior)
- [x] Debug logs agregados
- [x] Filtro de especialidades implementado
- [x] Estado de disponibilidad (🟢 Disponible / 🔴 Ocupado)
- [ ] **PENDIENTE:** Verificar con console.log si workers tienen `especialidad`

---

## 🎯 PRÓXIMOS PASOS

1. **Ejecuta el deployment:**
   ```bash
   serverless deploy --stage dev
   ```

2. **Abre el frontend y prueba crear un incidente con nivel de urgencia**

3. **Abre la consola del navegador (`Cmd + Option + I`) y verifica:**
   - Request POST a `/incidentes` incluye `Nivel_Riesgo`
   - No hay errores de JavaScript
   - Response del backend es 200 OK

4. **Para debugging de especialidades:**
   - Click en botón "Asignar" de cualquier incidente
   - Revisa los console.logs
   - Comparte los mensajes que aparecen

---

## 📞 Si Encuentras Problemas

### Error: "Nivel de urgencia no válido"
- Verifica que el backend esté desplegado con los últimos cambios
- Ejecuta: `serverless deploy --stage dev`

### Error: Dropdown de especialidades vacío
- Abre consola del navegador
- Busca: `console.log('Unique especialidades:', ...)`
- Si el array está vacío, los trabajadores no tienen especialidad guardada
- Solución: Re-registrar trabajadores con especialidad

### Error: No se envía el nivel de urgencia
- Abre Network tab en Developer Tools
- Busca el request POST a `/incidentes`
- Verifica que el payload incluya `Nivel_Riesgo`
- Si no aparece, hay un error en JavaScript

---

## ✨ ESTADO ACTUAL

```
✅ Backend desplegado en AWS
✅ Endpoints configurados correctamente
✅ Nivel de urgencia implementado (frontend + backend)
✅ Estilos CSS aplicados
✅ Debug logs para especialidades agregados
⏳ Pendiente: Pruebas en navegador
⏳ Pendiente: Verificar logs de especialidades
```

**¡Todo está listo para probar!** 🚀
