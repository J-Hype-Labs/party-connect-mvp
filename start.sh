#!/bin/bash
echo "Starting local server for Party Connect MVP..."
echo "Opening http://localhost:3000 in your browser..."
open "http://localhost:3000" 2>/dev/null || true
python3 -m http.server 3000
