# 🚀 PROMPT COMPLETO - SISTEMA DE NOTIFICACIONES Y GESTIÓN AVANZADA

## 📋 CONTEXTO
Tengo un sistema de gestión de incidentes serverless en AWS con:
- Backend Python (Lambda + DynamoDB)
- Frontend HTML/CSS/JS
- WebSocket para actualizaciones en tiempo real
- Roles: estudiante, admin, trabajador

## 🎯 OBJETIVO
Implementar las siguientes funcionalidades **SIN TOCAR** el sistema de asignación por especialidades que ya funciona:

---

## ✅ FUNCIONALIDAD 1: NOTIFICACIONES EN TIEMPO REAL

### Requerimiento:
Cuando el **admin cambia el estado** de un incidente, el **estudiante** que lo creó debe recibir una **notificación en tiempo real** usando WebSockets.

### Implementación Backend:

**Archivo: `src/app.py`**

Agregar función para notificar cambios de estado:

```python
def _notify_user_estado_change(user_email, incidente, old_estado, new_estado):
    """Send notification to specific user about estado change"""
    try:
        ws_api_id = os.environ.get('WS_API_ID')
        ws_stage = os.environ.get('WS_STAGE', 'prod')
        connections_table = os.environ.get('CONNECTIONS_TABLE', 'ConnectionsTable')
        
        if not ws_api_id or not user_email:
            return
        
        endpoint = f"https://{ws_api_id}.execute-api.{os.environ.get('AWS_REGION', 'us-east-1')}.amazonaws.com/{ws_stage}"
        apigw = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint)
        
        con_table = dynamodb.Table(connections_table)
        resp = con_table.scan()
        conns = resp.get('Items', [])
        
        # Find connections for this specific user
        for c in conns:
            cid = c.get('connectionId')
            conn_email = c.get('userEmail', '')
            
            if not cid or conn_email != user_email:
                continue
            
            try:
                message = {
                    'action': 'estado_change',
                    'incidente_id': incidente.get('id'),
                    'titulo': incidente.get('titulo'),
                    'old_estado': old_estado,
                    'new_estado': new_estado,
                    'timestamp': datetime.datetime.utcnow().isoformat(),
                    'mensaje': f"Tu incidente '{incidente.get('titulo')}' cambió de estado: {old_estado} → {new_estado}"
                }
                
                apigw.post_to_connection(
                    ConnectionId=cid,
                    Data=json.dumps(message).encode('utf-8')
                )
            except apigw.exceptions.GoneException:
                con_table.delete_item(Key={'connectionId': cid})
            except Exception as e:
                print(f"Error sending notification: {str(e)}")
                pass
    except Exception as e:
        print(f"Error in _notify_user_estado_change: {str(e)}")
        pass
```

Luego, en el endpoint PUT /incidentes/{id}, agregar detección de cambio de estado:

```python
# En PUT /incidentes/{id} - después de obtener el item
old_estado = item.get('estado', '')

# ... actualizar campos ...

if 'estado' in data:
    new_estado = data['estado']
    item['estado'] = new_estado
    
    # Si cambió el estado, notificar al usuario que creó el incidente
    if old_estado != new_estado and item.get('creado_por'):
        _notify_user_estado_change(
            item.get('creado_por'),
            item,
            old_estado,
            new_estado
        )
```

**Archivo: `src/connect.py`**

Guardar el email del usuario al conectarse:

```python
def lambda_handler(event, context):
    connection_id = event['requestContext']['connectionId']
    
    # Obtener email del usuario de los query parameters
    query_params = event.get('queryStringParameters') or {}
    user_email = query_params.get('email', '')
    
    connections_table = os.environ.get('CONNECTIONS_TABLE', 'ConnectionsTable')
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(connections_table)
    
    item = {
        'connectionId': connection_id,
        'userEmail': user_email,  # NUEVO - guardar email
        'timestamp': datetime.datetime.utcnow().isoformat()
    }
    
    table.put_item(Item=item)
    
    return {'statusCode': 200, 'body': 'Connected'}
```

### Implementación Frontend:

**Archivo: `frontend/app.js`**

