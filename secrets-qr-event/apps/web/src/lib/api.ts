import axios from "axios";
import type {
  Announcement,
  EventInfo,
  ExhibitItem,
  ItineraryItem,
  Visitor,
} from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
});

api.interceptors.request.use((config) => {
  // Check if Authorization header is already set (case-insensitive check)
  const hasAuthHeader = config.headers.Authorization || 
                       config.headers.authorization ||
                       (config.headers as any)['Authorization'] ||
                       (config.headers as any)['authorization'];
  
  // Don't add admin token if Authorization is already set or if it's a visitor/auth endpoint
  const isVisitorEndpoint = config.url?.includes("/auth/verify-visitor") || 
                           config.url?.includes("/visitors/first-login") ||
                           (config.url?.includes("/events/") && !config.url?.includes("/admin/"));
  
  if (!hasAuthHeader && !isVisitorEndpoint) {
    const raw = localStorage.getItem("nr_admin_session");
    if (raw) {
      try {
        const session = JSON.parse(raw) as { token?: string };
        if (session.token) {
          config.headers.Authorization = `Bearer ${session.token}`;
        }
      } catch {
        // ignore parsing errors
      }
    }
  }
  return config;
});

export async function fetchEvent(slug: string) {
  const { data } = await api.get<EventInfo>(`/events/${slug}`);
  return data;
}

export async function requestOtp(phone: string) {
  const { data } = await api.post<{ ok: boolean; devOtp?: string }>(
    "/otp/request",
    { phone }
  );
  return data;
}

export async function verifyOtp(phone: string, code: string) {
  const { data } = await api.post<{ ok: boolean }>("/otp/verify", {
    phone,
    code,
  });
  return data.ok;
}

export async function registerVisitor(slug: string, payload: {
  name: string;
  phone: string;
  email: string;
  otp: string;
  existingCustomer: boolean;
  consentWhatsapp: boolean;
}) {
  const { data } = await api.post<{ visitor: Visitor; event: EventInfo }>(
    `/events/${slug}/visitors/register`,
    payload
  );
  return data;
}

export async function fetchAnnouncements(eventId: string) {
  const { data } = await api.get<Announcement[]>(
    `/events/${eventId}/announcements`
  );
  return data;
}

export async function fetchItinerary(eventId: string) {
  const { data } = await api.get<ItineraryItem[]>(
    `/events/${eventId}/itinerary`
  );
  return data;
}

export async function fetchExhibits(eventId: string, type?: string) {
  const { data } = await api.get<ExhibitItem[]>(
    `/events/${eventId}/exhibits`,
    {
      params: type ? { type } : undefined,
    }
  );
  return data;
}

export async function createToken(eventId: string, visitorId: string) {
  const { data } = await api.post(`/events/${eventId}/tokens`, { visitorId });
  return data;
}

export async function updateBirthDetails(visitorId: string, payload: {
  dob?: string;
  tob?: string;
  pob?: string;
  lat?: number;
  lng?: number;
  timezone?: string;
}) {
  const { data } = await api.put(
    `/visitors/${visitorId}/birth-details`,
    payload
  );
  return data;
}

export async function fetchVisitorSummary(visitorId: string) {
  const { data } = await api.get(`/visitors/${visitorId}/summary`);
  return data;
}

export async function fetchExpertQueue(eventId: string) {
  const { data } = await api.get(`/expert/queue`, { params: { eventId } });
  return data;
}

export async function fetchConsultation(consultationId: string) {
  const { data } = await api.get(`/consultations/${consultationId}`);
  return data;
}

export async function updateConsultationNotes(consultationId: string, notes: string) {
  const { data } = await api.patch(`/consultations/${consultationId}`, { notes });
  return data;
}

export async function updateTokenStatus(tokenId: string, status: string) {
  const { data } = await api.patch(`/tokens/${tokenId}/status`, { status });
  return data;
}

export async function lockRecommendations(
  consultationId: string,
  payload: {
    lockedByUserId?: string;
    items: Array<{
      exhibitItemId?: string;
      mappedShopifyVariantId?: string;
      productDetails?: any; // Full Shopify product details
      checkoutLink?: string; // Direct checkout link
      priority: number;
      reason: string;
      notes?: string;
    }>;
  }
) {
  const { data } = await api.post(
    `/consultations/${consultationId}/recommendations/lock`,
    payload
  );
  return data;
}

export async function fetchOrderHistory(consultationId: string) {
  const { data } = await api.get(`/consultations/${consultationId}/order-history`);
  return data;
}

