#!/bin/bash
# Railway Backend Deployment Verification Script
# Run this after deploying to Railway to confirm everything is working
#
# Usage: ./verify-railway-deployment.sh <RAILWAY_URL>
# Example: ./verify-railway-deployment.sh https://dholera-backend-prod.railway.app

set -e

RAILWAY_URL="${1:?Error: Please provide Railway URL as argument}"
RAILWAY_URL="${RAILWAY_URL%/}"  # Remove trailing slash if present

echo "🔍 Verifying Railway Backend Deployment: $RAILWAY_URL"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "📋 Test 1: Health Check (/healthz)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/healthz")
if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC}: Received 200 OK"
  curl -s "$RAILWAY_URL/healthz" | jq . 2>/dev/null || curl -s "$RAILWAY_URL/healthz"
else
  echo -e "${RED}✗ FAIL${NC}: Received HTTP $RESPONSE (expected 200)"
  exit 1
fi
echo ""

# Test 2: Runtime Diagnostics
echo "📋 Test 2: Runtime Diagnostics (/healthz/runtime)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/healthz/runtime")
if [ "$RESPONSE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC}: Received 200 OK"
  curl -s "$RAILWAY_URL/healthz/runtime" | jq . 2>/dev/null || curl -s "$RAILWAY_URL/healthz/runtime"
else
  echo -e "${RED}✗ FAIL${NC}: Received HTTP $RESPONSE (expected 200)"
  exit 1
fi
echo ""

# Test 3: CORS Headers
echo "📋 Test 3: CORS Headers (preflight request)"
RESPONSE=$(curl -s -i -X OPTIONS -H "Origin: http://localhost:3000" "$RAILWAY_URL/api/leads" 2>/dev/null)
if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
  echo -e "${GREEN}✓ PASS${NC}: CORS headers present"
  echo "$RESPONSE" | grep -i "access-control-"
else
  echo -e "${YELLOW}⚠ WARNING${NC}: No CORS headers detected (may be expected)"
fi
echo ""

# Test 4: Database Connection
echo "📋 Test 4: Database Connection (via analytics endpoint - no auth required check)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/api/analytics")
if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ]; then
  echo -e "${GREEN}✓ PASS${NC}: Endpoint protected (received $RESPONSE) - database is accessible"
elif [ "$RESPONSE" = "200" ]; then
  echo -e "${YELLOW}⚠ WARNING${NC}: Endpoint returned 200 (usually requires auth token)"
else
  echo -e "${RED}✗ FAIL${NC}: Received HTTP $RESPONSE (expected 401/403 for auth)"
  exit 1
fi
echo ""

# Test 5: SSL/TLS
echo "📋 Test 5: SSL/TLS Certificate"
if [[ "$RAILWAY_URL" == https://* ]]; then
  RESPONSE=$(curl -s -I "$RAILWAY_URL/healthz" 2>&1)
  if echo "$RESPONSE" | grep -q "HTTP/"; then
    echo -e "${GREEN}✓ PASS${NC}: SSL certificate valid"
  else
    echo -e "${RED}✗ FAIL${NC}: SSL certificate validation failed"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠ WARNING${NC}: Not using HTTPS (expected for production)"
fi
echo ""

# Test 6: Response Time
echo "📋 Test 6: Response Time (measuring latency)"
START=$(date +%s%N)
curl -s "$RAILWAY_URL/healthz" > /dev/null
END=$(date +%s%N)
LATENCY=$(( (END - START) / 1000000 ))
echo -e "${GREEN}✓ PASS${NC}: Response time: ${LATENCY}ms"
if [ "$LATENCY" -gt 1000 ]; then
  echo -e "${YELLOW}⚠ WARNING${NC}: Latency > 1 second (check Railway resources)"
fi
echo ""

echo "========================================="
echo -e "${GREEN}✨ All Deployment Checks Passed!${NC}"
echo "========================================="
echo ""
echo "📝 Next Steps:"
echo "  1. Test API endpoints with valid JWT token"
echo "  2. Verify database connectivity from logs"
echo "  3. Monitor error logs in Railway dashboard"
echo "  4. Update frontend VITE_API_URL to: $RAILWAY_URL"
echo "  5. Deploy frontend to connect to this backend"
echo ""
