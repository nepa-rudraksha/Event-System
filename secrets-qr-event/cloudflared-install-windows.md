# Installing Cloudflared on Windows

## Option 1: Run PowerShell as Administrator (Recommended)

1. Right-click on PowerShell
2. Select "Run as Administrator"
3. Run the installation command:
```powershell
choco install cloudflared
```

## Option 2: Manual Download (No Admin Required)

1. Download the Windows executable from:
   https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe

2. Rename it to `cloudflared.exe`

3. Place it in a folder (e.g., `C:\cloudflared\`)

4. Add to PATH:
   - Open System Properties → Environment Variables
   - Edit "Path" in User variables
   - Add: `C:\cloudflared`
   - Click OK

5. Or use it directly from the folder:
```powershell
C:\cloudflared\cloudflared.exe tunnel --url http://localhost:5173
```

## Option 3: Using Scoop (Alternative Package Manager)

If you have Scoop installed:
```powershell
scoop install cloudflared
```

## Option 4: Direct Download and Use (Quickest)

1. Download: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe

2. Rename to `cloudflared.exe` and place in your project folder or any convenient location

3. Use it directly:
```powershell
.\cloudflared.exe tunnel --url http://localhost:5173
```

Or from the full path:
```powershell
D:\Main Codes\Event System\cloudflared.exe tunnel --url http://localhost:5173
```

## Verify Installation

After installation, verify it works:
```powershell
cloudflared --version
```

## Quick Start

Once installed, start the tunnel:
```powershell
cloudflared tunnel --url http://localhost:5173
```

You'll see output like:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
|  https://xyz-1234.trycloudflare.com                                                       |
+--------------------------------------------------------------------------------------------+
```
