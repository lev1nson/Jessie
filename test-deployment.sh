#!/bin/bash

# Deployment Testing Script for Jessie Email Assistant
# Usage: ./test-deployment.sh [VERCEL_URL]

if [ $# -eq 0 ]; then
    echo "Usage: $0 <VERCEL_URL>"
    echo "Example: $0 https://jessie-email-assistant.vercel.app"
    exit 1
fi

VERCEL_URL=$1
echo "🚀 Testing deployment at: $VERCEL_URL"
echo "================================="

# Remove trailing slash if present
VERCEL_URL=${VERCEL_URL%/}

# Test 1: Basic health check
echo "1. Testing basic health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$VERCEL_URL/api/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check: PASS"
    echo "   Response: $(echo $RESPONSE_BODY | jq -r '.status // "N/A"')"
else
    echo "❌ Health check: FAIL (HTTP $HTTP_CODE)"
    echo "   Response: $RESPONSE_BODY"
fi
echo ""

# Test 2: Environment variables check
echo "2. Testing environment variables..."
ENV_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$VERCEL_URL/api/health/env")
ENV_HTTP_CODE=$(echo "$ENV_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
ENV_BODY=$(echo "$ENV_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$ENV_HTTP_CODE" = "200" ]; then
    ENV_STATUS=$(echo $ENV_BODY | jq -r '.status // "unknown"')
    COMPLETION_RATE=$(echo $ENV_BODY | jq -r '.completionRate // "0%"')
    MISSING_COUNT=$(echo $ENV_BODY | jq -r '.missing | length')
    
    if [ "$ENV_STATUS" = "ok" ]; then
        echo "✅ Environment variables: PASS (100% configured)"
    else
        echo "⚠️  Environment variables: PARTIAL ($COMPLETION_RATE configured)"
        echo "   Missing variables: $(echo $ENV_BODY | jq -r '.missing[]' | tr '\n' ' ')"
    fi
else
    echo "❌ Environment variables: FAIL (HTTP $ENV_HTTP_CODE)"
    echo "   Response: $ENV_BODY"
fi
echo ""

# Test 3: Static page load
echo "3. Testing homepage load..."
HOME_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$VERCEL_URL/")
HOME_HTTP_CODE=$(echo "$HOME_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$HOME_HTTP_CODE" = "200" ]; then
    echo "✅ Homepage: PASS"
else
    echo "❌ Homepage: FAIL (HTTP $HOME_HTTP_CODE)"
fi
echo ""

# Test 4: OAuth redirect (should redirect to Google)
echo "4. Testing OAuth redirect..."
AUTH_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -I "$VERCEL_URL/auth/login")
AUTH_HTTP_CODE=$(echo "$AUTH_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$AUTH_HTTP_CODE" = "302" ] || [ "$AUTH_HTTP_CODE" = "307" ]; then
    echo "✅ OAuth redirect: PASS (HTTP $AUTH_HTTP_CODE)"
else
    echo "❌ OAuth redirect: FAIL (HTTP $AUTH_HTTP_CODE)"
    echo "   Expected 302/307 redirect to Google OAuth"
fi
echo ""

# Test 5: API route protection (should require auth)
echo "5. Testing API protection..."
API_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$VERCEL_URL/api/indexing/stats")
API_HTTP_CODE=$(echo "$API_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$API_HTTP_CODE" = "401" ] || [ "$API_HTTP_CODE" = "403" ]; then
    echo "✅ API protection: PASS (HTTP $API_HTTP_CODE - properly protected)"
elif [ "$API_HTTP_CODE" = "500" ]; then
    echo "⚠️  API protection: PARTIAL (HTTP $API_HTTP_CODE - server error, but protected)"
else
    echo "❌ API protection: FAIL (HTTP $API_HTTP_CODE - should be protected)"
fi
echo ""

# Test 6: Cron job endpoint (should require CRON_SECRET)
echo "6. Testing cron job protection..."
CRON_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$VERCEL_URL/api/cron/email-sync")
CRON_HTTP_CODE=$(echo "$CRON_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$CRON_HTTP_CODE" = "401" ] || [ "$CRON_HTTP_CODE" = "403" ]; then
    echo "✅ Cron protection: PASS (HTTP $CRON_HTTP_CODE - properly protected)"
else
    echo "❌ Cron protection: FAIL (HTTP $CRON_HTTP_CODE - should require CRON_SECRET)"
fi
echo ""

# Summary
echo "================================="
echo "🎯 DEPLOYMENT TEST SUMMARY"
echo "================================="

# Count passes
TESTS=6
PASSES=0

if [ "$HTTP_CODE" = "200" ]; then ((PASSES++)); fi
if [ "$ENV_STATUS" = "ok" ]; then ((PASSES++)); fi
if [ "$HOME_HTTP_CODE" = "200" ]; then ((PASSES++)); fi
if [ "$AUTH_HTTP_CODE" = "302" ] || [ "$AUTH_HTTP_CODE" = "307" ]; then ((PASSES++)); fi
if [ "$API_HTTP_CODE" = "401" ] || [ "$API_HTTP_CODE" = "403" ]; then ((PASSES++)); fi
if [ "$CRON_HTTP_CODE" = "401" ] || [ "$CRON_HTTP_CODE" = "403" ]; then ((PASSES++)); fi

echo "Tests passed: $PASSES/$TESTS"
PERCENTAGE=$((PASSES * 100 / TESTS))
echo "Success rate: $PERCENTAGE%"

if [ $PASSES -eq $TESTS ]; then
    echo "🎉 ALL TESTS PASSED! Deployment is ready for production."
    exit 0
elif [ $PASSES -ge 4 ]; then
    echo "⚠️  MOSTLY WORKING. Check failed tests before going live."
    exit 1
else
    echo "❌ CRITICAL ISSUES. Fix failed tests before deployment."
    exit 2
fi