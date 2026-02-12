export type AdminSession = {
  token: string;
  role: string;
  name: string;
  eventId?: string;
};

const KEY = "nr_admin_session";
const EVENT_KEY = "nr_admin_event_id";

export function setAdminSession(session: AdminSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function getAdminSession(): AdminSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function getAdminToken(): string | null {
  const session = getAdminSession();
  return session?.token ?? null;
}

export function setAdminEventId(eventId: string) {
  localStorage.setItem(EVENT_KEY, eventId);
  const session = getAdminSession();
  if (session) {
    session.eventId = eventId;
    setAdminSession(session);
  }
}

export function getAdminEventId(): string | null {
  return localStorage.getItem(EVENT_KEY);
}

export function clearAdminSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(EVENT_KEY);
}
