# Deployment Guide for Digital Ocean

This guide will help you deploy both the backend and frontend to a Digital Ocean server.

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

### 2. Install Docker (Option 1: Docker Deployment)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 3. Install PM2 (Option 2: PM2 Deployment)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the instructions shown
```

### 4. Install Nginx (For PM2 deployment or custom setup)

```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Install MySQL (If not using Docker)

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

## Deployment Methods

### Method 1: Docker Deployment (Recommended)

#### Step 1: Clone Repository

```bash
cd /var/www
sudo git clone <your-repo-url> event-system
cd event-system
```

#### Step 2: Configure Environment Variables

```bash
# Copy and edit environment file
cp server/.env.example server/.env
nano server/.env
```

Required environment variables:
```env
# Database
DATABASE_URL=mysql://event_user:password@mysql:3306/event_db
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=event_db
MYSQL_USER=event_user
MYSQL_PASSWORD=your_password

# Server
PORT=8080
NODE_ENV=production
WEB_ORIGIN=https://yourdomain.com

# JWT
JWT_SECRET=your_very_secure_jwt_secret_key

# WhatsApp API
WHATSAPP_API_TOKEN=your_whatsapp_token
WHATSAPP_CHANNEL_ID=your_channel_id
```

#### Step 3: Deploy

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy with Docker
./deploy.sh docker
```

#### Step 4: Configure Firewall

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Method 2: PM2 Deployment

#### Step 1: Clone and Setup

```bash
cd /var/www
sudo git clone <your-repo-url> event-system
cd event-system
sudo chown -R $USER:$USER /var/www/event-system
```

#### Step 2: Configure Environment Variables

```bash
cp server/.env.example server/.env
nano server/.env
```

Update `DATABASE_URL` to use `localhost` instead of `mysql`:
```env
DATABASE_URL=mysql://event_user:password@localhost:3306/event_db
```

#### Step 3: Build Frontend

```bash
cd apps/web
npm ci
npm run build
cd ../..
```

#### Step 4: Setup Backend

```bash
cd server
npm ci
npx prisma generate
npx prisma migrate deploy
cd ..
```

#### Step 5: Deploy with PM2

```bash
chmod +x deploy.sh
./deploy.sh pm2
```

#### Step 6: Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/event-system

# Edit the configuration
sudo nano /etc/nginx/sites-available/event-system
# Update server_name with your domain

# Create symlink
sudo ln -s /etc/nginx/sites-available/event-system /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Copy frontend build to web root
sudo mkdir -p /var/www/event-system/dist
sudo cp -r apps/web/dist/* /var/www/event-system/dist/

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

## Updating the Application

### Docker Method

```bash
cd /var/www/event-system
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### PM2 Method

```bash
cd /var/www/event-system
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

# Update frontend files
sudo cp -r apps/web/dist/* /var/www/event-system/dist/
```

## Monitoring and Logs

### Docker

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check container status
docker-compose ps
```

### PM2

```bash
# View logs
pm2 logs event-backend

# Monitor
pm2 monit

# Status
pm2 status

# Restart
pm2 restart event-backend
```

## Database Backups

### Docker

```bash
# Create backup
docker-compose exec mysql mysqldump -u event_user -p event_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T mysql mysql -u event_user -p event_db < backup_file.sql
```

### PM2

```bash
# Create backup
mysqldump -u event_user -p event_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u event_user -p event_db < backup_file.sql
```

## Troubleshooting

### Backend not starting

1. Check logs: `docker-compose logs backend` or `pm2 logs event-backend`
2. Verify environment variables in `server/.env`
3. Check database connection
4. Verify Prisma migrations: `npx prisma migrate status`

### Frontend not loading

1. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
2. Verify Nginx configuration: `sudo nginx -t`
3. Check file permissions: `sudo chown -R www-data:www-data /var/www/event-system/dist`

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
- Check application logs
- Review Nginx error logs
- Verify environment variables
- Test database connectivity