**1. Auto-conexión WebSocket al cargar la página:**

```javascript
// Al inicio del documento
document.addEventListener('DOMContentLoaded', () => {
    currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    displayUserInfo(currentUser);
    
    // ✅ Conectar WebSocket automáticamente
    setTimeout(() => {
        connectWebSocket();
        logWsMessage('🔄 Conectando automáticamente para recibir notificaciones en tiempo real...', 'info');
    }, 500);
});
```

**2. Función de conexión con email del usuario:**

```javascript
function connectWebSocket() {
    if (ws && wsConnected) {
        ws.close();
        return;
    }

    // Obtener email del usuario actual
    const userEmail = currentUser ? currentUser.email : '';
    const wsUrl = getWsUrl();
    
    // Agregar email como query parameter
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
                
                // Manejar notificación de cambio de estado
                if (data.action === 'estado_change') {
                    showEstadoChangeNotification(data);
                    // Actualizar lista después de 1 segundo
                    setTimeout(() => loadIncidents(), 1000);
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
            }
        };
        
        ws.onerror = (error) => {
            logWsMessage(`❌ Error de conexión`, 'error');
            updateWsStatus(false);
        };
        
        ws.onclose = () => {
            logWsMessage('🔌 WebSocket desconectado. Intentando reconectar...', 'info');
            updateWsStatus(false);
            
            // ✅ Reconectar automáticamente después de 3 segundos
            setTimeout(() => {
                if (currentUser) {
                    connectWebSocket();
                }
            }, 3000);
        };
    } catch (error) {
        logWsMessage(`❌ Failed to connect: ${error.message}`, 'error');
        updateWsStatus(false);
    }
}
```

**3. Mostrar notificación toast visual:**

```javascript
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
```

**Archivo: `frontend/style.css`**

Agregar estilos para notificaciones toast:

```css
/* ===================================
   NOTIFICACIONES EN TIEMPO REAL
   =================================== */

.estado-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-left: 5px solid #667eea;
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
    padding: 15px 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    max-width: 400px;
    z-index: 10000;
    animation: slideInRight 0.4s ease-out;
}

.estado-notification.fade-out {
    animation: fadeOut 0.3s ease-out forwards;
}

.notification-icon {
    font-size: 32px;
    animation: pulse 1.5s infinite;
}

.notification-content {
    flex: 1;
}

.notification-content strong {
    display: block;
    color: #333;
    font-size: 16px;
    margin-bottom: 5px;
}

.notification-content p {
    color: #555;
    font-size: 14px;
    margin-bottom: 5px;
}

.notification-content small {
    color: #999;
    font-size: 12px;
}

.notification-close {
    background: none;
    border: none;
    font-size: 24px;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s ease;
}

.notification-close:hover {
    background: #f5f5f5;
    color: #333;
}

@keyframes slideInRight {
    from {
        transform: translateX(450px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes fadeOut {
    from {
        opacity: 1;
        transform: scale(1);
    }
    to {
        opacity: 0;
        transform: scale(0.9);
    }
}

@keyframes pulse {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.1);
    }
}
```

---

## ✅ FUNCIONALIDAD 2: SISTEMA DE FILTROS

### Requerimiento:
Permitir filtrar incidentes en el panel de admin por:
- Urgencia (Bajo/Medio/Alto/Crítico)
- Tipo/Área (las especialidades del sistema)
- Estado (Pendiente/En Atención/Resuelto)

### Implementación Frontend:

**Archivo: `frontend/index.html`**

Agregar contenedor de filtros antes de las pestañas:

```html
<!-- Filtros -->
<div class="filters-container" id="filtersContainer">
    <h3>🔍 Filtros</h3>
    <div class="filters-grid">
        <div class="filter-group">
            <label for="filterUrgencia">Urgencia:</label>
            <select id="filterUrgencia" class="filter-select">
                <option value="">Todas</option>
                <option value="bajo">🟢 Bajo</option>
                <option value="medio">🟡 Medio</option>
                <option value="alto">🟠 Alto</option>
                <option value="crítico">🔴 Crítico</option>
            </select>
        </div>

        <div class="filter-group">
            <label for="filterTipo">Tipo:</label>
            <select id="filterTipo" class="filter-select">
                <option value="">Todos</option>
                <!-- Se llenan dinámicamente con los tipos de incidentes -->
            </select>
        </div>

        <div class="filter-group">
            <label for="filterEstado">Estado:</label>
            <select id="filterEstado" class="filter-select">
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en atención">En Atención</option>
                <option value="resuelto">Resuelto</option>
            </select>
        </div>

        <div class="filter-group">
            <button id="clearFilters" class="btn btn-secondary">🗑️ Limpiar Filtros</button>
        </div>
    </div>
</div>
```

