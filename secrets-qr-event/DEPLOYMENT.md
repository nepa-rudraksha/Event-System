# Deployment Guide for Digital Ocean (PM2)

This guide will help you deploy both the backend and frontend to a Digital Ocean server using PM2.

## Prerequisites

- Digital Ocean Droplet (Ubuntu 22.04 LTS recommended)
- Domain name (optional, but recommended)
- SSH access to your server
- Basic knowledge of Linux commands

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget build-essential

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the instructions shown
```

### 3. Install Nginx

```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. Install MySQL

```bash
sudo apt install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE event_db;
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Deployment Steps

### Step 1: Clone Repository

```bash
cd /var/www
sudo git clone <your-repo-url> event-system
cd event-system/secrets-qr-event
sudo chown -R $USER:$USER /var/www/event-system
```

### Step 2: Configure Environment Variables

```bash
# Create environment file
nano server/.env
```

Required environment variables:
```env
# Database (use localhost for PM2)
DATABASE_URL=mysql://event_user:password@localhost:3306/event_db

# Server
PORT=8080
NODE_ENV=production
WEB_ORIGIN=https://event.nepalirudraksha.com

# JWT
JWT_SECRET=your_very_secure_jwt_secret_key

# WhatsApp API
WHATSAPP_API_TOKEN=your_whatsapp_token
WHATSAPP_CHANNEL_ID=your_channel_id
```

**Important:** Use `localhost` in `DATABASE_URL` (not `mysql`).

### Step 3: Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy with PM2
./deploy.sh
```

This will:
- Build the frontend
- Install backend dependencies
- Generate Prisma client
- Run database migrations
- Start backend with PM2

### Step 4: Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/event-system

# Edit the configuration (optional, to verify paths)
sudo nano /etc/nginx/sites-available/event-system

# Create symlink
sudo ln -s /etc/nginx/sites-available/event-system /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Configure Firewall

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d event.nepalirudraksha.com

# Auto-renewal is set up automatically
```

## Updating the Application

```bash
cd /var/www/event-system/secrets-qr-event

# Pull latest code
git pull

# Rebuild frontend
cd apps/web
npm ci
npm run build
cd ../..

# Update backend
cd server
npm ci
npx prisma generate
npx prisma migrate deploy
cd ..

# Restart PM2
pm2 restart event-backend
```

## Monitoring and Logs

```bash
# View logs
pm2 logs event-backend

# Monitor
pm2 monit

# Status
pm2 status

# Restart
pm2 restart event-backend

# View last 100 lines
pm2 logs event-backend --lines 100
```

## Database Backups

```bash
# Create backup
mysqldump -u event_user -p event_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u event_user -p event_db < backup_file.sql
```

## Troubleshooting

### Backend not starting

1. Check logs: `pm2 logs event-backend`
2. Verify environment variables in `server/.env`
3. Check database connection: `mysql -u event_user -p event_db`
4. Verify Prisma migrations: `npx prisma migrate status`

### Frontend not loading

1. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
2. Verify Nginx configuration: `sudo nginx -t`
3. Check file permissions: `sudo chown -R www-data:www-data /var/www/event-system/secrets-qr-event/apps/web/dist`
4. Verify dist folder exists: `ls -la apps/web/dist`

### Database connection issues

1. Verify MySQL is running: `sudo systemctl status mysql`
2. Check database credentials in `.env`
3. Test connection: `mysql -u event_user -p event_db`

### Port already in use

```bash
# Find process using port
sudo lsof -i :80
sudo lsof -i :8080

# Kill process if needed
sudo kill -9 <PID>
```

## Security Checklist

- [ ] Change default MySQL root password
- [ ] Use strong JWT_SECRET
- [ ] Enable firewall (UFW)
- [ ] Setup SSL certificate
- [ ] Keep system updated: `sudo apt update && sudo apt upgrade`
- [ ] Use strong passwords for all services
- [ ] Restrict SSH access (disable root login, use keys)
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity

## Performance Optimization

1. **Enable Nginx caching** (already configured in nginx.conf)
2. **Use PM2 cluster mode** (already configured in ecosystem.config.js)
3. **Database indexing** (ensure Prisma indexes are applied)
4. **CDN for static assets** (optional, for high traffic)

## Support

For issues or questions:
- Check application logs: `pm2 logs event-backend`
- Review Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify environment variables: `cat server/.env`
- Test database connectivity: `mysql -u event_user -p event_db`
