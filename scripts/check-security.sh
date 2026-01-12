#!/bin/bash

# Security Configuration Check Script
# This script verifies that security measures are properly configured

set -e

echo "🔒 Security Configuration Check"
echo "==============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Check functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# 1. Check if required files exist
echo "Checking security infrastructure files..."
if [ -f "lib/api-auth.ts" ]; then
    check_pass "API authentication module exists"
else
    check_fail "API authentication module missing"
fi

if [ -f "lib/csrf.ts" ]; then
    check_pass "CSRF protection module exists"
else
    check_fail "CSRF protection module missing"
fi

if [ -f "lib/rate-limit.ts" ]; then
    check_pass "Rate limiting module exists"
else
    check_fail "Rate limiting module missing"
fi

if [ -f "lib/file-validation.ts" ]; then
    check_pass "File validation module exists"
else
    check_fail "File validation module missing"
fi

if [ -f "components/csrf-input.tsx" ]; then
    check_pass "CSRF input component exists"
else
    check_fail "CSRF input component missing"
fi

echo ""

# 2. Check environment variables
echo "Checking environment configuration..."
if [ -f ".env" ]; then
    check_pass ".env file exists"

    if grep -q "NODE_ENV" .env; then
        check_pass "NODE_ENV is set"
    else
        check_warn "NODE_ENV not set in .env"
    fi

    if grep -q "REDIS_URL" .env; then
        check_pass "REDIS_URL is configured"
    else
        check_fail "REDIS_URL not configured (required for rate limiting)"
    fi
else
    check_warn ".env file not found (using defaults)"
fi

echo ""

# 3. Check API routes for security
echo "Checking API routes security..."

API_ROUTES=$(find app/api -name "route.ts" 2>/dev/null | grep -v "auth/login\|auth/logout" || true)
ROUTES_WITH_AUTH=0
ROUTES_WITHOUT_AUTH=0

for route in $API_ROUTES; do
    if grep -q "requireAuth" "$route"; then
        ((ROUTES_WITH_AUTH++))
    else
        ((ROUTES_WITHOUT_AUTH++))
        check_warn "Route may be missing auth: $route"
    fi
done

if [ $ROUTES_WITH_AUTH -gt 0 ]; then
    check_pass "$ROUTES_WITH_AUTH API routes have authentication"
fi

if [ $ROUTES_WITHOUT_AUTH -gt 0 ]; then
    check_warn "$ROUTES_WITHOUT_AUTH API routes may need authentication review"
fi

echo ""

# 4. Check for CSRF in forms
echo "Checking forms for CSRF protection..."

FORMS=$(grep -r "<form" app --include="*.tsx" 2>/dev/null | wc -l || echo "0")
FORMS_WITH_CSRF=$(grep -r "CsrfInput" app --include="*.tsx" 2>/dev/null | wc -l || echo "0")

if [ "$FORMS" -gt 0 ]; then
    echo "Found $FORMS forms in the application"
    if [ "$FORMS_WITH_CSRF" -gt 0 ]; then
        check_pass "$FORMS_WITH_CSRF forms have CSRF protection"
        if [ "$FORMS_WITH_CSRF" -lt "$FORMS" ]; then
            check_warn "$((FORMS - FORMS_WITH_CSRF)) forms may need CSRF tokens (see TODO_FRONTEND_UPDATES.md)"
        fi
    else
        check_warn "No forms have CSRF protection yet (see TODO_FRONTEND_UPDATES.md)"
    fi
fi

echo ""

# 5. Check Next.js config for security headers
echo "Checking Next.js security configuration..."
if [ -f "next.config.mjs" ]; then
    if grep -q "Strict-Transport-Security" next.config.mjs; then
        check_pass "Security headers configured in Next.js"
    else
        check_fail "Security headers not configured"
    fi
else
    check_fail "next.config.mjs not found"
fi

echo ""

# 6. Check for hardcoded secrets
echo "Checking for potential hardcoded secrets..."

HARDCODED=0

if grep -r "password.*=.*['\"].*['\"]" app lib --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "passwordHash" | grep -q .; then
    check_warn "Potential hardcoded passwords found"
    ((HARDCODED++))
fi

if grep -r "token.*=.*['\"][a-zA-Z0-9]\{20,\}['\"]" app lib --include="*.ts" --include="*.tsx" 2>/dev/null | grep -q .; then
    check_warn "Potential hardcoded tokens found"
    ((HARDCODED++))
fi

if [ $HARDCODED -eq 0 ]; then
    check_pass "No obvious hardcoded secrets found"
fi

echo ""

# 7. Check documentation
echo "Checking documentation..."
if [ -f "SECURITY.md" ]; then
    check_pass "Security documentation exists"
else
    check_warn "SECURITY.md not found"
fi

if [ -f "MIGRATION_GUIDE.md" ]; then
    check_pass "Migration guide exists"
else
    check_warn "MIGRATION_GUIDE.md not found"
fi

echo ""

# Summary
echo "==============================="
echo "Summary:"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All security checks passed!${NC}"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠ Security checks passed with warnings${NC}"
    echo "Review warnings above and see documentation for details"
    exit 0
else
    echo -e "${RED}✗ Security checks failed${NC}"
    echo "Please fix failed checks before deploying to production"
    exit 1
fi
