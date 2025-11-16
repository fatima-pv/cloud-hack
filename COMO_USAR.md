# 🚀 CÓMO USAR LA APLICACIÓN - PASO A PASO

## ⚠️ IMPORTANTE: Debes estar autenticado primero

El error **"No autenticado. Incluye X-User-Email header"** significa que **NO has iniciado sesión**.

## 📋 PASOS PARA USAR LA APLICACIÓN

### OPCIÓN 1: Usar el Frontend (Recomendado)

#### 1. Abrir el archivo de registro
```bash
cd /Users/fatimapacheco/Documents/cloud/cloud-hack/frontend
open register.html
```

#### 2. Registrarte como estudiante
- **Nombre**: Tu nombre
- **Email**: tu-email@test.com
- **Contraseña**: tu-password
- **Tipo**: Estudiante
- Click en "Register"

#### 3. Serás redirigido al login automáticamente
- Ingresa tu email y contraseña
- Click en "Login"

#### 4. Ahora podrás crear incidentes
- Serás redirigido a `index.html`
- Llena el formulario
- Click en "Submit Incident"

---

### OPCIÓN 2: Registrarte por cURL primero

Si prefieres hacerlo por terminal primero:

#### 1. Registrar un estudiante
```bash
curl -X POST https://pj9trlx4uf.execute-api.us-east-1.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "estudiante@test.com",
    "password": "est123",
    "nombre": "Estudiante Test",
    "tipo": "estudiante"
  }'
```

#### 2. Luego abrir el frontend y hacer login
```bash
cd frontend
open login.html
```

- Email: estudiante@test.com
- Password: est123
- Click "Login"

---

## 🔐 TIPOS DE USUARIOS

### Estudiante
- **Puede**: Crear incidentes, ver solo SUS incidentes
- **No puede**: Editar, asignar, completar

### Trabajador
- **Puede**: Ver incidentes asignados a él, completarlos
- **No puede**: Crear, editar, asignar

### Admin
- **Puede**: Ver todos, editar, asignar, completar
- **No puede**: Crear incidentes (solo estudiantes)

---

## 🧪 FLUJO COMPLETO DE PRUEBA

### 1. Registrar 3 usuarios (por cURL o frontend)

**Estudiante:**
```bash
curl -X POST https://pj9trlx4uf.execute-api.us-east-1.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "estudiante@test.com",
    "password": "est123",
    "nombre": "Juan Estudiante",
    "tipo": "estudiante"
  }'
```

**Trabajador:**
```bash
curl -X POST https://pj9trlx4uf.execute-api.us-east-1.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trabajador@test.com",
    "password": "trab123",
    "nombre": "Pedro Trabajador",
    "tipo": "trabajador",
    "especialidad": "Plomería"
  }'
```

**Admin:**
```bash
curl -X POST https://pj9trlx4uf.execute-api.us-east-1.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123",
    "nombre": "María Admin",
    "tipo": "admin"
  }'
```

### 2. Login como estudiante
```bash
cd frontend
open login.html
```
- Email: estudiante@test.com
- Password: est123

### 3. Crear un incidente
- Llenar el formulario
- Click "Submit Incident"
- **Guardar el ID del incidente que aparece**

### 4. Abrir otra ventana/pestaña como admin
```bash
open login.html
```
- Email: admin@test.com
- Password: admin123

### 5. En la ventana del estudiante, conectar WebSocket
- Click en "Connect WebSocket"
- Debería decir "Connected"

### 6. En la ventana del admin, asignar el incidente
- Ver el incidente creado
- Click en "Asignar"
- Seleccionar trabajador
- **En la ventana del estudiante deberías ver la notificación** 🔔

---

## 🎯 SOLUCIÓN RÁPIDA AL ERROR

Si ves el error **"No autenticado"**:

1. **Abre el frontend:**
   ```bash
   cd /Users/fatimapacheco/Documents/cloud/cloud-hack/frontend
   open login.html
   ```

2. **Si no tienes cuenta, primero registra:**
   ```bash
   open register.html
   ```

3. **Llena el formulario de registro:**
   - Tipo: **Estudiante**
   - Email: tu-email@test.com
   - Password: cualquier contraseña

4. **Después del registro, haz login**

5. **Ahora podrás crear incidentes** ✅

---

## 📱 URLs DEL FRONTEND

- **Registro**: `file:///Users/fatimapacheco/Documents/cloud/cloud-hack/frontend/register.html`
- **Login**: `file:///Users/fatimapacheco/Documents/cloud/cloud-hack/frontend/login.html`
- **App Principal**: `file:///Users/fatimapacheco/Documents/cloud/cloud-hack/frontend/index.html`

---

## ⚡ TROUBLESHOOTING

### "No autenticado"
→ No has hecho login. Ve a `login.html`

### "Solo estudiantes pueden crear incidentes"
→ Estás logueado como admin o trabajador. Usa una cuenta de estudiante.

### "Error de CORS"
→ Normal si usas `file://`. Usa un servidor local:
```bash
cd frontend
python3 -m http.server 8000
# Luego abre: http://localhost:8000/login.html
```

### "WebSocket no conecta"
→ Verifica que el email en localStorage coincida con un usuario registrado.

---

## 🎬 VIDEO TUTORIAL (Paso a Paso)

1. `cd /Users/fatimapacheco/Documents/cloud/cloud-hack/frontend`
2. `open register.html` → Registrar estudiante
3. Automáticamente redirige a login
4. Login con email y password
5. Llenar formulario de incidente
6. Click "Submit Incident"
7. ✅ Ver el incidente creado

---

## 💡 CONSEJO

**Usa el servidor local para evitar problemas:**

```bash
cd /Users/fatimapacheco/Documents/cloud/cloud-hack/frontend
python3 -m http.server 8000
```

Luego abre en tu navegador:
- http://localhost:8000/register.html
- http://localhost:8000/login.html
- http://localhost:8000/index.html
