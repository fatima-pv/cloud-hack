import os
import json
import uuid
import datetime
import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ.get('TABLE_NAME', 'ReportsTable')
USERS_TABLE = os.environ.get('USERS_TABLE', 'UsersTable')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)
users_table = dynamodb.Table(USERS_TABLE)


def _resp(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-User-Email',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
        },
        'body': json.dumps(body, default=str)
    }


def _parse_body(event):
    body = event.get('body')
    if not body:
        return {}
    try:
        return json.loads(body)
    except Exception:
        return {}


def _get_user_from_request(event):
    """Get user info from X-User-Email header"""
    headers = event.get('headers', {})
    # Check both cases since headers can be lowercase
    email = headers.get('X-User-Email') or headers.get('x-user-email')
    
    if not email:
        return None
    
    try:
        response = users_table.get_item(Key={'email': email})
        return response.get('Item')
    except Exception:
        return None


def _broadcast_to_websockets(item):
    """Broadcast incident to connected WebSocket clients"""
    try:
        ws_api_id = os.environ.get('WS_API_ID')
        ws_stage = os.environ.get('WS_STAGE', 'prod')
        connections_table = os.environ.get('CONNECTIONS_TABLE', 'ConnectionsTable')
        if ws_api_id:
            endpoint = f"https://{ws_api_id}.execute-api.{os.environ.get('AWS_REGION', 'us-east-1')}.amazonaws.com/{ws_stage}"
            apigw = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint)

            con_table = dynamodb.Table(connections_table)
            resp = con_table.scan()
            conns = resp.get('Items', [])
            for c in conns:
                cid = c.get('connectionId')
                if not cid:
                    continue
                try:
                    apigw.post_to_connection(
                        ConnectionId=cid, 
                        Data=json.dumps({'action': 'new_incidente', 'item': item}).encode('utf-8')
                    )
                except apigw.exceptions.GoneException:
                    con_table.delete_item(Key={'connectionId': cid})
                except Exception:
                    pass
    except Exception:
        pass


