# Sistema de Autenticación - Cloud Hack

## 📋 Descripción

Sistema de autenticación implementado para el proyecto Cloud Hack que permite registro y login de usuarios con tres tipos diferentes basados en el dominio del correo electrónico.

## 👥 Tipos de Usuario

El sistema automáticamente asigna el tipo de usuario basándose en el dominio del correo electrónico:

| Tipo | Dominio | Descripción |
|------|---------|-------------|
| **Estudiante** | `@utec.edu.pe` | Usuarios con correo institucional de estudiantes UTEC |
| **Admin** | `@admin.utec.edu.pe` | Administradores del sistema |
| **Trabajador** | Otros dominios | Empleados con correos de otros dominios |

## 🔧 Arquitectura

### Backend (AWS Lambda + DynamoDB)

- **Función Lambda**: `src/auth.py`
- **Tabla DynamoDB**: `UsersTable` con clave primaria `email`
- **Endpoints**:
  - `POST /auth/register` - Registro de nuevos usuarios
  - `POST /auth/login` - Inicio de sesión

### Frontend (HTML + JavaScript)

- `login.html` - Página de inicio de sesión
- `register.html` - Página de registro
- `auth.js` - Lógica de autenticación
- `auth-style.css` - Estilos para páginas de autenticación

## 🚀 Despliegue

### 1. Configurar Serverless Framework

```bash
# Instalar dependencias (si aún no lo has hecho)
npm install -g serverless

# Verificar configuración AWS
aws configure
```

### 2. Desplegar el Backend

```bash
# Desde la raíz del proyecto
serverless deploy

# O para un stage específico
serverless deploy --stage prod
```

### 3. Configurar URLs en el Frontend

Después del despliegue, actualiza las URLs en `frontend/auth.js`:

```javascript
const API_BASE_URL = 'https://YOUR_API_GATEWAY_URL/dev';
```

Obtén la URL del API Gateway desde la salida del comando `serverless deploy`.

## 📝 Uso

### Registro de Usuario

1. Navega a `register.html`
2. Ingresa:
   - Nombre completo
   - Correo electrónico (el tipo se asignará automáticamente)
   - Contraseña (mínimo 6 caracteres)
   - Confirmar contraseña
3. Click en "Crear Cuenta"
4. El sistema mostrará el tipo de usuario asignado

### Inicio de Sesión

1. Navega a `login.html`
2. Ingresa:
   - Correo electrónico
   - Contraseña
3. Click en "Iniciar Sesión"
4. Serás redirigido a la aplicación principal

### Protección de Rutas

La página principal (`index.html`) ahora requiere autenticación. Los usuarios no autenticados serán redirigidos automáticamente a `login.html`.

## 🔒 Seguridad

- **Contraseñas**: Hasheadas con SHA-256 antes de almacenar
- **CORS**: Configurado para permitir acceso desde el frontend
- **Validación**: 
  - Email válido requerido
  - Contraseña mínimo 6 caracteres
  - Verificación de correo único

## 📦 Estructura de Datos

### Usuario en DynamoDB

```json
{
  "email": "estudiante@utec.edu.pe",
  "user_id": "uuid-v4",
  "nombre": "Juan Pérez",
  "password_hash": "sha256-hash",
  "tipo": "estudiante",
  "created_at": "2025-01-01T00:00:00",
  "updated_at": "2025-01-01T00:00:00"
}
```

### Respuesta de Login/Register

```json
{
  "message": "Login exitoso",
  "user": {
    "user_id": "uuid",
    "email": "user@domain.com",
    "nombre": "Nombre Usuario",
    "tipo": "estudiante",
    "created_at": "timestamp"
  }
}
```

## 🧪 Testing Local

Para probar localmente sin desplegar:

```bash
# Usar serverless offline (requiere plugin)
npm install --save-dev serverless-offline
serverless offline
```

## 🔄 Próximos Pasos

1. ✅ Sistema de autenticación implementado
2. ⏳ Implementar funcionalidades específicas por tipo de usuario
3. ⏳ Agregar tokens JWT para autenticación persistente
4. ⏳ Implementar recuperación de contraseña
5. ⏳ Agregar verificación de correo electrónico

## 📄 Archivos Creados/Modificados

### Nuevos Archivos
- `src/auth.py` - Lambda function para autenticación
- `frontend/login.html` - Página de login
- `frontend/register.html` - Página de registro
- `frontend/auth.js` - Lógica de autenticación
- `frontend/auth-style.css` - Estilos de autenticación
- `docs/AUTH_README.md` - Esta documentación

### Archivos Modificados
- `serverless.yml` - Añadido función auth y tabla UsersTable
- `frontend/index.html` - Añadido header con info de usuario
- `frontend/app.js` - Añadida verificación de autenticación
- `frontend/style.css` - Añadidos estilos para user info

## 💡 Ejemplos de Uso

### Registrar un Estudiante
```bash
curl -X POST https://your-api.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "María García",
    "email": "maria.garcia@utec.edu.pe",
    "password": "securepass123"
  }'
```

### Login
```bash
curl -X POST https://your-api.com/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria.garcia@utec.edu.pe",
    "password": "securepass123"
  }'
```

## ❓ Troubleshooting

### Error: "Email y password son requeridos"
- Verifica que estés enviando ambos campos en el body del request

### Error: "El usuario ya existe"
- El email ya está registrado, intenta con login o usa otro email

### Error: "Credenciales inválidas"
- Verifica que el email y password sean correctos

### No puedo acceder a la aplicación principal
- Asegúrate de haber iniciado sesión primero
- Verifica que el localStorage tenga la información del usuario
- Abre la consola del navegador para ver errores

## 📞 Soporte

Para problemas o preguntas, contacta al equipo de desarrollo.
