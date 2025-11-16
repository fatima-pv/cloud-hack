import os
import json
import boto3

table_name = os.environ.get('CONNECTIONS_TABLE', 'ConnectionsTable')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(table_name)


def lambda_handler(event, context):
    # When a client connects, API Gateway will call this lambda.
    connection_id = event['requestContext']['connectionId']
    
    # Try to get user email from query string parameters
    query_params = event.get('queryStringParameters') or {}
    user_email = query_params.get('email', '')
    
    # Store the connection id along with user email
    item = {
        'connectionId': connection_id,
        'userEmail': user_email
    }
    
    table.put_item(Item=item)
    return {
        'statusCode': 200,
        'body': 'connected'
    }
