#!/bin/bash

# ═══════════════════════════════════════════════════════════════
#  SysPulse Startup Script
#  Starts: MongoDB, Middleware, C++ Agent, Frontend
# ═══════════════════════════════════════════════════════════════

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# PIDs for cleanup
PIDS=()

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}[SysPulse] Shutting down...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    echo -e "${GREEN}[SysPulse] Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Header
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ███████╗██╗   ██╗███████╗██████╗ ██╗   ██╗██╗     ███████╗║"
echo "║   ██╔════╝╚██╗ ██╔╝██╔════╝██╔══██╗██║   ██║██║     ██╔════╝║"
echo "║   ███████╗ ╚████╔╝ ███████╗██████╔╝██║   ██║██║     ███████╗║"
echo "║   ╚════██║  ╚██╔╝  ╚════██║██╔═══╝ ██║   ██║██║     ╚════██║║"
echo "║   ███████║   ██║   ███████║██║     ╚██████╔╝███████╗███████║║"
echo "║   ╚══════╝   ╚═╝   ╚══════╝╚═╝      ╚═════╝ ╚══════╝╚══════╝║"
echo "║                                                           ║"
echo "║                 System Monitor v1.0.0                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────────────────────────
# 1. Check MongoDB
# ─────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/4] Checking MongoDB...${NC}"
if command -v mongod &> /dev/null; then
    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}  ✓ MongoDB is already running${NC}"
    else
        echo -e "${CYAN}  → Starting MongoDB...${NC}"
        mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --fork 2>/dev/null || \
        mongod --dbpath ~/.mongodb/data --logpath ~/.mongodb/mongod.log --fork 2>/dev/null || \
        echo -e "${YELLOW}  ⚠ Could not start MongoDB automatically. Please start it manually.${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ MongoDB not found. Please install and start MongoDB manually.${NC}"
    echo -e "${YELLOW}    The app will work but alerts won't be persisted.${NC}"
fi

# ─────────────────────────────────────────────────────────────────
# 2. Start Middleware Server
# ─────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/4] Starting Middleware Server...${NC}"
cd "$PROJECT_ROOT/Engine/middleware"

if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}  → Installing dependencies...${NC}"
    npm install
fi

npm run start &
MIDDLEWARE_PID=$!
PIDS+=($MIDDLEWARE_PID)
echo -e "${GREEN}  ✓ Middleware running on http://localhost:3000 (PID: $MIDDLEWARE_PID)${NC}"

# Wait for middleware to be ready
sleep 2

# ─────────────────────────────────────────────────────────────────
# 3. Start C++ Agent
# ─────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/4] Starting C++ Agent...${NC}"
cd "$PROJECT_ROOT/Engine/agent"

AGENT_BIN="$PROJECT_ROOT/Engine/agent/build/syspulse_agent"

if [ ! -f "$AGENT_BIN" ]; then
    echo -e "${CYAN}  → Building agent...${NC}"
    mkdir -p build && cd build
    cmake .. && make
    cd ..
fi

if [ -f "$AGENT_BIN" ]; then
    "$AGENT_BIN" &
    AGENT_PID=$!
    PIDS+=($AGENT_PID)
    echo -e "${GREEN}  ✓ Agent running (PID: $AGENT_PID)${NC}"
else
    echo -e "${RED}  ✗ Agent binary not found. Build failed?${NC}"
fi

# ─────────────────────────────────────────────────────────────────
# 4. Start Frontend
# ─────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/4] Starting Frontend...${NC}"
cd "$PROJECT_ROOT/Frontend"

if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}  → Installing dependencies...${NC}"
    npm install
fi

npm run dev &
FRONTEND_PID=$!
PIDS+=($FRONTEND_PID)
echo -e "${GREEN}  ✓ Frontend running on http://localhost:3001 (PID: $FRONTEND_PID)${NC}"

# ─────────────────────────────────────────────────────────────────
# Ready!
# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SysPulse is now running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Dashboard:${NC}   http://localhost:3001"
echo -e "  ${CYAN}Middleware:${NC}  http://localhost:3000"
echo -e "  ${CYAN}Health:${NC}      http://localhost:3000/api/health"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running
wait
