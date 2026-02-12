# PM2 Quick Start - event.nepalirudraksha.com

## Fast Deployment Steps

### 1. Install Prerequisites

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2, MySQL, Nginx
sudo npm install -g pm2
sudo apt install -y mysql-server nginx build-essential
```

### 2. Setup MySQL

```bash
sudo mysql_secure_installation
sudo mysql -u root -p
```

```sql
CREATE DATABASE event_db;
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'YourPassword123!';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Navigate to Project

```bash
cd /var/www/event-system/secrets-qr-event
```

### 4. Create .env File

```bash
nano server/.env
```

```env
DATABASE_URL=mysql://event_user:YourPassword123!@localhost:3306/event_db
PORT=8080
NODE_ENV=production
WEB_ORIGIN=https://event.nepalirudraksha.com
JWT_SECRET=$(openssl rand -base64 32)
WHATSAPP_API_TOKEN=your_token
WHATSAPP_CHANNEL_ID=your_channel_id
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

### 5. Deploy

```bash
chmod +x deploy.sh
./deploy.sh pm2
```

### 6. Setup Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/event-system
sudo ln -s /etc/nginx/sites-available/event-system /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Configure Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 8. Configure DNS

Add A record: `event` → `157.245.103.21`

### 9. Setup SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d event.nepalirudraksha.com
```

### 10. Update .env for HTTPS

```bash
nano server/.env
# Change WEB_ORIGIN to https://event.nepalirudraksha.com
pm2 restart event-backend
```

## Done! 🎉

Your site should be live at: `https://event.nepalirudraksha.com`

## Quick Commands

```bash
pm2 status              # Check backend status
pm2 logs event-backend  # View logs
pm2 restart event-backend # Restart backend
sudo nginx -t           # Test nginx config
sudo systemctl reload nginx # Reload nginx
```
