# 🚨 Nueva Funcionalidad: Nivel de Urgencia para Estudiantes

## ✨ Resumen de Cambios

Ahora los **estudiantes** pueden seleccionar el nivel de urgencia al crear un incidente, mientras que los **administradores** mantienen la capacidad de editarlo posteriormente.

---

## 📋 Niveles de Urgencia Disponibles

| Nivel | Icono | Descripción | Color |
|-------|-------|-------------|-------|
| **Bajo** | 🟢 | No requiere atención inmediata | Verde |
| **Medio** | 🟡 | Atención en 24-48 horas | Amarillo |
| **Alto** | 🟠 | Requiere atención pronta | Naranja |
| **Crítico** | 🔴 | Atención inmediata | Rojo |

---

## 🔧 Cambios Realizados

### 1. Frontend - Formulario de Creación (`frontend/index.html`)

**Agregado**: Nuevo campo de selección de urgencia
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

**Características**:
- Campo **requerido** (el estudiante debe seleccionar un nivel)
- Descripciones claras de cada nivel
- Iconos visuales (🟢🟡🟠🔴)
- Ubicado entre "Lugar Específico" y "Foto URL"

---

### 2. Frontend - JavaScript (`frontend/app.js`)

**Modificado**: Función de envío del formulario
```javascript
const formData = {
    titulo: document.getElementById('titulo').value,
    descripcion: document.getElementById('descripcion').value,
    tipo: document.getElementById('tipo').value,
    piso: document.getElementById('piso').value,
    lugar_especifico: document.getElementById('lugar_especifico').value,
    foto: document.getElementById('foto').value,
    Nivel_Riesgo: document.getElementById('nivel_urgencia').value  // ← NUEVO
};
```

**Cambios**:
- Se incluye el valor del select `nivel_urgencia` en el objeto enviado al backend
- El campo se mapea a `Nivel_Riesgo` para mantener compatibilidad con la base de datos

---

### 3. Backend - Lambda (`src/app.py`)

**Modificado**: Función de creación de incidentes

**Antes**:
```python
'Nivel_Riesgo': '',  # Siempre vacío
```

**Después**:
```python
# Validar nivel de riesgo si se proporciona
nivel_riesgo = data.get('Nivel_Riesgo', '').lower()
niveles_validos = ['bajo', 'medio', 'alto', 'crítico', 'critico']
if nivel_riesgo and nivel_riesgo not in niveles_validos:
    nivel_riesgo = ''

item = {
    ...
    'Nivel_Riesgo': nivel_riesgo,  # ← Valor del estudiante
    ...
}
```

**Características**:
- Acepta el nivel de riesgo enviado por el estudiante
- Valida que sea uno de los valores permitidos
- Convierte a minúsculas para consistencia
- Acepta tanto "crítico" como "critico" (con y sin acento)
- Si el valor no es válido, lo establece como vacío

---

### 4. Frontend - Estilos (`frontend/style.css`)

**Agregado**: Estilos para el select de urgencia
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

**Características**:
- Colores distintivos para cada nivel
- Nivel crítico en **negrita** para mayor énfasis
- Mejora la experiencia visual del usuario

---

## 🎯 Flujo de Usuario

### Para Estudiantes (Crear Incidente)

1. **Inicia sesión** como estudiante (`@utec.edu.pe`)
2. **Completa el formulario** de nuevo incidente
3. **Selecciona el nivel de urgencia**:
   - Evalúa la gravedad del problema
   - Elige entre Bajo, Medio, Alto o Crítico
4. **Envía el formulario**
5. El incidente se crea con el nivel de urgencia seleccionado

### Para Administradores (Editar Nivel)

1. **Inicia sesión** como admin (`@admin.utec.edu.pe`)
2. **Ve los incidentes** con sus niveles de urgencia
3. **Hace clic en "Editar"** en un incidente
4. **Modifica el nivel de riesgo** si es necesario
   - Puede aumentarlo o reducirlo según evaluación
5. **Guarda los cambios**

---

## 🔄 Compatibilidad

### ✅ Mantenido
- Administradores **siguen pudiendo editar** el nivel de urgencia
- Modal de edición conserva las mismas opciones
- Incidentes antiguos sin nivel siguen funcionando

### ✅ Nuevo
- Estudiantes ahora **deben** seleccionar nivel al crear
- Backend valida los valores recibidos
- Se guardan en DynamoDB correctamente

---

## 📊 Estructura de Datos

### Objeto Incidente (DynamoDB - ReportsTable)
```json
{
  "id": "uuid-123",
  "titulo": "Foco fundido",
  "descripcion": "El foco del aula 301 está fundido",
  "Nivel_Riesgo": "bajo",  // ← Ahora viene del estudiante
  "creado_por": "estudiante@utec.edu.pe",
  "estado": "pendiente",
  "Fecha_creacion": "2024-11-16T10:30:00"
}
```

---

## 🧪 Casos de Prueba

### Caso 1: Estudiante Crea Incidente con Urgencia
1. Login como estudiante
2. Crear incidente
3. Seleccionar "🟡 Medio"
4. Enviar formulario
5. ✅ **Resultado**: Incidente creado con `Nivel_Riesgo: "medio"`

### Caso 2: Admin Edita Nivel de Urgencia
1. Login como admin
2. Ver incidente creado por estudiante (nivel: "medio")
3. Editar incidente
4. Cambiar a "🔴 Crítico"
5. Guardar
6. ✅ **Resultado**: Incidente actualizado con `Nivel_Riesgo: "crítico"`

### Caso 3: Estudiante Debe Seleccionar Nivel
1. Login como estudiante
2. Intentar crear incidente sin seleccionar nivel
3. ✅ **Resultado**: Formulario no se envía (campo requerido)

---

## 🎨 Mejoras Visuales

### Select de Urgencia
- **Opciones con color** según nivel
- **Iconos** para identificación rápida
- **Descripciones** claras de cada nivel
- **Negrita** para nivel crítico

### Badges en Tarjetas de Incidentes
- Los badges de severidad ya existentes se mantienen
- Ahora muestran el nivel seleccionado por el estudiante
- Colores consistentes en todo el sistema

---

## 📝 Valores Válidos en Backend

```python
niveles_validos = ['bajo', 'medio', 'alto', 'crítico', 'critico']
```

**Nota**: Se aceptan ambas formas de "crítico" (con y sin acento) para mayor flexibilidad.

---

## 🚀 Para Desplegar

```bash
# Desde la raíz del proyecto
serverless deploy --stage dev
```

Esto actualizará:
- ✅ Lambda function `app.py` con validación de nivel de urgencia
- ✅ Frontend con nuevo campo en el formulario
- ✅ Estilos CSS para el select

---

## ✨ Resumen de Beneficios

| Beneficio | Descripción |
|-----------|-------------|
| **Mejor Priorización** | Los administradores pueden ver la urgencia percibida por el estudiante |
| **Respuesta Más Rápida** | Incidentes críticos se identifican desde el momento de creación |
| **Autonomía del Usuario** | Estudiantes tienen más control sobre sus reportes |
| **Mantenimiento del Control** | Admins pueden ajustar el nivel si es necesario |
| **Validación Robusta** | Backend valida los valores para evitar datos incorrectos |

---

## 🎯 Estado Final

- ✅ Formulario de creación actualizado
- ✅ JavaScript enviando nivel de urgencia
- ✅ Backend validando y guardando nivel
- ✅ Estilos visuales implementados
- ✅ Compatibilidad con función de edición de admin mantenida
- ✅ Campo requerido para estudiantes
- ✅ Listo para deployment

**¡La funcionalidad está completa y lista para usar!** 🎉
