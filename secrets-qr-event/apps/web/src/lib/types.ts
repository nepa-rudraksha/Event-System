export type EventInfo = {
  id: string;
  slug: string;
  name: string;
  venue: string;
  startTime: string;
  endTime: string;
  heroText?: string | null;
  heroImage?: string | null;
  themeConfig?: Record<string, unknown> | null;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  priority: number;
  startAt?: string | null;
  endAt?: string | null;
};

export type ItineraryItem = {
  id: string;
  timeLabel: string;
  title: string;
  description?: string | null;
};

export type ExhibitItem = {
  id: string;
  type: string;
  name: string;
  rarity?: string | null;
  deity?: string | null;
  planet?: string | null;
  benefits?: string[] | null;
  beejMantra?: string | null;
  images?: string[] | null;
  model3dUrl?: string | null;
  darshanStart?: string | null;
  darshanEnd?: string | null;
  tags?: string[] | null;
  shopifyVariantId?: string | null;
};

export type Visitor = {
  id: string;
  name: string;
  phone: string;
  email: string;
  otpVerified: boolean;
  existingCustomer: boolean;
  consentWhatsapp: boolean;
};

export type Token = {
  id: string;
  tokenNo: number;
  status: "WAITING" | "IN_PROGRESS" | "DONE" | "NO_SHOW";
  createdAt: string;
};

export type RecommendationItem = {
  id: string;
  priority: number;
  reason: string;
  notes?: string | null;
  exhibitItemId?: string | null;
  mappedShopifyVariantId?: string | null;
};

export type Consultation = {
  id: string;
  notes?: string | null;
  recommendations?: RecommendationItem[];
  salesAssist?: {
    checkoutLink?: string | null;
    status: "INTERESTED" | "HOLD" | "PURCHASED" | "FOLLOW_UP";
    salesNotes?: string | null;
  } | null;
};
