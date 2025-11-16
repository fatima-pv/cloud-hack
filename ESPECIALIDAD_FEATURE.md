# Especialidad Feature - Implementación Completa

## Resumen
Se ha implementado la funcionalidad de **especialidad** para usuarios de tipo "trabajador" (personal). Ahora cuando un trabajador se registra, debe seleccionar una especialidad de las siguientes opciones:
- **TI** - Tecnologías de la Información
- **Servicio de Limpieza**
- **Seguridad**
- **Electricista**

## Cambios Realizados

### 1. Backend (`src/auth.py`)
**Modificaciones en el registro:**
- Agregado campo `especialidad` como parámetro opcional en `register_handler`
- Validación: `especialidad` es **requerida** para usuarios tipo "trabajador"
- Validación: `especialidad` debe ser una de las 4 opciones permitidas
- El campo `especialidad` se guarda en DynamoDB (tabla UsersTable)
- El campo `especialidad` se incluye en la respuesta de registro para trabajadores

**Modificaciones en el login:**
- El campo `especialidad` se incluye en la respuesta de login para usuarios tipo "trabajador"

**Código clave:**
```python
# Validación
ESPECIALIDADES_VALIDAS = ['TI', 'Servicio de Limpieza', 'Seguridad', 'Electricista']

if user_type == 'trabajador':
    especialidad = data.get('especialidad', '').strip()
    if not especialidad:
        return _resp(400, {'error': 'Especialidad es requerida para trabajadores'})
    if especialidad not in ESPECIALIDADES_VALIDAS:
        return _resp(400, {'error': f'Especialidad inválida. Opciones: {", ".join(ESPECIALIDADES_VALIDAS)}'})
```

### 2. Backend (`src/app.py`)
**Modificaciones en la creación de incidentes:**
- Inicializado campo `asignado_a_especialidad` como `None` al crear un nuevo incidente

**Modificaciones en la asignación de incidentes:**
- Al asignar un incidente a un trabajador, se guarda también su especialidad
- Se almacena en el campo `asignado_a_especialidad`

**Código clave:**
```python
# Al asignar
item['asignado_a'] = trabajador_email
item['asignado_a_nombre'] = trabajador.get('nombre')
item['asignado_a_especialidad'] = trabajador.get('especialidad')
```

### 3. Frontend - Formulario de Registro (`frontend/register.html`)
**Cambios:**
- Agregado campo `<select id="especialidad">` con las 4 opciones
- Campo envuelto en `<div id="especialidadGroup" style="display:none">` (oculto por defecto)
- Se muestra solo cuando el email ingresado corresponde a tipo "trabajador"
- Actualizada la info box para mostrar las especialidades disponibles

**HTML agregado:**
```html
<div class="form-group" id="especialidadGroup" style="display:none">
    <label for="especialidad">Especialidad:</label>
    <select id="especialidad" name="especialidad">
        <option value="">-- Selecciona una especialidad --</option>
        <option value="TI">TI - Tecnologías de la Información</option>
        <option value="Servicio de Limpieza">Servicio de Limpieza</option>
        <option value="Seguridad">Seguridad</option>
        <option value="Electricista">Electricista</option>
    </select>
</div>
```

### 4. Frontend - Auth Logic (`frontend/auth.js`)
**Funcionalidad de mostrar/ocultar campo:**
- Listener en el input de email detecta cuando el dominio corresponde a "trabajador"
- Muestra el campo `especialidadGroup` solo para trabajadores
- Oculta el campo para estudiantes y admins

**Validación en el registro:**
- Antes de enviar el formulario, valida que trabajadores hayan seleccionado una especialidad
- Solo incluye `especialidad` en el body del POST para usuarios tipo "trabajador"

**Mensajes mejorados:**
- Al registrarse, muestra: "¡Registro exitoso! Tipo de usuario: trabajador - TI"
- Al hacer login, muestra: "¡Bienvenido! Tipo de usuario: trabajador - Seguridad"

**Código clave:**
```javascript
// Validación
if (userType === 'trabajador' && !especialidad) {
    showResult('registerResult', 'Debes seleccionar una especialidad para el personal', 'error');
    return;
}

// Solo agregar especialidad si es trabajador
if (userType === 'trabajador' && especialidad) {
    requestBody.especialidad = especialidad;
}
```

### 5. Frontend - App Principal (`frontend/app.js`)
**Header de usuario:**
- Modificado `displayUserInfo()` para mostrar especialidad en el badge del usuario
- Ejemplo: "TRABAJADOR - TI"

**Lista de incidentes:**
- Modificado `renderIncidentCard()` para mostrar especialidad del trabajador asignado
- Ejemplo: "Asignado a: Juan Pérez - Electricista"

