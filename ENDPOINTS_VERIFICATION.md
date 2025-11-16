# ✅ Verificación de Endpoints - Sistema Listo para Probar

## 📡 Configuración Actual del Frontend

### **Auth Endpoints** (`frontend/auth.js`)
```javascript
const API_BASE_URL = 'https://eb28n1jcdh.execute-api.us-east-1.amazonaws.com/dev';
```

✅ **POST** `/auth/register` - Registro de usuarios con especialidad
✅ **POST** `/auth/login` - Login de usuarios

### **Incident Endpoints** (`frontend/index.html`)
```html
<input id="apiUrl" value="https://eb28n1jcdh.execute-api.us-east-1.amazonaws.com/dev/incidentes">
```

✅ **POST** `/incidentes` - Crear incidente (estudiantes)
✅ **GET** `/incidentes` - Listar incidentes (filtrado por rol)
✅ **PUT** `/incidentes/{id}` - Editar incidente (admin)
✅ **PUT** `/incidentes/{id}/asignar` - Asignar a trabajador (admin)

### **Users Endpoint**
```javascript
// Construido dinámicamente en app.js
const apiBase = getApiUrl().replace('/incidentes', '');
// Result: https://eb28n1jcdh.execute-api.us-east-1.amazonaws.com/dev
```

✅ **GET** `/users?tipo=trabajador` - Listar trabajadores

### **WebSocket** (`frontend/index.html`)
```html
<input id="wsUrl" value="wss://brrnv2ag89.execute-api.us-east-1.amazonaws.com/dev">
```

✅ **WebSocket** - Actualizaciones en tiempo real

---

## 🎯 Mapeo Completo de Endpoints

| Método | Endpoint | Descripción | Rol Requerido | Archivo Frontend |
|--------|----------|-------------|---------------|------------------|
| `POST` | `/auth/register` | Registro con especialidad | Público | `auth.js:106` |
| `POST` | `/auth/login` | Login | Público | `auth.js:182` |
| `POST` | `/incidentes` | Crear incidente | Estudiante | `app.js:216` |
| `GET` | `/incidentes` | Listar incidentes | Todos (autenticado) | `app.js:253` |
| `PUT` | `/incidentes/{id}` | Editar incidente | Admin | `app.js:446` |
| `PUT` | `/incidentes/{id}/asignar` | Asignar trabajador | Admin | `app.js:578` |
| `GET` | `/users?tipo=trabajador` | Listar trabajadores | Admin | `app.js:647` |
| `WSS` | `/dev` | WebSocket real-time | Todos | `app.js:159` |

---

## 🚀 Funcionalidades Implementadas

### ✨ Sistema de Especialidades
- [x] Registro de trabajadores con especialidad
- [x] Validación backend (4 opciones)
- [x] Campo visible solo para trabajadores
- [x] Especialidad mostrada en UI

### ✨ Sistema de Asignación Mejorado
- [x] Filtro por especialidad en modal de asignación
- [x] Estado de disponibilidad (🟢 Disponible / 🔴 Ocupado)
- [x] Contador de incidentes activos
- [x] Trabajadores liberados al cerrar incidentes

### ✨ Roles y Permisos
- [x] Estudiantes: crear y ver sus incidentes
- [x] Admin: ver todos, editar, asignar
- [x] Trabajadores: ver solo asignados a ellos

---

## 📋 Checklist de Pruebas

### 1. Autenticación
- [ ] Registrar estudiante (`@utec.edu.pe`)
- [ ] Registrar admin (`@admin.utec.edu.pe`)
- [ ] Registrar 4 trabajadores (uno de cada especialidad):
  - [ ] TI (`@gmail.com`)
  - [ ] Servicio de Limpieza (`@gmail.com`)
  - [ ] Seguridad (`@gmail.com`)
  - [ ] Electricista (`@gmail.com`)

### 2. Especialidades
- [ ] Verificar que el campo aparece solo para trabajadores
- [ ] Validar que es requerido para trabajadores
- [ ] Confirmar que se guarda correctamente
- [ ] Verificar que se muestra en login

### 3. Incidentes
- [ ] Crear incidente como estudiante
- [ ] Listar incidentes (cada rol ve lo que debe)
- [ ] Editar incidente como admin
- [ ] Verificar estados: pendiente, asignado, en_proceso, resuelto

