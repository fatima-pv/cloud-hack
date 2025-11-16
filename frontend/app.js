// WebSocket connection
let ws = null;
let wsConnected = false;
let currentUser = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    displayUserInfo(currentUser);
});

// Get current user from localStorage
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Display user info in header
function displayUserInfo(user) {
    const userName = document.getElementById('userName');
    const userType = document.getElementById('userType');
    
    if (userName) {
        userName.textContent = `👤 ${user.nombre}`;
    }
    
    if (userType) {
        userType.textContent = user.tipo.toUpperCase();
        userType.className = `user-badge badge-${user.tipo}`;
    }
}

// Logout handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro que quieres cerrar sesión?')) {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }
    });
}

// DOM Elements
const incidentForm = document.getElementById('incidentForm');
const submitResult = document.getElementById('submitResult');
const incidentsList = document.getElementById('incidentsList');
const refreshBtn = document.getElementById('refreshBtn');
const connectWsBtn = document.getElementById('connectWsBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const wsMessages = document.getElementById('wsMessages');
const wsStatus = document.getElementById('wsStatus');
const apiUrlInput = document.getElementById('apiUrl');
const wsUrlInput = document.getElementById('wsUrl');

// Get API URLs
function getApiUrl() {
    return apiUrlInput.value.trim();
}

function getWsUrl() {
    return wsUrlInput.value.trim();
}

// Show result message
function showResult(element, message, type) {
    element.textContent = message;
    element.className = `result show ${type}`;
    setTimeout(() => {
        element.className = 'result';
    }, 5000);
}

// Log WebSocket message
function logWsMessage(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const messageDiv = document.createElement('div');
    messageDiv.className = `ws-message ${type}`;
    messageDiv.innerHTML = `
        <span class="timestamp">[${timestamp}]</span>
        <div>${message}</div>
    `;
    wsMessages.appendChild(messageDiv);
    wsMessages.scrollTop = wsMessages.scrollHeight;
}

// Update WebSocket status
function updateWsStatus(connected) {
    wsConnected = connected;
    const statusDot = wsStatus.querySelector('.status-dot');
    const statusText = wsStatus.querySelector('.status-text');
    
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        connectWsBtn.textContent = 'Disconnect WebSocket';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        connectWsBtn.textContent = 'Connect WebSocket';
    }
}

// Connect to WebSocket
function connectWebSocket() {
    if (ws && wsConnected) {
        ws.close();
        return;
    }

    const wsUrl = getWsUrl();
    logWsMessage(`Connecting to ${wsUrl}...`, 'info');
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            logWsMessage('✅ WebSocket connected successfully!', 'success');
            updateWsStatus(true);
        };
        
        ws.onmessage = (event) => {
            logWsMessage(`📨 Received: ${event.data}`, 'info');
            try {
                const data = JSON.parse(event.data);
                logWsMessage(`Parsed data: ${JSON.stringify(data, null, 2)}`, 'success');
            } catch (e) {
                // Not JSON, just display as is
            }
        };
        
        ws.onerror = (error) => {
            logWsMessage(`❌ WebSocket error: ${error.message || 'Connection failed'}`, 'error');
            updateWsStatus(false);
        };
        
        ws.onclose = () => {
            logWsMessage('🔌 WebSocket disconnected', 'info');
            updateWsStatus(false);
        };
    } catch (error) {
        logWsMessage(`❌ Failed to connect: ${error.message}`, 'error');
        updateWsStatus(false);
    }
}

// Submit incident form
incidentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        titulo: document.getElementById('titulo').value,
        descripcion: document.getElementById('descripcion').value,
        tipo: document.getElementById('tipo').value,
        piso: document.getElementById('piso').value,
        lugar_especifico: document.getElementById('lugar_especifico').value,
        foto: document.getElementById('foto').value
    };
    
    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors',
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showResult(submitResult, '✅ Incident submitted successfully!', 'success');
            incidentForm.reset();
            
            // Refresh the incidents list
            setTimeout(() => loadIncidents(), 500);
        } else {
            showResult(submitResult, `❌ Error: ${data.message || 'Failed to submit incident'}`, 'error');
        }
    } catch (error) {
        showResult(submitResult, `❌ Error: ${error.message}`, 'error');
        console.error('Full error:', error);
    }
});

