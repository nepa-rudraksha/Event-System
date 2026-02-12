# Complete Deployment Steps for event.nepalirudraksha.com (PM2)

## Server IP: 157.245.103.21

### Step 1: Navigate to Project Directory

```bash
cd /var/www/event-system/secrets-qr-event
```

### Step 2: Create Environment File

```bash
nano server/.env
```

Paste this (replace the placeholder values):

```env
# Database Configuration (use localhost for PM2)
DATABASE_URL=mysql://event_user:ChangeThisPassword123!@localhost:3306/event_db

# Server Configuration
PORT=8080
NODE_ENV=production
WEB_ORIGIN=https://event.nepalirudraksha.com

# JWT Secret (IMPORTANT: Generate a secure random string)
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_STRING_AT_LEAST_32_CHARACTERS_LONG

# WhatsApp API Configuration
WHATSAPP_API_TOKEN=your_whatsapp_api_token_here
WHATSAPP_CHANNEL_ID=your_whatsapp_channel_id_here
```

**To generate JWT_SECRET, run this:**
```bash
openssl rand -base64 32
```

Then copy the output and replace `CHANGE_THIS_TO_A_RANDOM_STRING_AT_LEAST_32_CHARACTERS_LONG` with it.

**Save the file:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Generate JWT Secret (if you haven't)

```bash
openssl rand -base64 32
```

Copy the output and update `JWT_SECRET` in `server/.env`

### Step 4: Make Deploy Script Executable

```bash
chmod +x deploy.sh
```

### Step 5: Deploy with PM2

```bash
./deploy.sh
```

This will take a few minutes. You'll see logs from the deployment process.

**If you see errors, check:**
```bash
pm2 logs event-backend
```

### Step 6: Check if Services are Running

```bash
# Check PM2 status
pm2 status

# Check backend health
curl http://localhost:8080/api/health
```

You should see:
- `event-backend` running in PM2
- Health check returns `{"ok":true}`

### Step 7: Setup Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/event-system

# Create symlink
sudo ln -s /etc/nginx/sites-available/event-system /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 8: Test the Application

```bash
# Test backend health
curl http://localhost:8080/api/health

# Test frontend
curl http://localhost
```

### Step 9: Configure Firewall (if not already done)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw status
```

### Step 10: Configure DNS

Go to your domain registrar (where you manage `nepalirudraksha.com`) and add:

**A Record:**
- **Type:** A
- **Name/Host:** `event`
- **Value/Points to:** `157.245.103.21`
- **TTL:** 3600 (or default)

**Wait 5-15 minutes** for DNS to propagate.

**Test DNS:**
```bash
nslookup event.nepalirudraksha.com
# or
dig event.nepalirudraksha.com
```

### Step 11: Test HTTP Access

Once DNS is working, test:

```bash
curl -I http://event.nepalirudraksha.com
```

Or open in browser: `http://event.nepalirudraksha.com`

### Step 12: Setup SSL Certificate (HTTPS)

**Only do this after DNS is working and HTTP is accessible:**

```bash
# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace email with your email)
sudo certbot --nginx -d event.nepalirudraksha.com --non-interactive --agree-tos --email admin@nepalirudraksha.com
```

Certbot will automatically configure Nginx with SSL.

### Step 13: Update Environment for HTTPS

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

### Step 14: Test HTTPS

```bash
curl -I https://event.nepalirudraksha.com
```

Or open in browser: `https://event.nepalirudraksha.com`

### Step 15: Setup Auto-Renewal for SSL

Certbot sets this up automatically, but verify:

```bash
sudo certbot renew --dry-run
```

## Troubleshooting Commands

```bash
# View PM2 logs
pm2 logs event-backend
pm2 logs event-backend --lines 100

# Check PM2 status
pm2 status

# Restart backend
pm2 restart event-backend

# Monitor resources
pm2 monit

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check if ports are listening
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :443
```

## Quick Checklist

- [ ] Step 1: Navigated to project directory
- [ ] Step 2: Created `server/.env` with all required variables
- [ ] Step 3: Generated and set JWT_SECRET
- [ ] Step 4: Made deploy.sh executable
- [ ] Step 5: Ran `./deploy.sh`
- [ ] Step 6: Verified PM2 is running and backend is healthy
- [ ] Step 7: Configured Nginx
- [ ] Step 8: Tested localhost access
- [ ] Step 9: Configured firewall
- [ ] Step 10: Added DNS A record for event.nepalirudraksha.com
- [ ] Step 11: Tested HTTP access via domain
- [ ] Step 12: Obtained SSL certificate
- [ ] Step 13: Updated WEB_ORIGIN to HTTPS
- [ ] Step 14: Tested HTTPS access
- [ ] Step 15: Verified SSL auto-renewal

## Important Notes

1. **Start with HTTP first**: Use `http://event.nepalirudraksha.com` in `WEB_ORIGIN` initially, then switch to `https://` after SSL is working.

2. **DNS Propagation**: Can take 5-15 minutes (sometimes up to 48 hours). Be patient.

3. **Strong Passwords**: Make sure to use strong passwords for MySQL in your `.env` file.

4. **JWT_SECRET**: Must be at least 32 characters long and random.

5. **WhatsApp Credentials**: Make sure to add your actual WhatsApp API token and channel ID.

6. **Database URL**: Use `localhost` (not `mysql`) in `DATABASE_URL` for PM2 deployment.

## If Something Goes Wrong

1. **Check logs first:**
   ```bash
   pm2 logs event-backend
   ```

2. **Verify environment variables:**
   ```bash
   cat server/.env
   ```

3. **Check if PM2 is running:**
   ```bash
   pm2 status
   ```

4. **Check if Nginx is running:**
   ```bash
   sudo systemctl status nginx
   ```

5. **Restart services:**
   ```bash
   pm2 restart event-backend
   sudo systemctl reload nginx
   ```

6. **If still not working, check database:**
   ```bash
   mysql -u event_user -p event_db
   ```