**Archivo: `frontend/app.js`**

```javascript
// Variables globales para filtros
let allIncidents = [];
let currentFilters = {
    urgencia: '',
    tipo: '',
    estado: ''
};

// En loadIncidents(), guardar todos los incidentes
async function loadIncidents() {
    // ... código existente ...
    
    const data = await response.json();
    
    // Guardar todos los incidentes
    allIncidents = Array.isArray(data) ? data : [];
    
    // Ordenar por fecha
    allIncidents.sort((a, b) => {
        const timeA = new Date(a.Fecha_creacion || 0);
        const timeB = new Date(b.Fecha_creacion || 0);
        return timeB - timeA;
    });
    
    // Poblar filtro de tipo dinámicamente
    populateTipoFilter();
    
    // Renderizar con filtros aplicados
    renderFilteredIncidents();
}

// Poblar filtro de tipo
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
```

**Archivo: `frontend/style.css`**

```css
/* Filtros */
.filters-container {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
}

.filters-container h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: #333;
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    align-items: end;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.filter-group label {
    font-size: 13px;
    font-weight: 600;
    color: #555;
}

.filter-select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    transition: all 0.3s ease;
}

.filter-select:hover {
    border-color: #667eea;
}

.filter-select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
```

---

## ✅ FUNCIONALIDAD 3: PESTAÑAS ACTIVOS/COMPLETADOS

### Requerimiento:
Separar incidentes en dos pestañas:
- **Activos**: Incidentes con estado ≠ "resuelto"
- **Completados**: Incidentes con estado = "resuelto"

Los completados deben estar **agrupados por fecha**.

### Implementación Frontend:

**Archivo: `frontend/index.html`**

```html
<!-- Pestañas -->
<div class="tabs-container">
    <button class="tab-btn active" data-tab="activos">
        📌 Activos <span id="activosCount" class="badge">0</span>
    </button>
    <button class="tab-btn" data-tab="completados">
        ✅ Completados <span id="completadosCount" class="badge">0</span>
    </button>
</div>

<!-- Tab Content - Activos -->
<div id="tabActivos" class="tab-content active">
    <div id="incidentsList" class="incidents-list">
        <p class="loading">Cargando incidentes...</p>
    </div>
</div>

<!-- Tab Content - Completados -->
<div id="tabCompletados" class="tab-content">
    <div id="completadosList" class="incidents-list">
        <p class="info">No hay incidentes completados</p>
    </div>
</div>
```

**Archivo: `frontend/app.js`**

```javascript
let currentTab = 'activos';

// Renderizar con separación y filtros
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
    
    // Aplicar filtros solo a activos
    let filteredActivos = applyFilters(activos);
    
    // Renderizar
    renderActivosTab(filteredActivos);
    renderCompletadosTab(completados);
    
    // Actualizar contadores
    updateTabCounts(filteredActivos.length, completados.length);
}

// Renderizar tab activos
function renderActivosTab(incidents) {
    const activosList = document.getElementById('incidentsList');
    
    if (incidents.length === 0) {
        activosList.innerHTML = '<p class="info">No hay incidentes activos</p>';
        return;
    }
    
    activosList.innerHTML = incidents.map(incident => renderIncidentCard(incident)).join('');
    
    if (currentUser.tipo === 'admin') {
        attachAdminEventListeners();
    }
}

// Renderizar tab completados agrupados por fecha
function renderCompletadosTab(incidents) {
    const completadosList = document.getElementById('completadosList');
    
    if (incidents.length === 0) {
        completadosList.innerHTML = '<p class="info">No hay incidentes completados</p>';
        return;
    }
    
    // Agrupar por fecha
    const groupedByDate = {};
    
    incidents.forEach(inc => {
        const completedDate = inc.fecha_completado || inc.Fecha_creacion;
        const dateKey = completedDate ? new Date(completedDate).toLocaleDateString('es-ES') : 'Sin fecha';
        
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(inc);
    });
    
    // Ordenar fechas
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
}

// Actualizar contadores
function updateTabCounts(activosCount, completadosCount) {
    const activosCountEl = document.getElementById('activosCount');
    const completadosCountEl = document.getElementById('completadosCount');
    
    if (activosCountEl) activosCountEl.textContent = activosCount;
    if (completadosCountEl) completadosCountEl.textContent = completadosCount;
}

// Event listeners para pestañas
const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        
        // Activar pestaña
        tabBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // Mostrar contenido
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
```

