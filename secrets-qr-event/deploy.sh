#!/bin/bash

# Deployment script for Digital Ocean
# Usage: ./deploy.sh [docker|pm2]

set -e

DEPLOY_METHOD=${1:-docker}

echo "🚀 Starting deployment with method: $DEPLOY_METHOD"

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "❌ Error: server/.env file not found!"
    echo "Please create server/.env with all required environment variables."
    exit 1
fi

if [ "$DEPLOY_METHOD" = "docker" ]; then
    echo "🐳 Deploying with Docker..."
    
    # Build and start containers
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    
    # Show logs
    echo "📋 Container logs:"
    docker-compose logs -f --tail=50
    
elif [ "$DEPLOY_METHOD" = "pm2" ]; then
    echo "⚡ Deploying with PM2..."
    
    # Install PM2 if not installed
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        npm install -g pm2
    fi
    
    # Build frontend
    echo "📦 Building frontend..."
    cd apps/web
    npm ci
    npm run build
    cd ../..
    
    # Install backend dependencies
    echo "📦 Installing backend dependencies..."
    cd server
    npm ci
    npx prisma generate
    npx prisma migrate deploy
    cd ..
    
    # Start with PM2
    pm2 delete event-backend 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    
    echo "✅ Deployment complete!"
    echo "📋 PM2 Status:"
    pm2 status
    
    echo ""
    echo "📝 Useful commands:"
    echo "  pm2 logs event-backend    # View logs"
    echo "  pm2 restart event-backend # Restart backend"
    echo "  pm2 stop event-backend    # Stop backend"
else
    echo "❌ Invalid deployment method. Use 'docker' or 'pm2'"
    exit 1
fi

echo "✅ Deployment complete!"
