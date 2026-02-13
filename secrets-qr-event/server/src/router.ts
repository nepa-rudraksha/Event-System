import { Router } from "express";
import { z } from "zod";
import type { Server } from "socket.io";
import bcrypt from "bcrypt";
// QRCode imported dynamically to avoid module resolution issues
import { prisma } from "./lib/prisma.js";
import { asyncHandler } from "./lib/http.js";
import { createOtp, peekOtp, verifyOtp } from "./lib/otpStore.js";
import { broadcastEvent } from "./realtime/socket.js";
import { requireAuth, requireRole, signToken } from "./lib/auth.js";
import { geocodePlace } from "./lib/geocode.js";
import { fetchShopifyOrdersByEmail, createShopifyDraftOrder, fetchShopifyProduct, searchShopifyProducts, fetchVariantPricesInINR, sendDraftOrderInvoice, getShopifyDraftOrder } from "./shopify.js";

const phoneSchema = z.string().min(6).max(20);
const emailSchema = z.string().email();

// Helper function to send WhatsApp notifications (compulsory - no consent check)
async function sendWhatsAppNotification(
  eventId: string,
  templateKey: string,
  visitor: { id: string; name: string; phone: string; consentWhatsapp: boolean },
  parameters: Array<{ type: "text"; text: string }>
) {
  // WhatsApp messages are now compulsory - consent check removed

  try {
    // Get WhatsApp template
    const template = await prisma.whatsAppTemplate.findUnique({
      where: {
        eventId_templateKey: {
          eventId,
          templateKey,
        },
      },
    });

    if (!template || !template.isActive) {
      return { success: false, reason: "Template not found or inactive" };
    }

    const whatsappPayload = {
      channelId: process.env.WHATSAPP_CHANNEL_ID || "6971f3a7cb205bd2e61ce326",
      template: {
        name: template.templateKey,
        language: "en",
        components: [
          {
            type: "body",
            parameters: parameters.map(p => ({
              type: p.type,
              text: p.text,
            })),
          },
        ],
      },
      recipients: [
        { waNumber: visitor.phone.replace(/[^0-9]/g, "") },
      ],
    };

    const whatsappResponse = await fetch("https://api.whatsapp.nepalirudraksha.com/templates/bulk-send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.WHATSAPP_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTc5Yzg5ZGIxMTdiMDYzYmE4ZGY4ZTgiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzAwOTM3NTcsImV4cCI6MTc3MDY5ODU1N30.4Pz5dW8LDLeKJAdY7crlgtiOq1bMDUGY6mIijCi6W6g"}`,
      },
      body: JSON.stringify(whatsappPayload),
    });

    const whatsappResult = await whatsappResponse.json();

    await prisma.notificationLog.create({
      data: {
        visitorId: visitor.id,
        templateKey: template.templateKey,
        channel: "whatsapp",
        status: whatsappResponse.ok ? "sent" : "failed",
        payload: whatsappPayload,
        response: {
          data: whatsappResult,
          statusCode: whatsappResponse.status,
          statusText: whatsappResponse.statusText,
        },
      },
    });

    return {
      success: whatsappResponse.ok,
      result: whatsappResult,
    };
  } catch (err) {
    console.error(`WhatsApp notification error (${templateKey}):`, err);
    await prisma.notificationLog.create({
      data: {
        visitorId: visitor.id,
        templateKey: templateKey,
        channel: "whatsapp",
        status: "failed",
        payload: null,
        response: {
          error: String(err),
          errorStack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString(),
        },
      },
    });
    return { success: false, error: err };
  }
}

export function createRouter(io?: Server) {
  const router = Router();

  // Admin routes should come before general routes to avoid conflicts
  router.get(
    "/admin/events",
    requireAuth,
    requireRole(["ADMIN", "EXPERT", "SALES", "EXHIBITION_MANAGER"]),
    asyncHandler(async (req, res) => {
      const events = await prisma.event.findMany({
        select: { id: true, name: true, slug: true, venue: true, startTime: true },
        orderBy: { startTime: "desc" },
      });
      res.json(events);
    })
  );

  router.get(
    "/admin/events/:eventId",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const event = await prisma.event.findUnique({
        where: { id: req.params.eventId },
      });
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.json(event);
    })
  );

  // Public endpoint to fetch active events (for login/selection)
  router.get(
    "/events",
    asyncHandler(async (req, res) => {
      const events = await prisma.event.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, venue: true, startTime: true },
        orderBy: { startTime: "desc" },
      });
      res.json(events);
    })
  );

  router.get(
    "/events/:slug",
    asyncHandler(async (req, res) => {
      const event = await prisma.event.findUnique({
        where: { slug: req.params.slug },
      });
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.json(event);
    })
  );

  router.post(
    "/otp/request",
    asyncHandler(async (req, res) => {
      const body = z.object({ phone: phoneSchema }).parse(req.body);
      const code = createOtp(body.phone);
      
      // Send OTP via WhatsApp using the new API
      let whatsappSent = false;
      let whatsappError: string | null = null;
      try {
        // Format phone number with country code (ensure it starts with +)
        let phoneNumber = body.phone.trim();
        
        // Remove any spaces, dashes, or parentheses
        phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");
        
        // Ensure phone number starts with + for international format
        if (!phoneNumber.startsWith("+")) {
          // If it doesn't start with +, add it
          phoneNumber = "+" + phoneNumber;
        }

        const otpPayload = {
          to: phoneNumber,
          code: code,
          templateName: "otp_verification",
          templateLanguage: "en",
          channelId: process.env.WHATSAPP_CHANNEL_ID || "6971f3a7cb205bd2e61ce326",
        };

        const whatsappResponse = await fetch("https://api.whatsapp.nepalirudraksha.com/auth/send-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.WHATSAPP_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTc5Yzg5ZGIxMTdiMDYzYmE4ZGY4ZTgiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzAwOTM3NTcsImV4cCI6MTc3MDY5ODU1N30.4Pz5dW8LDLeKJAdY7crlgtiOq1bMDUGY6mIijCi6W6g"}`,
          },
          body: JSON.stringify(otpPayload),
        });

        const whatsappResult = await whatsappResponse.json().catch(() => ({}));
        
        whatsappSent = whatsappResponse.ok;
        
        if (!whatsappSent) {
          whatsappError = whatsappResult.message || whatsappResult.error || `HTTP ${whatsappResponse.status}`;
          console.error("WhatsApp OTP send failed:", whatsappError, whatsappResult);
        } else {
          console.log(`OTP sent successfully to ${phoneNumber} via WhatsApp`);
        }
      } catch (error: any) {
        console.error("WhatsApp OTP send error:", error);
        whatsappError = error.message || "Failed to send OTP";
      }

      res.json({
        ok: true,
        whatsappSent,
        message: whatsappSent 
          ? "OTP sent successfully via WhatsApp" 
          : whatsappError 
            ? `OTP generated but WhatsApp send failed: ${whatsappError}`
            : "OTP generated but WhatsApp send failed",
        error: whatsappError || undefined,
      });
    })
  );

  router.post(
    "/auth/login",
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          email: z.string().email(),
          password: z.string().min(6),
        })
        .parse(req.body);
      const user = await prisma.user.findUnique({ where: { email: body.email } });
      if (!user || !user.isActive) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const ok = await bcrypt.compare(body.password, user.password);
      if (!ok) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });
      res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    })
  );

  router.post(
    "/otp/verify",
    asyncHandler(async (req, res) => {
      const body = z
        .object({ phone: phoneSchema, code: z.string().length(6) })
        .parse(req.body);
      const ok = verifyOtp(body.phone, body.code);
      res.json({ ok });
    })
  );

  // Verify visitor token and return visitor/event info
  router.get(
    "/auth/verify-visitor",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as Request & { user?: AuthUser }).user;
      console.log("[verify-visitor] User from token:", { id: user?.id, email: user?.email, role: user?.role, name: user?.name });
      if (!user) {
        console.log("[verify-visitor] No user found in request");
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (user.role !== "VISITOR") {
        console.log("[verify-visitor] Invalid token type - expected VISITOR, got:", user.role);
        res.status(403).json({ error: "Invalid token type", receivedRole: user.role });
        return;
      }

      const visitor = await prisma.visitor.findUnique({
        where: { id: user.id },
        include: {
          event: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      });

      if (!visitor) {
        res.status(404).json({ error: "Visitor not found" });
        return;
      }

      res.json({
        visitor: {
          id: visitor.id,
          name: visitor.name,
          phone: visitor.phone,
          email: visitor.email,
        },
        event: visitor.event,
      });
    })
  );

  // Send welcome message on first login (only once)
  router.post(
    "/visitors/first-login",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = (req as Request & { user?: AuthUser }).user;
      if (!user || user.role !== "VISITOR") {
        res.status(403).json({ error: "Visitor access required" });
        return;
      }

      const visitor = await prisma.visitor.findUnique({
        where: { id: user.id },
        include: { event: true },
      });

      if (!visitor) {
        res.status(404).json({ error: "Visitor not found" });
        return;
      }

      // Check if welcome message was already sent
      const welcomeAlreadySent = await prisma.notificationLog.findFirst({
        where: {
          visitorId: visitor.id,
          templateKey: "visitor_welcome",
          status: "sent",
        },
      });

      if (welcomeAlreadySent) {
        res.json({ success: true, message: "Welcome message already sent" });
        return;
      }

      // Send welcome message with PDF and emergency contact
      const eventConfig = visitor.event.themeConfig as any;
      const pdfLink = eventConfig?.welcomePdfLink || process.env.DEFAULT_WELCOME_PDF_LINK || "";
      const emergencyContact = eventConfig?.emergencyContact || process.env.DEFAULT_EMERGENCY_CONTACT || "+9779863832800";
      
      const welcomeSent = await sendWhatsAppNotification(
        visitor.eventId,
        "visitor_welcome",
        visitor,
        [
          { type: "text", text: visitor.name },
          { type: "text", text: visitor.event.name },
          { type: "text", text: pdfLink },
          { type: "text", text: emergencyContact },
        ]
      ).catch(err => {
        console.error("Welcome message send error:", err);
        return { success: false };
      });

      res.json({
        success: welcomeSent.success || false,
        message: welcomeSent.success ? "Welcome message sent" : "Failed to send welcome message",
      });
    })
  );

  // Verify OTP for admin-created visitors (special endpoint)
  router.post(
    "/events/:slug/visitors/verify-otp",
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          phone: phoneSchema,
          otp: z.string(),
        })
        .parse(req.body);

      const event = await prisma.event.findUnique({
        where: { slug: req.params.slug },
      });
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      const visitor = await prisma.visitor.findUnique({
        where: {
          eventId_phone: {
            eventId: event.id,
            phone: body.phone,
          },
        },
      });

      if (!visitor) {
        res.status(404).json({ error: "Visitor not found" });
        return;
      }

      // If OTP is "ADMIN_CREATED", mark as verified (admin-created visitors)
      if (body.otp === "ADMIN_CREATED") {
        await prisma.visitor.update({
          where: { id: visitor.id },
          data: { otpVerified: true },
        });
        res.json({ ok: true });
        return;
      }

      // Otherwise, verify normally
      const ok = verifyOtp(body.phone, body.otp);
      if (ok) {
        await prisma.visitor.update({
          where: { id: visitor.id },
          data: { otpVerified: true },
        });
      }
      res.json({ ok });
    })
  );

  router.post(
    "/events/:slug/visitors/register",
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(2),
          phone: phoneSchema,
          email: emailSchema,
          otp: z.string().length(6), // OTP is required
          existingCustomer: z.boolean().optional(),
          consentWhatsapp: z.boolean().optional(),
        })
        .parse(req.body);

      const event = await prisma.event.findUnique({
        where: { slug: req.params.slug },
      });
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      // Verify OTP
      const otpOk = verifyOtp(body.phone, body.otp);
      if (!otpOk) {
        res.status(400).json({ error: "Invalid OTP" });
        return;
      }

      const visitor = await prisma.visitor.upsert({
        where: {
          eventId_phone: {
            eventId: event.id,
            phone: body.phone,
          },
        },
        update: {
          name: body.name,
          email: body.email,
          otpVerified: true,
          existingCustomer: body.existingCustomer ?? false,
          consentWhatsapp: true, // WhatsApp is now compulsory
        },
        create: {
          eventId: event.id,
          name: body.name,
          phone: body.phone,
          email: body.email,
          otpVerified: true,
          existingCustomer: body.existingCustomer ?? false,
          consentWhatsapp: true, // WhatsApp is now compulsory
        },
        include: {
          event: true,
        },
      });

      // Send welcome message after registration
      const eventConfig = event.themeConfig as any;
      const eventName = eventConfig?.visitorWelcomeEventName || event.name;
      const eventGuide = eventConfig?.visitorWelcomeEventGuide || eventConfig?.welcomePdfLink || process.env.DEFAULT_WELCOME_PDF_LINK || "";
      const emergencyContact = eventConfig?.visitorWelcomeEmergencyContact || eventConfig?.emergencyContact || process.env.DEFAULT_EMERGENCY_CONTACT || "+9779863832800";
      
      // Send welcome message (don't await - send in background)
      sendWhatsAppNotification(
        event.id,
        "visitor_welcome",
        visitor,
        [
          { type: "text", text: visitor.name },
          { type: "text", text: eventName },
          { type: "text", text: eventGuide },
          { type: "text", text: emergencyContact },
        ]
      ).catch(err => {
        console.error("Welcome message send error during registration:", err);
      });

      res.json({ visitor, event });
    })
  );

  router.get(
    "/events/:eventId/announcements",
    asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const announcements = await prisma.announcement.findMany({
        where: { eventId, isActive: true },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });
      res.json(announcements);
    })
  );

  router.get(
    "/events/:eventId/itinerary",
    asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const items = await prisma.itineraryItem.findMany({
        where: { eventId, isActive: true },
        orderBy: [{ timeLabel: "asc" }],
      });
      res.json(items);
    })
  );

  // QR Code redirect route - public, no auth required
  router.get(
    "/qr/:code",
    asyncHandler(async (req, res) => {
      const code = String(req.params.code);
      
      // Find exhibit by QR code using raw query (works even if Prisma types are outdated)
      // This ensures the query works immediately after migration without needing to regenerate Prisma client
      const exhibits = await prisma.$queryRaw<Array<{ 
        id: string; 
        eventId: string; 
        type: string; 
        name: string; 
        slug: string;
        qrCode: string;
      }>>`
        SELECT ei.id, ei.eventId, ei.type, ei.name, e.slug, ei.qrCode
        FROM ExhibitItem ei
        INNER JOIN Event e ON ei.eventId = e.id
        WHERE ei.qrCode = ${code}
        LIMIT 1
      `;
      
      let exhibit = null;
      
      if (exhibits.length > 0) {
        const found = exhibits[0];
        // Fetch full exhibit with relations
        exhibit = await prisma.exhibitItem.findUnique({
          where: { id: found.id },
          include: { event: { select: { slug: true } } },
        });
      }
      
      // If still not found, try case-insensitive search
      if (!exhibit) {
        const exhibitsCaseInsensitive = await prisma.$queryRaw<Array<{ 
          id: string; 
          eventId: string; 
          type: string; 
          name: string; 
          slug: string;
        }>>`
          SELECT ei.id, ei.eventId, ei.type, ei.name, e.slug
          FROM ExhibitItem ei
          INNER JOIN Event e ON ei.eventId = e.id
          WHERE LOWER(ei.qrCode) = LOWER(${code})
          LIMIT 1
        `;
        
        if (exhibitsCaseInsensitive.length > 0) {
          const found = exhibitsCaseInsensitive[0];
          exhibit = await prisma.exhibitItem.findUnique({
            where: { id: found.id },
            include: { event: { select: { slug: true } } },
          });
        }
      }

      if (!exhibit) {
        // Log for debugging
        console.log(`QR code lookup failed for code: "${code}"`);
        res.status(404).json({ 
          error: `No exhibit found with QR code "${code}". Please ensure the QR code is assigned to an exhibit in the admin panel.`,
          code: code,
        });
        return;
      }

      // Check if request wants JSON (from frontend) or HTML redirect (direct browser access)
      const acceptsJson = req.headers.accept?.includes("application/json");
      
      if (acceptsJson) {
        // Return JSON for frontend navigation
        res.json({
          redirectUrl: `/e/${exhibit.event.slug}/exhibits/${exhibit.type}/${exhibit.id}`,
          exhibit: {
            id: exhibit.id,
            name: exhibit.name,
            type: exhibit.type,
            eventSlug: exhibit.event.slug,
          },
        });
      } else {
        // Redirect directly for direct browser/QR scanner access
        const redirectUrl = `/e/${exhibit.event.slug}/exhibits/${exhibit.type}/${exhibit.id}`;
        res.redirect(redirectUrl);
      }
    })
  );

  router.get(
    "/events/:eventId/exhibits",
    asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const type = z.string().optional().parse(req.query.type);
      const exhibits = await prisma.exhibitItem.findMany({
        where: {
          eventId,
          isVisible: true,
          ...(type ? { type } : {}),
        },
        orderBy: [{ name: "asc" }],
      });
      res.json(exhibits);
    })
  );

  // Get Shopify product handle by product ID
  router.get(
    "/shopify/product/:productId/handle",
    asyncHandler(async (req, res) => {
      const { productId } = req.params;
      try {
        const product = await fetchShopifyProduct(productId);
        if (product && product.handle) {
          res.json({ handle: product.handle });
        } else {
          res.status(404).json({ error: "Product not found or handle not available" });
        }
      } catch (error: any) {
        console.error("Error fetching product handle:", error);
        res.status(500).json({ error: "Failed to fetch product handle" });
      }
    })
  );

  // Search Shopify products
  router.get(
    "/shopify/products/search",
    requireAuth,
    requireRole(["EXPERT", "ADMIN", "SALES"]),
    asyncHandler(async (req, res) => {
      const query = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      if (!query || query.trim().length === 0) {
        res.status(400).json({ error: "Search query is required" });
        return;
      }

      try {
        const products = await searchShopifyProducts(query.trim(), limit);
        res.json({ products });
      } catch (error: any) {
        console.error("Error searching Shopify products:", error);
        res.status(500).json({ error: "Failed to search products" });
      }
    })
  );

  // Fetch variant prices in INR
  router.post(
    "/shopify/variants/prices",
    requireAuth,
    requireRole(["EXPERT", "ADMIN", "SALES"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          variantIds: z.array(z.string()),
        })
        .parse(req.body);

      try {
        const prices = await fetchVariantPricesInINR(body.variantIds);
        res.json({ prices });
      } catch (error: any) {
        console.error("Error fetching variant prices:", error);
        res.status(500).json({ error: "Failed to fetch variant prices" });
      }
    })
  );

  router.get(
    "/visitors/:visitorId/summary",
    asyncHandler(async (req, res) => {
      const visitorId = req.params.visitorId;
      
      // Use findFirst instead of findUnique to avoid potential sort issues
      // Fetch visitor basic info only (no includes to avoid sort memory issues)
      const visitor = await prisma.visitor.findFirst({
        where: { id: visitorId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          eventId: true,
          createdAt: true,
        },
      });
      
      if (!visitor) {
        res.status(404).json({ error: "Visitor not found" });
        return;
      }

      // Fetch all related data separately to avoid sort memory issues
      // Use findFirst with limit instead of orderBy to reduce sort memory usage
      const [birthDetails, latestToken, latestConsultation] = await Promise.all([
        // Birth details
        prisma.visitorBirthDetails.findFirst({
          where: { visitorId },
        }).catch(() => null),
        // Get token ID first, then fetch details (avoid sorting large result set)
        prisma.token.findFirst({
          where: { visitorId },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        }).then(async (token) => {
          if (!token) return null;
          return prisma.token.findUnique({
            where: { id: token.id },
            select: {
              id: true,
              tokenNo: true,
              status: true,
              createdAt: true,
              eventId: true,
            },
          });
        }).catch(() => null),
        // Get consultation ID first, then fetch details
        prisma.consultation.findFirst({
          where: { visitorId },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        }).then(async (consultation) => {
          if (!consultation) return null;
          return prisma.consultation.findUnique({
            where: { id: consultation.id },
            select: {
              id: true,
              eventId: true,
              notes: true,
              astrologyReport: true,
              expertId: true,
              createdAt: true,
            },
          });
        }).catch(() => null),
      ]);

      // Fetch recommendations and sales assist separately if consultation exists
      let recommendations: any[] = [];
      let salesAssist: any[] = [];
      
      if (latestConsultation) {
        const consultationId = latestConsultation.id;
        
        // Fetch recommendations without orderBy first, then sort in memory
        const allRecs = await prisma.recommendationItem.findMany({
          where: { consultationId },
          take: 50, // Limit to prevent memory issues
          select: {
            id: true,
            quantity: true,
            priority: true,
            reason: true,
            notes: true,
            mappedShopifyVariantId: true,
            checkoutLink: true,
            productDetails: true,
            createdAt: true,
          },
        }).catch(() => []);
        
        // Sort in memory instead of database
        recommendations = allRecs.sort((a, b) => (a.priority || 0) - (b.priority || 0));
        
        // Fetch sales assist separately
        salesAssist = await prisma.salesOrderAssist.findMany({
          where: { consultationId },
          take: 10,
        }).catch(() => []);
      }

      // Combine the data
      const result = {
        ...visitor,
        birthDetails,
        tokens: latestToken ? [latestToken] : [],
        consultations: latestConsultation ? [{
          ...latestConsultation,
          recommendations,
          salesAssist,
        }] : [],
      };

      res.json(result);
    })
  );

  router.post(
    "/events/:eventId/tokens",
    asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const body = z.object({ visitorId: z.string() }).parse(req.body);

      // Verify visitor exists and belongs to this event
      const visitor = await prisma.visitor.findFirst({
        where: {
          id: body.visitorId,
          eventId: eventId,
        },
      });

      if (!visitor) {
        res.status(404).json({ error: "Visitor not found or does not belong to this event" });
        return;
      }

      const lastToken = await prisma.token.findFirst({
        where: { eventId },
        orderBy: { tokenNo: "desc" },
      });
      const nextTokenNo = (lastToken?.tokenNo ?? 0) + 1;

      const token = await prisma.token.create({
        data: {
          eventId,
          visitorId: body.visitorId,
          tokenNo: nextTokenNo,
        },
        include: {
          visitor: true,
        },
      });

      await prisma.consultation.create({
        data: {
          eventId,
          visitorId: body.visitorId,
          tokenId: token.id,
        },
      });

      // Send token_booked notification
      await sendWhatsAppNotification(
        eventId,
        "token_booked",
        token.visitor,
        [
          { type: "text", text: token.visitor.name },
          { type: "text", text: nextTokenNo.toString() },
        ]
      );

      if (io) {
        broadcastEvent(io, eventId, "token_created", token);
      }

      res.json(token);
    })
  );

  router.patch(
    "/tokens/:tokenId/status",
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          status: z.enum(["WAITING", "IN_PROGRESS", "DONE", "NO_SHOW"]),
        })
        .parse(req.body);
      
      const token = await prisma.token.update({
        where: { id: req.params.tokenId },
        data: { status: body.status },
        include: {
          visitor: true,
        },
      });

      // Send consultation_ready notification when status changes to IN_PROGRESS
      if (body.status === "IN_PROGRESS") {
        // Notify the current token holder
        await sendWhatsAppNotification(
          token.eventId,
          "consultation_ready",
          token.visitor,
          [
            { type: "text", text: token.visitor.name },
            { type: "text", text: token.tokenNo.toString() },
          ]
        ).catch(err => console.error("Consultation ready notification error:", err));

        // Send consultation_get_ready notification to the next person in line (when last person is in consultation)
        const nextToken = await prisma.token.findFirst({
          where: {
            eventId: token.eventId,
            status: "WAITING",
            tokenNo: {
              gt: token.tokenNo,
            },
          },
          include: {
            visitor: true,
          },
          orderBy: { tokenNo: "asc" },
        });

        if (nextToken) {
          await sendWhatsAppNotification(
            token.eventId,
            "consultation_get_ready",
            nextToken.visitor,
            [
              { type: "text", text: nextToken.visitor.name },
              { type: "text", text: nextToken.tokenNo.toString() },
            ]
          ).catch(err => console.error("Get ready notification error:", err));
        }
      }

      // Send thank you message with feedback link when consultation is completed (status = DONE)
      if (body.status === "DONE") {
        const event = await prisma.event.findUnique({
          where: { id: token.eventId },
        });
        
        if (event) {
          const eventConfig = event.themeConfig as any;
          const feedbackLink = eventConfig?.feedbackLink || process.env.DEFAULT_FEEDBACK_LINK || "";
          
          await sendWhatsAppNotification(
            token.eventId,
            "thank_you_feedback",
            token.visitor,
            [
              { type: "text", text: token.visitor.name },
              { type: "text", text: event.name },
              { type: "text", text: feedbackLink },
            ]
          ).catch(err => console.error("Thank you message send error:", err));
        }
      }

      if (io) {
        broadcastEvent(io, token.eventId, "token_updated", token);
      }
      res.json(token);
    })
  );

  router.put(
    "/visitors/:visitorId/birth-details",
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          dob: z.string().optional(),
          tob: z.string().optional(),
          pob: z.string().optional(),
          lat: z.number().optional(),
          lng: z.number().optional(),
          timezone: z.string().optional(),
        })
        .parse(req.body);

      // If pob is provided, always try to geocode (unless lat/lng/timezone are explicitly provided)
      let lat = body.lat;
      let lng = body.lng;
      let timezone = body.timezone;
      
      // Check if pob changed by comparing with existing record
      const existing = await prisma.visitorBirthDetails.findUnique({
        where: { visitorId: req.params.visitorId },
      });
      
      const pobChanged = body.pob && body.pob !== existing?.pob;
      
      // If pob changed or lat/lng/timezone weren't explicitly provided, geocode
      if (body.pob && (pobChanged || body.lat === undefined || body.lng === undefined || body.timezone === undefined)) {
        console.log(`Attempting to geocode place of birth: "${body.pob}" (changed: ${pobChanged})`);
        try {
          const geocoded = await geocodePlace(body.pob);
          if (geocoded) {
            // Only update if not explicitly provided
            lat = body.lat ?? geocoded.lat;
            lng = body.lng ?? geocoded.lng;
            timezone = body.timezone ?? geocoded.timezone;
            console.log(`Geocoding successful: lat=${lat}, lng=${lng}, timezone=${timezone}`);
          } else {
            console.log(`Geocoding failed for "${body.pob}" - no results`);
          }
        } catch (error) {
          console.error(`Error geocoding "${body.pob}":`, error);
        }
      }

      const birth = await prisma.visitorBirthDetails.upsert({
        where: { visitorId: req.params.visitorId },
        update: {
          dob: body.dob ? new Date(body.dob) : undefined,
          tob: body.tob,
          pob: body.pob,
          lat: lat,
          lng: lng,
          timezone: timezone,
        },
        create: {
          visitorId: req.params.visitorId,
          dob: body.dob ? new Date(body.dob) : undefined,
          tob: body.tob,
          pob: body.pob,
          lat: lat,
          lng: lng,
          timezone: timezone,
        },
      });

      res.json(birth);
    })
  );


  router.post(
    "/consultations/:consultationId/notes",
    asyncHandler(async (req, res) => {
      const body = z.object({ notes: z.string().optional() }).parse(req.body);
      const consultation = await prisma.consultation.update({
        where: { id: req.params.consultationId },
        data: { notes: body.notes },
      });
      res.json(consultation);
    })
  );

  // Update consultation notes - MUST come before GET routes to avoid conflicts
  router.patch(
    "/consultations/:consultationId",
    requireAuth,
    requireRole(["EXPERT", "ADMIN"]),
    asyncHandler(async (req, res) => {
      const user = (req as any).user;
      const body = z.object({ 
        notes: z.string().optional(),
        expertId: z.string().optional(),
      }).parse(req.body);
      
      // Auto-assign expert if not already assigned
      const consultation = await prisma.consultation.findUnique({
        where: { id: req.params.consultationId },
      });
      
      if (!consultation) {
        res.status(404).json({ error: "Consultation not found" });
        return;
      }
      
      const updateData: any = { notes: body.notes };
      if (user.role === "EXPERT" && !consultation.expertId) {
        updateData.expertId = user.id;
      } else if (body.expertId) {
        updateData.expertId = body.expertId;
      }
      
      const updated = await prisma.consultation.update({
        where: { id: req.params.consultationId },
        data: updateData,
      });
      res.json(updated);
    })
  );

  // Manual WhatsApp notification endpoint - placed early to avoid route conflicts
  router.post(
    "/consultations/:consultationId/send-whatsapp",
    requireAuth,
    requireRole(["EXPERT", "ADMIN", "SALES"]),
    asyncHandler(async (req, res) => {
      const consultationId = String(req.params.consultationId);
      const body = z.object({
        templateKey: z.string(),
        parameters: z.array(z.object({ type: z.literal("text"), text: z.string() })).optional(),
      }).parse(req.body);

      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: {
          visitor: true,
          event: { select: { id: true } },
          token: { select: { tokenNo: true } },
        },
      });

      if (!consultation) {
        res.status(404).json({ error: "Consultation not found" });
        return;
      }

      // Construct parameters based on template
      let parameters: Array<{ type: "text"; text: string }>;
      
      if (body.parameters) {
        // Use provided parameters as-is (don't modify them)
        parameters = body.parameters;
      } else if (body.templateKey === "token_booked" && consultation.token) {
        // For token_booked, construct parameters: [name, tokenNumber]
        // Token number should be just the number, not with "#" prefix
        parameters = [
          { type: "text" as const, text: consultation.visitor.name },
          { type: "text" as const, text: String(consultation.token.tokenNo) }, // Just the number, no "#"
        ];
      } else {
        // Default: just visitor name
        parameters = [
          { type: "text" as const, text: consultation.visitor.name },
        ];
      }

      const result = await sendWhatsAppNotification(
        consultation.event.id,
        body.templateKey,
        consultation.visitor,
        parameters
      );

      res.json(result);
    })
  );

  // Public consultation endpoint (for visitors to view their own consultation)
  router.get(
    "/consultations/:consultationId/public",
    asyncHandler(async (req, res) => {
      const consultation = await prisma.consultation.findUnique({
        where: { id: req.params.consultationId },
        include: {
          visitor: true,
          token: true,
          recommendations: true,
          salesAssist: true,
        },
      });
      if (!consultation) {
        res.status(404).json({ error: "Consultation not found" });
        return;
      }
      res.json(consultation);
    })
  );

  router.post(
    "/consultations/:consultationId/assign",
    asyncHandler(async (req, res) => {
      const body = z.object({ expertId: z.string().optional() }).parse(req.body);
      const consultation = await prisma.consultation.update({
        where: { id: req.params.consultationId },
        data: { expertId: body.expertId },
      });
      res.json(consultation);
    })
  );

  router.post(
    "/consultations/:consultationId/recommendations/lock",
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          lockedByUserId: z.string().optional(),
          items: z.array(
            z.object({
              exhibitItemId: z.string().optional(),
              mappedShopifyVariantId: z.string().optional(),
              productDetails: z.any().optional(), // Full Shopify product details
              checkoutLink: z.string().optional().nullable(),
              quantity: z.number().min(1).optional().default(1),
              priority: z.number().min(1).max(3),
              reason: z.string().min(2),
              notes: z.string().optional(),
            })
          ),
        })
        .parse(req.body);

      const existingLock = await prisma.recommendationLock.findUnique({
        where: { consultationId: req.params.consultationId },
      });

      let lock;
      if (existingLock) {
        // Update existing lock
        lock = existingLock;
        // Delete existing items and create new ones
        await prisma.recommendationItem.deleteMany({
          where: { consultationId: req.params.consultationId },
        });
      } else {
        // Create new lock
        lock = await prisma.recommendationLock.create({
          data: {
            consultationId: req.params.consultationId,
            lockedByUserId: body.lockedByUserId,
          },
        });
      }

      // Validate consultation exists
      const consultation = await prisma.consultation.findUnique({
        where: { id: req.params.consultationId },
      });

      if (!consultation) {
        res.status(404).json({ error: "Consultation not found" });
        return;
      }

      const items = await prisma.recommendationItem.createMany({
        data: body.items.map((item) => ({
          consultationId: req.params.consultationId,
          exhibitItemId: item.exhibitItemId || null,
          mappedShopifyVariantId: item.mappedShopifyVariantId || null,
          productDetails: item.productDetails || null,
          checkoutLink: item.checkoutLink && typeof item.checkoutLink === "string" && item.checkoutLink.trim() !== "" ? item.checkoutLink : null,
          quantity: item.quantity ?? 1,
          priority: item.priority,
          reason: item.reason,
          notes: item.notes || null,
        })),
      });

      res.json({ lock, items, updated: !!existingLock });
    })
  );

  // Astrology API integration
  router.post(
    "/consultations/:consultationId/astrology-report",
    requireAuth,
    requireRole(["EXPERT", "ADMIN"]),
    asyncHandler(async (req, res) => {
      const consultation = await prisma.consultation.findUnique({
        where: { id: req.params.consultationId },
        include: { visitor: { include: { birthDetails: true } } },
      });
      if (!consultation) {
        res.status(404).json({ error: "Consultation not found" });
        return;
      }
      if (!consultation.visitor.birthDetails) {
        res.status(400).json({ error: "Birth details not provided" });
        return;
      }

      const { dob, tob, lat, lng, timezone } = consultation.visitor.birthDetails;
      if (!dob || !tob || !lat || !lng || !timezone) {
        res.status(400).json({ error: "Incomplete birth details" });
        return;
      }

      // Call astrology API
      const astrologyResponse = await fetch("https://recommendation.nepalirudraksha.com/api/astro/report/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: consultation.visitor.name,
          date: dob.toISOString().split("T")[0],
          time: tob,
          latitude: String(lat),
          longitude: String(lng),
          timezone: timezone,
          user_currency: "INR",
        }),
      });

      if (!astrologyResponse.ok) {
        res.status(500).json({ error: "Failed to fetch astrology report" });
        return;
      }

      const report = await astrologyResponse.json();

      // Save report to consultation
      const updated = await prisma.consultation.update({
        where: { id: req.params.consultationId },
        data: { astrologyReport: report },
      });

      res.json({ consultation: updated, report });
    })
  );


  // Get consultation with recommendations
  router.get(
    "/consultations/:consultationId",
    requireAuth,
    requireRole(["EXPERT", "ADMIN", "SALES"]),
    asyncHandler(async (req, res) => {
      const consultation = await prisma.consultation.findUnique({
        where: { id: req.params.consultationId },
        include: {
          visitor: { include: { birthDetails: true } },
          expert: { select: { id: true, name: true, email: true } },
          token: true,
          recommendations: { orderBy: { priority: "asc" }, include: { exhibitItem: true } },
          recommendationLock: true,
          salesAssist: true,
        },
      });
      if (!consultation) {
        res.status(404).json({ error: "Consultation not found" });
        return;
      }

      // If there's a draft order ID, fetch draft order details from Shopify
      let draftOrderDetails = null;
      if (consultation.salesAssist?.shopifyDraftId) {
        try {
          const draftOrderGid = consultation.salesAssist.shopifyDraftId;
          draftOrderDetails = await getShopifyDraftOrder(draftOrderGid);
        } catch (err) {
          console.error("Error fetching draft order details:", err);
          // Continue without draft order details
        }
      }

      res.json({
        ...consultation,
        draftOrderDetails, // Include draft order details if available
      });
    })
  );


  // Shopify order history endpoint for experts
  router.get(
    "/consultations/:consultationId/order-history",
    requireAuth,
    requireRole(["EXPERT", "ADMIN", "SALES"]),
    asyncHandler(async (req, res) => {
      try {
        const consultation = await prisma.consultation.findUnique({
          where: { id: req.params.consultationId },
          include: { visitor: true },
        });

        if (!consultation) {
          res.status(404).json({ error: "Consultation not found" });
          return;
        }

        // Fetch order history from Shopify (returns empty array if not configured)
        let shopifyOrders: any[] = [];
        let shopifyError: string | null = null;
        try {
          shopifyOrders = await fetchShopifyOrdersByEmail(consultation.visitor.email);
        } catch (error: any) {
          console.error("Error fetching Shopify orders:", error);
          shopifyError = error.message || "Failed to fetch Shopify orders";
          // Continue with local orders even if Shopify fails
        }

        // Also fetch orders from our database
        const localOrders = await prisma.order.findMany({
          where: { visitorId: consultation.visitorId },
          orderBy: { createdAt: "desc" },
          take: 20,
        });

        res.json({
          shopifyOrders: shopifyOrders || [],
          localOrders: localOrders || [],
          shopifyConfigured: !!(process.env.SHOPIFY_STORE && process.env.SHOPIFY_ACCESS_TOKEN),
          shopifyError: shopifyError || null,
          visitor: {
            email: consultation.visitor.email,
            name: consultation.visitor.name,
          },
        });
      } catch (error: any) {
        console.error("Error fetching order history:", error);
        res.status(500).json({
          error: "Failed to fetch order history",
          details: error.message,
        });
      }
    })
  );

  // Create draft order in Shopify
  router.post(
    "/consultations/:consultationId/draft-order",
    requireAuth,
    requireRole(["EXPERT", "ADMIN", "SALES"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          lineItems: z.array(
            z.object({
              variantId: z.string(),
              quantity: z.number().min(1),
              customAttributes: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
            })
          ),
          note: z.string().optional(),
          discount: z.object({
            type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
            value: z.number().min(0),
            title: z.string().optional(),
          }).optional(),
        })
        .parse(req.body);

      const consultation = await prisma.consultation.findUnique({
        where: { id: req.params.consultationId },
        include: { visitor: true },
      });

      if (!consultation) {
        res.status(404).json({ error: "Consultation not found" });
        return;
      }

      // Create draft order in Shopify
      const draftOrder = await createShopifyDraftOrder(
        consultation.visitor.email,
        body.lineItems,
        body.note || `Draft order for consultation ${consultation.id}`,
        body.discount
      );

      if (!draftOrder) {
        res.status(500).json({ error: "Failed to create draft order" });
        return;
      }

      // Update consultation with draft order info
      await prisma.consultation.update({
        where: { id: req.params.consultationId },
        data: {
          salesAssist: {
            upsert: {
              create: {
                visitorId: consultation.visitorId,
                checkoutLink: draftOrder.checkoutUrl,
                shopifyDraftId: draftOrder.draftOrderId, // Store the draft order ID
                status: "INTERESTED",
                salesNotes: `Draft order created: ${draftOrder.name || draftOrder.draftOrderId}`,
              },
              update: {
                checkoutLink: draftOrder.checkoutUrl,
                shopifyDraftId: draftOrder.draftOrderId, // Store the draft order ID
                salesNotes: `Draft order updated: ${draftOrder.name || draftOrder.draftOrderId}`,
              },
            },
          },
        },
      });

      res.json({
        draftOrderId: draftOrder.draftOrderId,
        checkoutUrl: draftOrder.checkoutUrl,
        name: draftOrder.name,
        subtotalPrice: draftOrder.subtotalPrice,
        totalPrice: draftOrder.totalPrice,
        totalTax: draftOrder.totalTax,
        appliedDiscount: draftOrder.appliedDiscount,
        lineItems: draftOrder.lineItems,
        customer: draftOrder.customer,
        createdAt: draftOrder.createdAt,
        updatedAt: draftOrder.updatedAt,
      });
    })
  );

  // Send invoice email for draft order
  router.post(
    "/draft-orders/:draftOrderId/send-invoice",
    requireAuth,
    requireRole(["EXPERT", "ADMIN", "SALES"]),
    asyncHandler(async (req, res) => {
      // URL-decode the draft order ID since it's URL-encoded in the path
      const draftOrderId = decodeURIComponent(req.params.draftOrderId);
      
      try {
        await sendDraftOrderInvoice(draftOrderId);
        res.json({ success: true, message: "Invoice email sent successfully" });
      } catch (error: any) {
        console.error("Error sending invoice:", error);
        res.status(500).json({ error: error.message || "Failed to send invoice email" });
      }
    })
  );

  // Order processing endpoints
  router.post(
    "/orders",
    requireAuth,
    requireRole(["SALES", "ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          consultationId: z.string(),
          paymentId: z.string().optional(),
          paymentStatus: z.enum(["pending", "paid", "failed"]).default("pending"),
          totalAmount: z.number().optional(),
          currency: z.string().default("INR"),
          items: z.any().optional(),
          shopifyOrderId: z.string().optional(),
          shopifyDraftId: z.string().optional(),
          shopifyCheckoutUrl: z.string().optional(),
        })
        .parse(req.body);

      const consultation = await prisma.consultation.findUnique({
        where: { id: body.consultationId },
        include: { visitor: true },
      });
      if (!consultation) {
        res.status(404).json({ error: "Consultation not found" });
        return;
      }

      const order = await prisma.order.create({
        data: {
          consultationId: body.consultationId,
          visitorId: consultation.visitorId,
          paymentId: body.paymentId,
          paymentStatus: body.paymentStatus || "paid",
          orderStatus: "paid", // Start with "paid" status, then move to "processing" -> "completed"
          totalAmount: body.totalAmount,
          currency: body.currency,
          items: body.items,
          orderNumber: `ORD-${Date.now()}`,
        },
      });

      res.json(order);
    })
  );

  router.patch(
    "/orders/:id/process",
    requireAuth,
    requireRole(["SALES", "ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          orderStatus: z.enum(["pending", "paid", "processing", "completed", "cancelled"]).optional(),
        })
        .parse(req.body);

      const user = (req as any).user;
      const order = await prisma.order.update({
        where: { id: req.params.id },
        data: {
          orderStatus: body.orderStatus || "processing",
          processedBy: user.id,
          processedAt: new Date(),
        },
        include: {
          consultation: {
            include: {
              visitor: true,
              recommendations: {
                take: 1,
                orderBy: { priority: "asc" },
              },
            },
          },
        },
      });

      // Send WhatsApp notification after processing
      if (order.orderStatus === "completed") {
        // Get product name from first recommendation item
        const firstItem = order.consultation.recommendations?.[0];
        const productName = firstItem?.productDetails
          ? (firstItem.productDetails as any)?.title || "Rudraksha"
          : "Rudraksha";

        const result = await sendWhatsAppNotification(
          order.consultation.eventId,
          "order_completed",
          order.consultation.visitor,
          [
            { type: "text", text: order.consultation.visitor.name },
            { type: "text", text: productName },
          ]
        );

        await prisma.order.update({
          where: { id: order.id },
          data: {
            whatsappSent: result.success,
            whatsappSentAt: result.success ? new Date() : undefined,
          },
        });
      }

      res.json(order);
    })
  );

  // WhatsApp template management
  router.get(
    "/admin/event/:eventId/whatsapp-templates",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const templates = await prisma.whatsAppTemplate.findMany({
        where: { eventId: req.params.eventId },
        orderBy: { templateKey: "asc" },
      });
      res.json(templates);
    })
  );

  router.post(
    "/admin/event/:eventId/whatsapp-templates",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          templateKey: z.string(),
          templateName: z.string(),
          description: z.string().optional(),
        })
        .parse(req.body);

      const template = await prisma.whatsAppTemplate.upsert({
        where: {
          eventId_templateKey: {
            eventId: req.params.eventId,
            templateKey: body.templateKey,
          },
        },
        update: {
          templateName: body.templateName,
          description: body.description,
        },
        create: {
          eventId: req.params.eventId,
          templateKey: body.templateKey,
          templateName: body.templateName,
          description: body.description,
        },
      });

      res.json(template);
    })
  );

  // Send announcement to all visitors (with batch splitting for >250 recipients)
  router.post(
    "/admin/event/:eventId/announcements/send",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const body = z
        .object({
          title: z.string().min(1),
          message: z.string().min(1),
        })
        .parse(req.body);

      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      // Create announcement record in database
      const announcement = await prisma.announcement.create({
        data: {
          eventId: event.id,
          title: body.title,
          message: body.message,
          priority: 1,
          isActive: true,
        },
      });

      // Get all visitors with WhatsApp consent (now compulsory, so all visitors)
      const visitors = await prisma.visitor.findMany({
        where: { eventId },
        select: { id: true, name: true, phone: true, consentWhatsapp: true },
      });

      if (visitors.length === 0) {
        res.json({ sent: 0, total: 0, batches: 0, message: "No visitors found", announcementId: announcement.id });
        return;
      }

      // Split into batches of 250
      const BATCH_SIZE = 250;
      const batches: typeof visitors[] = [];
      for (let i = 0; i < visitors.length; i += BATCH_SIZE) {
        batches.push(visitors.slice(i, i + BATCH_SIZE));
      }

      let totalSent = 0;
      let totalFailed = 0;

      // Send to each batch
      for (const batch of batches) {
        const recipients = batch.map(v => ({ waNumber: v.phone.replace(/[^0-9]/g, "") }));
        
        const templateName = "event_information_update";
        console.log(`[ANNOUNCEMENT] Using template: ${templateName}`);
        
        const whatsappPayload = {
          channelId: process.env.WHATSAPP_CHANNEL_ID || "6971f3a7cb205bd2e61ce326",
          template: {
            name: templateName,
            language: "en",
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: body.title },
                  { type: "text", text: body.message },
                ],
              },
            ],
          },
          recipients,
        };

        console.log(`[ANNOUNCEMENT] Payload template name: ${whatsappPayload.template.name}`);

        try {
          const whatsappResponse = await fetch("https://api.whatsapp.nepalirudraksha.com/templates/bulk-send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.WHATSAPP_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTc5Yzg5ZGIxMTdiMDYzYmE4ZGY4ZTgiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzAwOTM3NTcsImV4cCI6MTc3MDY5ODU1N30.4Pz5dW8LDLeKJAdY7crlgtiOq1bMDUGY6mIijCi6W6g"}`,
            },
            body: JSON.stringify(whatsappPayload),
          });

          const whatsappResult = await whatsappResponse.json().catch(() => ({}));
          const batchSent = whatsappResponse.ok ? batch.length : 0;
          const batchFailed = whatsappResponse.ok ? 0 : batch.length;
          totalSent += batchSent;
          totalFailed += batchFailed;

          // Log notifications for each visitor in the batch
          for (const visitor of batch) {
            await prisma.notificationLog.create({
              data: {
                visitorId: visitor.id,
                templateKey: "event_information_update",
                channel: "whatsapp",
                status: whatsappResponse.ok ? "sent" : "failed",
                payload: whatsappPayload,
                response: {
                  data: whatsappResult,
                  statusCode: whatsappResponse.status,
                  statusText: whatsappResponse.statusText,
                },
              },
            });
          }
        } catch (error: any) {
          console.error("Announcement batch send error:", error);
          totalFailed += batch.length;
          // Log failed notifications
          for (const visitor of batch) {
            await prisma.notificationLog.create({
              data: {
                visitorId: visitor.id,
                templateKey: "event_information_update",
                channel: "whatsapp",
                status: "failed",
                payload: whatsappPayload,
                response: {
                  error: String(error),
                },
              },
            });
          }
        }
      }

      res.json({
        sent: totalSent,
        failed: totalFailed,
        total: visitors.length,
        batches: batches.length,
        announcementId: announcement.id,
        message: `Announcement sent to ${totalSent} visitors in ${batches.length} batch(es)`,
      });
    })
  );

  // Manual trigger for consultation get ready notification (Expert can trigger)
  router.post(
    "/consultations/:consultationId/notify-get-ready",
    requireAuth,
    requireRole(["EXPERT", "ADMIN"]),
    asyncHandler(async (req, res) => {
      const consultation = await prisma.consultation.findUnique({
        where: { id: req.params.consultationId },
        include: {
          visitor: true,
          token: true,
        },
      });

      if (!consultation) {
        res.status(404).json({ error: "Consultation not found" });
        return;
      }

      const result = await sendWhatsAppNotification(
        consultation.eventId,
        "consultation_get_ready",
        consultation.visitor,
        [
          { type: "text", text: consultation.visitor.name },
          { type: "text", text: consultation.token.tokenNo.toString() },
        ]
      );

      res.json({
        success: result.success,
        message: result.success ? "Get ready notification sent" : result.reason || "Failed to send notification",
      });
    })
  );


  // Expert endpoints - Customer Management
  router.get(
    "/expert/event/:eventId/customers",
    requireAuth,
    requireRole(["EXPERT", "ADMIN", "SALES"]),
    asyncHandler(async (req, res) => {
      try {
        const { eventId } = req.params;
        const { search } = req.query;

        const where: any = { eventId };
        if (search && typeof search === "string" && search.trim() !== "") {
          const searchTerm = search.trim();
          where.OR = [
            { name: { contains: searchTerm } },
            { email: { contains: searchTerm } },
            { phone: { contains: searchTerm } },
          ];
        }

        // Fetch visitors with basic info first
        const visitors = await prisma.visitor.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            existingCustomer: true,
            createdAt: true,
            updatedAt: true,
            eventId: true,
            otpVerified: true,
            consentWhatsapp: true,
            _count: {
              select: {
                consultations: true,
                orders: true,
                tokens: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        // Fetch consultations separately for each visitor to avoid complex joins
        const visitorIds = visitors.map((v) => v.id);
        const consultationsMap = new Map();
        if (visitorIds.length > 0) {
          const consultations = await prisma.consultation.findMany({
            where: { visitorId: { in: visitorIds } },
            select: {
              id: true,
              visitorId: true,
              createdAt: true,
              notes: true,
              recommendationLock: {
                select: { id: true },
              },
              _count: {
                select: {
                  recommendations: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          });

          consultations.forEach((c) => {
            if (!consultationsMap.has(c.visitorId)) {
              consultationsMap.set(c.visitorId, []);
            }
            consultationsMap.get(c.visitorId).push(c);
          });
        }

        // Combine data
        const visitorsWithData = visitors.map((v) => ({
          ...v,
          consultations: consultationsMap.get(v.id) || [],
          orders: [], // Will be loaded separately if needed
          tokens: [], // Will be loaded separately if needed
        }));

        res.json(visitorsWithData);
      } catch (error: any) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ 
          error: "Failed to fetch customers", 
          details: error.message,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined
        });
      }
    })
  );

  // Get complete customer profile with all data
  router.get(
    "/expert/customers/:visitorId",
    requireAuth,
    requireRole(["EXPERT", "ADMIN", "SALES"]),
    asyncHandler(async (req, res) => {
      const visitorId = req.params.visitorId;

      // Fetch visitor with basic info first
      const visitor = await prisma.visitor.findUnique({
        where: { id: visitorId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          existingCustomer: true,
          createdAt: true,
          updatedAt: true,
          eventId: true,
          otpVerified: true,
          consentWhatsapp: true,
        },
      });

      if (!visitor) {
        res.status(404).json({ error: "Visitor not found" });
        return;
      }

      // Fetch related data separately to avoid complex joins
      const [birthDetails, consultations, orders, tokens, salesAssists] = await Promise.all([
        prisma.visitorBirthDetails.findUnique({
          where: { visitorId },
        }).catch(() => null),
        
        prisma.consultation.findMany({
          where: { visitorId },
          select: {
            id: true,
            createdAt: true,
            notes: true,
            expertId: true,
            tokenId: true,
            recommendationLock: {
              select: { id: true },
            },
            _count: {
              select: {
                recommendations: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }).catch(() => []),
        
        prisma.order.findMany({
          where: { visitorId },
          select: {
            id: true,
            createdAt: true,
            orderNumber: true,
            paymentStatus: true,
            orderStatus: true,
            totalAmount: true,
            currency: true,
            items: true,
            consultationId: true,
          },
          orderBy: { createdAt: "desc" },
        }).catch(() => []),
        
        prisma.token.findMany({
          where: { visitorId },
          select: {
            id: true,
            tokenNo: true,
            status: true,
            createdAt: true,
            assignedDesk: true,
            assignedToUserId: true,
          },
          orderBy: { tokenNo: "desc" },
        }).catch(() => []),
        
        prisma.salesOrderAssist.findMany({
          where: { consultation: { visitorId } },
          select: {
            id: true,
            createdAt: true,
            status: true,
            checkoutLink: true,
            consultationId: true,
            salesAgentId: true,
          },
          orderBy: { createdAt: "desc" },
        }).catch(() => []),
      ]);

      // Fetch recommendations for consultations separately
      const consultationIds = consultations.map((c) => c.id);
      const recommendations = consultationIds.length > 0
        ? await prisma.recommendationItem.findMany({
            where: { consultationId: { in: consultationIds } },
            select: {
              id: true,
              consultationId: true,
              priority: true,
              reason: true,
              quantity: true,
              productDetails: true,
              checkoutLink: true,
            },
            orderBy: { priority: "asc" },
          }).catch(() => [])
        : [];

      // Group recommendations by consultation
      const recommendationsByConsultation = new Map();
      recommendations.forEach((r) => {
        if (!recommendationsByConsultation.has(r.consultationId)) {
          recommendationsByConsultation.set(r.consultationId, []);
        }
        recommendationsByConsultation.get(r.consultationId).push(r);
      });

      // Attach recommendations to consultations
      const consultationsWithRecommendations = consultations.map((c) => ({
        ...c,
        recommendations: recommendationsByConsultation.get(c.id) || [],
      }));

      // Fetch user details for tokens and sales assists
      const userIds = [
        ...tokens.map((t) => t.assignedToUserId).filter(Boolean),
        ...salesAssists.map((s) => s.salesAgentId).filter(Boolean),
      ].filter((id, index, arr) => arr.indexOf(id) === index) as string[];

      const users = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          }).catch(() => [])
        : [];

      const userMap = new Map(users.map((u) => [u.id, u]));

      // Attach user info to tokens and sales assists
      const tokensWithUsers = tokens.map((t) => ({
        ...t,
        assignedToUser: t.assignedToUserId ? userMap.get(t.assignedToUserId) : null,
      }));

      const salesAssistsWithUsers = salesAssists.map((s) => ({
        ...s,
        salesAgent: s.salesAgentId ? userMap.get(s.salesAgentId) : null,
      }));

      // Fetch consultation notes for orders
      const orderConsultationIds = orders
        .map((o) => o.consultationId)
        .filter(Boolean) as string[];
      const orderConsultations = orderConsultationIds.length > 0
        ? await prisma.consultation.findMany({
            where: { id: { in: orderConsultationIds } },
            select: { id: true, notes: true },
          }).catch(() => [])
        : [];

      const consultationMap = new Map(orderConsultations.map((c) => [c.id, c]));

      const ordersWithConsultation = orders.map((o) => ({
        ...o,
        consultation: o.consultationId ? consultationMap.get(o.consultationId) : null,
      }));

      // Fetch Shopify orders
      const shopifyOrders = await fetchShopifyOrdersByEmail(visitor.email).catch(() => []);

      // Get draft orders from sales assists
      const draftOrders = salesAssists
        .filter((s) => s.checkoutLink)
        .map((s) => ({
          consultationId: s.consultationId,
          checkoutUrl: s.checkoutLink,
          createdAt: s.createdAt,
          status: s.status,
        }));

      res.json({
        visitor: {
          ...visitor,
          birthDetails,
          consultations: consultationsWithRecommendations,
          orders: ordersWithConsultation,
          tokens: tokensWithUsers,
          salesAssists: salesAssistsWithUsers,
        },
        shopifyOrders,
        draftOrders,
      });
    })
  );

  // Expert queue endpoints
  router.get(
    "/expert/queue",
    requireAuth,
    requireRole(["EXPERT", "ADMIN"]),
    asyncHandler(async (req, res) => {
      const user = (req as any).user;
      const eventId = z.string().parse(req.query.eventId);
      
      const whereClause: any = { 
        eventId, 
        status: { in: ["WAITING", "IN_PROGRESS"] },
      };

      // For EXPERT role, show tokens with no expert assigned OR assigned to this expert
      if (user.role === "EXPERT") {
        whereClause.OR = [
          { consultation: { expertId: null } },
          { consultation: { expertId: user.id } },
        ];
      }

      const tokens = await prisma.token.findMany({
        where: whereClause,
        orderBy: [{ tokenNo: "asc" }],
        include: { 
          visitor: { select: { id: true, name: true, phone: true } }, 
          consultation: true 
        },
      });
      
      res.json(tokens);
    })
  );

  // Sales agent endpoints
  router.get(
    "/sales/orders",
    requireAuth,
    requireRole(["SALES", "ADMIN"]),
    asyncHandler(async (req, res) => {
      const user = (req as any).user;
      const { eventId, status } = req.query;

      const where: any = {};
      if (eventId) {
        where.consultation = { eventId: String(eventId) };
      }
      if (status) {
        where.orderStatus = String(status);
      }
      // Don't filter by processedBy for SALES - they should see all orders for the event
      // The processedBy field is only set when order is processed, not when created

      const orders = await prisma.order.findMany({
        where,
        include: {
          consultation: {
            include: {
              visitor: { select: { id: true, name: true, phone: true, email: true } },
              recommendations: { 
                include: { exhibitItem: true },
                orderBy: { priority: "asc" }
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100, // Increased limit
      });

      // Log for debugging
      console.log(`[Sales Orders] Query params: eventId=${eventId}, status=${status}`);
      console.log(`[Sales Orders] Found ${orders.length} orders`);
      if (orders.length > 0) {
        console.log(`[Sales Orders] First order consultation eventId: ${orders[0].consultation?.eventId}`);
      }

      res.json(orders);
    })
  );

  router.get(
    "/sales/recommendations",
    requireAuth,
    requireRole(["SALES", "ADMIN"]),
    asyncHandler(async (req, res) => {
      const { eventId } = req.query;
      if (!eventId) {
        res.status(400).json({ error: "eventId required" });
        return;
      }

      // Optimized query: limit results to avoid sort memory issues
      const consultations = await prisma.consultation.findMany({
        where: {
          eventId: String(eventId),
          recommendationLock: { isNot: null },
        },
        select: {
          id: true,
          createdAt: true,
          visitor: { select: { id: true, name: true, phone: true, email: true } },
          salesAssist: true,
          orders: { select: { id: true, orderNumber: true, orderStatus: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100, // Limit to most recent 100 consultations
      });

      if (consultations.length === 0) {
        res.json([]);
        return;
      }

      // Fetch all recommendations in one query and group by consultationId
      const consultationIds = consultations.map((c) => c.id);
      const allRecommendations = await prisma.recommendationItem.findMany({
        where: {
          consultationId: { in: consultationIds },
        },
        include: { exhibitItem: true },
      });

      // Group recommendations by consultationId and sort by priority
      const recommendationsByConsultation = new Map<string, typeof allRecommendations>();
      allRecommendations.forEach((rec) => {
        if (!recommendationsByConsultation.has(rec.consultationId)) {
          recommendationsByConsultation.set(rec.consultationId, []);
        }
        recommendationsByConsultation.get(rec.consultationId)!.push(rec);
      });

      // Sort recommendations by priority for each consultation
      recommendationsByConsultation.forEach((recs) => {
        recs.sort((a, b) => a.priority - b.priority);
      });

      // Fetch draft order details for consultations that have draft orders
      const consultationsWithRecommendations = await Promise.all(
        consultations.map(async (consultation) => {
          let draftOrderDetails = null;
          if (consultation.salesAssist?.shopifyDraftId) {
            try {
              const draftOrderGid = consultation.salesAssist.shopifyDraftId;
              draftOrderDetails = await getShopifyDraftOrder(draftOrderGid);
            } catch (err) {
              console.error(`Error fetching draft order for consultation ${consultation.id}:`, err);
              // Continue without draft order details
            }
          }

          return {
            ...consultation,
            recommendations: recommendationsByConsultation.get(consultation.id) || [],
            draftOrderDetails, // Include draft order details if available
          };
        })
      );

      res.json(consultationsWithRecommendations);
    })
  );

  router.post(
    "/sales/:consultationId/checkout-link",
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          checkoutLink: z.string().url().optional(),
          status: z.enum(["INTERESTED", "HOLD", "PURCHASED", "FOLLOW_UP"]).optional(),
          salesNotes: z.string().optional(),
        })
        .parse(req.body);

      const consultation = await prisma.consultation.findUnique({
        where: { id: req.params.consultationId },
      });
      if (!consultation) {
        res.status(404).json({ error: "Consultation not found" });
        return;
      }

      const assist = await prisma.salesOrderAssist.upsert({
        where: { consultationId: req.params.consultationId },
        update: {
          checkoutLink: body.checkoutLink,
          status: body.status,
          salesNotes: body.salesNotes,
        },
        create: {
          consultationId: req.params.consultationId,
          visitorId: consultation.visitorId,
          checkoutLink: body.checkoutLink,
          status: body.status ?? "INTERESTED",
          salesNotes: body.salesNotes,
        },
      });

      res.json(assist);
    })
  );

  router.get(
    "/admin/event/:eventId",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const event = await prisma.event.findUnique({
        where: { id: req.params.eventId },
      });
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.json(event);
    })
  );

  router.get(
    "/admin/event/:eventId/overview",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const [registrations, tokens, consultations, sales] = await Promise.all([
        prisma.visitor.count({ where: { eventId } }),
        prisma.token.count({ where: { eventId } }),
        prisma.consultation.count({ where: { eventId } }),
        prisma.salesOrderAssist.count({
          where: { consultation: { eventId } },
        }),
      ]);

      const nowServing = await prisma.token.findFirst({
        where: { eventId, status: "IN_PROGRESS" },
        orderBy: { updatedAt: "desc" },
      });

      res.json({
        registrations,
        tokens,
        consultations,
        sales,
        nowServing,
      });
    })
  );

  router.post(
    "/admin/event/:eventId/announcements",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          title: z.string(),
          message: z.string(),
          priority: z.number().optional(),
          startAt: z.string().optional(),
          endAt: z.string().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);
      const announcement = await prisma.announcement.create({
        data: {
          eventId: req.params.eventId,
          title: body.title,
          message: body.message,
          priority: body.priority ?? 1,
          startAt: body.startAt ? new Date(body.startAt) : undefined,
          endAt: body.endAt ? new Date(body.endAt) : undefined,
          isActive: body.isActive ?? true,
        },
      });
      res.json(announcement);
    })
  );

  router.put(
    "/admin/announcements/:id",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          title: z.string().optional(),
          message: z.string().optional(),
          priority: z.number().optional(),
          startAt: z.string().optional(),
          endAt: z.string().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);
      const announcement = await prisma.announcement.update({
        where: { id: req.params.id },
        data: {
          title: body.title,
          message: body.message,
          priority: body.priority,
          startAt: body.startAt ? new Date(body.startAt) : undefined,
          endAt: body.endAt ? new Date(body.endAt) : undefined,
          isActive: body.isActive,
        },
      });
      res.json(announcement);
    })
  );

  router.post(
    "/admin/event/:eventId/itinerary",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          timeLabel: z.string(),
          title: z.string(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);
      const item = await prisma.itineraryItem.create({
        data: {
          eventId: req.params.eventId,
          timeLabel: body.timeLabel,
          title: body.title,
          description: body.description,
          isActive: body.isActive ?? true,
        },
      });
      res.json(item);
    })
  );

  router.post(
    "/admin/event/:eventId/exhibits",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          type: z.string(),
          name: z.string(),
          rarity: z.string().optional(),
          deity: z.string().optional(),
          planet: z.string().optional(),
          benefits: z.array(z.string()).optional(),
          beejMantra: z.string().optional().nullable(),
          images: z.array(z.string()).optional(),
          model3dUrl: z.string().optional(),
          darshanStart: z.string().optional(),
          darshanEnd: z.string().optional(),
          isVisible: z.boolean().optional(),
          tags: z.array(z.string()).optional(),
          shopifyProductId: z.string().optional(),
          shopifyVariantId: z.string().optional(),
          qrCode: z.string().optional().nullable(),
          actualPrice: z.number().optional().nullable(),
          discountPercentage: z.number().optional().nullable(),
          discountedPrice: z.number().optional().nullable(),
        })
        .parse(req.body);

      // Validate model3dUrl is a valid URL if provided and not empty
      if (body.model3dUrl !== undefined && body.model3dUrl !== null && body.model3dUrl.trim() !== "") {
        let trimmedUrl = body.model3dUrl.trim();
        
        // Extract URL from iframe tag if user pasted the entire iframe
        const iframeMatch = trimmedUrl.match(/src=["']([^"']+)["']/);
        if (iframeMatch) {
          trimmedUrl = iframeMatch[1];
        }
        
        try {
          new URL(trimmedUrl);
          // Update body.model3dUrl with the extracted/trimmed URL
          body.model3dUrl = trimmedUrl;
        } catch (err) {
          res.status(400).json({ 
            error: "model3dUrl must be a valid URL",
            details: `Invalid URL: ${trimmedUrl}`,
            received: body.model3dUrl,
            hint: "Please provide just the URL (e.g., https://poly.cam/capture/...) or paste the iframe tag and we'll extract the URL"
          });
          return;
        }
      }

      // Fetch description from Shopify if description is empty and shopifyProductId is provided
      let description = body.description && body.description.trim() !== "" ? body.description.trim() : null;
      const shopifyProductId = body.shopifyProductId && body.shopifyProductId.trim() !== "" ? body.shopifyProductId.trim() : null;
      
      if (!description && shopifyProductId) {
        try {
          const shopifyProduct = await fetchShopifyProduct(shopifyProductId);
          if (shopifyProduct && shopifyProduct.description) {
            description = shopifyProduct.description;
            console.log(`Fetched description from Shopify for product ${shopifyProductId}`);
          }
        } catch (error) {
          console.error("Error fetching Shopify product description:", error);
          // Continue without description from Shopify
        }
      }

      // Prepare data, converting empty strings to null
      const createData: any = {
        eventId: req.params.eventId,
        type: body.type,
        name: body.name,
        rarity: body.rarity && body.rarity.trim() !== "" ? body.rarity : null,
        deity: body.deity && body.deity.trim() !== "" ? body.deity : null,
        planet: body.planet && body.planet.trim() !== "" ? body.planet : null,
        benefits: body.benefits,
        description: description,
        beejMantra: body.beejMantra && body.beejMantra.trim() !== "" ? body.beejMantra : null,
        images: body.images,
        model3dUrl: body.model3dUrl && body.model3dUrl.trim() !== "" ? body.model3dUrl.trim() : null,
        darshanStart: body.darshanStart && body.darshanStart.trim() !== "" ? new Date(body.darshanStart) : null,
        darshanEnd: body.darshanEnd && body.darshanEnd.trim() !== "" ? new Date(body.darshanEnd) : null,
        isVisible: body.isVisible ?? true,
        tags: body.tags,
        shopifyProductId: shopifyProductId,
        shopifyVariantId: body.shopifyVariantId && body.shopifyVariantId.trim() !== "" ? body.shopifyVariantId : null,
        qrCode: body.qrCode && body.qrCode.trim() !== "" ? body.qrCode.trim() : null,
        actualPrice: body.actualPrice !== undefined && body.actualPrice !== null ? parseFloat(String(body.actualPrice)) : null,
        discountPercentage: body.discountPercentage !== undefined && body.discountPercentage !== null ? parseFloat(String(body.discountPercentage)) : null,
        discountedPrice: body.discountedPrice !== undefined && body.discountedPrice !== null ? parseFloat(String(body.discountedPrice)) : null,
      };

      const exhibit = await prisma.exhibitItem.create({
        data: createData,
      });
      res.json(exhibit);
    })
  );

  router.post(
    "/admin/event/:eventId/ops-checklist",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          category: z.string(),
          itemName: z.string(),
          requiredQty: z.number(),
          packedQty: z.number().optional(),
          status: z.string().optional(),
          assignedTo: z.string().optional(),
          notes: z.string().optional(),
        })
        .parse(req.body);
      const item = await prisma.opsInventoryChecklist.create({
        data: {
          eventId: req.params.eventId,
          category: body.category,
          itemName: body.itemName,
          requiredQty: body.requiredQty,
          packedQty: body.packedQty ?? 0,
          status: body.status ?? "pending",
          assignedTo: body.assignedTo,
          notes: body.notes,
        },
      });
      res.json(item);
    })
  );

  router.put(
    "/admin/ops-checklist/:id",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          status: z.string().optional(),
          packedQty: z.number().optional(),
          assignedTo: z.string().optional(),
          notes: z.string().optional(),
        })
        .parse(req.body);
      const item = await prisma.opsInventoryChecklist.update({
        where: { id: req.params.id },
        data: body,
      });
      res.json(item);
    })
  );

  // Admin GET endpoints
  router.get(
    "/admin/event/:eventId/exhibits",
    requireAuth,
    requireRole(["ADMIN", "EXHIBITION_MANAGER"]),
    asyncHandler(async (req, res) => {
      const exhibits = await prisma.exhibitItem.findMany({
        where: { eventId: req.params.eventId },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      });
      res.json(exhibits);
    })
  );

  router.get(
    "/admin/event/:eventId/announcements",
    requireAuth,
    requireRole(["ADMIN", "EXHIBITION_MANAGER"]),
    asyncHandler(async (req, res) => {
      const announcements = await prisma.announcement.findMany({
        where: { eventId: req.params.eventId },
        orderBy: [{ createdAt: "desc" }],
      });
      res.json(announcements);
    })
  );

  router.get(
    "/admin/event/:eventId/itinerary",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const items = await prisma.itineraryItem.findMany({
        where: { eventId: req.params.eventId },
        orderBy: [{ timeLabel: "asc" }],
      });
      res.json(items);
    })
  );

  router.get(
    "/admin/event/:eventId/tokens",
    requireAuth,
    requireRole(["ADMIN", "EXPERT"]),
    asyncHandler(async (req, res) => {
      const tokens = await prisma.token.findMany({
        where: { eventId: req.params.eventId },
        include: {
          visitor: { select: { id: true, name: true, phone: true } },
        },
        orderBy: [{ tokenNo: "asc" }],
      });
      res.json(tokens);
    })
  );

  // Admin endpoint to create visitor with OTP, QR code, and login link
  // Placed here with other admin event routes for proper ordering
  router.post(
    "/admin/event/:eventId/visitors/create",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const body = z
        .object({
          name: z.string().min(2),
          phone: phoneSchema,
          email: emailSchema,
          existingCustomer: z.boolean().optional().default(false),
          consentWhatsapp: z.boolean().optional().default(true),
        })
        .parse(req.body);

      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      // Generate OTP
      const otp = createOtp(body.phone);

      // Create or update visitor
      const visitor = await prisma.visitor.upsert({
        where: {
          eventId_phone: {
            eventId: event.id,
            phone: body.phone,
          },
        },
        update: {
          name: body.name,
          email: body.email,
          existingCustomer: body.existingCustomer,
          consentWhatsapp: body.consentWhatsapp,
        },
        create: {
          eventId: event.id,
          name: body.name,
          phone: body.phone,
          email: body.email,
          otpVerified: false,
          existingCustomer: body.existingCustomer,
          consentWhatsapp: body.consentWhatsapp,
        },
      });

      // Generate login token (JWT with visitor ID and event slug)
      const loginToken = signToken({
        id: visitor.id,
        email: visitor.email,
        role: "VISITOR",
        name: visitor.name,
      });

      // Generate login link
      const baseUrl = process.env.WEB_ORIGIN || "http://localhost:5173";
      const loginLink = `${baseUrl}/e/${event.slug}/login?token=${encodeURIComponent(loginToken)}`;

      // Generate QR code as data URL
      let qrCodeDataUrl: string;
      try {
        const qrcode = await import("qrcode");
        qrCodeDataUrl = await qrcode.default.toDataURL(loginLink, {
          width: 300,
          margin: 2,
        });
      } catch (error) {
        console.error("QR code generation error:", error);
        qrCodeDataUrl = "";
      }

      // Send WhatsApp message with login link (WhatsApp is now compulsory)
      const registrationSent = await sendWhatsAppNotification(
        event.id,
        "visitor_registration",
        visitor,
        [
          { type: "text", text: visitor.name },
          { type: "text", text: loginLink },
        ]
      ).catch(err => {
        console.error("Visitor registration WhatsApp send error:", err);
        return { success: false };
      });

      res.json({
        visitor,
        otp,
        loginLink,
        qrCodeDataUrl,
        whatsappSent: registrationSent.success || false,
      });
    })
  );

  // Admin endpoint to send OTP via WhatsApp (step 1)
  router.post(
    "/admin/event/:eventId/visitors/send-otp",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const body = z
        .object({
          phone: phoneSchema,
        })
        .parse(req.body);

      // Generate OTP
      const otp = createOtp(body.phone);

      // Send OTP via WhatsApp using the new API
      let whatsappSent = false;
      let whatsappError: string | null = null;
      try {
        // Format phone number with country code (ensure it starts with +)
        let phoneNumber = body.phone.trim();
        
        // Remove any spaces, dashes, or parentheses
        phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");
        
        // Ensure phone number starts with + for international format
        if (!phoneNumber.startsWith("+")) {
          // If it doesn't start with +, add it
          // This handles cases like "9779863832800" -> "+9779863832800"
          // Or "1234567890" -> "+1234567890" (let API validate)
          phoneNumber = "+" + phoneNumber;
        }

        const otpPayload = {
          to: phoneNumber,
          code: otp,
          templateName: "otp_verification",
          templateLanguage: "en",
          channelId: process.env.WHATSAPP_CHANNEL_ID || "6971f3a7cb205bd2e61ce326",
        };

        const whatsappResponse = await fetch("https://api.whatsapp.nepalirudraksha.com/auth/send-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.WHATSAPP_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTc5Yzg5ZGIxMTdiMDYzYmE4ZGY4ZTgiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzAwOTM3NTcsImV4cCI6MTc3MDY5ODU1N30.4Pz5dW8LDLeKJAdY7crlgtiOq1bMDUGY6mIijCi6W6g"}`,
          },
          body: JSON.stringify(otpPayload),
        });

        const whatsappResult = await whatsappResponse.json().catch(() => ({}));
        
        whatsappSent = whatsappResponse.ok;
        
        if (!whatsappSent) {
          whatsappError = whatsappResult.message || whatsappResult.error || `HTTP ${whatsappResponse.status}`;
          console.error("WhatsApp OTP send failed:", whatsappError, whatsappResult);
        } else {
          console.log(`OTP sent successfully to ${phoneNumber} via WhatsApp`);
        }
      } catch (error: any) {
        console.error("WhatsApp OTP send error:", error);
        whatsappError = error.message || "Failed to send OTP";
      }

      res.json({
        ok: true,
        whatsappSent,
        message: whatsappSent 
          ? "OTP sent successfully via WhatsApp" 
          : whatsappError 
            ? `OTP generated but WhatsApp send failed: ${whatsappError}`
            : "OTP generated but WhatsApp send failed",
        error: whatsappError || undefined,
      });
    })
  );

  // Admin endpoint to create visitor with OTP verification (step 2)
  router.post(
    "/admin/event/:eventId/visitors/create",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const body = z
        .object({
          name: z.string().min(2),
          phone: phoneSchema,
          email: emailSchema,
          otp: z.string().length(6),
          existingCustomer: z.boolean().optional().default(false),
          consentWhatsapp: z.boolean().optional().default(true),
        })
        .parse(req.body);

      // Verify OTP
      const otpOk = verifyOtp(body.phone, body.otp);
      if (!otpOk) {
        res.status(400).json({ error: "Invalid OTP" });
        return;
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      // Create or update visitor
      const visitor = await prisma.visitor.upsert({
        where: {
          eventId_phone: {
            eventId: event.id,
            phone: body.phone,
          },
        },
        update: {
          name: body.name,
          email: body.email,
          existingCustomer: body.existingCustomer,
          consentWhatsapp: true, // WhatsApp is now compulsory
          otpVerified: true,
        },
        create: {
          eventId: event.id,
          name: body.name,
          phone: body.phone,
          email: body.email,
          otpVerified: true,
          existingCustomer: body.existingCustomer,
          consentWhatsapp: true, // WhatsApp is now compulsory
        },
      });

      // Generate login token (JWT with visitor ID and event slug)
      const loginToken = signToken({
        id: visitor.id,
        email: visitor.email,
        role: "VISITOR",
        name: visitor.name,
      });

      // Generate login link
      const baseUrl = process.env.WEB_ORIGIN || "http://localhost:5173";
      const loginLink = `${baseUrl}/e/${event.slug}/login?token=${encodeURIComponent(loginToken)}`;

      // Generate QR code as data URL
      let qrCodeDataUrl: string = "";
      try {
        // Try dynamic import first
        const qrcodeModule = await import("qrcode");
        const qrcode = qrcodeModule.default || qrcodeModule;
        qrCodeDataUrl = await qrcode.toDataURL(loginLink, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: "M",
        });
        console.log("QR code generated successfully, length:", qrCodeDataUrl.length);
      } catch (error: any) {
        console.error("QR code generation error:", error);
        console.error("Error details:", error.message);
        // Try alternative import method
        try {
          const QRCode = (await import("qrcode")).default;
          qrCodeDataUrl = await QRCode.toDataURL(loginLink, {
            width: 300,
            margin: 2,
          });
          console.log("QR code generated with alternative method");
        } catch (err2: any) {
          console.error("Alternative QR code generation also failed:", err2.message);
          // Continue without QR code
        }
      }

      // Note: visitor_welcome is now sent on first login, not during visitor creation
      // See /visitors/first-login endpoint

      res.json({
        visitor,
        loginLink,
        qrCodeDataUrl,
        whatsappSent: false, // Welcome message sent separately on first login
      });
    })
  );

  // List all generated visitors for an event
  router.get(
    "/admin/event/:eventId/visitors",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const { search } = req.query;
      
      const where: any = { eventId };
      if (search && typeof search === "string" && search.trim() !== "") {
        const searchTerm = search.trim();
        where.OR = [
          { name: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { phone: { contains: searchTerm } },
        ];
      }

      // Fetch event to get slug
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { slug: true },
      });

      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      const visitors = await prisma.visitor.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          existingCustomer: true,
          otpVerified: true,
          consentWhatsapp: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              tokens: true,
              consultations: true,
              orders: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Generate login links and QR codes for each visitor
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const visitorsWithLinks = await Promise.all(
        visitors.map(async (visitor) => {
          // Generate login token
          const loginToken = signToken({
            id: visitor.id,
            email: visitor.email,
            role: "VISITOR",
            name: visitor.name,
          });

          // Generate login link
          const loginLink = `${baseUrl}/e/${event.slug}/login?token=${encodeURIComponent(loginToken)}`;

          // Generate QR code
          let qrCodeDataUrl: string = "";
          try {
            // Try dynamic import first (same pattern as visitor creation)
            const qrcodeModule = await import("qrcode");
            const qrcode = qrcodeModule.default || qrcodeModule;
            qrCodeDataUrl = await qrcode.toDataURL(loginLink, {
              width: 200,
              margin: 2,
              errorCorrectionLevel: "M",
            });
            console.log(`QR code generated for visitor ${visitor.id}, length: ${qrCodeDataUrl.length}`);
          } catch (error: any) {
            console.error(`QR code generation error for visitor ${visitor.id}:`, error.message);
            // Try alternative import method
            try {
              const QRCode = (await import("qrcode")).default;
              qrCodeDataUrl = await QRCode.toDataURL(loginLink, {
                width: 200,
                margin: 2,
              });
              console.log(`QR code generated with alternative method for visitor ${visitor.id}`);
            } catch (err2: any) {
              console.error(`Alternative QR code generation also failed for visitor ${visitor.id}:`, err2.message);
              // Continue without QR code
            }
          }

          return {
            ...visitor,
            loginLink,
            qrCodeDataUrl,
          };
        })
      );

      res.json(visitorsWithLinks);
    })
  );

  router.get(
    "/admin/event/:eventId/customers",
    requireAuth,
    requireRole(["ADMIN", "SALES"]),
    asyncHandler(async (req, res) => {
      const { search } = req.query;
      const where: any = { eventId: req.params.eventId };
      if (search) {
        where.OR = [
          { phone: { contains: String(search) } },
          { email: { contains: String(search) } },
          { name: { contains: String(search) } },
        ];
      }
      const visitors = await prisma.visitor.findMany({
        where,
        include: {
          tokens: true,
          consultations: { include: { recommendations: true, salesAssist: true } },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 50,
      });
      res.json(visitors);
    })
  );

  router.get(
    "/admin/event/:eventId/ops-checklist",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const items = await prisma.opsInventoryChecklist.findMany({
        where: { eventId: req.params.eventId },
        orderBy: [{ category: "asc" }, { itemName: "asc" }],
      });
      res.json(items);
    })
  );

  // Admin PUT/DELETE endpoints
  router.put(
    "/admin/event/:eventId",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          name: z.string().optional(),
          venue: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          heroText: z.string().optional(),
          heroImage: z.string().optional(),
          themeConfig: z.any().optional(),
          askExpertContent: z.string().optional().nullable(),
        })
        .parse(req.body);
      const event = await prisma.event.update({
        where: { id: req.params.eventId },
        data: {
          name: body.name,
          venue: body.venue,
          startTime: body.startTime ? new Date(body.startTime) : undefined,
          endTime: body.endTime ? new Date(body.endTime) : undefined,
          heroText: body.heroText,
          heroImage: body.heroImage,
          themeConfig: body.themeConfig,
          askExpertContent: body.askExpertContent !== undefined ? (body.askExpertContent && body.askExpertContent.trim() !== "" ? body.askExpertContent.trim() : null) : undefined,
        },
      });
      res.json(event);
    })
  );

  router.put(
    "/admin/exhibits/:id",
    requireAuth,
    requireRole(["ADMIN", "EXHIBITION_MANAGER"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          name: z.string().optional(),
          rarity: z.string().optional(),
          deity: z.string().optional(),
          planet: z.string().optional(),
          benefits: z.array(z.string()).optional(),
          description: z.string().optional(),
          beejMantra: z.string().optional().nullable(),
          images: z.array(z.string()).optional(),
          model3dUrl: z.string().optional(),
          darshanStart: z.string().optional(),
          darshanEnd: z.string().optional(),
          isVisible: z.boolean().optional(),
          tags: z.array(z.string()).optional(),
          shopifyProductId: z.string().optional(),
          shopifyVariantId: z.string().optional(),
          qrCode: z.string().optional().nullable(),
          actualPrice: z.number().optional().nullable(),
          discountPercentage: z.number().optional().nullable(),
          discountedPrice: z.number().optional().nullable(),
        })
        .parse(req.body);
      
      // Validate model3dUrl is a valid URL if provided and not empty
      if (body.model3dUrl !== undefined && body.model3dUrl !== null && body.model3dUrl.trim() !== "") {
        const trimmedUrl = body.model3dUrl.trim();
        try {
          new URL(trimmedUrl);
        } catch (err) {
          res.status(400).json({ 
            error: "model3dUrl must be a valid URL",
            details: `Invalid URL: ${trimmedUrl}`,
            received: body.model3dUrl
          });
          return;
        }
      }
      
      // Fetch description from Shopify if description is empty and shopifyProductId is provided
      let description = body.description !== undefined 
        ? (body.description && body.description.trim() !== "" ? body.description.trim() : null)
        : undefined;
      const shopifyProductId = body.shopifyProductId !== undefined
        ? (body.shopifyProductId && body.shopifyProductId.trim() !== "" ? body.shopifyProductId.trim() : null)
        : undefined;
      
      if (description === null && shopifyProductId) {
        try {
          const shopifyProduct = await fetchShopifyProduct(shopifyProductId);
          if (shopifyProduct && shopifyProduct.description) {
            description = shopifyProduct.description;
            console.log(`Fetched description from Shopify for product ${shopifyProductId}`);
          }
        } catch (error) {
          console.error("Error fetching Shopify product description:", error);
          // Continue without description from Shopify
        }
      }
      
      // Prepare update data, converting empty strings to null
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.rarity !== undefined) updateData.rarity = body.rarity && body.rarity.trim() !== "" ? body.rarity : null;
      if (body.deity !== undefined) updateData.deity = body.deity && body.deity.trim() !== "" ? body.deity : null;
      if (body.planet !== undefined) updateData.planet = body.planet && body.planet.trim() !== "" ? body.planet : null;
      if (body.benefits !== undefined) updateData.benefits = body.benefits;
      if (description !== undefined) updateData.description = description;
      if (body.beejMantra !== undefined) updateData.beejMantra = body.beejMantra && body.beejMantra.trim() !== "" ? body.beejMantra : null;
      if (body.images !== undefined) updateData.images = body.images;
      if (body.model3dUrl !== undefined) updateData.model3dUrl = body.model3dUrl && body.model3dUrl.trim() !== "" ? body.model3dUrl.trim() : null;
      if (body.darshanStart !== undefined) {
        updateData.darshanStart = body.darshanStart && body.darshanStart.trim() !== "" ? new Date(body.darshanStart) : null;
      }
      if (body.darshanEnd !== undefined) {
        updateData.darshanEnd = body.darshanEnd && body.darshanEnd.trim() !== "" ? new Date(body.darshanEnd) : null;
      }
      if (body.isVisible !== undefined) updateData.isVisible = body.isVisible;
      if (body.tags !== undefined) updateData.tags = body.tags;
      if (shopifyProductId !== undefined) updateData.shopifyProductId = shopifyProductId;
      if (body.shopifyVariantId !== undefined) updateData.shopifyVariantId = body.shopifyVariantId && body.shopifyVariantId.trim() !== "" ? body.shopifyVariantId : null;
      if (body.qrCode !== undefined) updateData.qrCode = body.qrCode && body.qrCode.trim() !== "" ? body.qrCode.trim() : null;
      if (body.actualPrice !== undefined) updateData.actualPrice = body.actualPrice !== null ? parseFloat(String(body.actualPrice)) : null;
      if (body.discountPercentage !== undefined) updateData.discountPercentage = body.discountPercentage !== null ? parseFloat(String(body.discountPercentage)) : null;
      if (body.discountedPrice !== undefined) updateData.discountedPrice = body.discountedPrice !== null ? parseFloat(String(body.discountedPrice)) : null;

      const exhibit = await prisma.exhibitItem.update({
        where: { id: req.params.id },
        data: updateData,
      });
      res.json(exhibit);
    })
  );

  router.delete(
    "/admin/exhibits/:id",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      await prisma.exhibitItem.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    })
  );

  router.put(
    "/admin/itinerary/:id",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          timeLabel: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(req.body);
      const item = await prisma.itineraryItem.update({
        where: { id: req.params.id },
        data: body,
      });
      res.json(item);
    })
  );

  router.delete(
    "/admin/itinerary/:id",
    requireAuth,
    requireRole(["ADMIN"]),
    asyncHandler(async (req, res) => {
      await prisma.itineraryItem.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    })
  );

  // Token control endpoints
  router.patch(
    "/admin/tokens/:id/status",
    requireAuth,
    requireRole(["ADMIN", "EXPERT"]),
    asyncHandler(async (req, res) => {
      const body = z
        .object({
          status: z.enum(["WAITING", "IN_PROGRESS", "DONE", "NO_SHOW"]),
          assignedDesk: z.string().optional(),
        })
        .parse(req.body);
      const token = await prisma.token.update({
        where: { id: req.params.id },
        data: { status: body.status, assignedDesk: body.assignedDesk },
      });
      if (io) {
        broadcastEvent(io, token.eventId, "token_updated", token);
      }
      res.json(token);
    })
  );

  router.get("/otp/debug", (req, res) => {
    if (process.env.NODE_ENV === "production") {
      res.status(404).end();
      return;
    }
    const phone = z.string().parse(req.query.phone);
    res.json({ phone, otp: peekOtp(phone) });
  });

  return router;
}
