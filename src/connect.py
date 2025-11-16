import os
import boto3

table_name = os.environ.get('CONNECTIONS_TABLE', 'ConnectionsTable')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(table_name)


def lambda_handler(event, context):
    # When a client connects, API Gateway will call this lambda.
    connection_id = event['requestContext']['connectionId']
    # Store the connection id
    table.put_item(Item={'connectionId': connection_id})
    return {
        'statusCode': 200,
        'body': 'connected'
    }
