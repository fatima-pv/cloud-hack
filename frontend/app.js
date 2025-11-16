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
    
    // ✅ Conectar WebSocket automáticamente para notificaciones en tiempo real
    setTimeout(() => {
        connectWebSocket();
        logWsMessage('🔄 Conectando automáticamente para recibir notificaciones en tiempo real...', 'info');
    }, 500);
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
        const especialidadText = user.especialidad ? ` - ${user.especialidad}` : '';
        userType.textContent = user.tipo.toUpperCase() + especialidadText;
        userType.className = `user-badge badge-${user.tipo}`;
    }
    
    // Mostrar/ocultar elementos según el tipo de usuario
    adjustUIForUserType(user.tipo);
}

// Adjust UI based on user type
function adjustUIForUserType(tipo) {
    const createPanel = document.querySelector('.panel:first-child'); // Panel de crear incidente
    const incidentsPanel = document.querySelectorAll('.panel')[1]; // Panel de lista
    
    if (tipo === 'estudiante') {
        // Estudiantes: solo pueden crear, ver solo los suyos
        if (createPanel) createPanel.style.display = 'block';
        if (incidentsPanel) {
            const header = incidentsPanel.querySelector('.panel-header h2');
            if (header) header.textContent = '📋 Mis Incidentes';
        }
    } else if (tipo === 'admin') {
        // Admin: no puede crear, puede ver y editar todos
        if (createPanel) createPanel.style.display = 'none';
        if (incidentsPanel) {
            const header = incidentsPanel.querySelector('.panel-header h2');
            if (header) header.textContent = '📋 Todos los Incidentes (Admin)';
        }
    } else if (tipo === 'trabajador') {
        // Trabajadores: no pueden crear, solo ven asignados a ellos
        if (createPanel) createPanel.style.display = 'none';
        if (incidentsPanel) {
            const header = incidentsPanel.querySelector('.panel-header h2');
            if (header) header.textContent = '📋 Incidentes Asignados a Mí';
        }
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

// Mostrar notificación de cambio de estado
function showEstadoChangeNotification(data) {
    const { titulo, old_estado, new_estado, mensaje, incidente_id } = data;
    
    // Crear notificación toast
    const notification = document.createElement('div');
    notification.className = 'estado-notification';
    notification.innerHTML = `
        <div class="notification-icon">🔔</div>
        <div class="notification-content">
            <strong>¡Estado Actualizado!</strong>
            <p>${mensaje}</p>
            <small>Incidente: ${titulo}</small>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Agregar al body
    document.body.appendChild(notification);
    
    // Auto-eliminar después de 8 segundos
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 8000);
    
    // También mostrar en el log de WebSocket
    logWsMessage(`🔔 ${mensaje}`, 'success');
    
    // Intentar mostrar notificación del navegador
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Incidente Actualizado', {
            body: mensaje,
            icon: '🔔'
        });
    }
}

// Update WebSocket status
function updateWsStatus(connected) {
    wsConnected = connected;
    const statusDot = wsStatus.querySelector('.status-dot');
    const statusText = wsStatus.querySelector('.status-text');
    
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = '🔔 Notificaciones Activas';
        connectWsBtn.textContent = 'Desconectar';
        connectWsBtn.style.display = 'none'; // Ocultar botón ya que es automático
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Reconectando...';
        connectWsBtn.textContent = 'Reconectar';
    }
}

// Connect to WebSocket
function connectWebSocket() {
    if (ws && wsConnected) {
        ws.close();
        return;
    }

    // Obtener email del usuario actual para las notificaciones
    const userEmail = currentUser ? currentUser.email : '';
    const wsUrl = getWsUrl();
    
    // Agregar email como query parameter para recibir notificaciones personalizadas
    const wsUrlWithEmail = userEmail ? `${wsUrl}?email=${encodeURIComponent(userEmail)}` : wsUrl;
    
    logWsMessage(`Connecting to ${wsUrlWithEmail}...`, 'info');
    
    try {
        ws = new WebSocket(wsUrlWithEmail);
        
        ws.onopen = () => {
            logWsMessage('✅ Conectado! Recibirás notificaciones en tiempo real', 'success');
            updateWsStatus(true);
        };
        
        ws.onmessage = (event) => {
            logWsMessage(`📨 Received: ${event.data}`, 'info');
            try {
                const data = JSON.parse(event.data);
                logWsMessage(`Parsed data: ${JSON.stringify(data, null, 2)}`, 'success');
                
                // Manejar notificación de cambio de estado
                if (data.action === 'estado_change') {
                    // Mostrar notificación visual
                    showEstadoChangeNotification(data);
                    
                    // Refrescar la lista de incidentes para mostrar el cambio
                    setTimeout(() => loadIncidents(), 1000);
                }
            } catch (e) {
                // Not JSON, just display as is
            }
        };
        
        ws.onerror = (error) => {
            logWsMessage(`❌ Error de conexión: ${error.message || 'Falló la conexión'}`, 'error');
            updateWsStatus(false);
        };
        
        ws.onclose = () => {
            logWsMessage('🔌 WebSocket desconectado. Intentando reconectar...', 'info');
            updateWsStatus(false);
            
            // ✅ Reconectar automáticamente después de 3 segundos
            setTimeout(() => {
                if (!wsConnected && currentUser) {
                    logWsMessage('🔄 Reconectando...', 'info');
                    connectWebSocket();
                }
            }, 3000);
        };
    } catch (error) {
        logWsMessage(`❌ Failed to connect: ${error.message}`, 'error');
        updateWsStatus(false);
    }
}

// Submit incident form
incidentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        showResult(submitResult, '❌ Error: No estás autenticado', 'error');
        return;
    }
    
    // Solo estudiantes pueden crear
    if (currentUser.tipo !== 'estudiante') {
        showResult(submitResult, '❌ Solo estudiantes pueden crear incidentes', 'error');
        return;
    }
    
    const formData = {
        titulo: document.getElementById('titulo').value,
        descripcion: document.getElementById('descripcion').value,
        tipo: document.getElementById('tipo').value,
        piso: document.getElementById('piso').value,
        lugar_especifico: document.getElementById('lugar_especifico').value,
        foto: document.getElementById('foto').value,
        Nivel_Riesgo: document.getElementById('nivel_urgencia').value
    };
    
    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': currentUser.email
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
            showResult(submitResult, `❌ Error: ${data.error || data.message || 'Failed to submit incident'}`, 'error');
        }
    } catch (error) {
        showResult(submitResult, `❌ Error: ${error.message}`, 'error');
        console.error('Full error:', error);
    }
});

// Variables globales para filtros
let allIncidents = [];
let currentFilters = {
    urgencia: '',
    tipo: '',
    estado: ''
};
let currentTab = 'activos';

// Load incidents
async function loadIncidents() {
    if (!currentUser) {
        incidentsList.innerHTML = '<p class="error">No estás autenticado</p>';
        return;
    }
    
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        activeTab.querySelector('.incidents-list').innerHTML = '<p class="loading">Cargando incidentes...</p>';
    }
    
    try {
        const response = await fetch(getApiUrl(), {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': currentUser.email
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle different response formats
        allIncidents = [];
        if (Array.isArray(data)) {
            allIncidents = data;
        } else if (data.incidents && Array.isArray(data.incidents)) {
            allIncidents = data.incidents;
        } else if (data.Items && Array.isArray(data.Items)) {
            allIncidents = data.Items;
        }
        
        // Sort by timestamp (newest first)
        allIncidents.sort((a, b) => {
            const timeA = new Date(a.Fecha_creacion || a.timestamp || 0);
            const timeB = new Date(b.Fecha_creacion || b.timestamp || 0);
            return timeB - timeA;
        });
        
        // Poblar filtros dinámicos (tipos únicos)
        populateTipoFilter();
        
        // Renderizar incidentes según filtros y pestaña
        renderFilteredIncidents();
        
    } catch (error) {
        const activeList = document.querySelector('.tab-content.active .incidents-list');
        if (activeList) {
            activeList.innerHTML = `<p class="error" style="color: #721c24; text-align: center; padding: 20px;">❌ Error: ${error.message}</p>`;
        }
        console.error('Full error:', error);
    }
}

// Poblar filtro de tipo con opciones únicas
function populateTipoFilter() {
    const filterTipo = document.getElementById('filterTipo');
    if (!filterTipo) return;
    
    const tipos = [...new Set(allIncidents.map(inc => inc.tipo).filter(t => t))];
    
    filterTipo.innerHTML = '<option value="">Todos</option>';
    tipos.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo;
        option.textContent = tipo;
        filterTipo.appendChild(option);
    });
}

// Aplicar filtros y renderizar
function renderFilteredIncidents() {
    // Separar activos y completados
    const activos = allIncidents.filter(inc => {
        const estado = (inc.estado || '').toLowerCase();
        return estado !== 'resuelto';
    });
    
    const completados = allIncidents.filter(inc => {
        const estado = (inc.estado || '').toLowerCase();
        return estado === 'resuelto';
    });
    
    // Aplicar filtros a activos
    let filteredActivos = applyFilters(activos);
    
    // Renderizar activos
    renderActivosTab(filteredActivos);
    
    // Renderizar completados agrupados por fecha
    renderCompletadosTab(completados);
    
    // Actualizar contadores
    updateTabCounts(filteredActivos.length, completados.length);
}

// Aplicar filtros
function applyFilters(incidents) {
    return incidents.filter(inc => {
        // Filtro por urgencia
        if (currentFilters.urgencia && inc.Nivel_Riesgo !== currentFilters.urgencia) {
            return false;
        }
        
        // Filtro por tipo
        if (currentFilters.tipo && inc.tipo !== currentFilters.tipo) {
            return false;
        }
        
        // Filtro por estado
        if (currentFilters.estado && (inc.estado || '').toLowerCase() !== currentFilters.estado.toLowerCase()) {
            return false;
        }
        
        return true;
    });
}

// Renderizar tab de activos
function renderActivosTab(incidents) {
    const activosList = document.getElementById('incidentsList');
    
    if (incidents.length === 0) {
        let message = 'No hay incidentes activos.';
        if (currentFilters.urgencia || currentFilters.tipo || currentFilters.estado) {
            message = 'No hay incidentes que coincidan con los filtros seleccionados.';
        } else if (currentUser.tipo === 'estudiante') {
            message = 'No has creado ningún incidente activo. ¡Crea uno para comenzar!';
        } else if (currentUser.tipo === 'trabajador') {
            message = 'No tienes incidentes activos asignados.';
        }
        activosList.innerHTML = `<p class="info">${message}</p>`;
        return;
    }
    
    activosList.innerHTML = incidents.map(incident => renderIncidentCard(incident)).join('');
    
    // Add event listeners for admin actions
    if (currentUser.tipo === 'admin') {
        attachAdminEventListeners();
    }
}

// Renderizar tab de completados agrupados por fecha
function renderCompletadosTab(incidents) {
    const completadosList = document.getElementById('completadosList');
    
    if (incidents.length === 0) {
        completadosList.innerHTML = '<p class="info">No hay incidentes completados.</p>';
        return;
    }
    
    // Agrupar por fecha de completado
    const groupedByDate = {};
    
    incidents.forEach(inc => {
        const completedDate = inc.fecha_completado || inc.Fecha_creacion;
        const dateKey = completedDate ? new Date(completedDate).toLocaleDateString('es-ES') : 'Sin fecha';
        
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(inc);
    });
    
    // Ordenar fechas (más reciente primero)
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        if (a === 'Sin fecha') return 1;
        if (b === 'Sin fecha') return -1;
        return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
    });
    
    // Renderizar grupos
    let html = '';
    sortedDates.forEach(date => {
        const incidentsOfDay = groupedByDate[date];
        html += `
            <div class="completados-group">
                <div class="completados-group-header">
                    <span>📅 ${date}</span>
                    <span class="completados-group-count">${incidentsOfDay.length}</span>
                </div>
                ${incidentsOfDay.map(inc => renderIncidentCard(inc)).join('')}
            </div>
        `;
    });
    
    completadosList.innerHTML = html;
    
    // Add event listeners for admin actions
    if (currentUser.tipo === 'admin') {
        attachAdminEventListeners();
    }
}

// Actualizar contadores de las pestañas
function updateTabCounts(activosCount, completadosCount) {
    const activosCountEl = document.getElementById('activosCount');
    const completadosCountEl = document.getElementById('completadosCount');
    
    if (activosCountEl) activosCountEl.textContent = activosCount;
    if (completadosCountEl) completadosCountEl.textContent = completadosCount;
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

// Render incident card based on user type
function renderIncidentCard(incident) {
    const isAdmin = currentUser && currentUser.tipo === 'admin';
    const isEstudiante = currentUser && currentUser.tipo === 'estudiante';
    const isTrabajador = currentUser && currentUser.tipo === 'trabajador';
    
    let actionButtons = '';
    
    if (isAdmin) {
        actionButtons = `
            <div class="incident-actions">
                <button class="btn-edit" data-id="${incident.id}">✏️ Editar</button>
                <button class="btn-assign" data-id="${incident.id}">👤 Asignar</button>
            </div>
        `;
    } else if (isTrabajador && incident.estado === 'en atención' && incident.asignado_a === currentUser.email) {
        // Trabajador solo ve botón "Completar Tarea" si el incidente está asignado a él
        actionButtons = `
            <div class="incident-actions">
                <button class="btn-complete" data-id="${incident.id}">✅ Marcar como Completado</button>
            </div>
        `;
    }
    
    return `
        <div class="incident-card" data-id="${incident.id}">
            <h3>${escapeHtml(incident.titulo || 'Sin título')}</h3>
            <p><strong>Descripción:</strong> ${escapeHtml(incident.descripcion || 'Sin descripción')}</p>
            ${incident.tipo ? `<p><strong>Tipo:</strong> ${escapeHtml(incident.tipo)}</p>` : ''}
            ${incident.piso ? `<p><strong>Piso:</strong> ${escapeHtml(incident.piso)}</p>` : ''}
            ${incident.lugar_especifico ? `<p><strong>Lugar:</strong> ${escapeHtml(incident.lugar_especifico)}</p>` : ''}
            ${incident.creado_por_nombre ? `<p><strong>Creado por:</strong> ${escapeHtml(incident.creado_por_nombre)}</p>` : ''}
            ${incident.asignado_a_nombre ? `<p><strong>Asignado a:</strong> ${escapeHtml(incident.asignado_a_nombre)}${incident.asignado_a_especialidad ? ` - ${escapeHtml(incident.asignado_a_especialidad)}` : ''}</p>` : ''}
            <p><strong>Estado:</strong> <span class="badge-estado estado-${incident.estado}">${escapeHtml(incident.estado || 'pendiente')}</span></p>
            <p><strong>Creado:</strong> ${formatDate(incident.Fecha_creacion)}</p>
            ${incident.Nivel_Riesgo ? `<span class="severity ${getSeverityClass(incident.Nivel_Riesgo)}">${getSeverityIcon(incident.Nivel_Riesgo)} ${incident.Nivel_Riesgo}</span>` : ''}
            ${actionButtons}
        </div>
    `;
}

// Admin: Edit incident
async function editIncident(incidentId) {
    const incident = await getIncidentById(incidentId);
    if (!incident) return;
    
    // Create modal for editing
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>✏️ Editar Incidente</h2>
            <form id="editForm">
                <div class="form-group">
                    <label>Título:</label>
                    <input type="text" id="edit-titulo" value="${escapeHtml(incident.titulo || '')}" required>
                </div>
                <div class="form-group">
                    <label>Descripción:</label>
                    <textarea id="edit-descripcion" rows="3" required>${escapeHtml(incident.descripcion || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>Tipo:</label>
                    <input type="text" id="edit-tipo" value="${escapeHtml(incident.tipo || '')}">
                </div>
                <div class="form-group">
                    <label>Nivel de Riesgo:</label>
                    <select id="edit-riesgo">
                        <option value="">Sin definir</option>
                        <option value="bajo" ${incident.Nivel_Riesgo === 'bajo' ? 'selected' : ''}>Bajo</option>
                        <option value="medio" ${incident.Nivel_Riesgo === 'medio' ? 'selected' : ''}>Medio</option>
                        <option value="alto" ${incident.Nivel_Riesgo === 'alto' ? 'selected' : ''}>Alto</option>
                    </select>
                </div>
                <div class="info-box" style="background: #e7f3ff; padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <small>ℹ️ <strong>Nota:</strong> El estado se cambia automáticamente al asignar o completar el incidente.</small>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">Guardar</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updates = {
            titulo: document.getElementById('edit-titulo').value,
            descripcion: document.getElementById('edit-descripcion').value,
            tipo: document.getElementById('edit-tipo').value,
            Nivel_Riesgo: document.getElementById('edit-riesgo').value
            // Estado removido - ahora es automático
        };
        
        try {
            const response = await fetch(`${getApiUrl()}/${incidentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': currentUser.email
                },
                body: JSON.stringify(updates)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('✅ Incidente actualizado exitosamente');
                modal.remove();
                loadIncidents();
            } else {
                alert(`❌ Error: ${data.error || 'No se pudo actualizar'}`);
            }
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    });
}

