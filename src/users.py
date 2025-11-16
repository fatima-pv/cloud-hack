import os
import json
import boto3

USERS_TABLE = os.environ.get('USERS_TABLE', 'UsersTable')

dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(USERS_TABLE)


def _resp(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-User-Email',
            'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        'body': json.dumps(body, default=str)
    }


def _get_user_from_email(email):
    """Get user info from email"""
    if not email:
        return None
    
    try:
        response = users_table.get_item(Key={'email': email})
        return response.get('Item')
    except Exception:
        return None


def lambda_handler(event, context):
    method = event.get('httpMethod')
    
    # Handle OPTIONS for CORS
    if method == 'OPTIONS':
        return _resp(200, {'message': 'OK'})
    
    # Get current user from header
    headers = event.get('headers', {})
    email = headers.get('X-User-Email') or headers.get('x-user-email')
    
    if not email:
        return _resp(401, {'error': 'No autenticado. Header X-User-Email requerido.'})
    
    current_user = _get_user_from_email(email)
    if not current_user:
        return _resp(401, {'error': 'Usuario no encontrado'})
    
    # Solo admin puede listar usuarios
    if current_user.get('tipo') != 'admin':
        return _resp(403, {'error': 'Solo administradores pueden listar usuarios'})
    
    # Get query parameter for filtering by tipo
    query_params = event.get('queryStringParameters') or {}
    tipo_filter = query_params.get('tipo')
    
    try:
        # Scan all users
        response = users_table.scan()
        users = response.get('Items', [])
        
        # Filter by tipo if specified
        if tipo_filter:
            users = [u for u in users if u.get('tipo') == tipo_filter]
        
        # Remove password hashes from response
        safe_users = []
        for user in users:
            safe_user = {
                'email': user.get('email'),
                'user_id': user.get('user_id'),
                'nombre': user.get('nombre'),
                'tipo': user.get('tipo'),
                'created_at': user.get('created_at')
            }
            safe_users.append(safe_user)
        
        return _resp(200, safe_users)
        
    except Exception as e:
        return _resp(500, {'error': f'Error al obtener usuarios: {str(e)}'})
