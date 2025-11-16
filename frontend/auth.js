// Configuration - Update these URLs after deployment
const API_BASE_URL = 'https://eb28n1jcdh.execute-api.us-east-1.amazonaws.com/dev';

// Get stored user data
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

// Save user data
function saveCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

// Clear user data (logout)
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Check if user is logged in
function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// Show result message
function showResult(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.textContent = message;
    element.className = `result show ${type}`;
    
    setTimeout(() => {
        element.className = 'result';
    }, 5000);
}

// Determine user type from email (client-side preview)
function getUserTypeFromEmail(email) {
    email = email.toLowerCase().trim();
    
    if (email.endsWith('@admin.utec.edu.pe')) {
        return 'admin';
    } else if (email.endsWith('@utec.edu.pe')) {
        return 'estudiante';
    } else {
        return 'trabajador';
    }
}

// Register Form Handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const especialidad = document.getElementById('especialidad').value;
        
        console.log('📝 Form values:', { nombre, email, especialidad });
        
        // Validate passwords match
        if (password !== confirmPassword) {
            showResult('registerResult', 'Las contraseñas no coinciden', 'error');
            return;
        }
        
        // Show preview of user type
        const userType = getUserTypeFromEmail(email);
        
        console.log('👤 Detected user type:', userType);
        
        // Validate especialidad for trabajador
        if (userType === 'trabajador' && !especialidad) {
            showResult('registerResult', 'Debes seleccionar una especialidad para el personal', 'error');
            return;
        }
        
        console.log(`Registering as: ${userType}${userType === 'trabajador' ? ` with especialidad: ${especialidad}` : ''}`);
        
        // Build request body
        const requestBody = {
            nombre,
            email,
            password
        };
        
        // Add especialidad only for trabajadores
        if (userType === 'trabajador' && especialidad) {
            requestBody.especialidad = especialidad;
        }
        
        console.log('📤 Sending request body:', requestBody);
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                const especialidadText = data.user.especialidad ? ` - ${data.user.especialidad}` : '';
                showResult('registerResult', 
                    `¡Registro exitoso! Tipo de usuario: ${data.user.tipo}${especialidadText}. Redirigiendo...`, 
                    'success');
                
                // Save user and redirect to login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showResult('registerResult', 
                    data.error || 'Error en el registro', 
                    'error');
            }
        } catch (error) {
            console.error('Register error:', error);
            showResult('registerResult', 
                'Error de conexión. Verifica que el API URL esté configurado correctamente.', 
                'error');
        }
    });
    
    // Show user type preview and especialidad field on email input
    const emailInput = document.getElementById('email');
    const especialidadGroup = document.getElementById('especialidadGroup');
    
    if (emailInput) {
        emailInput.addEventListener('input', (e) => {
            const email = e.target.value.trim();
            if (email.includes('@')) {
                const userType = getUserTypeFromEmail(email);
                const helpText = emailInput.nextElementSibling;
                if (helpText) {
                    if (userType === 'trabajador') {
                        helpText.textContent = `Tu tipo de usuario será: personal (debes seleccionar una especialidad)`;
                    } else {
                        helpText.textContent = `Tu tipo de usuario será: ${userType}`;
                    }
                    helpText.style.color = '#4CAF50';
                    helpText.style.fontWeight = 'bold';
                }
                
                // Show/hide especialidad field based on user type
                if (especialidadGroup) {
                    if (userType === 'trabajador') {
                        especialidadGroup.style.display = 'block';
                    } else {
                        especialidadGroup.style.display = 'none';
                    }
                }
            }
        });
    }
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                const especialidadText = data.user.especialidad ? ` - ${data.user.especialidad}` : '';
                showResult('loginResult', 
                    `¡Bienvenido! Tipo de usuario: ${data.user.tipo}${especialidadText}`, 
                    'success');
                
                // Save user data
                saveCurrentUser(data.user);
                
                // Redirect to main app
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                showResult('loginResult', 
                    data.error || 'Credenciales inválidas', 
                    'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showResult('loginResult', 
                'Error de conexión. Verifica que el API URL esté configurado correctamente.', 
                'error');
        }
    });
    
    // Show user type preview on email input
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', (e) => {
            const email = e.target.value.trim();
            if (email.includes('@')) {
                const userType = getUserTypeFromEmail(email);
                const helpText = emailInput.nextElementSibling;
                if (helpText) {
                    helpText.textContent = `Tipo de usuario: ${userType}`;
                    helpText.style.color = '#2196F3';
                    helpText.style.fontWeight = 'bold';
                }
            }
        });
    }
}

// Check if user is already logged in when visiting login/register pages
if (window.location.pathname.includes('login.html') || 
    window.location.pathname.includes('register.html')) {
    const user = getCurrentUser();
    if (user) {
        console.log('User already logged in, redirecting...');
        // Uncomment the next line if you want to auto-redirect logged-in users
        // window.location.href = 'index.html';
    }
}
