// ========================================
// CONFIGURACIÓN DE API - Cloud Hack
// ========================================
// Actualizado: 16 de noviembre de 2024
// Stage: dev
// ========================================

// REST API Base URL
const API_BASE_URL = 'https://pj9trlx4uf.execute-api.us-east-1.amazonaws.com/dev';

// WebSocket URL
const WS_URL = 'wss://6qtk3h60si.execute-api.us-east-1.amazonaws.com/dev';

// ========================================
// Endpoints construidos automáticamente
// ========================================

const ENDPOINTS = {
    // Autenticación
    auth: {
        register: `${API_BASE_URL}/auth/register`,
        login: `${API_BASE_URL}/auth/login`
    },
    
    // Usuarios
    users: {
        list: `${API_BASE_URL}/users`
    },
    
    // Incidentes
    incidentes: {
        create: `${API_BASE_URL}/incidentes`,
        list: `${API_BASE_URL}/incidentes`,
        update: (id) => `${API_BASE_URL}/incidentes/${id}`,
        assign: (id) => `${API_BASE_URL}/incidentes/${id}/asignar`,
        complete: (id) => `${API_BASE_URL}/incidentes/${id}/completar`
    },
    
    // WebSocket
    websocket: WS_URL
};

// ========================================
// NO MODIFICAR ABAJO DE ESTA LÍNEA
// ========================================
console.log('✅ Configuración cargada:');
console.log('   REST API:', API_BASE_URL);
console.log('   WebSocket:', WS_URL);
