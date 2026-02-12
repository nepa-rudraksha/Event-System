# Secrets of Rudraksha - Complete System Process Flow

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- MySQL database running (or use remote DB)
- npm/yarn package manager

### Initial Setup

1. **Database Setup**
   ```bash
   cd secrets-qr-event/server
   # Update .env with your DATABASE_URL
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run seed
   ```
   This creates:
   - Database schema
   - Admin user: `admin@neparudraksha.com` / `Admin@12345`
   - Sample event with slug `bangalore`

2. **Start Backend Server**
   ```bash
   cd secrets-qr-event/server
   npm run dev
   ```
   Server runs on `http://localhost:8080`

3. **Start Frontend**
   ```bash
   cd secrets-qr-event/apps/web
   npm install
   npm run dev
   ```
   Frontend runs on `http://localhost:5173` (or next available port)

---

## 📱 Visitor Flow (Mobile-First)

### Entry Point
1. **QR Code Scan** → Opens `/e/bangalore`
2. **Welcome Screen** → Shows event details, "Start My Journey" CTA
3. **Registration (2 Steps)**
   - Step 1: Name + WhatsApp + OTP verification
   - Step 2: Email + Customer type + WhatsApp consent
4. **Dashboard** → Main hub with:
   - Token status strip (if booked)
   - Announcements carousel
   - Quick actions (Book Consultation, View Exhibits)
   - Itinerary preview
   - Profile section

### Consultation Flow
1. **Book Token** → `/e/bangalore/consultation`
   - Click "Get My Token Now"
   - Token number assigned
   - Live queue updates via WebSocket
2. **Update Birth Details** → `/e/bangalore/consultation/details`
   - Required: DOB, TOB, POB
   - Enables accurate recommendations
3. **Wait for Token** → Dashboard shows live status
4. **Consultation** → Expert calls token, conducts session
5. **View Recommendations** → `/e/bangalore/my-consultation`
   - See expert recommendations
   - Get Shopify checkout link (from sales team)

### Exhibit Browsing
1. **View Exhibits** → `/e/bangalore/exhibits/rudraksha` or `/exhibits/shaligram`
2. **Filter & Search** → By rarity, type, tags
3. **View Details** → `/e/bangalore/exhibits/rudraksha/:id`
   - Image/3D toggle
   - Benefits, mantra, darshan timing
   - "Ask Expert" CTA

---

## 👨‍💼 Admin CRM Flow

### Login
1. Go to `/admin/login`
2. Use credentials: `admin@neparudraksha.com` / `Admin@12345`
3. Redirected to `/admin` dashboard

### Admin Dashboard
1. **Enter Event ID** → Paste event ID from seed output
2. **View Overview** → KPIs (registrations, tokens, consultations, sales)
3. **Navigate to Modules**:
   - **Event Manager** → Update event details, hero image, theme
   - **Exhibit Catalog** → Add/edit/delete exhibits, manage visibility
   - **Inventory Checklist** → Track items being taken to event
   - **Consultation Control** → Manage token queue, pause/resume, call next
   - **Customer CRM** → Search visitors, view profiles, recommendations
   - **Notifications** → Manage WhatsApp templates, view delivery logs
   - **Analytics** → View conversion funnels, metrics

### Event Manager
- Update event name, venue, dates
- Set hero text and image
- Configure theme settings

### Exhibit Catalog Manager
- Add new exhibits (Rudraksha, Shaligram, Books, etc.)
- Edit existing exhibits
- Toggle visibility (show/hide on visitor app)
- Map to Shopify products/variants
- Set darshan timings

### Consultation Control
- View live token queue
- Call next token (WAITING → IN_PROGRESS)
- Mark as done or no-show
- Pause/resume token issuance

### Customer CRM
- Search by name, phone, email
- View customer profile
- See token history
- View consultation notes
- Check recommendations
- View sales status

---

## 👨‍⚕️ Expert Flow

### Access
1. Login as Expert role user
2. Navigate to `/ops/expert/:eventId`
3. See live queue of waiting tokens

### Consultation Workspace
1. **Click Token** → Opens workspace `/ops/expert/:eventId/workspace/:consultationId`
2. **View Customer Details**:
   - Registration info
   - Birth details (DOB/TOB/POB)
   - Past Shopify orders (if existing customer)
3. **Add Recommendations**:
   - Select item type (Rudraksha, Mala, Bracelet, etc.)
   - Set priority (1-3)
   - Add reason and notes
   - Submit → Locks recommendations (immutable)
