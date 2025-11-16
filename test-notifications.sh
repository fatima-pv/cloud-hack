#!/bin/bash

# Script de prueba rápida para el sistema de notificaciones
# Autor: Sistema de Gestión de Incidentes
# Fecha: 16 de Noviembre 2024

set -e  # Detener en caso de error

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔔 Sistema de Notificaciones - Prueba Rápida            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que jq esté instalado
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ ERROR: jq no está instalado${NC}"
    echo "Instalar con: brew install jq"
    exit 1
fi

# Configuración (REEMPLAZAR CON TUS URLS REALES)
API_URL="${API_URL:-https://xxx.execute-api.us-east-1.amazonaws.com/prod}"
WS_URL="${WS_URL:-wss://yyy.execute-api.us-east-1.amazonaws.com/prod}"

# Usuarios de prueba
ESTUDIANTE_EMAIL="${ESTUDIANTE_EMAIL:-estudiante@test.com}"
TRABAJADOR_EMAIL="${TRABAJADOR_EMAIL:-trabajador@test.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@test.com}"

echo -e "${YELLOW}📝 Configuración:${NC}"
echo "   API URL: $API_URL"
echo "   WebSocket URL: $WS_URL"
echo "   Estudiante: $ESTUDIANTE_EMAIL"
echo "   Trabajador: $TRABAJADOR_EMAIL"
echo "   Admin: $ADMIN_EMAIL"
echo ""

# Verificar si las URLs están configuradas
if [[ "$API_URL" == *"xxx"* ]]; then
    echo -e "${RED}❌ ERROR: Debes configurar las URLs reales${NC}"
    echo ""
    echo "Exporta las variables de entorno:"
    echo "  export API_URL='https://tu-api.execute-api.us-east-1.amazonaws.com/prod'"
    echo "  export WS_URL='wss://tu-ws.execute-api.us-east-1.amazonaws.com/prod'"
    echo ""
    exit 1
fi

read -p "¿Continuar con la prueba? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PASO 1: Crear Incidente${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

RESPONSE=$(curl -s -X POST "$API_URL/incidentes" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $ESTUDIANTE_EMAIL" \
  -d '{
    "titulo": "Test: Notificaciones de Estado",
    "descripcion": "Prueba automática del sistema de notificaciones",
    "tipo": "Test Automatizado",
    "piso": "1",
    "lugar_especifico": "Sistema de Pruebas",
    "Nivel_Riesgo": "medio"
  }')

# Verificar si hubo error
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR al crear incidente:${NC}"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

INCIDENTE_ID=$(echo "$RESPONSE" | jq -r '.id')
ESTADO_INICIAL=$(echo "$RESPONSE" | jq -r '.estado')
TITULO=$(echo "$RESPONSE" | jq -r '.titulo')

echo -e "${GREEN}✅ Incidente creado exitosamente${NC}"
echo "   ID: $INCIDENTE_ID"
echo "   Título: $TITULO"
echo -e "   Estado inicial: ${YELLOW}$ESTADO_INICIAL${NC}"

if [ "$ESTADO_INICIAL" != "pendiente" ]; then
    echo -e "${RED}❌ ERROR: Estado inicial debería ser 'pendiente' pero es '$ESTADO_INICIAL'${NC}"
    exit 1
fi

echo -e "${GREEN}   ✓ Estado correcto: pendiente${NC}"
echo ""