export async function createDraftOrder(
  consultationId: string,
  payload: {
    lineItems: Array<{
      variantId: string;
      quantity: number;
      customAttributes?: Array<{ key: string; value: string }>;
    }>;
    note?: string;
    discount?: {
      type: "PERCENTAGE" | "FIXED_AMOUNT";
      value: number;
      title?: string;
    };
  }
) {
  const { data } = await api.post(`/consultations/${consultationId}/draft-order`, payload);
  return data;
}

export async function searchShopifyProducts(query: string, limit: number = 20) {
  const { data } = await api.get(`/shopify/products/search`, {
    params: { q: query, limit },
  });
  return data.products;
}

export async function fetchShopifyOrdersByEmail(email: string) {
  // This is handled by the backend endpoint
  return [];
}

export async function upsertCheckoutLink(
  consultationId: string,
  payload: {
    checkoutLink?: string;
    status?: string;
    salesNotes?: string;
  }
) {
  const { data } = await api.post(
    `/sales/${consultationId}/checkout-link`,
    payload
  );
  return data;
}

export async function loginAdmin(payload: { email: string; password: string }) {
  const { data } = await api.post("/auth/login", payload);
  return data as {
    token: string;
    user: { id: string; name: string; role: string };
  };
}

export async function fetchAdminEvents() {
  const { data } = await api.get(`/admin/events`);
  return data;
}

// Public endpoint to fetch active events (for login/selection)
export async function fetchEvents() {
  const { data } = await api.get(`/events`);
  return data;
}

export async function fetchAdminOverview(eventId: string) {
  const { data } = await api.get(`/admin/event/${eventId}/overview`);
  return data;
}

export async function createAnnouncement(eventId: string, payload: {
  title: string;
  message: string;
  priority?: number;
}) {
  const { data } = await api.post(`/admin/event/${eventId}/announcements`, payload);
  return data;
}

export async function sendAnnouncement(eventId: string, payload: {
  title: string;
  message: string;
}) {
  const { data } = await api.post(`/admin/event/${eventId}/announcements/send`, payload);
  return data;
}

export async function createItineraryItem(eventId: string, payload: {
  timeLabel: string;
  title: string;
  description?: string;
}) {
  const { data } = await api.post(`/admin/event/${eventId}/itinerary`, payload);
  return data;
}

export async function createExhibit(eventId: string, payload: {
  type: string;
  name: string;
  rarity?: string;
}) {
  const { data } = await api.post(`/admin/event/${eventId}/exhibits`, payload);
  return data;
}

export async function createOpsItem(eventId: string, payload: {
  category: string;
  itemName: string;
  requiredQty: number;
}) {
  const { data } = await api.post(`/admin/event/${eventId}/ops-checklist`, payload);
  return data;
}

// Expert endpoints
export async function generateAstrologyReport(consultationId: string) {
  const { data } = await api.post(`/consultations/${consultationId}/astrology-report`);
  return data;
}

// Sales endpoints
export async function fetchSalesRecommendations(eventId: string) {
  const { data } = await api.get(`/sales/recommendations?eventId=${eventId}`);
  return data;
}

export async function fetchSalesOrders(eventId?: string, status?: string) {
  const params = new URLSearchParams();
  if (eventId) params.append("eventId", eventId);
  if (status) params.append("status", status);
  const { data } = await api.get(`/sales/orders?${params.toString()}`);
  return data;
}

export async function createOrder(payload: {
  consultationId: string;
  paymentId?: string;
  paymentStatus?: "pending" | "paid" | "failed";
  totalAmount?: number;
  currency?: string;
  items?: any;
}) {
  const { data } = await api.post(`/orders`, payload);
  return data;
}

export async function processOrder(orderId: string, orderStatus?: string) {
  const { data } = await api.patch(`/orders/${orderId}/process`, { orderStatus });
  return data;
}

// WhatsApp templates
export async function fetchWhatsAppTemplates(eventId: string) {
  const { data } = await api.get(`/admin/event/${eventId}/whatsapp-templates`);
  return data;
}

export async function createWhatsAppTemplate(eventId: string, payload: {
  templateKey: string;
  templateName: string;
  description?: string;
}) {
  const { data } = await api.post(`/admin/event/${eventId}/whatsapp-templates`, payload);
  return data;
}

// Send WhatsApp notification manually
export async function sendWhatsAppNotification(consultationId: string, payload: {
  templateKey: string;
  parameters?: Array<{ type: "text"; text: string }>;
}) {
  const { data } = await api.post(`/consultations/${consultationId}/send-whatsapp`, payload);
  return data;
}

// Fetch variant prices in INR from Shopify
export async function fetchVariantPrices(variantIds: string[]) {
  interface VariantPricesResponse {
    prices: Record<string, number>;
  }
  const { data } = await api.post<VariantPricesResponse>("/shopify/variants/prices", {
    variantIds,
  });
  return data.prices;
}

export { api };
export default api;
