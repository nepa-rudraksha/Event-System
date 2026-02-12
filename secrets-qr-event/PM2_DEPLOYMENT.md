# PM2 Deployment Guide for event.nepalirudraksha.com

## Complete Step-by-Step Instructions

### Prerequisites Checklist

- [ ] Ubuntu 22.04+ server
- [ ] Root or sudo access
- [ ] Domain DNS configured (event.nepalirudraksha.com → 157.245.103.21)
- [ ] Code pulled from GitHub to `/var/www/event-system/secrets-qr-event`

---

## Step 1: Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install MySQL
sudo apt install -y mysql-server

# Install Nginx
sudo apt install -y nginx

# Install build tools (for native modules)
sudo apt install -y build-essential

# Verify installations
node --version  # Should be v20.x
npm --version
pm2 --version
mysql --version
nginx -v
```

---

## Step 2: Setup MySQL Database

```bash
# Secure MySQL installation
sudo mysql_secure_installation
# Follow prompts: Set root password, remove anonymous users, etc.

# Login to MySQL
sudo mysql -u root -p
```

In MySQL, run:

```sql
CREATE DATABASE event_db;
CREATE USER 'event_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON event_db.* TO 'event_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Note:** Remember the password you set for `event_user` - you'll need it in the `.env` file.

---

## Step 3: Navigate to Project Directory

```bash
cd /var/www/event-system/secrets-qr-event
```

---

## Step 4: Create Environment File

```bash
nano server/.env
```

Paste this configuration (replace with your actual values):

```env
# Database Configuration (use localhost for PM2)
DATABASE_URL=mysql://event_user:YourSecurePassword123!@localhost:3306/event_db

# Server Configuration
PORT=8080
NODE_ENV=production
WEB_ORIGIN=https://event.nepalirudraksha.com

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=REPLACE_WITH_GENERATED_SECRET

# WhatsApp API Configuration
WHATSAPP_API_TOKEN=your_whatsapp_api_token
WHATSAPP_CHANNEL_ID=your_whatsapp_channel_id
```

**Important:**
- Use `localhost` in `DATABASE_URL` (not `mysql`)
- Replace `YourSecurePassword123!` with the MySQL password you set
- Generate JWT_SECRET (see next step)

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Generate JWT Secret

```bash
openssl rand -base64 32
```

Copy the output, then:

```bash
nano server/.env
```

Replace `REPLACE_WITH_GENERATED_SECRET` with the generated value. Save again.

---

## Step 6: Deploy Application

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy with PM2
./deploy.sh pm2
```

This will:
- Build the frontend
- Install backend dependencies
- Generate Prisma client
- Run database migrations
- Start backend with PM2

**Wait for it to complete** (may take a few minutes).

---

## Step 7: Verify Backend is Running

```bash
# Check PM2 status
pm2 status

# Check if backend is responding
curl http://localhost:8080/api/health

# View logs
pm2 logs event-backend --lines 50
```

You should see:
- PM2 shows `event-backend` as `online`
- Health check returns `{"ok":true}`

---

## Step 8: Setup Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/event-system

# Edit to verify paths (optional)
sudo nano /etc/nginx/sites-available/event-system
```

Make sure the `root` path is:
```
root /var/www/event-system/secrets-qr-event/apps/web/dist;
```

And `server_name` is:
```
server_name event.nepalirudraksha.com _;
```

Save and exit.

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/event-system /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

---

## Step 9: Configure Firewall

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 10: Configure DNS

In your domain registrar, add an A record:

- **Type:** A
- **Name:** `event`
- **Value:** `157.245.103.21`
- **TTL:** 3600

Wait 5-15 minutes for DNS propagation, then test:

```bash
nslookup event.nepalirudraksha.com
```

---

## Step 11: Test HTTP Access

```bash
# Test from server
curl -I http://event.nepalirudraksha.com

# Or open in browser
# http://event.nepalirudraksha.com
```

---

