// ====================================
// SCRIPT DE DEBUG - NOTIFICACIONES
// ====================================
// Pega esto en la consola del navegador (F12)

console.log('=== DEBUG NOTIFICACIONES ===');

// 1. Verificar usuario actual
console.log('1. Usuario actual:', localStorage.getItem('currentUser'));
const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
console.log('   Email:', user.email);
console.log('   Tipo:', user.tipo);

// 2. Verificar WebSocket
console.log('2. Estado WebSocket:');
console.log('   wsConnected:', wsConnected);
console.log('   ws object:', ws);
if (ws) {
    console.log('   ws.url:', ws.url);
    console.log('   ws.readyState:', ws.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)');
}

// 3. Verificar configuración
console.log('3. URLs configuradas:');
console.log('   API URL:', getApiUrl());
console.log('   WS URL:', getWsUrl());

// 4. Test manual de notificación
console.log('4. Probando notificación manual...');
if (typeof showEstadoChangeNotification === 'function') {
    showEstadoChangeNotification({
        titulo: 'TEST',
        old_estado: 'pendiente',
        new_estado: 'asignado',
        mensaje: 'PRUEBA: Tu incidente TEST cambió de estado: pendiente → asignado',
        incidente_id: 'test-123'
    });
    console.log('   ✅ Función existe y fue llamada');
} else {
    console.log('   ❌ Función showEstadoChangeNotification NO existe');
}

// 5. Verificar si hay incidentes creados por este usuario
console.log('5. Verificando incidentes...');
fetch(getApiUrl(), {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'X-User-Email': user.email
    }
})
.then(r => r.json())
.then(data => {
    console.log('   Incidentes del usuario:', data);
    if (data.length > 0) {
        console.log('   ✅ Tienes', data.length, 'incidente(s)');
        console.log('   Primer incidente ID:', data[0].id);
    } else {
        console.log('   ⚠️ No tienes incidentes creados');
    }
});

console.log('=== FIN DEBUG ===');
