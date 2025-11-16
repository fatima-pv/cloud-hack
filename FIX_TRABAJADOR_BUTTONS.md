# 🔧 Fix: Botones de Trabajador No Funcionaban

## ❌ Problema
Los trabajadores no podían iniciar o finalizar tareas. Al hacer clic en "Iniciar Tarea" aparecía el error:
```
❌ Error: Solo administradores pueden editar incidentes
```

## 🔍 Causa Raíz
En `src/app.py`, el endpoint `PUT /incidentes/{id}` (del admin) se estaba ejecutando **ANTES** que el endpoint `PUT /incidentes/{id}/estado` (del trabajador).

Como el endpoint del admin usa `path.startswith('/incidentes/')`, capturaba **todas** las rutas que empiezan con `/incidentes/`, incluyendo `/incidentes/{id}/estado`.

## ✅ Solución
Reorganicé el orden de los endpoints en `src/app.py`:

**ANTES (incorrecto):**
```python
# UPDATE: PUT /incidentes/{id} (Admin) ← Se ejecutaba PRIMERO
if path.startswith('/incidentes/') and method == 'PUT':
    # Bloquea a trabajadores...

# WORKER UPDATE: PUT /incidentes/{id}/estado ← Nunca se alcanzaba
if path.endswith('/estado') and method == 'PUT':
    # Este código nunca se ejecutaba
```

**DESPUÉS (correcto):**
```python
# WORKER UPDATE: PUT /incidentes/{id}/estado ← PRIMERO
if path.endswith('/estado') and method == 'PUT':
    # Ahora SÍ se ejecuta para trabajadores

# UPDATE: PUT /incidentes/{id} (Admin) ← DESPUÉS
if path.startswith('/incidentes/') and method == 'PUT':
    # Solo para admins
```

## 📋 Endpoints Correctos

### 1. Asignar Trabajador (Admin)
```
PUT /incidentes/{id}/asignar
```
- **Permiso**: Solo admin
- **Cambia estado**: reportado → asignado
- **Notifica**: Trabajador + Estudiante

### 2. Iniciar Tarea (Trabajador)
```
PUT /incidentes/{id}/estado
Body: { "estado": "en_proceso" }
```
- **Permiso**: Solo trabajador asignado
- **Cambia estado**: asignado → en_proceso
- **Notifica**: Estudiante + Admin

### 3. Finalizar Tarea (Trabajador)
```
PUT /incidentes/{id}/estado
Body: { "estado": "resuelto" }
```
- **Permiso**: Solo trabajador asignado
- **Cambia estado**: en_proceso → resuelto
- **Notifica**: Estudiante + Admin

### 4. Editar Incidente (Admin)
```
PUT /incidentes/{id}
Body: { "estado": "cerrado", ... }
```
- **Permiso**: Solo admin
- **Puede cambiar**: Cualquier campo, incluyendo cerrar directamente
- **Notifica**: Estudiante (si cambia estado)

## 🔔 Sistema de Notificaciones

### Estudiante (Creador del Incidente)
Recibe notificación cuando **cualquier estado** de SU incidente cambia:
- reportado → asignado
- asignado → en_proceso
- en_proceso → resuelto
- cualquier estado → cerrado

### Admin
Recibe notificación solo cuando el **trabajador** actualiza:
- asignado → en_proceso (trabajador inició)
- en_proceso → resuelto (trabajador finalizó)

### Trabajador
Recibe notificación solo cuando:
- Le asignan un nuevo incidente

## 🚀 Deploy Necesario

**Tu amigo DEBE hacer deploy en EC2:**

```bash
cd /ruta/del/proyecto
git pull origin diego  # O la rama que estés usando
sls deploy
```

Sin el deploy, el cambio del backend no se aplicará.

## 🧪 Testing

Después del deploy, probar:

1. **Login como Admin**
2. **Asignar incidente** a trabajador
3. **Login como Trabajador** (en otra ventana/tab)
4. **Click "Iniciar Tarea"** → debe cambiar a "En Proceso" ✅
5. **Click "Finalizar Tarea"** → debe cambiar a "Resuelto" ✅
6. **Verificar notificaciones**:
   - Estudiante recibe notificación de cada cambio
   - Admin recibe notificación cuando trabajador inicia/finaliza

---

**Fecha del Fix**: 16 de noviembre de 2025  
**Archivos Modificados**: `src/app.py`