## Step 12: Setup SSL Certificate (HTTPS)

**Only do this after HTTP is working:**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace email)
sudo certbot --nginx -d event.nepalirudraksha.com --non-interactive --agree-tos --email admin@nepalirudraksha.com

# Certbot will automatically update nginx config
```

---

## Step 13: Update Environment for HTTPS

```bash
nano server/.env
```

Change `WEB_ORIGIN` to:
```env
WEB_ORIGIN=https://event.nepalirudraksha.com
```

Then restart backend:

```bash
pm2 restart event-backend
```

---

## Step 14: Test HTTPS

```bash
curl -I https://event.nepalirudraksha.com
```

Or open: `https://event.nepalirudraksha.com` in your browser.

---

## Step 15: Setup SSL Auto-Renewal

Certbot sets this up automatically, but verify:

```bash
sudo certbot renew --dry-run
```

---

## Useful Commands

### PM2 Management

```bash
# View status
pm2 status

# View logs
pm2 logs event-backend
pm2 logs event-backend --lines 100

# Restart
pm2 restart event-backend

# Stop
pm2 stop event-backend

# Monitor resources
pm2 monit

# View info
pm2 info event-backend
```

### Nginx Management

```bash
# Test configuration
sudo nginx -t

# Reload (no downtime)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Frontend Updates

```bash
cd /var/www/event-system/secrets-qr-event

# Rebuild frontend
cd apps/web
npm ci
npm run build
cd ../..

# Copy to nginx location (if needed)
# The dist folder is already in the right place
```

### Backend Updates

```bash
cd /var/www/event-system/secrets-qr-event

# Pull latest code
git pull

# Update dependencies
cd server
npm ci
npx prisma generate
npx prisma migrate deploy
cd ..

# Restart PM2
pm2 restart event-backend
```

---

## Troubleshooting

### Backend not starting?

```bash
# Check PM2 logs
pm2 logs event-backend --lines 100

# Check if port is in use
sudo netstat -tlnp | grep :8080

# Check environment variables
cat server/.env

# Test database connection
cd server
npx prisma db pull
```

### Frontend not loading?

```bash
# Check if dist folder exists
ls -la apps/web/dist

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify nginx config
sudo nginx -t

# Check file permissions
sudo chown -R www-data:www-data /var/www/event-system/secrets-qr-event/apps/web/dist
```

### Database connection errors?

```bash
# Test MySQL connection
mysql -u event_user -p event_db

# Check MySQL is running
sudo systemctl status mysql

# Check database exists
sudo mysql -u root -p
# Then: SHOW DATABASES;
```

### CORS errors?

```bash
# Verify WEB_ORIGIN in .env matches your domain
cat server/.env | grep WEB_ORIGIN

# Restart backend
pm2 restart event-backend
```

---

## Quick Deployment Checklist

- [ ] Installed Node.js, PM2, MySQL, Nginx
- [ ] Created MySQL database and user
- [ ] Created `server/.env` with correct values
- [ ] Generated and set JWT_SECRET
- [ ] Ran `./deploy.sh pm2`
- [ ] Verified backend is running (`pm2 status`)
- [ ] Configured Nginx
- [ ] Tested HTTP access
- [ ] Configured DNS
- [ ] Setup SSL certificate
- [ ] Updated WEB_ORIGIN to HTTPS
- [ ] Tested HTTPS access

---

## Architecture Overview

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

---

## Next Steps After Deployment

1. **Monitor logs regularly:**
   ```bash
   pm2 logs event-backend
   ```

2. **Setup monitoring** (optional):
   ```bash
   pm2 install pm2-logrotate
   ```

3. **Regular backups:**
   ```bash
   mysqldump -u event_user -p event_db > backup_$(date +%Y%m%d).sql
   ```

4. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade
   ```

---

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs event-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify environment variables: `cat server/.env`
4. Test database connection
5. Verify DNS is working: `nslookup event.nepalirudraksha.com`