// Admin: Assign incident to worker
async function assignIncident(incidentId) {
    // Get list of workers and all incidents to check availability
    const workers = await getWorkers();
    const allIncidents = await getAllIncidentsForAdmin();
    
    console.log('Workers loaded:', workers);
    console.log('All incidents:', allIncidents);
    
    if (workers.length === 0) {
        alert('No hay trabajadores registrados en el sistema');
        return;
    }
    
    // Get unique especialidades (including workers without especialidad)
    const especialidades = [...new Set(workers.map(w => w.especialidad).filter(e => e))];
    console.log('Unique especialidades:', especialidades);
    
    // Calculate worker availability
    const workersWithStatus = workers.map(worker => {
        // Check if worker has active (not closed) incidents assigned
        const activeIncidents = allIncidents.filter(inc => 
            inc.asignado_a === worker.email && 
            inc.estado !== 'resuelto' && 
            inc.estado !== 'cerrado'
        );
        
        return {
            ...worker,
            isAvailable: activeIncidents.length === 0,
            activeIncidentsCount: activeIncidents.length
        };
    });
    
    console.log('Workers with status:', workersWithStatus);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>👤 Asignar Incidente a Trabajador</h2>
            <form id="assignForm">
                <div class="form-group">
                    <label>Filtrar por Especialidad:</label>
                    <select id="especialidad-filter">
                        <option value="">-- Todas las especialidades --</option>
                        ${especialidades.map(e => `<option value="${e}">${e}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Seleccionar Trabajador:</label>
                    <select id="worker-select" required>
                        <option value="">-- Selecciona un trabajador --</option>
                    </select>
                    <small class="help-text" style="color: #666; margin-top: 5px; display: block;">
                        🟢 Disponible | 🔴 Ocupado
                    </small>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">Asignar</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const workerSelect = document.getElementById('worker-select');
    const especialidadFilter = document.getElementById('especialidad-filter');
    
    // Function to populate workers dropdown based on filter
    function populateWorkers(filterEspecialidad = '') {
        const filteredWorkers = filterEspecialidad 
            ? workersWithStatus.filter(w => w.especialidad === filterEspecialidad)
            : workersWithStatus;
        
        console.log('Filtering by:', filterEspecialidad);
        console.log('Filtered workers:', filteredWorkers);
        
        workerSelect.innerHTML = '<option value="">-- Selecciona un trabajador --</option>';
        
        if (filteredWorkers.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No hay trabajadores con esta especialidad';
            option.disabled = true;
            workerSelect.appendChild(option);
            return;
        }
        
        filteredWorkers.forEach(w => {
            const especialidadText = w.especialidad ? ` - ${w.especialidad}` : ' - Sin especialidad';
            const statusIcon = w.isAvailable ? '🟢' : '🔴';
            const statusText = w.isAvailable ? 'Disponible' : `Ocupado (${w.activeIncidentsCount} incidente${w.activeIncidentsCount > 1 ? 's' : ''})`;
            
            const option = document.createElement('option');
            option.value = w.email;
            option.textContent = `${statusIcon} ${w.nombre}${especialidadText} - ${statusText}`;
            
            workerSelect.appendChild(option);
        });
        
        console.log('Worker select populated with', filteredWorkers.length, 'workers');
    }
    
    // Initial population
    populateWorkers();
    
    // Update workers when filter changes
    especialidadFilter.addEventListener('change', (e) => {
        console.log('Filter changed to:', e.target.value);
        populateWorkers(e.target.value);
    });
    
    const assignForm = document.getElementById('assignForm');
    console.log('Assign form found:', assignForm);
    
    assignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted!');
        
        const trabajadorEmail = document.getElementById('worker-select').value;
        console.log('Selected worker:', trabajadorEmail);
        
        if (!trabajadorEmail) {
            alert('Por favor selecciona un trabajador');
            return;
        }
        
        console.log('Attempting to assign to:', trabajadorEmail);
        
        try {
            const response = await fetch(`${getApiUrl()}/${incidentId}/asignar`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': currentUser.email
                },
                body: JSON.stringify({ trabajador_email: trabajadorEmail })
            });
            
            const data = await response.json();
            console.log('Assignment response:', data);
            
            if (response.ok) {
                alert('✅ Incidente asignado exitosamente');
                modal.remove();
                loadIncidents();
            } else {
                alert(`❌ Error: ${data.error || 'No se pudo asignar'}`);
            }
        } catch (error) {
            console.error('Assignment error:', error);
            alert(`❌ Error: ${error.message}`);
        }
    });
}

// Trabajador: Completar tarea
async function completarTarea(incidentId) {
    if (!confirm('¿Marcar esta tarea como completada?')) {
        return;
    }
    
    try {
        const response = await fetch(`${getApiUrl()}/${incidentId}/completar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': currentUser.email
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('✅ ¡Tarea completada exitosamente!');
            // Recargar incidentes
            setTimeout(() => loadIncidents(), 500);
        } else {
            alert(`❌ Error: ${data.error || 'No se pudo completar la tarea'}`);
        }
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

// Get incident by ID
async function getIncidentById(id) {
    try {
        const response = await fetch(getApiUrl(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': currentUser.email
            }
        });
        
        const data = await response.json();
        const incidents = Array.isArray(data) ? data : [];
        return incidents.find(i => i.id === id);
    } catch (error) {
        console.error('Error getting incident:', error);
        return null;
    }
}

// Get all incidents (admin only - for checking worker availability)
async function getAllIncidentsForAdmin() {
    try {
        const response = await fetch(getApiUrl(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': currentUser.email
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        }
        return [];
    } catch (error) {
        console.error('Error getting all incidents:', error);
        return [];
    }
}

// Get all workers (for assignment)
async function getWorkers() {
    try {
        const apiBase = getApiUrl().replace('/incidentes', '');
        const response = await fetch(`${apiBase}/users?tipo=trabajador`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': currentUser.email
            }
        });
        
        if (response.ok) {
            const workers = await response.json();
            return workers;
        }
        return [];
    } catch (error) {
        console.error('Error getting workers:', error);
        return [];
    }
}

