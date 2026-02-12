# Deployment Files Overview

This directory contains all necessary files for deploying the Event System to Digital Ocean.

## Files Created

### Docker Files
- **`docker-compose.yml`** - Orchestrates MySQL, Backend, and Frontend services
- **`server/Dockerfile`** - Backend container configuration
- **`apps/web/Dockerfile`** - Frontend container with Nginx
- **`.dockerignore`** - Files to exclude from Docker builds

### Deployment Scripts
- **`deploy.sh`** - Main deployment script (supports Docker and PM2)
- **`update-frontend.sh`** - Quick script to update frontend after rebuild

### Configuration Files
- **`ecosystem.config.js`** - PM2 configuration for process management
- **`nginx.conf`** - Nginx configuration for PM2 deployment method

### Documentation
- **`DEPLOYMENT.md`** - Comprehensive deployment guide
- **`QUICK_START.md`** - Quick reference for fast deployment
- **`README_DEPLOYMENT.md`** - This file

## Deployment Methods

### Method 1: Docker (Recommended)
- **Pros**: Isolated environments, easy updates, includes database
- **Cons**: Requires Docker installation
- **Best for**: Production deployments, easy maintenance

### Method 2: PM2 + Nginx
- **Pros**: More control, traditional setup
- **Cons**: Manual database setup required
- **Best for**: Custom configurations, existing infrastructure

## Quick Commands

### Docker Deployment
```bash
./deploy.sh docker
docker-compose logs -f
docker-compose restart
```

### PM2 Deployment
```bash
./deploy.sh pm2
pm2 logs event-backend
pm2 restart event-backend
```

## Environment Variables

Create `server/.env` with:
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `WEB_ORIGIN` - Your domain or IP
- `WHATSAPP_API_TOKEN` - WhatsApp API token
- `WHATSAPP_CHANNEL_ID` - WhatsApp channel ID

See `DEPLOYMENT.md` for complete list.

## Architecture

```
┌─────────────────┐
│   Nginx (80)    │  ← Frontend + API Proxy
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│Frontend│ │Backend│
│(Static)│ │(8080) │
└────────┘ └───┬───┘
               │
          ┌────▼────┐
          │  MySQL  │
          │  (3306) │
          └─────────┘
```

## Next Steps

1. Read `QUICK_START.md` for fastest deployment
2. Follow `DEPLOYMENT.md` for detailed instructions
3. Configure your domain and SSL
4. Setup monitoring and backups

## Support

For issues:
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Review Nginx configuration