4. **Notes** → Add consultation notes

---

## 💼 Sales Flow

### Access
1. Login as Sales role user
2. Navigate to `/ops/sales`
3. See completed consultations

### Sales Desk
1. **Search Customer** → By token, phone, or email
2. **View Recommendations** → Read-only (expert-submitted)
3. **Generate Checkout Link**:
   - Create Shopify checkout link with recommended items
   - Copy link or generate QR
   - Share with customer
4. **Update Status**:
   - Interested / Hold / Purchased / Follow-up
   - Add sales notes

---

## 🔔 Notification System

### WhatsApp Notifications
- **Token Booked** → Sent when visitor books token
- **Token Near** → Sent when token is 3 before current
- **Consultation Ready** → Sent when expert calls token
- **Talk Reminder** → Sent before scheduled talks
- **Darshan Reminder** → Sent for rare item darshan timings

### Admin Console
- View notification templates
- Edit templates
- View delivery logs (sent/failed)
- Retry failed notifications
- Manual send option

---

## 📊 Analytics & Reporting

### Metrics Tracked
- **Registrations** → Total visitors registered
- **Tokens Issued** → Consultation tokens booked
- **Consultations Completed** → Finished sessions
- **Sales Assisted** → Checkout links generated
- **Conversion Rates**:
  - Registrations → Tokens
  - Tokens → Consultations
  - Consultations → Sales

### Real-time Updates
- Dashboard auto-refreshes every 30 seconds
- Token queue updates via WebSocket
- Live "Now Serving" indicator

---

## 🛠️ Technical Architecture

### Frontend
- **React 19** + **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS v3** for styling
- **React Router** for navigation
- **Socket.io Client** for real-time updates
- **Axios** for API calls

### Backend
- **Node.js** + **Express**
- **Prisma ORM** with MySQL
- **Socket.io** for WebSocket
- **JWT** for authentication
- **bcrypt** for password hashing
- **Zod** for validation

### Database
- **MySQL** (or compatible)
- Prisma migrations for schema
- Seed script for initial data

---

## 🔐 Role-Based Access

### Roles
1. **ADMIN** → Full access to all modules
2. **EXHIBITION_MANAGER** → Manage exhibits, announcements
3. **EXPERT** → View queue, conduct consultations, add recommendations
4. **SALES** → View recommendations, generate checkout links
5. **REGISTRATION** → Manual check-in, OTP resend, basic lookup

### Permissions
- Backend enforces role checks on all admin endpoints
- Frontend shows/hides modules based on role
- Recommendations are immutable once submitted (expert → sales)

---

## 🚨 Troubleshooting

### CORS Errors
- Ensure `WEB_ORIGIN` in server `.env` matches frontend URL
- Server accepts `http://localhost:*` in development

### Database Connection
- Check `DATABASE_URL` in `server/.env`
- Ensure MySQL is running
- Run `npm run prisma:migrate` if schema changes

### OTP Not Showing
- Set `DEV_SHOW_OTP=true` in `server/.env`
- Restart server after env changes

### Token Queue Not Updating
- Check WebSocket connection in browser console
- Verify Socket.io server is running
- Check network tab for WebSocket errors

---

## 📝 Next Steps

### Production Deployment
1. Set up production database
2. Configure environment variables
3. Set up WhatsApp API integration
4. Configure Shopify API credentials
5. Deploy frontend (Vercel/Netlify)
6. Deploy backend (Railway/Render/AWS)
7. Set up SSL certificates
8. Configure domain names

### Integrations
- **Shopify API** → Customer lookup, order history, checkout link generation
- **WhatsApp API** → Send notifications (Twilio/MessageBird)
- **Payment Gateway** → If needed (currently handled by Shopify)

---

## ✅ System Checklist

- [x] Visitor registration with OTP
- [x] Token booking system
- [x] Consultation workflow
- [x] Exhibit catalog browsing
- [x] Expert queue and workspace
- [x] Sales desk with checkout links
- [x] Admin CRM (all modules)
- [x] Role-based access control
- [x] Real-time token updates
- [x] Responsive design (mobile + desktop)
- [x] Light premium theme
- [ ] WhatsApp integration (templates ready)
- [ ] Shopify integration (endpoints ready)
- [ ] Production deployment

---

**System is ready for testing and production deployment!** 🎉
