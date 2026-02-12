#!/bin/bash

# Deployment script for PM2
# Usage: ./deploy.sh

set -e

echo "🚀 Starting PM2 deployment..."

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "❌ Error: server/.env file not found!"
    echo "Please create server/.env with all required environment variables."
    exit 1
fi

# Get absolute path
PROJECT_DIR=$(pwd)

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Create logs directory
mkdir -p logs

# Build frontend
echo "📦 Building frontend..."
cd apps/web
npm ci
npm run build
cd "$PROJECT_DIR"

# Verify frontend build
if [ ! -d "apps/web/dist" ]; then
    echo "❌ Error: Frontend build failed!"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm ci
npx prisma generate

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

cd "$PROJECT_DIR"

# Stop existing PM2 process if running
pm2 delete event-backend 2>/dev/null || true

# Start with PM2
echo "🚀 Starting backend with PM2..."
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script
echo "⚙️  Setting up PM2 startup script..."
pm2 startup systemd | grep "sudo" | bash || echo "⚠️  PM2 startup already configured"

echo "✅ Deployment complete!"
echo ""
echo "📋 PM2 Status:"
pm2 status

echo ""
echo "📝 Useful commands:"
echo "  pm2 logs event-backend         # View logs"
echo "  pm2 logs event-backend --lines 100  # View last 100 lines"
echo "  pm2 restart event-backend      # Restart backend"
echo "  pm2 stop event-backend         # Stop backend"
echo "  pm2 monit                      # Monitor resources"
