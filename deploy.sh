#!/bin/bash

# Script de despliegue para Cloud Hack
# Este script ayuda a desplegar el proyecto en AWS

echo "================================================"
echo "  Cloud Hack - Script de Despliegue"
echo "================================================"
echo ""

# Verificar si serverless está instalado
if ! command -v serverless &> /dev/null; then
    echo "❌ Error: Serverless Framework no está instalado"
    echo "   Instálalo con: npm install -g serverless"
    exit 1
fi

echo "✅ Serverless Framework encontrado"

# Verificar si AWS CLI está configurado
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI no está instalado"
    echo "   Instálalo desde: https://aws.amazon.com/cli/"
    exit 1
fi

echo "✅ AWS CLI encontrado"

# Verificar credenciales AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: Credenciales AWS no configuradas"
    echo "   Configúralas con: aws configure"
    exit 1
fi

echo "✅ Credenciales AWS configuradas"
echo ""

# Preguntar por el stage
echo "¿En qué stage quieres desplegar?"
echo "1) dev (desarrollo)"
echo "2) prod (producción)"
read -p "Selecciona (1 o 2): " stage_choice

if [ "$stage_choice" == "2" ]; then
    STAGE="prod"
else
    STAGE="dev"
fi

echo ""
echo "📦 Desplegando en stage: $STAGE"
echo ""

# Desplegar
serverless deploy --stage $STAGE

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "  ✅ Despliegue Exitoso!"
    echo "================================================"
    echo ""
    echo "📋 Próximos pasos:"
    echo ""
    echo "1. Copia las URLs de los endpoints mostrados arriba"
    echo ""
    echo "2. Actualiza frontend/auth.js:"
    echo "   const API_BASE_URL = 'https://YOUR_API_GATEWAY_URL/$STAGE';"
    echo ""
    echo "3. Actualiza frontend/index.html con las URLs de:"
    echo "   - REST API (para incidentes)"
    echo "   - WebSocket API"
    echo ""
    echo "4. Abre frontend/register.html para crear tu primer usuario"
    echo ""
    echo "5. Inicia sesión en frontend/login.html"
    echo ""
    echo "================================================"
else
    echo ""
    echo "❌ Error en el despliegue"
    echo "   Revisa los errores arriba y vuelve a intentar"
    exit 1
fi
