# Cloud Hack - Sistema de Gestión de Incidentes UTEC

Sistema serverless para gestión de reportes de incidentes con autenticación de usuarios basada en dominios de correo electrónico.

## 🚀 Características

- ✅ **Autenticación de Usuarios** (Registro y Login)
- ✅ **Tipos de Usuario Automáticos** basados en dominio de correo
  - Estudiantes (`@utec.edu.pe`)
  - Administradores (`@admin.utec.edu.pe`)
  - Trabajadores (otros dominios)
- ✅ **Gestión de Incidentes** (REST API)
- ✅ **WebSocket en Tiempo Real** para actualizaciones
- ✅ **DynamoDB** para persistencia de datos
- ✅ **Serverless Framework** para deployment en AWS

## 📁 Estructura del Proyecto

```
cloud-hack/
├── src/
│   ├── app.py           # Lambda function para incidentes
│   ├── auth.py          # Lambda function para autenticación
│   ├── connect.py       # WebSocket connect handler
│   └── disconnect.py    # WebSocket disconnect handler
├── frontend/
│   ├── index.html       # Página principal (requiere auth)
│   ├── login.html       # Página de login
│   ├── register.html    # Página de registro
│   ├── app.js           # Lógica principal
│   ├── auth.js          # Lógica de autenticación
│   ├── style.css        # Estilos principales
│   └── auth-style.css   # Estilos de autenticación
├── docs/
│   ├── AUTH_README.md   # Documentación de autenticación
│   └── test-users.md    # Usuarios de prueba
├── serverless.yml       # Configuración Serverless
└── requirements.txt     # Dependencias Python
```

## 🔧 Tecnologías

- **Backend**: AWS Lambda (Python 3.9)
- **Base de Datos**: DynamoDB
- **API**: API Gateway (REST + WebSocket)
- **Frontend**: HTML5 + JavaScript (Vanilla)
- **IaC**: Serverless Framework
- **Autenticación**: SHA-256 password hashing

## 📋 Prerequisitos

- AWS Account (AWS Academy o cuenta personal)
- Node.js y npm instalados
- Serverless Framework: `npm install -g serverless`
- AWS CLI configurado: `aws configure`

## 🚀 Deployment

### 1. Instalar dependencias

```bash
npm install -g serverless
```

### 2. Configurar AWS Credentials

```bash
aws configure
# Ingresa tus credenciales AWS
```

### 3. Desplegar en AWS

```bash
# Desplegar todo el stack
serverless deploy

# O para un stage específico
serverless deploy --stage prod
```

### 4. Obtener URLs

Después del deployment, verás las URLs en la consola:

```
endpoints:
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/auth/register
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/auth/login
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/incidentes
  GET  - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/incidentes
  wss://xxxxx.execute-api.us-east-1.amazonaws.com/dev
```

### 5. Configurar Frontend

Actualiza las URLs en:
- `frontend/auth.js` - línea 2: `const API_BASE_URL`
- `frontend/index.html` - inputs de configuración

## 📖 Uso

### Registro de Usuario

1. Abre `frontend/register.html` en tu navegador
2. Completa el formulario:
   - Nombre completo
   - Email (determina el tipo de usuario automáticamente)
      - Si colocas tu email personal usando el formato `pepe@personal@utec.edu.pe`, se te creará una cuenta como **trabajador (area de trabajo)** y serás dirigido a tu dashboard personal, donde verás las incidencias que el admin te asigne. Desde este dashboard podrás marcar tus incidencias como "comenzada" o "terminada", y cada actualización enviará una notificación a los usuarios involucrados, quienes podrán ver el cambio de estado en su perfil.
      - Si colocas tu email con formato `pepe@admin@utec.edu.pe`, tu cuenta será de **administrador** (_admin_) y tendrás acceso a un perfil y dashboard de administración. Ahí podrás ver todas las incidencias reportadas, cancelarlas, asignarlas a los trabajadores según áreas, y hacer seguimiento en tiempo real al estado de cada una.
   - Contraseña (mínimo 6 caracteres)
3. Click en "Crear Cuenta"

**Resumen de tipos de usuario:**
- `usuario@utec.edu.pe` → Estudiante  
  Puede crear incidencias y ver el estado de sus propias incidencias (incluidas notificaciones cuando actualizan su reporte).
- `usuario@personal@utec.edu.pe` → Personal/Trabajador  
  Al hacer el registro verifica cuando se pone el @personal y le da la opcion de elegir su area de trabajo. Cuenta tipo trabajador. Recibe en su dashboard personal las incidencias asignadas por el admin, puede marcarlas como iniciadas o terminadas, y notifica automáticamente a los usuarios afectados.
- `usuario@admin@utec.edu.pe` → Administrador  
  Perfil para administración general. Visualiza todas las incidencias globalmente, cancela o reasigna tareas, y gestiona los flujos entre estudiantes y trabajadores.

### Login

1. Abre `frontend/login.html`
2. Ingresa email y contraseña
3. Serás redirigido a la aplicación principal correspondiente según tu tipo de usuario

### Crear Incidente

1. En la página principal (requiere login como estudiante)
2. Completa el formulario de incidente
3. Click en "Submit Incident"
4. El incidente se guarda y se notifica vía WebSocket

### Dashboard Personal, Asignación y Notificaciones

- Si eres trabajador (`@personal@utec.edu.pe`):  
  En tu dashboard tendrás solo las incidencias que el administrador te haya asignado. Puedes marcar cuándo las empiezas y terminas. Cada acción actualiza el estado y notifica automáticamente a los usuarios asociados a la incidencia en su perfil.
- Si eres administrador (`@admin@utec.edu.pe`):  
  Tu perfil incluye el dashboard global de incidencias. Puedes ver, cancelar u organizar incidencias y (re)asignarlas a los trabajadores según área.
- Todos los usuarios pueden ver sus propias notificaciones sobre incidencias en la sección "Notificaciones" de su perfil.

## 📊 Recursos AWS Creados

- **Lambda Functions**: 5 (auth, api, user, wsConnect, wsDisconnect)
- **DynamoDB Tables**: 3 (Users, Reports, Connections)
- **API Gateway**: 2 (REST API, WebSocket API)
- **IAM Roles**: Configurado con LabRole para AWS Academy
- entre otros

## 🐛 Troubleshooting

### Error: "Module not found"
```bash
# Asegúrate de tener boto3 en requirements.txt
pip install boto3
```

### Error: "Invalid credentials"
```bash
# Reconfigura AWS CLI
aws configure
```

## 👥 Contribuidores
Fatima Pacheco, Diego Alarcon y Valentino Contreras con mucho amor
//
Proyecto desarrollado para UTEC Cloud Computing.

## 📄 Licencia

MIT License
