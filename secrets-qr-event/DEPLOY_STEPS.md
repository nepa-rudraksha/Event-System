# Complete Deployment Steps for event.nepalirudraksha.com

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
# Database Configuration
DATABASE_URL=mysql://event_user:ChangeThisPassword123!@mysql:3306/event_db
MYSQL_ROOT_PASSWORD=ChangeThisRootPassword123!
MYSQL_DATABASE=event_db
MYSQL_USER=event_user
MYSQL_PASSWORD=ChangeThisPassword123!

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

**To generate JWT_SECRET, run this in another terminal:**
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

### Step 5: Deploy with Docker

```bash
./deploy.sh docker
```

This will take a few minutes. You'll see logs from all services.

**If you see errors, check:**
```bash
docker-compose logs
```

### Step 6: Check if Services are Running

```bash
docker-compose ps
```

You should see 3 containers:
- `event-mysql` (running)
- `event-backend` (running)
- `event-frontend` (running)

### Step 7: Test the Application

```bash
# Test backend health
curl http://localhost/api/health

# Test frontend
curl http://localhost
```

### Step 8: Configure Firewall (if not already done)

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw status
```

### Step 9: Configure DNS

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

### Step 10: Test HTTP Access

Once DNS is working, test:

```bash
curl -I http://event.nepalirudraksha.com
```

Or open in browser: `http://event.nepalirudraksha.com`

### Step 11: Setup SSL Certificate (HTTPS)

**Only do this after DNS is working and HTTP is accessible:**

```bash
# Install Certbot
sudo apt update
sudo apt install -y certbot

# Stop any nginx on host (Docker handles nginx)
sudo systemctl stop nginx 2>/dev/null || true

# Get SSL certificate (replace email with your email)
sudo certbot certonly --standalone -d event.nepalirudraksha.com --non-interactive --agree-tos --email admin@nepalirudraksha.com

# Create directory for SSL certificates
mkdir -p nginx-ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/event.nepalirudraksha.com/fullchain.pem nginx-ssl/
sudo cp /etc/letsencrypt/live/event.nepalirudraksha.com/privkey.pem nginx-ssl/
sudo chmod 644 nginx-ssl/fullchain.pem
sudo chmod 600 nginx-ssl/privkey.pem
```

### Step 12: Update Frontend Container with SSL

```bash
# Copy SSL nginx config into container
docker cp nginx-ssl.conf event-frontend:/etc/nginx/conf.d/default.conf

# Restart frontend container
docker-compose restart frontend
```

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
docker-compose restart backend
```

### Step 14: Test HTTPS

```bash
curl -I https://event.nepalirudraksha.com
```

Or open in browser: `https://event.nepalirudraksha.com`

### Step 15: Setup Auto-Renewal for SSL

```bash
sudo crontab -e
```

Add this line at the end:
```
0 3 * * * certbot renew --quiet && docker cp /etc/letsencrypt/live/event.nepalirudraksha.com/fullchain.pem event-frontend:/etc/nginx/ssl/fullchain.pem && docker cp /etc/letsencrypt/live/event.nepalirudraksha.com/privkey.pem event-frontend:/etc/nginx/ssl/privkey.pem && docker-compose restart frontend
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

## Troubleshooting Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend

# Stop everything
docker-compose down

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check container status
docker-compose ps

# Check if ports are listening
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

## Quick Checklist

- [ ] Step 1: Navigated to project directory
- [ ] Step 2: Created `server/.env` with all required variables
- [ ] Step 3: Generated and set JWT_SECRET
- [ ] Step 4: Made deploy.sh executable
- [ ] Step 5: Ran `./deploy.sh docker`
- [ ] Step 6: Verified all 3 containers are running
- [ ] Step 7: Tested localhost access
- [ ] Step 8: Configured firewall
- [ ] Step 9: Added DNS A record for event.nepalirudraksha.com
- [ ] Step 10: Tested HTTP access via domain
- [ ] Step 11: Obtained SSL certificate
- [ ] Step 12: Updated frontend container with SSL config
- [ ] Step 13: Updated WEB_ORIGIN to HTTPS
- [ ] Step 14: Tested HTTPS access
- [ ] Step 15: Setup SSL auto-renewal

## Important Notes

1. **Start with HTTP first**: Use `http://event.nepalirudraksha.com` in `WEB_ORIGIN` initially, then switch to `https://` after SSL is working.

2. **DNS Propagation**: Can take 5-15 minutes (sometimes up to 48 hours). Be patient.

3. **Strong Passwords**: Make sure to use strong passwords for MySQL in your `.env` file.

4. **JWT_SECRET**: Must be at least 32 characters long and random.

5. **WhatsApp Credentials**: Make sure to add your actual WhatsApp API token and channel ID.

## If Something Goes Wrong

1. **Check logs first:**
   ```bash
   docker-compose logs -f
   ```

2. **Verify environment variables:**
   ```bash
   cat server/.env
   ```

3. **Check if containers are running:**
   ```bash
   docker-compose ps
   ```

4. **Restart everything:**
   ```bash
   docker-compose restart
   ```

5. **If still not working, rebuild:**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```
