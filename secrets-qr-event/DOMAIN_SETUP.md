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
./deploy.sh
```

### 5. Setup SSL Certificate (HTTPS)

After DNS is working and the site is accessible via HTTP:

```bash
# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace email with yours)
sudo certbot --nginx -d event.nepalirudraksha.com --non-interactive --agree-tos --email your-email@example.com
```

Certbot will automatically configure Nginx with SSL.

### 6. Update Environment for HTTPS

```bash
nano server/.env
```

Make sure `WEB_ORIGIN` is:
```env
WEB_ORIGIN=https://event.nepalirudraksha.com
```

Then restart backend:
```bash
pm2 restart event-backend
```

### 7. Setup Auto-Renewal for SSL

Certbot sets this up automatically, but verify:

```bash
sudo certbot renew --dry-run
```

## Quick Commands Reference

```bash
# Check if DNS is working
nslookup event.nepalirudraksha.com

# Check if site is accessible
curl -I http://event.nepalirudraksha.com

# View PM2 logs
pm2 logs event-backend

# Restart services
pm2 restart event-backend
sudo systemctl reload nginx

# Update environment and restart
nano server/.env
pm2 restart event-backend
```

## Troubleshooting

### DNS not resolving?
- Wait longer (can take up to 48 hours, usually 5-15 minutes)
- Check DNS settings in your registrar
- Verify A record is correct

### Can't access site?
- Check firewall: `sudo ufw status`
- Allow ports: `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`
- Check if PM2 is running: `pm2 status`
- Check if Nginx is running: `sudo systemctl status nginx`

### SSL certificate issues?
- Make sure DNS is working first
- Ensure port 80 is accessible (needed for verification)
- Check certificate: `sudo certbot certificates`

### CORS errors?
- Make sure `WEB_ORIGIN` in `server/.env` matches your domain exactly
- Restart backend: `pm2 restart event-backend`
