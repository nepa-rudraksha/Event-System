# Tunnel Setup Guide: Ngrok + Cloudflare Tunnel

## Prerequisites
- Both backend (port 8080) and frontend (port 5173) servers should be running
- Ngrok installed and authenticated
- Cloudflare Tunnel (cloudflared) installed

## Option 1: Ngrok for Backend + Cloudflare for Frontend (Recommended)

### Step 1: Start Cloudflare Tunnel for Frontend

**Terminal 1** - Frontend via Cloudflare Tunnel:
```bash
cloudflared tunnel --url http://localhost:5173
```

This will give you a URL like: `https://xyz-1234.trycloudflare.com`

### Step 2: Start Ngrok Tunnel for Backend

**Terminal 2** - Backend via Ngrok:
```bash
ngrok http 8080
```

This will give you a URL like: `https://abc123.ngrok-free.dev`

### Step 3: Configure Frontend to Use Ngrok Backend

Add to `apps/web/.env`:
```env
VITE_API_URL=https://abc123.ngrok-free.dev/api
```

---

## Option 2: Cloudflare for Backend + Ngrok for Frontend

### Step 1: Start Cloudflare Tunnel for Backend

**Terminal 1** - Backend via Cloudflare Tunnel:
```bash
cloudflared tunnel --url http://localhost:8080
```

This will give you a URL like: `https://abc-5678.trycloudflare.com`

### Step 2: Start Ngrok Tunnel for Frontend

**Terminal 2** - Frontend via Ngrok:
```bash
ngrok http 5173
```

This will give you a URL like: `https://xyz789.ngrok-free.dev`

### Step 3: Configure Frontend to Use Cloudflare Backend

Add to `apps/web/.env`:
```env
VITE_API_URL=https://abc-5678.trycloudflare.com/api
```

## Installing Cloudflare Tunnel

If you don't have cloudflared installed:

**Windows:**
```powershell
# Option 1: Using Chocolatey (Run PowerShell as Administrator)
choco install cloudflared

# Option 2: Manual Download (No Admin Required)
# Download from: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
# Rename to cloudflared.exe and use directly or add to PATH

# Option 3: Quick Download and Use
# Download the .exe, place it in your project folder, and run:
.\cloudflared.exe tunnel --url http://localhost:5173
```

See `cloudflared-install-windows.md` for detailed Windows installation instructions.

**Mac:**
```bash
brew install cloudflared
```

**Linux:**
```bash
# Download from Cloudflare or use package manager
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

## Benefits of This Setup

- **Cloudflare Tunnel**: Free, no URL changes (with named tunnels), faster, no bandwidth limits
- **Ngrok**: Easy setup, good for quick testing, free tier available
- **Mix**: Use the best of both worlds - stable frontend with Cloudflare, flexible backend with Ngrok

## Step 4: Update CORS Configuration

The server's CORS is already configured to allow:
- Ngrok domains (`.ngrok-free.dev` and `.ngrok.io`)
- Cloudflare Tunnel domains (`.trycloudflare.com` and `.cfargotunnel.com`)

If you need to add more Cloudflare domains, update `server/src/main.ts`:
```typescript
origin.includes(".trycloudflare.com") || origin.includes(".cfargotunnel.com")
```

## Step 5: Restart Frontend Dev Server

After setting `VITE_API_URL`, restart your frontend dev server:

```bash
cd apps/web
npm run dev
```

## Step 6: Access Your Application

**Option 1 (Ngrok Backend + Cloudflare Frontend):**
- Frontend: Use Cloudflare URL (e.g., `https://xyz-1234.trycloudflare.com`)
- Backend API: Accessible at `https://abc123.ngrok-free.dev/api`

**Option 2 (Cloudflare Backend + Ngrok Frontend):**
- Frontend: Use Ngrok URL (e.g., `https://xyz789.ngrok-free.dev`)
- Backend API: Accessible at `https://abc-5678.trycloudflare.com/api`

## Important Notes

1. **Ngrok Free Tier**: URLs change every time you restart ngrok. You'll need to update `VITE_API_URL` each time.

2. **Ngrok Paid Tier**: You can get static domains that don't change.

3. **Environment Variables**: Make sure to restart the frontend dev server after changing `VITE_API_URL`.

4. **CORS**: The backend is already configured to accept requests from ngrok domains.

5. **WebSocket**: Socket.IO connections should also work through ngrok.

## Quick Script (Optional)

You can create a script to start both tunnels:

**start-ngrok.sh** (Linux/Mac):
```bash
#!/bin/bash
# Start backend tunnel
ngrok http 8080 --log=stdout > ngrok-backend.log &
# Start frontend tunnel  
ngrok http 5173 --log=stdout > ngrok-frontend.log &
echo "Ngrok tunnels started. Check the logs for URLs."
```

**start-ngrok.ps1** (Windows PowerShell):
```powershell
# Start backend tunnel
Start-Process ngrok -ArgumentList "http 8080" -WindowStyle Normal
# Start frontend tunnel
Start-Process ngrok -ArgumentList "http 5173" -WindowStyle Normal
Write-Host "Ngrok tunnels started. Check the windows for URLs."
```