// Load incidents
async function loadIncidents() {
    incidentsList.innerHTML = '<p class="loading">Loading incidents...</p>';
    
    try {
        const response = await fetch(getApiUrl(), {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle different response formats
        let incidents = [];
        if (Array.isArray(data)) {
            incidents = data;
        } else if (data.incidents && Array.isArray(data.incidents)) {
            incidents = data.incidents;
        } else if (data.Items && Array.isArray(data.Items)) {
            incidents = data.Items;
        }
        
        if (incidents.length === 0) {
            incidentsList.innerHTML = '<p class="info">No incidents found. Create one to get started!</p>';
            return;
        }
        
        // Sort by timestamp (newest first)
        incidents.sort((a, b) => {
            const timeA = new Date(a.Fecha_creacion || a.timestamp || 0);
            const timeB = new Date(b.Fecha_creacion || b.timestamp || 0);
            return timeB - timeA;
        });
        
        incidentsList.innerHTML = incidents.map(incident => `
            <div class="incident-card">
                <h3>${escapeHtml(incident.titulo || incident.title || 'Sin título')}</h3>
                <p><strong>Descripción:</strong> ${escapeHtml(incident.descripcion || incident.description || 'Sin descripción')}</p>
                ${incident.tipo ? `<p><strong>Tipo:</strong> ${escapeHtml(incident.tipo)}</p>` : ''}
                ${incident.piso ? `<p><strong>Piso:</strong> ${escapeHtml(incident.piso)}</p>` : ''}
                ${incident.lugar_especifico ? `<p><strong>Lugar:</strong> ${escapeHtml(incident.lugar_especifico)}</p>` : ''}
                <p><strong>ID:</strong> ${escapeHtml(incident.id || 'N/A')}</p>
                <p><strong>Estado:</strong> ${escapeHtml(incident.estado || 'N/A')}</p>
                <p><strong>Veces Reportado:</strong> ${incident.veces_reportado || 0}</p>
                <p><strong>Creado:</strong> ${formatDate(incident.Fecha_creacion || incident.timestamp)}</p>
                ${incident.Nivel_Riesgo ? `<span class="severity ${getSeverityClass(incident.Nivel_Riesgo)}">${getSeverityIcon(incident.Nivel_Riesgo)} ${incident.Nivel_Riesgo}</span>` : ''}
            </div>
        `).join('');
    } catch (error) {
        incidentsList.innerHTML = `<p class="error" style="color: #721c24; text-align: center; padding: 20px;">❌ Error loading incidents: ${error.message}<br><small>Check browser console for details</small></p>`;
        console.error('Full error:', error);
    }
}

// Helper functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function getSeverityIcon(severity) {
    const icons = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴',
        bajo: '🟢',
        medio: '🟡',
        alto: '🟠'
    };
    return icons[severity?.toLowerCase()] || '⚪';
}

function getSeverityClass(severity) {
    const classes = {
        bajo: 'low',
        medio: 'medium',
        alto: 'high',
        crítico: 'critical',
        low: 'low',
        medium: 'medium',
        high: 'high',
        critical: 'critical'
    };
    return classes[severity?.toLowerCase()] || 'medium';
}

// Event listeners
refreshBtn.addEventListener('click', loadIncidents);
connectWsBtn.addEventListener('click', connectWebSocket);
clearLogsBtn.addEventListener('click', () => {
    wsMessages.innerHTML = '<p class="info">Logs cleared...</p>';
});

// Initialize
console.log('Incident Management System loaded!');
console.log('Ready to test your serverless API');
