import os
import json
import uuid
import datetime
import hashlib
import boto3
from boto3.dynamodb.conditions import Key, Attr

USERS_TABLE = os.environ.get('USERS_TABLE', 'UsersTable')

dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(USERS_TABLE)


def _resp(status, body):
    """Helper to create HTTP response with CORS headers"""
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps(body, default=str)
    }


def _parse_body(event):
    """Parse request body"""
    body = event.get('body')
    if not body:
        return {}
    try:
        return json.loads(body)
    except Exception:
        return {}


def _hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


def _determine_user_type(email):
    """
    Determine user type based on email domain:
    - @utec.edu.pe -> estudiante
    - @admin.utec.edu.pe -> admin
    - other domains -> trabajador
    """
    email = email.lower().strip()
    
    if email.endswith('@admin.utec.edu.pe'):
        return 'admin'
    elif email.endswith('@utec.edu.pe'):
        return 'estudiante'
    else:
        return 'trabajador'


def _validate_email(email):
    """Basic email validation"""
    if not email or '@' not in email or '.' not in email:
        return False
    return True


def register_handler(event, context):
    """
    Register a new user
    POST /auth/register
    Body: { 
        "email": "user@domain.com", 
        "password": "pass123", 
        "nombre": "John Doe",
        "especialidad": "TI" (opcional, solo para trabajadores)
    }
    """
    if event.get('httpMethod') == 'OPTIONS':
        return _resp(200, {'message': 'OK'})
    
    data = _parse_body(event)
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    nombre = data.get('nombre', '').strip()
    especialidad = data.get('especialidad', '').strip()
    
    print(f"[REGISTER] Received data: email={email}, nombre={nombre}, especialidad={especialidad}")
    
    # Validation
    if not email or not password or not nombre:
        return _resp(400, {
            'error': 'Email, password y nombre son requeridos'
        })
    
    if not _validate_email(email):
        return _resp(400, {
            'error': 'Email inválido'
        })
    
    if len(password) < 6:
        return _resp(400, {
            'error': 'La contraseña debe tener al menos 6 caracteres'
        })
    
    # Determine user type based on email domain
    user_type = _determine_user_type(email)
    
    # Validar especialidad para trabajadores
    especialidades_validas = ['TI', 'Servicio de Limpieza', 'Seguridad', 'Electricista']
    if user_type == 'trabajador':
        if not especialidad:
            return _resp(400, {
                'error': 'Especialidad es requerida para trabajadores'
            })
        if especialidad not in especialidades_validas:
            return _resp(400, {
                'error': f'Especialidad inválida. Debe ser una de: {", ".join(especialidades_validas)}'
            })
    
    # Check if user already exists
    try:
        response = users_table.get_item(Key={'email': email})
        if 'Item' in response:
            return _resp(409, {
                'error': 'El usuario ya existe'
            })
    except Exception as e:
        return _resp(500, {
            'error': f'Error verificando usuario: {str(e)}'
        })
    
    # Create user
    user_id = str(uuid.uuid4())
    now = datetime.datetime.utcnow().isoformat()
    
    user = {
        'email': email,
        'user_id': user_id,
        'nombre': nombre,
        'password_hash': _hash_password(password),
        'tipo': user_type,
        'created_at': now,
        'updated_at': now
    }
    
    # Añadir especialidad solo para trabajadores
    if user_type == 'trabajador':
        user['especialidad'] = especialidad
        print(f"[REGISTER] Saving trabajador with especialidad: {especialidad}")
    
    try:
        users_table.put_item(Item=user)
    except Exception as e:
        return _resp(500, {
            'error': f'Error creando usuario: {str(e)}'
        })
    
    # Return user info (without password)
    user_response = {
        'user_id': user_id,
        'email': email,
        'nombre': nombre,
        'tipo': user_type,
        'created_at': now
    }
    
    # Incluir especialidad en respuesta para trabajadores
    if user_type == 'trabajador':
        user_response['especialidad'] = especialidad
    
    return _resp(201, {
        'message': 'Usuario registrado exitosamente',
        'user': user_response
    })


def login_handler(event, context):
    """
    Login user
    POST /auth/login
    Body: { "email": "user@domain.com", "password": "pass123" }
    """
    if event.get('httpMethod') == 'OPTIONS':
        return _resp(200, {'message': 'OK'})
    
    data = _parse_body(event)
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    # Validation
    if not email or not password:
        return _resp(400, {
            'error': 'Email y password son requeridos'
        })
    
    # Get user
    try:
        response = users_table.get_item(Key={'email': email})
        if 'Item' not in response:
            return _resp(401, {
                'error': 'Credenciales inválidas'
            })
        
        user = response['Item']
        
        # Verify password
        password_hash = _hash_password(password)
        if password_hash != user.get('password_hash'):
            return _resp(401, {
                'error': 'Credenciales inválidas'
            })
        
        # Return user info (without password)
        user_response = {
            'user_id': user.get('user_id'),
            'email': user.get('email'),
            'nombre': user.get('nombre'),
            'tipo': user.get('tipo'),
            'created_at': user.get('created_at')
        }
        
        # Incluir especialidad si es trabajador
        if user.get('tipo') == 'trabajador' and user.get('especialidad'):
            user_response['especialidad'] = user.get('especialidad')
        
        return _resp(200, {
            'message': 'Login exitoso',
            'user': user_response
        })
        
    except Exception as e:
        return _resp(500, {
            'error': f'Error en login: {str(e)}'
        })


def lambda_handler(event, context):
    """
    Main handler that routes to register or login based on path
    """
    path = event.get('path', '').rstrip('/')
    method = event.get('httpMethod')
    
    if method == 'OPTIONS':
        return _resp(200, {'message': 'OK'})
    
    if path == '/auth/register':
        return register_handler(event, context)
    elif path == '/auth/login':
        return login_handler(event, context)
    else:
        return _resp(404, {
            'error': 'Endpoint no encontrado'
        })
