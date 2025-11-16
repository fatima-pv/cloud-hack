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

## Troubleshooting: IAM / Role errors

If you encounter deployment errors like:

```
Encountered a permissions error performing a tagging operation
User: arn:aws:sts::175670145706:assumed-role/... is not authorized to perform: iam:CreateRole
```

This means the principal you're using to deploy does not have permission to create IAM roles or to tag them. You have a few options:

- Option A: Use a pre-existing role (recommended in restricted environments)
	- Edit `serverless.yaml` and provide the ARN of your existing role in `provider.role:` (the repo already uses `arn:aws:iam::175670145706:role/LabRole`).
	- Make sure the role has the required permissions: DynamoDB access (PutItem, Query, Scan, DeleteItem) and `execute-api:ManageConnections` for WebSocket post_to_connection.

- Option B: Request additional IAM permissions
	- Ask your administrator to grant `iam:CreateRole`, `iam:AttachRolePolicy`, and `iam:TagRole` during deployment. CloudFormation will need them to create the Roles and attach policies.

- Option C: Admin manually creates role(s) with correct policies
	- Ask an admin to create a role containing the necessary permissions for Lambda execution and to add tags the deployment uses. Then update `provider.role` to use the admin-created role ARN.

If your deployment still fails, re-run the deploy with `--debug` to get more details and ask your administrator which strategy is preferred in your environment.

### Example admin steps to prepare the LabRole

If your environment doesn't allow creating new roles, but admins can attach policies to the LabRole, here's an example sequence they can run:

1) Save the policy (provided in `docs/lab-role-policy.json`) locally.

2) Attach it to the role (admin only):

```bash
# Replace LabRole with the actual role name if different
aws iam put-role-policy --role-name LabRole --policy-name lab-role-policy --policy-document file://docs/lab-role-policy.json
```

3) Confirm your deployment identity (what role is currently assumed by your CLI):

```bash
aws sts get-caller-identity
```

4) Try deploying again (as the unprivileged user using the lab role):

```bash
sls deploy --stage prod --region us-east-1 --stack hackaton-cloud-prod

### Inspect packaged CloudFormation before deploying

You can examine the CloudFormation template Serverless will produce without deploying to validate it won't try to create IAM roles:

```bash
# Package the service locally
sls package --stage prod --region us-east-1

# The CloudFormation template will be in .serverless/cloudformation-template-update-stack.json
# Open this file and search for IAM::Role resources; if any exist, Serverless will try to create them.
```

Windows (cmd.exe) quick check for IAM::Role in the generated template:

```cmd
findstr /I /C:"AWS::IAM::Role" .serverless\cloudformation-template-update-stack.json || echo No IAM Role resources found
```

```


