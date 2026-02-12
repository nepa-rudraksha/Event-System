# Quick Start Deployment Guide

## Prerequisites Checklist

- [ ] Digital Ocean Droplet (Ubuntu 22.04)
- [ ] Domain name configured (optional)
- [ ] SSH access to server
- [ ] Environment variables ready

## Fastest Deployment (Docker - Recommended)

### 1. Connect to Server

```bash
ssh root@your_server_ip
```

### 2. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install -y docker-compose-plugin
```

### 3. Clone Repository

```bash
cd /var/www
git clone <your-repo-url> event-system
cd event-system
```

### 4. Setup Environment

```bash
# Create .env file
nano server/.env
```

Paste this template and fill in your values:

```env
DATABASE_URL=mysql://event_user:password@mysql:3306/event_db
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=event_db
MYSQL_USER=event_user
MYSQL_PASSWORD=your_secure_password
PORT=8080
NODE_ENV=production
WEB_ORIGIN=http://your_server_ip
JWT_SECRET=generate_a_very_long_random_string_here
WHATSAPP_API_TOKEN=your_token
WHATSAPP_CHANNEL_ID=your_channel_id
```

### 5. Deploy

```bash
chmod +x deploy.sh
./deploy.sh docker
```

### 6. Access Application

- Frontend: `http://your_server_ip`
- Backend API: `http://your_server_ip/api`
- Health Check: `http://your_server_ip/api/health`

## Alternative: PM2 Deployment

### 1. Install Node.js and PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. Install MySQL

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

### 3. Setup Database

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE event_db;
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Clone and Configure

```bash
cd /var/www
git clone <your-repo-url> event-system
cd event-system
nano server/.env
```

Update `DATABASE_URL` to use `localhost`:
```env
DATABASE_URL=mysql://event_user:password@localhost:3306/event_db
```

### 5. Deploy

```bash
chmod +x deploy.sh
./deploy.sh pm2
```

### 6. Setup Nginx

```bash
sudo apt install -y nginx
sudo cp nginx.conf /etc/nginx/sites-available/event-system
sudo ln -s /etc/nginx/sites-available/event-system /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo mkdir -p /var/www/event-system/dist
sudo cp -r apps/web/dist/* /var/www/event-system/dist/
sudo nginx -t
sudo systemctl reload nginx
```

## Post-Deployment

### Check Status

**Docker:**
```bash
docker-compose ps
docker-compose logs -f
```

**PM2:**
```bash
pm2 status
pm2 logs event-backend
```

### Setup SSL (Optional but Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Troubleshooting

**Can't access the site?**
- Check firewall: `sudo ufw status`
- Allow ports: `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`
- Check if services are running

**Backend errors?**
- Check logs: `docker-compose logs backend` or `pm2 logs event-backend`
- Verify `.env` file has all required variables
- Check database connection

**Frontend not loading?**
- Verify build completed: `ls apps/web/dist`
- Check Nginx: `sudo nginx -t`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

## Next Steps

1. Configure your domain DNS to point to server IP
2. Setup SSL certificate
3. Configure backup strategy
4. Monitor logs regularly
5. Review security settings

For detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md)
