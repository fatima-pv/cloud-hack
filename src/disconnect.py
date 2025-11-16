import os
import boto3

table_name = os.environ.get('CONNECTIONS_TABLE', 'ConnectionsTable')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(table_name)


def lambda_handler(event, context):
    # Remove connection id on disconnect
    connection_id = event['requestContext']['connectionId']
    table.delete_item(Key={'connectionId': connection_id})
    return {
        'statusCode': 200,
        'body': 'disconnected'
    }
