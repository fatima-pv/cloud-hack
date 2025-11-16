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
        Nivel_Riesgo: document.getElementById('nivel_urgencia').value,
        tipo_trabajador_requerido: document.getElementById('tipo_trabajador_requerido').value
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

// Load incidents
async function loadIncidents() {
    if (!currentUser) {
        incidentsList.innerHTML = '<p class="error">No estás autenticado</p>';
        return;
    }
    
    incidentsList.innerHTML = '<p class="loading">Loading incidents...</p>';
    
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
        let incidents = [];
        if (Array.isArray(data)) {
            incidents = data;
        } else if (data.incidents && Array.isArray(data.incidents)) {
            incidents = data.incidents;
        } else if (data.Items && Array.isArray(data.Items)) {
            incidents = data.Items;
        }
        
        if (incidents.length === 0) {
            let message = 'No incidents found.';
            if (currentUser.tipo === 'estudiante') {
                message = 'No has creado ningún incidente aún. ¡Crea uno para comenzar!';
            } else if (currentUser.tipo === 'trabajador') {
                message = 'No tienes incidentes asignados.';
            }
            incidentsList.innerHTML = `<p class="info">${message}</p>`;
            return;
        }
        
        // Sort by timestamp (newest first)
        incidents.sort((a, b) => {
            const timeA = new Date(a.Fecha_creacion || a.timestamp || 0);
            const timeB = new Date(b.Fecha_creacion || b.timestamp || 0);
            return timeB - timeA;
        });
        
        incidentsList.innerHTML = incidents.map(incident => renderIncidentCard(incident)).join('');
        
        // Add event listeners for admin actions
        if (currentUser.tipo === 'admin') {
            attachAdminEventListeners();
        }
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
    }
    
    return `
        <div class="incident-card" data-id="${incident.id}">
            <h3>${escapeHtml(incident.titulo || 'Sin título')}</h3>
            <p><strong>Descripción:</strong> ${escapeHtml(incident.descripcion || 'Sin descripción')}</p>
            ${incident.tipo ? `<p><strong>Tipo:</strong> ${escapeHtml(incident.tipo)}</p>` : ''}
            ${incident.tipo_trabajador_requerido ? `<p><strong>🔧 Requiere:</strong> <span class="badge-trabajador">${escapeHtml(incident.tipo_trabajador_requerido)}</span></p>` : ''}
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
    console.log('🔍 Attempting to edit incident with ID:', incidentId);
    
    const incident = await getIncidentById(incidentId);
    console.log('📦 Incident data retrieved:', incident);
    
    if (!incident) {
        alert('❌ Error: No se pudo obtener el incidente. ID: ' + incidentId);
        console.error('❌ Incident not found in list. ID:', incidentId);
        return;
    }
    
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
                <div class="form-group">
                    <label>Estado:</label>
                    <select id="edit-estado">
                        <option value="pendiente" ${incident.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="asignado" ${incident.estado === 'asignado' ? 'selected' : ''}>Asignado</option>
                        <option value="en_proceso" ${incident.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                        <option value="resuelto" ${incident.estado === 'resuelto' ? 'selected' : ''}>Resuelto</option>
                    </select>
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
            Nivel_Riesgo: document.getElementById('edit-riesgo').value,
            estado: document.getElementById('edit-estado').value
        };
        
        console.log('📝 Submitting edit for incident ID:', incidentId);
        console.log('📝 Updates:', updates);
        
        try {
            const apiUrl = getApiUrl();
            const editUrl = `${apiUrl}/${incidentId}`;
            console.log('📡 Calling PUT:', editUrl);
            console.log('📧 User email:', currentUser.email);
            
            const response = await fetch(editUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': currentUser.email
                },
                body: JSON.stringify(updates)
            });
            
            const data = await response.json();
            console.log('📨 Edit response:', {
                status: response.status,
                ok: response.ok,
                data: data
            });
            
            if (response.ok) {
                alert('✅ Incidente actualizado exitosamente');
                modal.remove();
                loadIncidents();
            } else {
                console.error('❌ Edit failed:', data);
                alert(`❌ Error: ${data.error || 'No se pudo actualizar'}`);
            }
        } catch (error) {
            console.error('❌ Edit error:', error);
            alert(`❌ Error: ${error.message}`);
        }
    });
}

// Admin: Assign incident to worker
async function assignIncident(incidentId) {
    // Primero obtener el incidente para saber qué tipo de trabajador requiere
    const incident = await getIncidentById(incidentId);
    if (!incident) {
        alert('❌ Error: No se pudo obtener el incidente');
        return;
    }
    
    console.log('📋 Incident to assign:', incident);
    console.log('🔧 Required worker type:', incident.tipo_trabajador_requerido);
    
    // Get list of workers and all incidents to check availability
    const workers = await getWorkers();
    const allIncidents = await getAllIncidentsForAdmin();
    
    console.log('Workers loaded:', workers.length);
    console.log('All incidents:', allIncidents.length);
    
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
    
    // Mensaje si el incidente requiere un tipo específico
    const requiredWorkerMsg = incident.tipo_trabajador_requerido 
        ? `<div class="alert-info" style="background: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #2196F3;">
               <strong>🔧 Este incidente requiere:</strong> ${incident.tipo_trabajador_requerido}
               <br><small>Se mostrarán trabajadores de esta especialidad primero</small>
           </div>` 
        : '';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>👤 Asignar Incidente a Trabajador</h2>
            ${requiredWorkerMsg}
            <form id="assignForm">
                <div class="form-group">
                    <label>Filtrar por Especialidad:</label>
                    <select id="especialidad-filter">
                        <option value="">-- Todas las especialidades --</option>
                        ${especialidades.map(e => `<option value="${e}" ${e === incident.tipo_trabajador_requerido ? 'selected' : ''}>${e}</option>`).join('')}
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
    
    // Añadir modal al DOM PRIMERO
    document.body.appendChild(modal);
    
    // DESPUÉS obtener los elementos (ahora sí existen en el DOM)
    const workerSelect = document.getElementById('worker-select');
    const especialidadFilter = document.getElementById('especialidad-filter');
    const assignForm = document.getElementById('assignForm');
    
    console.log('Modal elements found:', {
        workerSelect: !!workerSelect,
        especialidadFilter: !!especialidadFilter,
        assignForm: !!assignForm
    });
    
    // Function to populate workers dropdown based on filter
    function populateWorkers(filterEspecialidad = '') {
        const filteredWorkers = filterEspecialidad 
            ? workersWithStatus.filter(w => w.especialidad === filterEspecialidad)
            : workersWithStatus;
        
        console.log('Populating workers - Filter:', filterEspecialidad);
        console.log('Filtered workers count:', filteredWorkers.length);
        
        workerSelect.innerHTML = '<option value="">-- Selecciona un trabajador --</option>';
        
        if (filteredWorkers.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = filterEspecialidad 
                ? `No hay trabajadores de tipo ${filterEspecialidad}` 
                : 'No hay trabajadores disponibles';
            option.disabled = true;
            workerSelect.appendChild(option);
            return;
        }
        
        // Separar trabajadores por especialidad (los que coinciden primero)
        const matchingWorkers = filteredWorkers.filter(w => 
            incident.tipo_trabajador_requerido && w.especialidad === incident.tipo_trabajador_requerido
        );
        const otherWorkers = filteredWorkers.filter(w => 
            !incident.tipo_trabajador_requerido || w.especialidad !== incident.tipo_trabajador_requerido
        );
        
        // Agregar trabajadores que coinciden primero
        if (matchingWorkers.length > 0 && incident.tipo_trabajador_requerido) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = `✅ ${incident.tipo_trabajador_requerido} (Recomendados)`;
            matchingWorkers.forEach(w => {
                const statusIcon = w.isAvailable ? '🟢' : '🔴';
                const statusText = w.isAvailable ? 'Disponible' : `Ocupado (${w.activeIncidentsCount})`;
                
                const option = document.createElement('option');
                option.value = w.email;
                option.textContent = `${statusIcon} ${w.nombre} - ${statusText}`;
                optgroup.appendChild(option);
            });
            workerSelect.appendChild(optgroup);
        }
        
        // Agregar otros trabajadores
        if (otherWorkers.length > 0) {
            if (matchingWorkers.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = 'Otros trabajadores';
                otherWorkers.forEach(w => {
                    const especialidadText = w.especialidad ? ` - ${w.especialidad}` : '';
                    const statusIcon = w.isAvailable ? '🟢' : '🔴';
                    const statusText = w.isAvailable ? 'Disponible' : `Ocupado (${w.activeIncidentsCount})`;
                    
                    const option = document.createElement('option');
                    option.value = w.email;
                    option.textContent = `${statusIcon} ${w.nombre}${especialidadText} - ${statusText}`;
                    optgroup.appendChild(option);
                });
                workerSelect.appendChild(optgroup);
            } else {
                // Si no hay trabajadores recomendados, agregar todos normalmente
                filteredWorkers.forEach(w => {
                    const especialidadText = w.especialidad ? ` - ${w.especialidad}` : '';
                    const statusIcon = w.isAvailable ? '🟢' : '🔴';
                    const statusText = w.isAvailable ? 'Disponible' : `Ocupado (${w.activeIncidentsCount})`;
                    
                    const option = document.createElement('option');
                    option.value = w.email;
                    option.textContent = `${statusIcon} ${w.nombre}${especialidadText} - ${statusText}`;
                    
                    workerSelect.appendChild(option);
                });
            }
        }
        
        console.log('✅ Worker select populated with', filteredWorkers.length, 'workers');
    }
    
    // Initial population - usar el tipo de trabajador requerido si existe
    const initialFilter = incident.tipo_trabajador_requerido || '';
    console.log('🎯 Initial filter set to:', initialFilter || 'ALL');
    populateWorkers(initialFilter);
    
    // Update workers when filter changes
    especialidadFilter.addEventListener('change', (e) => {
        const selectedEspecialidad = e.target.value;
        console.log('🔍 Filter changed to:', selectedEspecialidad || 'ALL');
        populateWorkers(selectedEspecialidad);
    });
    
    // Handle form submission
    assignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📝 Assignment form submitted!');
        
        const trabajadorEmail = workerSelect.value;
        console.log('Selected worker email:', trabajadorEmail);
        
        if (!trabajadorEmail) {
            alert('⚠️ Por favor selecciona un trabajador');
            return;
        }
        
        console.log('🚀 Attempting to assign incident', incidentId, 'to worker:', trabajadorEmail);
        
        try {
            const apiUrl = getApiUrl();
            const assignUrl = `${apiUrl}/${incidentId}/asignar`;
            console.log('📡 Calling API:', assignUrl);
            
            const response = await fetch(assignUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': currentUser.email
                },
                body: JSON.stringify({ trabajador_email: trabajadorEmail })
            });
            
            const data = await response.json();
            console.log('📨 Assignment response:', {
                status: response.status,
                ok: response.ok,
                data: data
            });
            
            if (response.ok) {
                alert('✅ Incidente asignado exitosamente');
                modal.remove();
                loadIncidents();
            } else {
                alert(`❌ Error: ${data.error || 'No se pudo asignar'}`);
            }
        } catch (error) {
            console.error('❌ Assignment error:', error);
            alert(`❌ Error: ${error.message}`);
        }
    });
}

// Get incident by ID
async function getIncidentById(id) {
    console.log('🔎 Fetching incident by ID:', id);
    
    try {
        const response = await fetch(getApiUrl(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': currentUser.email
            }
        });
        
        if (!response.ok) {
            console.error('❌ Failed to fetch incidents:', response.status);
            return null;
        }
        
        const data = await response.json();
        const incidents = Array.isArray(data) ? data : [];
        console.log('📋 Total incidents retrieved:', incidents.length);
        console.log('🔍 Looking for ID:', id);
        
        const found = incidents.find(i => i.id === id);
        
        if (found) {
            console.log('✅ Incident found:', found);
        } else {
            console.warn('⚠️ Incident NOT found in list');
            console.log('Available IDs:', incidents.map(i => i.id));
        }
        
        return found;
    } catch (error) {
        console.error('❌ Error getting incident:', error);
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

// Attach event listeners for admin buttons
function attachAdminEventListeners() {
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
