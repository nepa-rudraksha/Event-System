import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppBar, AppShell, Chip, SectionCard, PrimaryButton } from "../components/ui";
import { CalendarIcon, MessageIcon, UserIcon } from "../components/Icons";
import { QRScanner } from "../components/QRScanner";
import { fetchAnnouncements, fetchVisitorSummary, fetchItinerary } from "../lib/api";
import { getSession } from "../lib/session";
import type { Announcement, ItineraryItem } from "../lib/types";

export default function Dashboard() {
  const { slug = "bangalore" } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [showQRScanner, setShowQRScanner] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate(`/e/${slug}`);
      return;
    }
    let cancelled = false;
    fetchAnnouncements(session.eventId)
      .then((data) => !cancelled && setAnnouncements(data))
      .catch(() => !cancelled && setAnnouncements([]));
    fetchVisitorSummary(session.visitorId)
      .then((data) => !cancelled && setSummary(data))
      .catch(() => !cancelled && setSummary(null));
    fetchItinerary(session.eventId)
      .then((data) => !cancelled && setItineraryItems(data))
      .catch(() => !cancelled && setItineraryItems([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.eventId, session?.visitorId, slug]); // Removed navigate from deps to prevent loops

  const token = summary?.tokens?.[0];
  const statusStrip = useMemo(() => {
    if (!token) return "Free Consultation Available Today";
    if (token.status === "DONE") return `Token #${token.tokenNo} completed`;
    return `Token #${token.tokenNo} • ${token.status.replace("_", " ")}`;
  }, [token]);

  return (
    <AppShell>
      <AppBar title="Event Dashboard" />
      
      {/* Status Banner */}
      <div className="mb-6 rounded-xl border-2 border-gold bg-gold/10 px-5 py-4 text-center">
        <div className="text-base font-semibold text-textDark">
          {statusStrip}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-1 gap-3">
        <Link 
          to={`/e/${slug}/consultation`} 
          className="rounded-xl border-2 border-gold bg-gold px-5 py-4 text-center text-base font-semibold text-white shadow-medium transition-all hover:bg-goldLight active:scale-[0.98]"
        >
          Book Free Consultation
        </Link>
        <PrimaryButton
          onClick={() => setShowQRScanner(true)}
          className="w-full"
        >
          Scan QR Code to View Product
        </PrimaryButton>
        <Link 
          to={`/e/${slug}/exhibits`} 
          className="rounded-xl border-2 border-creamDark bg-white px-5 py-4 text-center text-base font-semibold text-textDark shadow-soft transition-all hover:bg-cream active:scale-[0.98]"
        >
          View Products
        </Link>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <SectionCard title="Announcements">
          <div className="space-y-4">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border-2 border-creamDark bg-cream p-4"
              >
                <div className="mb-2 text-base font-semibold text-textDark">{item.title}</div>
                <div className="text-body text-textMedium">{item.message}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Itinerary */}
      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <CalendarIcon size={20} className="text-gold" />
            <span>Event Schedule</span>
          </div>
        }
        action={
          <Link 
            to={`/e/${slug}/itinerary`} 
            className="text-base font-semibold text-gold hover:underline"
          >
            View All →
          </Link>
        }
      >
        {itineraryItems.length === 0 ? (
          <p className="text-body text-textLight text-center py-2">
            No schedule published yet.
          </p>
        ) : (
          <div className="space-y-2">
            {itineraryItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Chip className="min-w-[80px] text-xs">{item.timeLabel}</Chip>
                <span className="text-body text-textDark flex-1">{item.title}</span>
              </div>
            ))}
            {itineraryItems.length > 3 && (
              <p className="text-sm text-textLight text-center pt-1">
                +{itineraryItems.length - 3} more items
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Consultation Info */}
      <SectionCard 
        title={
          <div className="flex items-center gap-2">
            <MessageIcon size={20} className="text-gold" />
            <span>About Your Consultation</span>
          </div>
        }
      >
        <p className="text-body text-textMedium leading-relaxed">
          Reserve your free 1:1 spiritual consultation token. You'll receive live updates about your position in the queue.
        </p>
        <Link 
          to={`/e/${slug}/consultation`}
          className="mt-4 inline-block text-base font-semibold text-gold hover:underline"
        >
          Book Now →
        </Link>
      </SectionCard>

      {/* Profile */}
      <SectionCard 
        title={
          <div className="flex items-center gap-2">
            <UserIcon size={20} className="text-gold" />
            <span>My Profile</span>
          </div>
        }
      >
        <div className="space-y-3 text-body text-textMedium">
          <div>
            <span className="font-semibold text-textDark">Name: </span>
            {session?.name}
          </div>
          <div>
            <span className="font-semibold text-textDark">Phone: </span>
            {session?.phone}
          </div>
          <div>
            <span className="font-semibold text-textDark">Email: </span>
            {session?.email}
          </div>
          <Link 
            to={`/e/${slug}/my-consultation`}
            className="mt-4 inline-block text-base font-semibold text-gold hover:underline"
          >
            View My Consultation Summary →
          </Link>
        </div>
      </SectionCard>

      {showQRScanner && (
        <QRScanner
          onScan={(scannedText) => {
            setShowQRScanner(false);
            
            // Clean the scanned text
            const cleaned = scannedText.trim();
            
            // Check if it's a full URL (starts with http:// or https://)
            if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
              // It's a complete URL - navigate to it directly
              window.location.href = cleaned;
              return;
            }
            
            // Check if it's a URL without protocol (e.g., www.example.com or example.com/path)
            if (cleaned.includes('.') && (cleaned.includes('/') || cleaned.includes('www.'))) {
              // Add https:// if missing and navigate
              const url = cleaned.startsWith('//') ? `https:${cleaned}` : 
                         cleaned.startsWith('/') ? cleaned : 
                         `https://${cleaned}`;
              window.location.href = url;
              return;
            }
            
            // Otherwise, treat it as a QR code and navigate to QR redirect page
            // Extract just the code part if it contains slashes or special characters
            const code = cleaned.split('/').pop() || cleaned.split('?')[0] || cleaned;
            navigate(`/qr/${code}`);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </AppShell>
  );
}
