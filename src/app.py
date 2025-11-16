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


def _notify_user(user_email, notification_data):
    """Send notification to specific user via WebSocket"""
    if not user_email:
        return
    
    try:
        ws_api_id = os.environ.get('WS_API_ID')
        ws_stage = os.environ.get('WS_STAGE', 'dev')
        connections_table = os.environ.get('CONNECTIONS_TABLE', 'ConnectionsTable')
        
        if not ws_api_id:
            print(f"[NOTIFY] WS_API_ID not configured")
            return
        
        endpoint = f"https://{ws_api_id}.execute-api.{os.environ.get('AWS_REGION', 'us-east-1')}.amazonaws.com/{ws_stage}"
        apigw = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint)
        
        con_table = dynamodb.Table(connections_table)
        resp = con_table.scan()
        conns = resp.get('Items', [])
        
        print(f"[NOTIFY] Sending to user: {user_email}, Total connections: {len(conns)}")
        
        sent_count = 0
        for c in conns:
            cid = c.get('connectionId')
            c_email = c.get('userEmail', '')
            
            if not cid:
                continue
            
            # Only send to matching user email
            if c_email.lower() == user_email.lower():
                try:
                    print(f"[NOTIFY] Sending to connection {cid} for user {c_email}")
                    apigw.post_to_connection(
                        ConnectionId=cid,
                        Data=json.dumps(notification_data).encode('utf-8')
                    )
                    sent_count += 1
                except apigw.exceptions.GoneException:
                    print(f"[NOTIFY] Connection {cid} gone, deleting")
                    con_table.delete_item(Key={'connectionId': cid})
                except Exception as e:
                    print(f"[NOTIFY] Error sending to {cid}: {str(e)}")
        
        print(f"[NOTIFY] Notification sent to {sent_count} connection(s)")
        
    except Exception as e:
        print(f"[NOTIFY] Error in _notify_user: {str(e)}")


def _notify_estado_change(user_email, incidente, old_estado, new_estado):
    """Notify student about incident status change"""
    notification = {
        'action': 'estado_change',
        'incidente_id': incidente.get('id'),
        'titulo': incidente.get('titulo'),
        'old_estado': old_estado,
        'new_estado': new_estado,
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'mensaje': f"El estado de tu incidente '{incidente.get('titulo')}' cambió de {old_estado} a {new_estado}"
    }
    _notify_user(user_email, notification)


def _notify_asignacion(trabajador_email, incidente):
    """Notify worker about new assignment"""
    notification = {
        'action': 'nueva_asignacion',
        'incidente_id': incidente.get('id'),
        'titulo': incidente.get('titulo'),
        'descripcion': incidente.get('descripcion', ''),
        'ubicacion': incidente.get('ubicacion', ''),
        'creado_por': incidente.get('creado_por', ''),
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'mensaje': f"Se te ha asignado un nuevo incidente: {incidente.get('titulo')}"
    }
    _notify_user(trabajador_email, notification)


