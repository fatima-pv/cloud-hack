#!/bin/bash

# Script de prueba rápida para las notificaciones de estado
# Actualizado con los endpoints desplegados

API_URL="https://pj9trlx4uf.execute-api.us-east-1.amazonaws.com/dev"
WS_URL="wss://6qtk3h60si.execute-api.us-east-1.amazonaws.com/dev"

echo "🚀 Iniciando pruebas del sistema de notificaciones..."
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Registrar Admin
echo -e "${BLUE}1. Registrando Admin...${NC}"
ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123",
    "nombre": "Admin Test",
    "tipo": "admin"
  }')
echo "$ADMIN_RESPONSE" | jq .
echo ""

# 2. Registrar Estudiante
echo -e "${BLUE}2. Registrando Estudiante...${NC}"
ESTUDIANTE_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "estudiante@test.com",
    "password": "est123",
    "nombre": "Estudiante Test",
    "tipo": "estudiante"
  }')
echo "$ESTUDIANTE_RESPONSE" | jq .
echo ""

# 3. Registrar Trabajador
echo -e "${BLUE}3. Registrando Trabajador...${NC}"
TRABAJADOR_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trabajador@test.com",
    "password": "trab123",
    "nombre": "Trabajador Test",
    "tipo": "trabajador",
    "especialidad": "Plomería"
  }')
echo "$TRABAJADOR_RESPONSE" | jq .
echo ""

# 4. Estudiante crea incidente
echo -e "${BLUE}4. Estudiante crea incidente (estado: pendiente)...${NC}"
INCIDENTE_RESPONSE=$(curl -s -X POST "$API_URL/incidentes" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: estudiante@test.com" \
  -d '{
    "titulo": "Fuga de agua en baño principal",
    "descripcion": "Hay una fuga importante en el segundo piso",
    "tipo": "Plomería",
    "piso": "2",
    "lugar_especifico": "Baño principal"
  }')
echo "$INCIDENTE_RESPONSE" | jq .

# Extraer el ID del incidente
INCIDENTE_ID=$(echo "$INCIDENTE_RESPONSE" | jq -r '.id')
echo -e "${GREEN}✅ Incidente creado con ID: $INCIDENTE_ID${NC}"
echo -e "${YELLOW}📝 Estado inicial: pendiente${NC}"
echo ""

# 5. Listar todos los usuarios (como admin)
echo -e "${BLUE}5. Listando usuarios (como admin)...${NC}"
USERS_RESPONSE=$(curl -s -X GET "$API_URL/users" \
  -H "X-User-Email: admin@test.com")
echo "$USERS_RESPONSE" | jq .
echo ""

# 6. Listar incidentes del estudiante
echo -e "${BLUE}6. Listando incidentes del estudiante...${NC}"
STUDENT_INCIDENTS=$(curl -s -X GET "$API_URL/incidentes" \
  -H "X-User-Email: estudiante@test.com")
echo "$STUDENT_INCIDENTS" | jq .
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ SETUP COMPLETADO${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 INFORMACIÓN IMPORTANTE:${NC}"
echo "   Incidente ID: $INCIDENTE_ID"
echo "   Estado actual: pendiente"
echo ""
echo -e "${BLUE}🔔 PARA PROBAR LAS NOTIFICACIONES:${NC}"
echo ""
echo "1️⃣  Conecta al WebSocket (en el navegador):"
echo "   const ws = new WebSocket('$WS_URL?email=estudiante@test.com');"
echo "   ws.onmessage = (e) => console.log('🔔', JSON.parse(e.data));"
echo ""
echo "2️⃣  Asignar incidente (trigger notificación):"
echo "   curl -X PUT '$API_URL/incidentes/$INCIDENTE_ID/asignar' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'X-User-Email: admin@test.com' \\"
echo "     -d '{\"trabajador_email\": \"trabajador@test.com\"}'"
echo ""
echo "3️⃣  Completar incidente (trigger notificación):"
echo "   curl -X PUT '$API_URL/incidentes/$INCIDENTE_ID/completar' \\"
echo "     -H 'X-User-Email: trabajador@test.com'"
echo ""
echo -e "${GREEN}🎯 El estudiante recibirá notificaciones en tiempo real!${NC}"
echo ""
