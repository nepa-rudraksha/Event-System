# Quick Start Deployment Guide (PM2)

## Prerequisites Checklist

- [ ] Digital Ocean Droplet (Ubuntu 22.04)
- [ ] Domain name configured (optional)
- [ ] SSH access to server
- [ ] Environment variables ready

## Fastest Deployment

### 1. Connect to Server

```bash
ssh root@your_server_ip
```

### 2. Install Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2, MySQL, Nginx
sudo npm install -g pm2
sudo apt install -y mysql-server nginx build-essential
```

### 3. Setup MySQL Database

```bash
# Secure MySQL
sudo mysql_secure_installation

# Create database
sudo mysql -u root -p
```

```sql
CREATE DATABASE event_db;
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'YourPassword123!';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Clone Repository

```bash
cd /var/www
git clone <your-repo-url> event-system
cd event-system/secrets-qr-event
```

### 5. Setup Environment

```bash
# Create .env file
nano server/.env
```

Paste this template and fill in your values:

```env
DATABASE_URL=mysql://event_user:YourPassword123!@localhost:3306/event_db
PORT=8080
NODE_ENV=production
WEB_ORIGIN=https://event.nepalirudraksha.com
JWT_SECRET=generate_a_very_long_random_string_here
WHATSAPP_API_TOKEN=your_token
WHATSAPP_CHANNEL_ID=your_channel_id
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

### 6. Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

### 7. Setup Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/event-system
sudo ln -s /etc/nginx/sites-available/event-system /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 9. Access Application

- Frontend: `http://your_server_ip`
- Backend API: `http://your_server_ip/api`
- Health Check: `http://your_server_ip/api/health`

## Post-Deployment

### Check Status

```bash
pm2 status
pm2 logs event-backend
```

### Setup SSL (Optional but Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d event.nepalirudraksha.com
```

## Troubleshooting

**Can't access the site?**
- Check firewall: `sudo ufw status`
- Allow ports: `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`
- Check if services are running: `pm2 status`

**Backend errors?**
- Check logs: `pm2 logs event-backend`
- Verify `.env` file has all required variables
- Check database connection: `mysql -u event_user -p event_db`

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

For detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md) or [PM2_DEPLOYMENT.md](./PM2_DEPLOYMENT.md)