### 4. Sistema de Asignación
- [ ] Abrir modal de asignación
- [ ] Verificar filtro de especialidades funciona
- [ ] Ver estado de disponibilidad (🟢/🔴)
- [ ] Asignar incidente
- [ ] Verificar que trabajador ahora está ocupado
- [ ] Cambiar incidente a "resuelto"
- [ ] Verificar que trabajador vuelve a estar disponible

### 5. WebSocket
- [ ] Conectar WebSocket
- [ ] Crear incidente (debe aparecer en tiempo real)
- [ ] Verificar actualización automática

---

## 🎨 Interfaz de Usuario

### Vista de Registro (Trabajador)
```
┌─────────────────────────────────────┐
│ Crear Cuenta                        │
├─────────────────────────────────────┤
│ Nombre: [Juan Pérez           ]    │
│ Email:  [juan@gmail.com       ]    │
│ ℹ️ Tu tipo de usuario será:         │
│    personal (selecciona especialid) │
│                                     │
│ Especialidad: [▼ TI             ]  │
│   - TI (Tecnologías de Info)       │
│   - Servicio de Limpieza           │
│   - Seguridad                      │
│   - Electricista                   │
│                                     │
│ Contraseña: [********]             │
│ Confirmar:  [********]             │
│                                     │
│         [Crear Cuenta]             │
└─────────────────────────────────────┘
```

### Modal de Asignación (Admin)
```
┌─────────────────────────────────────────┐
│  👤 Asignar Incidente a Trabajador     │
├─────────────────────────────────────────┤
│ Filtrar por Especialidad:              │
│ [▼ -- Todas las especialidades --]    │
│                                         │
│ Seleccionar Trabajador:                │
│ [▼ -- Selecciona un trabajador --]    │
│  🟢 Juan Pérez - TI - Disponible      │
│  🔴 Ana García - TI - Ocupado (2)      │
│  🟢 Carlos López - Limpieza - Disp.   │
│  🟢 María Ruiz - Seguridad - Disp.    │
│  🟢 Pedro Soto - Electricista - Disp. │
│                                         │
│ 🟢 Disponible | 🔴 Ocupado             │
│                                         │
│     [Asignar]  [Cancelar]              │
└─────────────────────────────────────────┘
```

### Header de Usuario
```
┌─────────────────────────────────────┐
│ 🚨 Incident Management System      │
│                                     │
│ 👤 Juan Pérez                      │
│ [TRABAJADOR - TI] [Cerrar Sesión]  │
└─────────────────────────────────────┘
```

---

## 🔍 URLs de Acceso

### Páginas Frontend
1. **Login**: `frontend/login.html`
2. **Registro**: `frontend/register.html`
3. **App Principal**: `frontend/index.html`

### Secuencia de Prueba Sugerida
1. Abre `frontend/register.html`
2. Crea cuentas de prueba (ver sección de datos de prueba)
3. Abre `frontend/login.html`
4. Inicia sesión con cada tipo de usuario
5. Prueba las funcionalidades según el rol

---

## 📊 Datos de Prueba Sugeridos

### Admin
```
Email: admin@admin.utec.edu.pe
Password: admin123
```

### Estudiante
```
Email: estudiante@utec.edu.pe
Password: student123
```

### Trabajadores
```
1. TI
   Email: ti.worker@gmail.com
   Especialidad: TI
   Password: worker123

2. Limpieza
   Email: limpieza@gmail.com
   Especialidad: Servicio de Limpieza
   Password: worker123

3. Seguridad
   Email: seguridad@gmail.com
   Especialidad: Seguridad
   Password: worker123

4. Electricista
   Email: electricista@gmail.com
   Especialidad: Electricista
   Password: worker123
```

---

## ✅ Estado del Sistema

| Componente | Estado | Observaciones |
|------------|--------|---------------|
| Backend Auth | ✅ Deployed | Validación de especialidad activa |
| Backend Incidents | ✅ Deployed | Sistema de asignación con especialidad |
| Backend Users | ✅ Deployed | Endpoint lista trabajadores |
| Frontend Auth | ✅ Configurado | URLs correctas |
| Frontend App | ✅ Configurado | Filtros y disponibilidad implementados |
| WebSocket | ✅ Configurado | Tiempo real funcional |

---

## 🎉 Todo Listo Para Probar

El sistema está completamente configurado y listo para usar. Todos los endpoints están correctamente apuntando a:
- **REST API**: `https://eb28n1jcdh.execute-api.us-east-1.amazonaws.com/dev`
- **WebSocket**: `wss://brrnv2ag89.execute-api.us-east-1.amazonaws.com/dev`

**¡Abre `frontend/register.html` en tu navegador y comienza a probar!** 🚀
