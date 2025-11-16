# cloud-hack

A small Serverless project demonstrating an API and WebSocket integration backed by DynamoDB.

This project deploys three Lambda functions:
- `app` — handles REST API endpoints `GET /incidentes` and `POST /incidentes` and writes to DynamoDB.
- `connect` — stores WebSocket connection ids in the `ConnectionsTable` on `$connect`.
- `disconnect` — removes connection ids from the `ConnectionsTable` on `$disconnect`.

The deployment is implemented with Serverless Framework and provisions two DynamoDB tables: `ReportsTable` and `ConnectionsTable`.

## How to deploy

1) Install Serverless and the requirements plugin (global install recommended):

```bash
pip install serverless
npm i -g serverless
npm i -g serverless-python-requirements
```

2) Ensure you have AWS credentials configured (for AWS Academy you can use the provided role credentials). The `serverless.yaml` uses the role `arn:aws:iam::175670145706:role/LabRole` as requested.

3) Deploy the service:

```bash
serverless deploy
```

4) After deployment, Serverless will output the HTTP and WebSocket endpoints.

5) Example quick requests (replace the URL with the one from your deployment output):

```bash
# Create a report
curl -X POST https://yourid.execute-api.us-east-1.amazonaws.com/dev/incidentes -d '{"titulo":"fuego","descripcion":"detalle"}' -H 'Content-Type: application/json'

# List incidents
curl https://yourid.execute-api.us-east-1.amazonaws.com/dev/incidentes
```

Notes:
- The WebSocket API id is exported in CloudFormation outputs so it can be set as `WS_API_ID` environment variable if your code requires it.
- The service uses `serverless-python-requirements` to bundle Python dependencies.

## WebSocket testing

You can use `wscat` (or any WebSocket client) to connect to the WebSocket endpoint reported by the deployment:

```bash
# Example using wscat
wscat -c wss://yourid.execute-api.us-east-1.amazonaws.com/dev
```

When a new report is created, the `app` lambda broadcasts a message to connected WebSocket clients.