**Archivo: `frontend/style.css`**

```css
/* Pestañas */
.tabs-container {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    border-bottom: 2px solid #e0e0e0;
}

.tab-btn {
    background: none;
    border: none;
    padding: 12px 20px;
    font-size: 15px;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    position: relative;
    transition: all 0.3s ease;
    border-bottom: 3px solid transparent;
}

.tab-btn:hover {
    color: #667eea;
    background: rgba(102, 126, 234, 0.05);
}

.tab-btn.active {
    color: #667eea;
    border-bottom-color: #667eea;
}

.badge {
    background: #667eea;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    margin-left: 5px;
}

.tab-btn:not(.active) .badge {
    background: #999;
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

/* Grupos de completados */
.completados-group {
    margin-bottom: 25px;
}

.completados-group-header {
    background: #f0f0f0;
    padding: 10px 15px;
    border-radius: 6px;
    margin-bottom: 10px;
    font-weight: 600;
    color: #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.completados-group-count {
    background: #667eea;
    color: white;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
}
```

---

## ✅ FUNCIONALIDAD 4: ESTADOS ESTANDARIZADOS

### Requerimiento:
Solo usar **3 estados** en todo el sistema:
1. **Pendiente** 🟡 - Creado, esperando asignación
2. **En Atención** 🔵 - Asignado a trabajador
3. **Resuelto** 🟢 - Completado

**Archivo: `frontend/style.css`**

```css
/* Estados de incidente */
.estado-pendiente {
    background: #fff3cd;
    color: #856404;
}

.estado-en-atención {
    background: #d1ecf1;
    color: #0c5460;
}

.estado-resuelto {
    background: #d4edda;
    color: #155724;
}
```

---

## 📝 NOTAS IMPORTANTES

### ❌ NO TOCAR:
- El sistema de asignación por especialidades (funciona correctamente)
- La lógica de disponibilidad de trabajadores
- El filtro por especialidad al asignar

### ✅ SÍ IMPLEMENTAR:
1. WebSocket automático con email del usuario
2. Notificaciones toast en tiempo real
3. Filtros por urgencia, tipo, estado
4. Pestañas activos/completados
5. Completados agrupados por fecha
6. Auto-reconexión WebSocket
7. Actualización automática de listas al recibir notificación

### 🚀 DEPLOYMENT:
```bash
# Backend
sls deploy

# Frontend  
# Solo refresca el navegador si usas Live Server
```

### 🧪 TESTING:
```
VENTANA 1 (Estudiante):
- Login
- WebSocket conecta automáticamente
- Ver "🔔 Notificaciones Activas" en verde

VENTANA 2 (Admin):
- Login
- Cambiar estado de incidente del estudiante

VENTANA 1:
- Recibe notificación toast
- Lista se actualiza sola
```

---

## 🎯 RESULTADO FINAL

Un sistema con:
- ✅ Notificaciones en tiempo real sin intervención del usuario
- ✅ Filtrado avanzado de incidentes
- ✅ Organización clara en pestañas
- ✅ Historial agrupado por fecha
- ✅ Actualizaciones automáticas sin recargar
- ✅ **SIN afectar** el sistema de especialidades

**¡TODO FUNCIONANDO PERFECTAMENTE! 🎉**
