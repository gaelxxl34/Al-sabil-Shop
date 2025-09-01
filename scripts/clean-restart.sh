#!/bin/bash

echo "🧹 Cleaning Next.js cache and restarting development server..."

# Kill any running Next.js processes
echo "Stopping Next.js development server..."
pkill -f "next dev" 2>/dev/null || true

# Wait a moment for processes to terminate
sleep 2

# Remove the .next directory
echo "Removing .next cache directory..."
rm -rf .next

# Clear npm cache (optional, for more thorough cleanup)
echo "Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# Restart the development server
echo "Starting fresh development server..."
npm run dev
