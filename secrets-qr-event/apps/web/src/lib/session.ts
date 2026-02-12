export type SessionState = {
  eventId: string;
  eventSlug: string;
  visitorId: string;
  name: string;
  phone: string;
  email: string;
};

const KEY = "nr_session";

export function getSession(): SessionState | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export function setSession(session: SessionState) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
