#!/bin/bash

# Function to handle script exit and kill background processes
cleanup() {
    echo ""
    echo "🛑 Stopping Amazon Listing Analyzer..."
    
    # Kill the backend process if it's running
    if [ -n "$BACKEND_PID" ]; then
        echo "Killing Backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
    fi
    
    echo "✅ All services stopped."
    exit
}

# Trap SIGINT (Ctrl+C) to run cleanup function
trap cleanup SIGINT

# Get the absolute path of the script directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT"

echo "🚀 Starting Amazon Listing Analyzer..."
echo "======================================="

# 1. Start Backend
echo "👉 Starting Backend (Python API)..."
./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Check if backend started successfully
if [ -z "$BACKEND_PID" ]; then
    echo "❌ Failed to start Backend."
    exit 1
fi

echo "Backend running with PID: $BACKEND_PID"
echo "Waiting 3 seconds for backend to initialize..."
sleep 3

# 2. Start Frontend
echo "======================================="
echo "👉 Starting Frontend (Next.js)..."
cd frontend
npm run dev

# The script will stay here running the frontend until Ctrl+C is pressed
# When Ctrl+C is pressed, the 'cleanup' function will be called
