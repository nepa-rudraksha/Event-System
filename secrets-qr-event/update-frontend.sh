#!/bin/bash

# Quick script to update frontend files after build
# Usage: ./update-frontend.sh

set -e

echo "🔄 Updating frontend files..."

# Build frontend
cd apps/web
npm ci
npm run build
cd ../..

# Copy to web root (adjust path if using different deployment method)
if [ -d "/var/www/event-system/dist" ]; then
    echo "📦 Copying files to /var/www/event-system/dist..."
    sudo cp -r apps/web/dist/* /var/www/event-system/dist/
    sudo chown -R www-data:www-data /var/www/event-system/dist
    echo "✅ Frontend updated!"
else
    echo "⚠️  Web root not found. Please update the path in this script."
fi
