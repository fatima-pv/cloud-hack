import os
import json
import uuid
import datetime
import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ.get('TABLE_NAME', 'ReportsTable')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)


def _resp(status, body):
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
    body = event.get('body')
    if not body:
        return {}
    try:
        return json.loads(body)
    except Exception:
        return {}


def lambda_handler(event, context):
    method = event.get('httpMethod')
    path = event.get('path', '')
    # Only keep two endpoints requested by the user:
    # - POST /reports : create a report accepting only specified fields
    # - GET  /incidentes : list all reports

    # Handle OPTIONS for CORS preflight
    if method == 'OPTIONS':
        return _resp(200, {'message': 'OK'})

    # CREATE: POST /incidentes
    if path.rstrip('/') == '/incidentes' and method == 'POST':
        data = _parse_body(event)
        new_id = str(uuid.uuid4())
        now = datetime.datetime.utcnow().isoformat()
        # Only accept the specified input fields and fill the rest with defaults
        item = {
            'id': new_id,
            'titulo': data.get('titulo', ''),
            'descripcion': data.get('descripcion', ''),
            'tipo': data.get('tipo', ''),
            'piso': data.get('piso', ''),
            'lugar_especifico': data.get('lugar_especifico', ''),
            'foto': data.get('foto', ''),
            'Nivel_Riesgo': '',
            'Fecha_creacion': now,
            'estado': 'abierto',
            'veces_reportado': 0
        }
        table.put_item(Item=item)

        # Broadcast the new incident to connected WebSocket clients.
        # We store connections in the ConnectionsTable and use the
        # ApiGatewayManagementApi to post messages.
        try:
            ws_api_id = os.environ.get('WS_API_ID')
            ws_stage = os.environ.get('WS_STAGE', 'prod')
            connections_table = os.environ.get('CONNECTIONS_TABLE', 'ConnectionsTable')
            if ws_api_id:
                endpoint = f"https://{ws_api_id}.execute-api.{os.environ.get('AWS_REGION', 'us-east-1')}.amazonaws.com/{ws_stage}"
                apigw = boto3.client('apigatewaymanagementapi', endpoint_url=endpoint)

                # read connection ids from ConnectionsTable
                con_table = dynamodb.Table(connections_table)
                resp = con_table.scan()
                conns = resp.get('Items', [])
                for c in conns:
                    cid = c.get('connectionId')
                    if not cid:
                        continue
                    try:
                        apigw.post_to_connection(ConnectionId=cid, Data=json.dumps({'action': 'new_incidente', 'item': item}).encode('utf-8'))
                    except apigw.exceptions.GoneException:
                        # stale connection, remove it
                        con_table.delete_item(Key={'connectionId': cid})
                    except Exception:
                        # ignore other posting errors for now
                        pass
        except Exception:
            # do not fail the request if broadcasting fails
            pass

        return _resp(201, item)

    # LIST: GET /incidentes
    if path.rstrip('/') == '/incidentes' and method == 'GET':
        res = table.scan()
        items = res.get('Items', [])
        return _resp(200, items)

    return _resp(400, {'message': 'Unsupported route or method'})
