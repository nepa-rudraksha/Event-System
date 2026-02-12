#!/bin/bash

# Script to setup domain and SSL for event.nepalirudraksha.com

set -e

DOMAIN="event.nepalirudraksha.com"
EMAIL="your-email@example.com"  # Change this to your email

echo "🌐 Setting up domain: $DOMAIN"

# Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot
fi

# Create directory for SSL certificates
mkdir -p nginx-ssl

# Stop nginx if running (we'll use certbot standalone mode)
sudo systemctl stop nginx 2>/dev/null || true

# Get SSL certificate
echo "🔒 Getting SSL certificate..."
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# Copy certificates to project directory
echo "📋 Copying certificates..."
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx-ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx-ssl/
sudo chmod 644 nginx-ssl/fullchain.pem
sudo chmod 600 nginx-ssl/privkey.pem

# Update nginx config in Dockerfile (or create custom nginx config)
echo "✅ SSL certificates ready!"
echo ""
echo "📝 Next steps:"
echo "1. Update server/.env with: WEB_ORIGIN=https://$DOMAIN"
echo "2. Rebuild frontend container: docker-compose build frontend"
echo "3. Restart: docker-compose up -d"
echo ""
echo "🔄 To auto-renew certificates, add to crontab:"
echo "0 3 * * * certbot renew --quiet && docker-compose restart frontend"
