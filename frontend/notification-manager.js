// Ejemplo de implementación del cliente WebSocket con notificaciones de estado

class IncidentNotificationManager {
    constructor(wsUrl, userEmail) {
        this.wsUrl = wsUrl;
        this.userEmail = userEmail;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
    }

    connect() {
        // Agregar email como query parameter
        const connectionUrl = `${this.wsUrl}?email=${encodeURIComponent(this.userEmail)}`;
        
        console.log('Conectando a WebSocket:', connectionUrl);
        this.ws = new WebSocket(connectionUrl);

        this.ws.onopen = () => {
            console.log('✅ WebSocket conectado');
            this.reconnectAttempts = 0;
            this.showStatus('Conectado', 'success');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 Mensaje recibido:', data);
                
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parseando mensaje:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('❌ Error WebSocket:', error);
            this.showStatus('Error de conexión', 'error');
        };

        this.ws.onclose = () => {
            console.log('🔌 WebSocket desconectado');
            this.showStatus('Desconectado', 'warning');
            this.attemptReconnect();
        };
    }

    handleMessage(data) {
        switch (data.action) {
            case 'estado_change':
                this.handleEstadoChange(data);
                break;
            case 'new_incidente':
                this.handleNewIncidente(data);
                break;
            default:
                console.log('Mensaje no manejado:', data);
        }
    }

    handleEstadoChange(data) {
        const {
            incidente_id,
            titulo,
            old_estado,
            new_estado,
            mensaje,
            timestamp
        } = data;

        console.log(`🔔 Cambio de estado: ${old_estado} → ${new_estado}`);

        // Mostrar notificación visual
        this.showNotification({
            title: '¡Estado actualizado!',
            message: mensaje,
            type: this.getNotificationType(new_estado),
            incidente_id
        });

        // Mostrar notificación del navegador (si está permitido)
        this.showBrowserNotification(titulo, mensaje);

        // Actualizar la UI
        this.updateIncidenteUI(incidente_id, new_estado);

        // Reproducir sonido (opcional)
        this.playNotificationSound();

        // Guardar en log de notificaciones
        this.logNotification({
            incidente_id,
            titulo,
            old_estado,
            new_estado,
            timestamp
        });
    }

    handleNewIncidente(data) {
        console.log('📝 Nuevo incidente creado:', data.item);
        // Refrescar lista de incidentes si es necesario
    }

    getNotificationType(estado) {
        const types = {
            'pendiente': 'info',
            'en atención': 'warning',
            'completado': 'success'
        };
        return types[estado] || 'info';
    }

    showNotification({ title, message, type, incidente_id }) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <strong>${this.getEstadoIcon(type)} ${title}</strong>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-body">
                ${message}
            </div>
            <div class="notification-footer">
                <small>${new Date().toLocaleTimeString()}</small>
                <button class="notification-view" data-id="${incidente_id}">
                    Ver detalles
                </button>
            </div>
        `;

        // Agregar al contenedor de notificaciones
        const container = document.getElementById('notifications-container') || this.createNotificationsContainer();
        container.appendChild(notification);

        // Auto-cerrar después de 10 segundos
        setTimeout(() => {
            notification.classList.add('notification-fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 10000);

        // Evento para cerrar manualmente
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Evento para ver detalles
        notification.querySelector('.notification-view').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            this.viewIncidenteDetails(id);
            notification.remove();
        });
    }

    showBrowserNotification(titulo, mensaje) {
        // Verificar si el navegador soporta notificaciones
        if (!('Notification' in window)) {
            return;
        }

        // Solicitar permiso si no se ha otorgado
        if (Notification.permission === 'granted') {
            new Notification(`Incidente: ${titulo}`, {
                body: mensaje,
                icon: '/icon-notification.png',
                badge: '/badge.png',
                tag: 'incidente-status'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(`Incidente: ${titulo}`, {
                        body: mensaje,
                        icon: '/icon-notification.png'
                    });
                }
            });
        }
    }

    getEstadoIcon(type) {
        const icons = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'success': '✅',
            'error': '❌'
        };
        return icons[type] || 'ℹ️';
    }

    createNotificationsContainer() {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
    }

    updateIncidenteUI(incidente_id, new_estado) {
        // Actualizar el estado en la tabla/lista de incidentes
        const incidenteElement = document.querySelector(`[data-incidente-id="${incidente_id}"]`);
        if (incidenteElement) {
            const estadoElement = incidenteElement.querySelector('.incidente-estado');
            if (estadoElement) {
                estadoElement.textContent = new_estado;
                estadoElement.className = `incidente-estado estado-${new_estado.replace(' ', '-')}`;
            }
        }
    }

    playNotificationSound() {
        // Opcional: reproducir sonido de notificación
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.3;
        audio.play().catch(err => console.log('No se pudo reproducir el sonido:', err));
    }

    logNotification(notification) {
        // Guardar en localStorage para historial
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        notifications.unshift(notification);
        
        // Mantener solo las últimas 50 notificaciones
        if (notifications.length > 50) {
            notifications.pop();
        }
        
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }

    viewIncidenteDetails(incidente_id) {
        // Redirigir o mostrar modal con detalles del incidente
        console.log('Ver detalles del incidente:', incidente_id);
        window.location.href = `/incidente/${incidente_id}`;
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('ws-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `ws-status status-${type}`;
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error('Máximo de intentos de reconexión alcanzado');
            this.showStatus('No se pudo conectar', 'error');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Uso del manager
document.addEventListener('DOMContentLoaded', () => {
    // Obtener email del usuario desde localStorage o session
    const userEmail = localStorage.getItem('userEmail');
    
    if (!userEmail) {
        console.warn('No hay email de usuario, no se conectará al WebSocket');
        return;
    }

    // Crear instancia del manager
    const wsUrl = 'wss://your-api-gateway.amazonaws.com/prod';
    const notificationManager = new IncidentNotificationManager(wsUrl, userEmail);
    
    // Conectar
    notificationManager.connect();

    // Guardar instancia global para debugging
    window.notificationManager = notificationManager;

    // Desconectar al cerrar la página
    window.addEventListener('beforeunload', () => {
        notificationManager.disconnect();
    });
});

// CSS para las notificaciones (agregar a tu archivo de estilos)
const styles = `
.notifications-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    max-width: 400px;
}

.notification {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    margin-bottom: 10px;
    padding: 15px;
    animation: slideIn 0.3s ease-out;
    border-left: 4px solid #666;
}

.notification-info { border-left-color: #3498db; }
.notification-warning { border-left-color: #f39c12; }
.notification-success { border-left-color: #27ae60; }
.notification-error { border-left-color: #e74c3c; }

.notification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.notification-close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #999;
}

.notification-close:hover {
    color: #333;
}

.notification-body {
    margin-bottom: 10px;
    color: #555;
}

.notification-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #999;
}

.notification-view {
    background: #3498db;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.notification-view:hover {
    background: #2980b9;
}

.notification-fade-out {
    animation: fadeOut 0.3s ease-out forwards;
}

@keyframes slideIn {
    from {
        transform: translateX(400px);
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

.ws-status {
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    display: inline-block;
}

.status-success { background: #d4edda; color: #155724; }
.status-warning { background: #fff3cd; color: #856404; }
.status-error { background: #f8d7da; color: #721c24; }

.incidente-estado {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
}

.estado-pendiente { background: #ffeaa7; color: #d63031; }
.estado-en-atención { background: #74b9ff; color: #0984e3; }
.estado-completado { background: #55efc4; color: #00b894; }
`;

// Agregar estilos al documento
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
