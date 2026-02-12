# Domain Setup Guide for event.nepalirudraksha.com

## Step-by-Step Instructions

### 1. Configure DNS

In your domain registrar (where you manage nepalirudraksha.com), add an A record:

```
Type: A
Name: event
Value: 157.245.103.21  (your server IP)
TTL: 3600 (or default)
```

**Wait 5-15 minutes** for DNS to propagate. You can check with:
```bash
nslookup event.nepalirudraksha.com
# or
dig event.nepalirudraksha.com
```

### 2. Navigate to Project Directory

```bash
cd /var/www/event-system/secrets-qr-event
```

### 3. Update Environment File

```bash
nano server/.env
```

Make sure `WEB_ORIGIN` is set to:
```env
WEB_ORIGIN=https://event.nepalirudraksha.com
```

Or if you want to test with HTTP first:
```env
WEB_ORIGIN=http://event.nepalirudraksha.com
```

### 4. Deploy Application

```bash
chmod +x deploy.sh
./deploy.sh docker
```

### 5. Setup SSL Certificate (HTTPS)

After DNS is working and the site is accessible via HTTP:

```bash
# Install Certbot
sudo apt update
sudo apt install -y certbot

# Stop any nginx running on host (Docker nginx will handle it)
sudo systemctl stop nginx 2>/dev/null || true

# Get certificate (replace email with yours)
sudo certbot certonly --standalone -d event.nepalirudraksha.com --non-interactive --agree-tos --email your-email@example.com

# Copy certificates to project
mkdir -p nginx-ssl
sudo cp /etc/letsencrypt/live/event.nepalirudraksha.com/fullchain.pem nginx-ssl/
sudo cp /etc/letsencrypt/live/event.nepalirudraksha.com/privkey.pem nginx-ssl/
sudo chmod 644 nginx-ssl/fullchain.pem
sudo chmod 600 nginx-ssl/privkey.pem
```

### 6. Update Frontend Container with SSL

Create a custom nginx config with SSL:

```bash
# Copy the SSL nginx config
cp nginx-ssl.conf nginx-ssl/nginx.conf

# Rebuild frontend container
docker-compose build frontend
docker-compose up -d frontend
```

Or manually update the nginx config inside the container:

```bash
# Copy SSL config into container
docker cp nginx-ssl.conf event-frontend:/etc/nginx/conf.d/default.conf

# Restart container
docker-compose restart frontend
```

### 7. Setup Auto-Renewal for SSL

```bash
# Add to crontab
sudo crontab -e
```

Add this line:
```
0 3 * * * certbot renew --quiet && docker cp /etc/letsencrypt/live/event.nepalirudraksha.com/fullchain.pem event-frontend:/etc/nginx/ssl/fullchain.pem && docker cp /etc/letsencrypt/live/event.nepalirudraksha.com/privkey.pem event-frontend:/etc/nginx/ssl/privkey.pem && docker-compose restart frontend
```

## Quick Commands Reference

```bash
# Check if DNS is working
nslookup event.nepalirudraksha.com

# Check if site is accessible
curl -I http://event.nepalirudraksha.com

# View container logs
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Update environment and restart
nano server/.env
docker-compose restart backend
```

## Troubleshooting

### DNS not resolving?
- Wait longer (can take up to 48 hours, usually 5-15 minutes)
- Check DNS settings in your registrar
- Verify A record is correct

### Can't access site?
- Check firewall: `sudo ufw status`
- Allow ports: `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`
- Check if containers are running: `docker-compose ps`

### SSL certificate issues?
- Make sure DNS is working first
- Ensure port 80 is accessible (needed for verification)
- Check certificate: `sudo certbot certificates`

### CORS errors?
- Make sure `WEB_ORIGIN` in `server/.env` matches your domain exactly
- Restart backend: `docker-compose restart backend`
