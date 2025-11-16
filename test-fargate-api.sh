#!/bin/bash

# Test script for Fargate deployment
# Tests all REST API endpoints

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get ALB URL from CloudFormation
echo -e "${YELLOW}Getting ALB URL from CloudFormation...${NC}"
ALB_URL=$(aws cloudformation describe-stacks \
    --stack-name cloud-hack-fargate-dev \
    --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerURL'].OutputValue" \
    --output text)

if [ -z "$ALB_URL" ]; then
    echo -e "${RED}Failed to get ALB URL. Make sure the stack is deployed.${NC}"
    exit 1
fi

echo -e "${GREEN}ALB URL: ${ALB_URL}${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" ${ALB_URL}/health)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi
echo ""

# Test 2: Register Student
echo -e "${YELLOW}Test 2: Register Student${NC}"
STUDENT_EMAIL="student$(date +%s)@utec.edu.pe"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${ALB_URL}/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"nombre\": \"Test Student\",
        \"email\": \"${STUDENT_EMAIL}\",
        \"password\": \"student123\"
    }")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✓ Student registration passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Student registration failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    exit 1
fi
echo ""

# Test 3: Login Student
echo -e "${YELLOW}Test 3: Login Student${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${ALB_URL}/auth/login \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"${STUDENT_EMAIL}\",
        \"password\": \"student123\"
    }")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Student login passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Student login failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    exit 1
fi
echo ""

# Test 4: Create Incident
echo -e "${YELLOW}Test 4: Create Incident${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${ALB_URL}/incidentes \
    -H "Content-Type: application/json" \
    -H "X-User-Email: ${STUDENT_EMAIL}" \
    -d '{
        "titulo": "Test Incident",
        "descripcion": "This is a test incident",
        "tipo": "Infraestructura",
        "piso": "1",
        "lugar_especifico": "Aula 101",
        "Nivel_Riesgo": "medio"
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✓ Incident creation passed${NC}"
    echo "Response: $BODY"
    INCIDENT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Incident ID: $INCIDENT_ID"
else
    echo -e "${RED}✗ Incident creation failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    exit 1
fi
echo ""

# Test 5: List Incidents
echo -e "${YELLOW}Test 5: List Incidents${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET ${ALB_URL}/incidentes \
    -H "X-User-Email: ${STUDENT_EMAIL}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ List incidents passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ List incidents failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    exit 1
fi
echo ""

# Test 6: Register Admin
echo -e "${YELLOW}Test 6: Register Admin${NC}"
ADMIN_EMAIL="admin$(date +%s)@admin.utec.edu.pe"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${ALB_URL}/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"nombre\": \"Test Admin\",
        \"email\": \"${ADMIN_EMAIL}\",
        \"password\": \"admin123\"
    }")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✓ Admin registration passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Admin registration failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    exit 1
fi
echo ""

# Test 7: Register Worker
echo -e "${YELLOW}Test 7: Register Worker${NC}"
WORKER_EMAIL="worker$(date +%s)@company.com"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${ALB_URL}/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"nombre\": \"Test Worker\",
        \"email\": \"${WORKER_EMAIL}\",
        \"password\": \"worker123\",
        \"especialidad\": \"TI\"
    }")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✓ Worker registration passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Worker registration failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    exit 1
fi
echo ""

# Test 8: List Users (Admin)
echo -e "${YELLOW}Test 8: List Users (Admin)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET ${ALB_URL}/users \
    -H "X-User-Email: ${ADMIN_EMAIL}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ List users passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ List users failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All tests completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Created test users:${NC}"
echo "Student: ${STUDENT_EMAIL} / student123"
echo "Admin: ${ADMIN_EMAIL} / admin123"
echo "Worker: ${WORKER_EMAIL} / worker123"
echo ""
echo -e "${YELLOW}You can use these credentials to test the frontend.${NC}"
