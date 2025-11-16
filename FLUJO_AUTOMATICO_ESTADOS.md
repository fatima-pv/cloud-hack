# 🔄 FLUJO AUTOMÁTICO DE ESTADOS Y ASIGNACIÓN

## ✅ NUEVO SISTEMA IMPLEMENTADO

El sistema ahora funciona con **estados automáticos** y **gestión de disponibilidad de trabajadores**.

---

## 📋 FLUJO COMPLETO

### 1️⃣ **ESTUDIANTE CREA INCIDENTE**
```
Estudiante llena formulario
         ↓
Estado: "pendiente" (automático)
         ↓
Visible en dashboard del admin
```

**Características:**
- ✅ ID único generado automáticamente (UUID)
- ✅ Estado inicial: **pendiente**
- ✅ Nivel de urgencia seleccionable
- ✅ Notificación en tiempo real vía WebSocket

---

### 2️⃣ **ADMIN ASIGNA A TRABAJADOR**
```
Admin ve incidente "pendiente"
         ↓
Click en "👤 Asignar"
         ↓
Selecciona trabajador DISPONIBLE
         ↓
Sistema automáticamente:
  • Estado → "en atención"
  • Trabajador → ocupado
  • Notifica al estudiante
```

**Características:**
- ✅ Admin solo ve trabajadores **disponibles** (sin tareas activas)
- ✅ Estado cambia **automáticamente** a "en atención"
- ✅ Estudiante recibe notificación: "Tu incidente cambió de pendiente a en atención"
- ✅ Incidente aparece en dashboard del trabajador
- ✅ Trabajador queda **ocupado** hasta completar la tarea

**Importante:** 
- 🔴 Admin **NO puede editar el estado manualmente**
- 🔴 Admin **NO puede asignar más tareas** a trabajador ocupado

---

### 3️⃣ **TRABAJADOR COMPLETA TAREA**
```
Trabajador ve "en atención" en su dashboard
         ↓
Trabaja en el incidente
         ↓
Click en "✅ Marcar como Completado"
         ↓
Sistema automáticamente:
  • Estado → "resuelto"
  • Trabajador → disponible
  • Notifica al estudiante
```

**Características:**
- ✅ Trabajador solo ve **sus tareas asignadas**
- ✅ Botón "Marcar como Completado" visible solo si estado = "en atención"
- ✅ Estado cambia **automáticamente** a "resuelto"
- ✅ Estudiante recibe notificación: "Tu incidente cambió de en atención a resuelto"
- ✅ Incidente se mueve a pestaña "Completados"
- ✅ Trabajador queda **disponible** para nueva tarea

---

## 🎯 ESTADOS DEL SISTEMA

### Estados de Incidente:

| Estado | Color | Descripción | Quién lo ve |
|--------|-------|-------------|-------------|
| **Pendiente** 🟡 | Amarillo | Esperando asignación | Admin |
| **En Atención** 🔵 | Azul | Asignado, en progreso | Admin + Trabajador |
| **Resuelto** 🟢 | Verde | Completado | Todos |

### Estados de Trabajador (implícito):

| Estado | Condición | Admin puede asignar |
|--------|-----------|---------------------|
| **Disponible** ✅ | No tiene tareas "en atención" | SÍ |
| **Ocupado** 🔴 | Tiene tareas "en atención" | NO |

---

## 🔒 PERMISOS Y RESTRICCIONES

### **ESTUDIANTE:**
- ✅ Crear incidentes
- ✅ Ver **solo sus incidentes** (propios)
- ✅ Recibir notificaciones de cambios de estado
- ❌ NO puede editar incidentes
- ❌ NO puede asignar trabajadores
- ❌ NO puede cambiar estados

### **ADMIN:**
- ✅ Ver **todos los incidentes**
- ✅ Editar información del incidente (título, descripción, tipo, urgencia)
- ✅ Asignar trabajadores **disponibles**
- ✅ Filtrar por urgencia, tipo, estado
- ❌ NO puede cambiar estado manualmente (es automático)
- ❌ NO puede asignar a trabajadores ocupados
- ❌ NO puede completar tareas

