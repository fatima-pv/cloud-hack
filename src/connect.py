import os
import boto3
import datetime

table_name = os.environ.get('CONNECTIONS_TABLE', 'ConnectionsTable')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(table_name)


def lambda_handler(event, context):
    # When a client connects, API Gateway will call this lambda.
    connection_id = event['requestContext']['connectionId']
    
    # Get user email from query parameters
    query_params = event.get('queryStringParameters') or {}
    user_email = query_params.get('email', '')
    
    # Store the connection id with user email
    item = {
        'connectionId': connection_id,
        'userEmail': user_email,
        'timestamp': datetime.datetime.utcnow().isoformat()
    }
    
    table.put_item(Item=item)
    
    return {
        'statusCode': 200,
        'body': 'connected'
    }