def _notify_admin_trabajador_update(incidente, new_estado, trabajador_email):
    """Notify admin when worker updates incident status (en_proceso or resuelto)"""
    # Get all admin users
    try:
        response = users_table.scan(
            FilterExpression='tipo = :tipo',
            ExpressionAttributeValues={':tipo': 'admin'}
        )
        admins = response.get('Items', [])
        
        notification = {
            'action': 'trabajador_update',
            'incidente_id': incidente.get('id'),
            'titulo': incidente.get('titulo'),
            'new_estado': new_estado,
            'trabajador_email': trabajador_email,
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'mensaje': f"Trabajador actualizó incidente '{incidente.get('titulo')}' a {new_estado}"
        }
        
        for admin in admins:
            admin_email = admin.get('email')
            if admin_email:
                _notify_user(admin_email, notification)
                
    except Exception as e:
        print(f"[NOTIFY] Error notifying admins: {str(e)}")


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
    
    print(f"[LAMBDA] Received request - Method: {method}, Path: {path}")
    print(f"[LAMBDA] Path repr: {repr(path)}")
    print(f"[LAMBDA] Path ends with '/asignar': {path.endswith('/asignar')}")
    print(f"[LAMBDA] Full event path (no rstrip): {event.get('path', '')}")
    
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
        
        # Validar tipo de trabajador requerido
        tipo_trabajador_requerido = data.get('tipo_trabajador_requerido', '')
        tipos_trabajador_validos = ['TI', 'Limpieza', 'Servicio de Limpieza', 'Seguridad', 'Electricista']
        if tipo_trabajador_requerido not in tipos_trabajador_validos:
            tipo_trabajador_requerido = ''
        
        item = {
            'id': new_id,
            'titulo': data.get('titulo', ''),
            'descripcion': data.get('descripcion', ''),
            'tipo': data.get('tipo', ''),
            'piso': data.get('piso', ''),
            'lugar_especifico': data.get('lugar_especifico', ''),
            'foto': data.get('foto', ''),
            'Nivel_Riesgo': nivel_riesgo,
            'tipo_trabajador_requerido': tipo_trabajador_requerido,
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

    # ASSIGN: PUT /incidentes/{id}/asignar (Solo ADMIN)
    # IMPORTANTE: Este check debe ir ANTES del UPDATE genérico para que no lo capture
    if path.endswith('/asignar') and method == 'PUT':
        print(f"[ASSIGN] Path: {path}, Method: {method}")
        
        if not current_user:
            return _resp(401, {'error': 'No autenticado'})
        
        # Solo admin puede asignar
        if current_user.get('tipo') != 'admin':
            return _resp(403, {'error': 'Solo administradores pueden asignar incidentes'})
        
        incident_id = path.split('/')[-2]
        print(f"[ASSIGN] Extracted incident_id: {incident_id}")
        
        data = _parse_body(event)
        trabajador_email = data.get('trabajador_email')
        
        print(f"[ASSIGN] Trabajador email: {trabajador_email}")
        
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
        
        _notify_asignacion(trabajador_email, item)
        
        return _resp(200, item)

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
        old_estado = item.get('estado')
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
            # Si admin cierra directamente, marcar fecha de cierre
            if data['estado'] == 'cerrado':
                item['fecha_cierre'] = now
                item['cerrado_por'] = current_user.get('email')
        
        item['ultima_modificacion'] = now
        item['modificado_por'] = current_user.get('email')
        
        table.put_item(Item=item)
        
        if 'estado' in data and old_estado != data['estado']:
            _notify_estado_change(item.get('creado_por'), item, old_estado, data['estado'])
        
        return _resp(200, item)

    # WORKER UPDATE STATUS: PUT /incidentes/{id}/estado (Solo TRABAJADOR asignado)
    if path.endswith('/estado') and method == 'PUT':
        if not current_user:
            return _resp(401, {'error': 'No autenticado'})
        
        # Solo trabajadores pueden usar este endpoint
        if current_user.get('tipo') != 'trabajador':
            return _resp(403, {'error': 'Solo trabajadores pueden actualizar su estado'})
        
        incident_id = path.split('/')[-2]
        data = _parse_body(event)
        new_estado = data.get('estado')
        
        # Validar que el estado sea válido para trabajadores
        if new_estado not in ['en_proceso', 'resuelto']:
            return _resp(400, {'error': 'Estado inválido. Solo permitido: en_proceso, resuelto'})
        
        # Get incident
        try:
            response = table.get_item(Key={'id': incident_id})
            if 'Item' not in response:
                return _resp(404, {'error': 'Incidente no encontrado'})
            
            item = response['Item']
        except Exception as e:
            return _resp(500, {'error': f'Error al obtener incidente: {str(e)}'})
        
        # Verificar que el incidente está asignado a este trabajador
        if item.get('asignado_a') != current_user.get('email'):
            return _resp(403, {'error': 'Este incidente no está asignado a ti'})
        
        # Update status
        old_estado = item.get('estado')
        now = datetime.datetime.utcnow().isoformat()
        item['estado'] = new_estado
        item['ultima_modificacion'] = now
        item['modificado_por'] = current_user.get('email')
        
        if new_estado == 'en_proceso':
            item['fecha_inicio'] = now
        elif new_estado == 'resuelto':
            item['fecha_resolucion'] = now
        
        table.put_item(Item=item)
        
        # Notify student about status change
        if item.get('creado_por'):
            _notify_estado_change(item.get('creado_por'), item, old_estado, new_estado)
        
        # Notify admin about worker update
        _notify_admin_trabajador_update(item, new_estado, current_user.get('email'))
        
        return _resp(200, item)

    return _resp(400, {'message': 'Unsupported route or method'})