### **TRABAJADOR:**
- ✅ Ver **solo incidentes asignados a él**
- ✅ Completar sus tareas asignadas
- ✅ Cambiar estado a "resuelto" al completar
- ❌ NO puede ver todos los incidentes
- ❌ NO puede asignar tareas
- ❌ NO puede editar incidentes

---

## 🔔 NOTIFICACIONES EN TIEMPO REAL

### Estudiante recibe notificación cuando:

1. **Admin asigna trabajador:**
   ```
   🔔 ¡Estado Actualizado!
   Tu incidente 'Fuga de agua' cambió de estado:
   pendiente → en atención
   ```

2. **Trabajador completa tarea:**
   ```
   🔔 ¡Estado Actualizado!
   Tu incidente 'Fuga de agua' cambió de estado:
   en atención → resuelto
   ```

**Características de notificaciones:**
- ✅ Toast visual en esquina superior derecha
- ✅ Animaciones suaves
- ✅ Auto-desaparecen después de 8 segundos
- ✅ Log en consola WebSocket
- ✅ Actualización automática de listas

---

## 📊 DASHBOARDS POR ROL

### **Dashboard del Estudiante:**
```
┌───────────────────────────────────┐
│ 📝 Crear Nuevo Incidente         │
├───────────────────────────────────┤
│ 📋 Mis Incidentes                 │
│                                   │
│ Pestañas:                         │
│ [📌 Activos]  [✅ Completados]   │
│                                   │
│ Activos:                          │
│  • Pendiente (esperando admin)    │
│  • En Atención (trabajador activo)│
│                                   │
│ Completados:                      │
│  • Resuelto (agrupados por fecha) │
└───────────────────────────────────┘
```

### **Dashboard del Admin:**
```
┌───────────────────────────────────┐
│ 📋 Todos los Incidentes           │
├───────────────────────────────────┤
│ 🔍 Filtros:                       │
│  Urgencia: [Alto ▼]               │
│  Tipo: [Eléctrico ▼]              │
│  Estado: [Pendiente ▼]            │
├───────────────────────────────────┤
│ Pestañas:                         │
│ [📌 Activos]  [✅ Completados]   │
│                                   │
│ Cada incidente tiene:             │
│  [✏️ Editar] [👤 Asignar]        │
└───────────────────────────────────┘
```

### **Dashboard del Trabajador:**
```
┌───────────────────────────────────┐
│ 📋 Mis Tareas Asignadas           │
├───────────────────────────────────┤
│ Pestañas:                         │
│ [📌 Activos]  [✅ Completados]   │
│                                   │
│ Activos:                          │
│  • En Atención                    │
│    [✅ Marcar como Completado]    │
│                                   │
│ Completados:                      │
│  • Resuelto (histórico)           │
└───────────────────────────────────┘
```

---

## 🔄 EJEMPLO COMPLETO DE FLUJO

