import os
import json
from flask import Flask, request, make_response, jsonify

# Import existing lambda handlers
from src import app as app_lambda
from src import auth as auth_lambda
from src import users as users_lambda

app = Flask(__name__)


def _make_event(flask_req, path_override=None):
    """Build a minimal API Gateway-like event for existing lambda handlers."""
    body = None
    try:
        body = flask_req.get_data(as_text=True)
        if body == '':
            body = None
    except Exception:
        body = None

    headers = {}
    # Flask's request.headers is case-insensitive; convert to simple dict
    for k, v in flask_req.headers.items():
        headers[k] = v

    event = {
        'httpMethod': flask_req.method,
        'path': path_override or flask_req.path,
        'headers': headers,
        'body': body,
        'queryStringParameters': flask_req.args.to_dict() if flask_req.args else None
    }
    return event


def _proxy_to_lambda(handler, flask_req, path_override=None):
    event = _make_event(flask_req, path_override=path_override)
    resp = handler.lambda_handler(event, None)
    status = resp.get('statusCode', 200)
    headers = resp.get('headers', {}) or {}
    body = resp.get('body', '')
    # If body is JSON string, try to return as-is
    return make_response((body, status, headers))


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


# Incidentes endpoints
@app.route('/incidentes', methods=['GET', 'POST', 'OPTIONS'])
def incidentes_root():
    if request.method == 'OPTIONS':
        return ('', 200)
    return _proxy_to_lambda(app_lambda, request, path_override='/incidentes')


@app.route('/incidentes/<string:inc_id>', methods=['PUT', 'OPTIONS'])
def incidentes_item(inc_id):
    if request.method == 'OPTIONS':
        return ('', 200)
    # For generic update the lambda expects path like /incidentes/{id}
    return _proxy_to_lambda(app_lambda, request, path_override=f'/incidentes/{inc_id}')


@app.route('/incidentes/<string:inc_id>/asignar', methods=['PUT', 'OPTIONS'])
def incidentes_asignar(inc_id):
    if request.method == 'OPTIONS':
        return ('', 200)
    return _proxy_to_lambda(app_lambda, request, path_override=f'/incidentes/{inc_id}/asignar')


@app.route('/incidentes/<string:inc_id>/estado', methods=['PUT', 'OPTIONS'])
def incidentes_estado(inc_id):
    if request.method == 'OPTIONS':
        return ('', 200)
    return _proxy_to_lambda(app_lambda, request, path_override=f'/incidentes/{inc_id}/estado')


# Auth endpoints (register / login)
@app.route('/auth/register', methods=['POST', 'OPTIONS'])
def auth_register():
    if request.method == 'OPTIONS':
        return ('', 200)
    return _proxy_to_lambda(auth_lambda, request, path_override='/auth/register')


@app.route('/auth/login', methods=['POST', 'OPTIONS'])
def auth_login():
    if request.method == 'OPTIONS':
        return ('', 200)
    return _proxy_to_lambda(auth_lambda, request, path_override='/auth/login')


# Users endpoint
@app.route('/users', methods=['GET', 'OPTIONS'])
def users_list():
    if request.method == 'OPTIONS':
        return ('', 200)
    return _proxy_to_lambda(users_lambda, request, path_override='/users')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 80))
    app.run(host='0.0.0.0', port=port)
