# Frontend Test Application

Simple frontend to test the Cloud Hack Incident Management serverless API.

## Features

- 📝 Create new incidents via REST API
- 📋 View all incidents via REST API
- 💬 Real-time WebSocket connection testing
- ⚙️ Configurable API endpoints

## How to Use

### Option 1: Open Directly in Browser
Simply open `index.html` in your web browser:
```bash
start index.html
```

### Option 2: Use a Local Server (Recommended)

#### Using Python:
```bash
python -m http.server 8000
```

#### Using Node.js:
```bash
npx http-server -p 8000
```

Then open: http://localhost:8000

## Configuration

The default endpoints are pre-configured based on your deployment:
- **REST API**: `https://lw14n0auoh.execute-api.us-east-1.amazonaws.com/prod/incidentes`
- **WebSocket**: `wss://1l16i22jel.execute-api.us-east-1.amazonaws.com/prod`

You can change these in the "API Configuration" section at the bottom of the page.

## Testing Guide

1. **Test WebSocket Connection**:
   - Click "Connect WebSocket" button
   - Watch the connection status in the top-right corner
   - Check the WebSocket messages panel for connection logs

2. **Create an Incident**:
   - Fill in the form with title, description, and severity
   - Click "Submit Incident"
   - Check for success message

3. **View Incidents**:
   - Click "Refresh" button
   - All incidents will be displayed with their details

4. **Monitor Real-time Updates**:
   - Keep WebSocket connected
   - Create incidents in another browser/tab
   - Watch for real-time notifications

## Troubleshooting

- **CORS Errors**: Make sure your serverless API has CORS enabled
- **Connection Failed**: Verify the API endpoints are correct
- **No Incidents Showing**: Check browser console for errors