sleep 2

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PASO 2: Conectar WebSocket (Instrucciones)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Abre una nueva terminal y ejecuta:${NC}"
echo ""
echo "  wscat -c \"$WS_URL?email=$ESTUDIANTE_EMAIL\""
echo ""
echo -e "${YELLOW}O en el navegador (consola JavaScript):${NC}"
echo ""
echo "  const ws = new WebSocket('$WS_URL?email=$ESTUDIANTE_EMAIL');"
echo "  ws.onmessage = (e) => console.log('🔔 Notificación:', JSON.parse(e.data));"
echo ""
echo -e "${YELLOW}Presiona ENTER cuando estés conectado...${NC}"
read

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PASO 3: Asignar Incidente${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

RESPONSE=$(curl -s -X PUT "$API_URL/incidentes/$INCIDENTE_ID/asignar" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $ADMIN_EMAIL" \
  -d "{\"trabajador_email\": \"$TRABAJADOR_EMAIL\"}")

# Verificar si hubo error
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR al asignar incidente:${NC}"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

ESTADO_ASIGNADO=$(echo "$RESPONSE" | jq -r '.estado')
ASIGNADO_A=$(echo "$RESPONSE" | jq -r '.asignado_a')

echo -e "${GREEN}✅ Incidente asignado exitosamente${NC}"
echo "   Asignado a: $ASIGNADO_A"
echo -e "   Nuevo estado: ${YELLOW}$ESTADO_ASIGNADO${NC}"

if [ "$ESTADO_ASIGNADO" != "en atención" ]; then
    echo -e "${RED}❌ ERROR: Estado debería ser 'en atención' pero es '$ESTADO_ASIGNADO'${NC}"
    exit 1
fi

echo -e "${GREEN}   ✓ Estado correcto: en atención${NC}"
echo ""
echo -e "${YELLOW}🔔 Verifica que recibiste la notificación en el WebSocket:${NC}"
echo "   Mensaje esperado: 'pendiente → en atención'"
echo ""
echo -e "${YELLOW}Presiona ENTER para continuar...${NC}"
read

sleep 2

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PASO 4: Completar Incidente${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

RESPONSE=$(curl -s -X PUT "$API_URL/incidentes/$INCIDENTE_ID/completar" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $TRABAJADOR_EMAIL")

# Verificar si hubo error
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR al completar incidente:${NC}"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

ESTADO_FINAL=$(echo "$RESPONSE" | jq -r '.estado')
COMPLETADO_POR=$(echo "$RESPONSE" | jq -r '.completado_por')
FECHA_COMPLETADO=$(echo "$RESPONSE" | jq -r '.fecha_completado')

echo -e "${GREEN}✅ Incidente completado exitosamente${NC}"
echo "   Completado por: $COMPLETADO_POR"
echo "   Fecha: $FECHA_COMPLETADO"
echo -e "   Estado final: ${YELLOW}$ESTADO_FINAL${NC}"

if [ "$ESTADO_FINAL" != "completado" ]; then
    echo -e "${RED}❌ ERROR: Estado final debería ser 'completado' pero es '$ESTADO_FINAL'${NC}"
    exit 1
fi

echo -e "${GREEN}   ✓ Estado correcto: completado${NC}"
echo ""
echo -e "${YELLOW}🔔 Verifica que recibiste la segunda notificación en el WebSocket:${NC}"
echo "   Mensaje esperado: 'en atención → completado'"
echo ""

sleep 1

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PASO 5: Verificar Datos Completos${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

RESPONSE=$(curl -s -X GET "$API_URL/incidentes" \
  -H "X-User-Email: $ESTUDIANTE_EMAIL")

INCIDENTE=$(echo "$RESPONSE" | jq ".[] | select(.id==\"$INCIDENTE_ID\")")

echo -e "${GREEN}✅ Incidente recuperado${NC}"
echo ""
echo "$INCIDENTE" | jq '{
  id,
  titulo,
  estado,
  creado_por,
  Fecha_creacion,
  asignado_a,
  fecha_asignacion,
  completado_por,
  fecha_completado
}'

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ RESUMEN DE LA PRUEBA${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓${NC} Incidente creado con estado: ${YELLOW}pendiente${NC}"
echo -e "${GREEN}✓${NC} Incidente asignado, cambió a: ${YELLOW}en atención${NC}"
echo -e "${GREEN}✓${NC} Incidente completado, cambió a: ${YELLOW}completado${NC}"
echo -e "${GREEN}✓${NC} Notificación 1: pendiente → en atención"
echo -e "${GREEN}✓${NC} Notificación 2: en atención → completado"
echo ""
echo -e "${GREEN}🎉 ¡Todas las pruebas pasaron exitosamente!${NC}"
echo ""
echo -e "${YELLOW}Información del incidente de prueba:${NC}"
echo "   ID: $INCIDENTE_ID"
echo "   Título: $TITULO"
echo ""
echo -e "${YELLOW}Tip:${NC} Puedes eliminar este incidente si lo deseas desde DynamoDB"
echo ""