def lambda_handler(event, context):
    method = event.get('httpMethod')
    path = event.get('path', '').rstrip('/')
    
    # Handle OPTIONS for CORS preflight
    if method == 'OPTIONS':
        return _resp(200, {'message': 'OK'})

    # Get current user
    current_user = _get_user_from_request(event)
    
    # CREATE: POST /incidentes (Solo ESTUDIANTES)
    if path == '/incidentes' and method == 'POST':
        if not current_user:
            return _resp(401, {'error': 'No autenticado. Incluye X-User-Email header.'})
        
        # Solo estudiantes pueden crear incidentes
        if current_user.get('tipo') != 'estudiante':
            return _resp(403, {'error': 'Solo estudiantes pueden crear incidentes'})
        
        data = _parse_body(event)
        new_id = str(uuid.uuid4())
        now = datetime.datetime.utcnow().isoformat()
        
        # Validar nivel de riesgo si se proporciona
        nivel_riesgo = data.get('Nivel_Riesgo', '').lower()
        niveles_validos = ['bajo', 'medio', 'alto', 'crítico', 'critico']
        if nivel_riesgo and nivel_riesgo not in niveles_validos:
            nivel_riesgo = ''
        
        item = {
            'id': new_id,
            'titulo': data.get('titulo', ''),
            'descripcion': data.get('descripcion', ''),
            'tipo': data.get('tipo', ''),
            'piso': data.get('piso', ''),
            'lugar_especifico': data.get('lugar_especifico', ''),
            'foto': data.get('foto', ''),
            'Nivel_Riesgo': nivel_riesgo,
            'Fecha_creacion': now,
            'estado': 'pendiente',
            'veces_reportado': 1,
            'creado_por': current_user.get('email'),
            'creado_por_nombre': current_user.get('nombre'),
            'asignado_a': None,
            'asignado_a_nombre': None,
            'asignado_a_especialidad': None,
            'asignado_por': None,
            'fecha_asignacion': None
        }
        table.put_item(Item=item)
        
        _broadcast_to_websockets(item)
        
        return _resp(201, item)

    # LIST: GET /incidentes
    if path == '/incidentes' and method == 'GET':
        if not current_user:
            return _resp(401, {'error': 'No autenticado. Incluye X-User-Email header.'})
        
        res = table.scan()
        items = res.get('Items', [])
        
        user_tipo = current_user.get('tipo')
        
        # Estudiantes: solo ven los que ellos crearon
        if user_tipo == 'estudiante':
            items = [item for item in items if item.get('creado_por') == current_user.get('email')]
        
        # Trabajadores: solo ven los asignados a ellos
        elif user_tipo == 'trabajador':
            items = [item for item in items if item.get('asignado_a') == current_user.get('email')]
        
        # Admin: ve todos (no filtramos)
        
        return _resp(200, items)

    # UPDATE: PUT /incidentes/{id} (Solo ADMIN)
    if path.startswith('/incidentes/') and method == 'PUT':
        if not current_user:
            return _resp(401, {'error': 'No autenticado'})
        
        # Solo admin puede editar
        if current_user.get('tipo') != 'admin':
            return _resp(403, {'error': 'Solo administradores pueden editar incidentes'})
        
        incident_id = path.split('/')[-1]
        data = _parse_body(event)
        
        # Get existing item
        try:
            response = table.get_item(Key={'id': incident_id})
            if 'Item' not in response:
                return _resp(404, {'error': 'Incidente no encontrado'})
            
            item = response['Item']
        except Exception as e:
            return _resp(500, {'error': f'Error al obtener incidente: {str(e)}'})
        
        # Update fields
        now = datetime.datetime.utcnow().isoformat()
        
        # Campos editables por admin
        if 'titulo' in data:
            item['titulo'] = data['titulo']
        if 'descripcion' in data:
            item['descripcion'] = data['descripcion']
        if 'tipo' in data:
            item['tipo'] = data['tipo']
        if 'piso' in data:
            item['piso'] = data['piso']
        if 'lugar_especifico' in data:
            item['lugar_especifico'] = data['lugar_especifico']
        if 'Nivel_Riesgo' in data:
            item['Nivel_Riesgo'] = data['Nivel_Riesgo']
        if 'estado' in data:
            item['estado'] = data['estado']
        
        item['ultima_modificacion'] = now
        item['modificado_por'] = current_user.get('email')
        
        table.put_item(Item=item)
        
        return _resp(200, item)

    # ASSIGN: PUT /incidentes/{id}/asignar (Solo ADMIN)
    if path.endswith('/asignar') and method == 'PUT':
        if not current_user:
            return _resp(401, {'error': 'No autenticado'})
        
        # Solo admin puede asignar
        if current_user.get('tipo') != 'admin':
            return _resp(403, {'error': 'Solo administradores pueden asignar incidentes'})
        
        incident_id = path.split('/')[-2]
        data = _parse_body(event)
        trabajador_email = data.get('trabajador_email')
        
        if not trabajador_email:
            return _resp(400, {'error': 'trabajador_email es requerido'})
        
        # Verificar que el trabajador existe y es de tipo trabajador
        try:
            trabajador_response = users_table.get_item(Key={'email': trabajador_email})
            if 'Item' not in trabajador_response:
                return _resp(404, {'error': 'Trabajador no encontrado'})
            
            trabajador = trabajador_response['Item']
            if trabajador.get('tipo') != 'trabajador':
                return _resp(400, {'error': 'Solo se puede asignar a usuarios de tipo trabajador'})
        except Exception as e:
            return _resp(500, {'error': f'Error al verificar trabajador: {str(e)}'})
        
        # Get incident
        try:
            response = table.get_item(Key={'id': incident_id})
            if 'Item' not in response:
                return _resp(404, {'error': 'Incidente no encontrado'})
            
            item = response['Item']
        except Exception as e:
            return _resp(500, {'error': f'Error al obtener incidente: {str(e)}'})
        
        # Asignar
        now = datetime.datetime.utcnow().isoformat()
        item['asignado_a'] = trabajador_email
        item['asignado_a_nombre'] = trabajador.get('nombre')
        item['asignado_a_especialidad'] = trabajador.get('especialidad')
        item['asignado_por'] = current_user.get('email')
        item['fecha_asignacion'] = now
        item['estado'] = 'asignado'
        
        table.put_item(Item=item)
        
        return _resp(200, item)

    return _resp(400, {'message': 'Unsupported route or method'})