```
┌─────────────────────────────────────────────────────┐
│ ESTUDIANTE: Juan                                    │
└─────────────────────────────────────────────────────┘
         │
         │ 1. Crea incidente: "Fuga de agua en baño"
         │    Urgencia: Alto
         ↓
┌─────────────────────────────────────────────────────┐
│ SISTEMA: Estado = "pendiente" (automático)          │
│ 🔔 Notificación a Juan: "Incidente creado"          │
└─────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────┐
│ ADMIN: María                                        │
│ • Ve incidente "pendiente"                          │
│ • Click "Asignar"                                   │
│ • Ve lista de trabajadores DISPONIBLES:             │
│   - Pedro (Plomería) ✅ Disponible                  │
│   - Carlos (Electricidad) 🔴 Ocupado                │
│ • Asigna a Pedro                                    │
└─────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────┐
│ SISTEMA: Estado = "en atención" (automático)        │
│ • Pedro → Ocupado                                   │
│ 🔔 Notificación a Juan:                             │
│    "pendiente → en atención"                        │
└─────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────┐
│ TRABAJADOR: Pedro                                   │
│ • Ve incidente en su dashboard                      │
│ • Trabaja en la fuga de agua                        │
│ • Click "Marcar como Completado"                    │
└─────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────┐
│ SISTEMA: Estado = "resuelto" (automático)           │
│ • Pedro → Disponible                                │
│ • Incidente → Pestaña "Completados"                 │
│ 🔔 Notificación a Juan:                             │
│    "en atención → resuelto"                         │
└─────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────┐
│ RESULTADO FINAL:                                    │
│ • Juan: Ve su incidente resuelto                    │
│ • Pedro: Disponible para nueva tarea                │
│ • María: Puede asignarle otra tarea a Pedro         │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ CAMBIOS TÉCNICOS IMPLEMENTADOS

### **Backend (src/app.py):**

1. **PUT /incidentes/{id}** (Admin editar):
   - ❌ Removido campo `estado` de actualización
   - ✅ Solo permite editar: título, descripción, tipo, piso, lugar, urgencia
   - ℹ️ Mensaje: "El estado se cambia automáticamente al asignar o completar"

2. **PUT /incidentes/{id}/asignar** (Admin asignar):
   - ✅ Cambia estado **automáticamente** a "en atención"
   - ✅ Envía notificación al estudiante
   - ✅ Guarda información del trabajador asignado

3. **PUT /incidentes/{id}/completar** (Trabajador completar):
   - ✅ Solo trabajador asignado puede completar
   - ✅ Cambia estado **automáticamente** a "resuelto"
   - ✅ Envía notificación al estudiante
   - ✅ Guarda fecha y quién completó

### **Frontend (frontend/app.js):**

1. **Modal de Edición (Admin):**
   - ❌ Removido campo de estado
   - ✅ Agregado mensaje informativo
   - ✅ Solo campos: título, descripción, tipo, urgencia

2. **Tarjeta de Incidente (Trabajador):**
   - ✅ Botón "Marcar como Completado"
   - ✅ Solo visible si estado = "en atención"
   - ✅ Solo visible si asignado al trabajador actual

3. **Asignación de Trabajadores:**
   - ✅ Calcula disponibilidad en tiempo real
   - ✅ Muestra icono: 🟢 Disponible / 🔴 Ocupado
   - ✅ Muestra contador de tareas activas

### **Frontend (frontend/style.css):**

1. **Nuevo botón:**
   - ✅ `.btn-complete` - Naranja (#FF9800)
   - ✅ Ancho completo para destacar
   - ✅ Hover con animación

---

## 🧪 TESTING

### **Probar flujo completo:**

```bash
# Ventana 1: Estudiante
1. Login como juan@test.com
2. Crear incidente con urgencia alta
3. Verificar estado "pendiente"
4. Esperar notificaciones

# Ventana 2: Admin  
1. Login como admin@test.com
2. Ver incidente pendiente
3. Click "Asignar"
4. Verificar que trabajadores ocupados no aparecen
5. Asignar a trabajador disponible
6. Verificar que estado cambió a "en atención"

# Ventana 3: Trabajador
1. Login como pedro@test.com
2. Ver incidente asignado
3. Click "Marcar como Completado"
4. Verificar que estado cambió a "resuelto"

# Ventana 1: Verificar estudiante
1. Recibió notificación "pendiente → en atención"
2. Recibió notificación "en atención → resuelto"
3. Incidente está en pestaña "Completados"
```

---

## ✅ BENEFICIOS DEL NUEVO SISTEMA

1. **Automatización**: Estados cambian solos, sin intervención manual
2. **Claridad**: Flujo lineal y predecible
3. **Control**: Admin no puede saturar trabajadores
4. **Transparencia**: Estudiantes siempre informados
5. **Eficiencia**: Trabajadores solo ven tareas relevantes
6. **Seguridad**: Permisos bien definidos

---

## 🚀 DEPLOYMENT

```bash
cd /Users/fatimapacheco/Documents/cloud/cloud-hack

# Backend
sls deploy

# Frontend (automático con Live Server)
# Solo refresca el navegador
```

---

**¡Sistema de estados automáticos implementado! 🎉**