**Modal de asignación:**
- Modificado dropdown en `assignIncident()` para mostrar especialidad de cada trabajador
- Ejemplo: "Juan Pérez (juan@gmail.com) - Electricista"

**Código clave:**
```javascript
// En el header
const especialidadText = user.especialidad ? ` - ${user.especialidad}` : '';
userType.textContent = user.tipo.toUpperCase() + especialidadText;

// En la tarjeta de incidente
${incident.asignado_a_nombre ? 
  `<p><strong>Asignado a:</strong> ${escapeHtml(incident.asignado_a_nombre)}${
    incident.asignado_a_especialidad ? 
    ` - ${escapeHtml(incident.asignado_a_especialidad)}` : ''
  }</p>` : ''}
```

## Flujo de Usuario

### Registro de Trabajador
1. Usuario accede a `register.html`
2. Ingresa nombre y comienza a escribir email
3. Cuando el email NO termina en `@utec.edu.pe` ni `@admin.utec.edu.pe`:
   - Se muestra el mensaje: "Tu tipo de usuario será: personal (debes seleccionar una especialidad)"
   - Aparece el dropdown de especialidad
4. Usuario selecciona una de las 4 especialidades
5. Ingresa y confirma contraseña
6. Al enviar, el sistema valida que se haya seleccionado una especialidad
7. Se crea el usuario con su especialidad en DynamoDB
8. Mensaje de éxito muestra: "¡Registro exitoso! Tipo de usuario: trabajador - [ESPECIALIDAD]"

### Login de Trabajador
1. Usuario ingresa email y contraseña
2. Sistema valida credenciales
3. Respuesta incluye el campo `especialidad`
4. Mensaje de bienvenida: "¡Bienvenido! Tipo de usuario: trabajador - [ESPECIALIDAD]"
5. En el header se muestra: "TRABAJADOR - [ESPECIALIDAD]"

### Asignación de Incidentes
1. Admin ve un incidente y hace clic en "👤 Asignar"
2. Se abre modal con dropdown de trabajadores
3. Cada opción muestra: "Nombre (email) - Especialidad"
   - Ejemplo: "Juan Pérez (juan@gmail.com) - Electricista"
4. Admin selecciona trabajador apropiado según la especialidad
5. Al asignar, el incidente guarda la especialidad del trabajador
6. En la tarjeta del incidente se muestra: "Asignado a: Juan Pérez - Electricista"

## Estructura de Datos

### Objeto Usuario (DynamoDB - UsersTable)
```json
{
  "email": "trabajador@example.com",
  "nombre": "Juan Pérez",
  "tipo": "trabajador",
  "especialidad": "Electricista",
  "password_hash": "..."
}
```

### Objeto Incidente (DynamoDB - ReportsTable)
```json
{
  "id": "uuid",
  "titulo": "Problema eléctrico",
  "asignado_a": "trabajador@example.com",
  "asignado_a_nombre": "Juan Pérez",
  "asignado_a_especialidad": "Electricista",
  "estado": "asignado",
  "fecha_asignacion": "2024-01-15T10:30:00",
  ...
}
```

## Próximos Pasos para Deployment

1. **Desplegar cambios al backend:**
   ```bash
   serverless deploy --stage dev
   ```

2. **Verificar deployment:**
   - Los endpoints de API Gateway deben seguir siendo los mismos
   - Las Lambda functions se actualizarán con el nuevo código

3. **Testing:**
   - Registrar un nuevo trabajador y verificar que la especialidad se guarda correctamente
   - Hacer login como trabajador y verificar que la especialidad se muestra
   - Como admin, asignar un incidente y verificar que se muestra la especialidad del trabajador

## Notas Importantes

- La especialidad es **obligatoria** solo para trabajadores
- Estudiantes y admins no tienen ni necesitan especialidad
- Las 4 especialidades están hardcodeadas tanto en backend como frontend
- La validación se hace en ambos lados (cliente y servidor)
- La especialidad se muestra en:
  - Badge de usuario en el header
  - Dropdown de asignación
  - Tarjeta de incidente cuando está asignado
  - Mensajes de registro y login

## Compatibilidad con Usuarios Existentes

Los usuarios trabajadores creados **antes** de esta actualización:
- No tendrán el campo `especialidad` en DynamoDB (será `undefined`)
- El sistema maneja esto correctamente usando verificaciones condicionales
- Al asignar incidentes antiguos, no se mostrará la especialidad (comportamiento gracioso)
- Se recomienda que los trabajadores existentes se vuelvan a registrar o que un admin actualice manualmente su especialidad en DynamoDB
