#!/bin/bash

# MTG Token Printer - Worker Deploy Script
# Simplifies deploying the Cloudflare Worker with automatic commit and status reporting

set -e

WORKER_DIR="$(dirname "$0")/worker"
PROJECT_ROOT="$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MTG Token Printer - Worker Deploy${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if worker directory exists
if [ ! -d "$WORKER_DIR" ]; then
  echo -e "${RED}❌ Worker directory not found: $WORKER_DIR${NC}"
  exit 1
fi

# Change to project root to check git status
cd "$PROJECT_ROOT"

# Check for uncommitted changes in worker
WORKER_CHANGES=$(git diff --name-only | grep "^worker/" || true)
STAGED_WORKER=$(git diff --staged --name-only | grep "^worker/" || true)

if [ -n "$WORKER_CHANGES" ] || [ -n "$STAGED_WORKER" ]; then
  echo -e "${YELLOW}📝 Uncommitted worker changes detected:${NC}"
  echo "$WORKER_CHANGES" "$STAGED_WORKER" | grep "^worker/" | sort | uniq
  echo ""
  
  read -p "Commit these changes? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add worker/
    COMMIT_MSG="Update worker QR configuration"
    read -p "Enter commit message (default: '$COMMIT_MSG'): " USER_MSG
    if [ -n "$USER_MSG" ]; then
      COMMIT_MSG="$USER_MSG"
    fi
    git commit -m "$COMMIT_MSG" || echo -e "${YELLOW}⚠️  No changes staged for commit${NC}"
  else
    echo -e "${YELLOW}⚠️  Skipping commit. Deploying with current changes...${NC}"
  fi
else
  echo -e "${GREEN}✅ No uncommitted worker changes${NC}"
fi

echo ""
echo -e "${BLUE}📦 Deploying to Cloudflare Workers...${NC}"

# Deploy using wrangler
cd "$WORKER_DIR"

if npx wrangler deploy; then
  echo ""
  echo -e "${GREEN}✅ Deploy successful!${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${BLUE}📍 Live at:${NC} https://mtg-token-printer-worker.luciano-wxc.workers.dev"
  echo ""
  exit 0
else
  echo ""
  echo -e "${RED}❌ Deploy failed!${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
