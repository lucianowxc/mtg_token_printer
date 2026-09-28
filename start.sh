#!/bin/bash

# MTG Token Printer - Thermer Edition
# Quick start script

echo "🚀 MTG Token Printer - Thermer Edition"
echo "======================================="
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
echo "✅ Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import flask" 2>/dev/null; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
fi

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "✅ Ready to start!"
echo ""
echo "📱 Access from your iPhone:"
echo "   http://$LOCAL_IP:5000"
echo ""
echo "Starting Flask server..."
echo ""

# Run the app
python web_app.py
