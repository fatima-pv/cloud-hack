// ========================================
// CONFIGURACIÓN DE API - Cloud Hack
// ========================================
// 
// INSTRUCCIONES:
// 1. Después de ejecutar 'serverless deploy', obtendrás URLs como estas:
//    - REST API: https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
//    - WebSocket: wss://xxxxx.execute-api.us-east-1.amazonaws.com/dev
//
// 2. Copia esta URL base (sin el /auth/register o /incidentes al final)
//
// 3. Reemplaza 'YOUR_API_GATEWAY_URL' abajo con tu URL real
//
// 4. Asegúrate de incluir el stage (/dev o /prod)
//
// ========================================

// 🔧 CONFIGURA ESTA URL DESPUÉS DEL DEPLOYMENT
const API_BASE_URL = 'https://pj9trlx4uf.execute-api.us-east-1.amazonaws.com/dev';

// Ejemplos de URLs correctas:
// const API_BASE_URL = 'https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev';
// const API_BASE_URL = 'https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod';

// ⚠️ URLs INCORRECTAS (no incluir el endpoint):
// ❌ 'https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/auth/login'
// ❌ 'https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/incidentes'
// ✅ 'https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev'

// ========================================
// NO MODIFICAR ABAJO DE ESTA LÍNEA
// ========================================

// Endpoints construidos automáticamente
const ENDPOINTS = {
    register: `${API_BASE_URL}/auth/register`,
    login: `${API_BASE_URL}/auth/login`,
    incidentes: `${API_BASE_URL}/incidentes`
};

console.log('API Configuration:', ENDPOINTS);
