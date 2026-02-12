# Deployment Files Overview

This directory contains all necessary files for deploying the Event System to Digital Ocean using PM2.

## Files Created

### Deployment Scripts
- **`deploy.sh`** - Main deployment script for PM2
- **`update-frontend.sh`** - Quick script to update frontend after rebuild

### Configuration Files
- **`ecosystem.config.js`** - PM2 configuration for process management
- **`nginx.conf`** - Nginx configuration for serving frontend and proxying API

### Documentation
- **`DEPLOYMENT.md`** - Comprehensive deployment guide
- **`PM2_DEPLOYMENT.md`** - Detailed PM2 deployment guide
- **`PM2_QUICK_START.md`** - Quick reference for fast deployment
- **`QUICK_START.md`** - Quick start guide
- **`README_DEPLOYMENT.md`** - This file

## Deployment Method

### PM2 + Nginx
- **Pros**: More control, traditional setup, better resource usage
- **Cons**: Manual database setup required
- **Best for**: Production deployments, custom configurations

## Quick Commands

### PM2 Deployment
```bash
./deploy.sh
pm2 logs event-backend
pm2 restart event-backend
pm2 status
```

### Nginx Management
```bash
sudo nginx -t              # Test configuration
sudo systemctl reload nginx # Reload nginx
sudo tail -f /var/log/nginx/error.log  # View errors
```

## Environment Variables

Create `server/.env` with:
- `DATABASE_URL` - MySQL connection string (use `localhost`)
- `JWT_SECRET` - Secret for JWT tokens
- `WEB_ORIGIN` - Your domain or IP
- `WHATSAPP_API_TOKEN` - WhatsApp API token
- `WHATSAPP_CHANNEL_ID` - WhatsApp channel ID

See `DEPLOYMENT.md` for complete list.

## Architecture

```
Internet
   ↓
Nginx (Port 80/443)
   ├── Serves: /var/www/event-system/secrets-qr-event/apps/web/dist
   └── Proxies: /api → localhost:8080
                    ↓
              PM2 Backend (Port 8080)
                    ↓
              MySQL (localhost:3306)
```

## Next Steps

1. Read `PM2_QUICK_START.md` for fastest deployment
2. Follow `PM2_DEPLOYMENT.md` for detailed instructions
3. Configure your domain and SSL
4. Setup monitoring and backups

## Support

For issues:
1. Check application logs: `pm2 logs event-backend`
2. Verify environment variables: `cat server/.env`
3. Test database connectivity: `mysql -u event_user -p event_db`
4. Review Nginx configuration: `sudo nginx -t`