// Attach event listeners for admin and worker buttons
function attachAdminEventListeners() {
    // Admin buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            editIncident(id);
        });
    });
    
    document.querySelectorAll('.btn-assign').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            assignIncident(id);
        });
    });
    
    // Worker buttons
    document.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            completarTarea(id);
        });
    });
}

// Event listeners
refreshBtn.addEventListener('click', loadIncidents);
connectWsBtn.addEventListener('click', connectWebSocket);
clearLogsBtn.addEventListener('click', () => {
    wsMessages.innerHTML = '<p class="info">Logs cleared...</p>';
});

// Event listeners para filtros
const filterUrgencia = document.getElementById('filterUrgencia');
const filterTipo = document.getElementById('filterTipo');
const filterEstado = document.getElementById('filterEstado');
const clearFiltersBtn = document.getElementById('clearFilters');

if (filterUrgencia) {
    filterUrgencia.addEventListener('change', (e) => {
        currentFilters.urgencia = e.target.value;
        renderFilteredIncidents();
    });
}

if (filterTipo) {
    filterTipo.addEventListener('change', (e) => {
        currentFilters.tipo = e.target.value;
        renderFilteredIncidents();
    });
}

if (filterEstado) {
    filterEstado.addEventListener('change', (e) => {
        currentFilters.estado = e.target.value;
        renderFilteredIncidents();
    });
}

if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
        currentFilters = { urgencia: '', tipo: '', estado: '' };
        if (filterUrgencia) filterUrgencia.value = '';
        if (filterTipo) filterTipo.value = '';
        if (filterEstado) filterEstado.value = '';
        renderFilteredIncidents();
    });
}

// Event listeners para pestañas
const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        
        // Activar pestaña
        tabBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // Mostrar contenido correspondiente
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        currentTab = tabName;
    });
});

// Initialize
console.log('Incident Management System loaded!');
console.log('Ready to test your serverless API');
