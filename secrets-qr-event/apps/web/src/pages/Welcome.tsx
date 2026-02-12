import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppBar, AppShell, Chip, GhostButton, PrimaryButton, SectionCard } from "../components/ui";
import { fetchEvent } from "../lib/api";
import { getSession } from "../lib/session";
import type { EventInfo } from "../lib/types";
import { QRScanner } from "../components/QRScanner";

export default function Welcome() {
  const { slug = "bangalore" } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchEvent(slug).then(setEvent).catch(() => setEvent(null));
  }, [slug]);

  const handleContinue = () => {
    const session = getSession();
    if (session?.eventSlug === slug) {
      navigate(`/e/${slug}/dashboard`);
      return;
    }
    navigate(`/e/${slug}/register`);
  };

  const handleQRScan = (scannedText: string) => {
    setShowScanner(false);
    
    // Clean the scanned text
    const cleaned = scannedText.trim();
    
    // Check if it's a login QR code first
    let token: string | null = null;
    
    // 1. Check if it's a full URL with token parameter
    try {
      const url = new URL(cleaned);
      const tokenParam = url.searchParams.get("token");
      if (tokenParam) {
        token = tokenParam;
      }
    } catch (err) {
      // Not a valid URL, continue to other checks
    }
    
    // 2. Check if it's a partial URL (missing protocol) or contains login path
    if (!token && cleaned.includes("/login?token=")) {
      try {
        const url = new URL("http://" + cleaned.replace(/^\/\//, ""));
        const tokenParam = url.searchParams.get("token");
        if (tokenParam) {
          token = tokenParam;
        }
      } catch (err) {
        // Try extracting token directly from the string
        const match = cleaned.match(/[?&]token=([^&]+)/);
        if (match && match[1]) {
          token = match[1];
        }
      }
    }
    
    // 3. Check if it's a JWT token (starts with eyJ)
    if (!token && cleaned.startsWith("eyJ")) {
      token = cleaned;
    }
    
    // 4. If we found a login token, navigate to login page
    if (token) {
      navigate(`/e/${slug}/login?token=${token}`);
      return;
    }
    
    // 5. If it's just numbers or very short, it might be a product QR code
    // Only navigate to product QR if it looks like a product code (not a login code)
    if (!cleaned.includes("login") && !cleaned.includes("token") && !cleaned.startsWith("eyJ")) {
      // Try as QR code for product redirect
      navigate(`/qr/${cleaned}`);
      return;
    }
    
    // 6. Last attempt: try to find token in any format
    const tokenMatch = cleaned.match(/(?:token=)?([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
    if (tokenMatch && tokenMatch[1]) {
      navigate(`/e/${slug}/login?token=${tokenMatch[1]}`);
      return;
    }
    
    // If nothing matched, try as product QR code (fallback)
    navigate(`/qr/${cleaned}`);
  };

  return (
    <AppShell>
      <div className="text-center space-y-6 py-8">
        <div className="space-y-3">
          <div className="text-sm font-medium text-textLight uppercase tracking-wide">
            Nepa Rudraksha Presents
          </div>
          <h1 className="text-display text-textDark leading-tight">
            {event?.name ?? "Secrets of Rudraksha with Sukritya Khatiwada"}
          </h1>
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <Chip>{event?.venue ?? "ITC Windsor, Bangalore"}</Chip>
            <Chip>9:00 AM - 6:00 PM</Chip>
          </div>
        </div>

        <p className="text-large text-textMedium leading-relaxed max-w-md mx-auto">
          A calm, premium ritual entry into the largest Rudraksha display and rare Shaligram darshan.
        </p>

        <SectionCard>
          <div className="space-y-4 text-body text-textMedium">
            <div className="flex items-start gap-3">
              <span className="text-gold text-xl">•</span>
              <span>Largest Rudraksha display</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold text-xl">•</span>
              <span>Rare Shaligram darshan</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold text-xl">•</span>
              <span>Free 1:1 consultation</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gold text-xl">•</span>
              <span>Book launch + talk by Sukritya Khatiwada</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-8 space-y-4">
        <PrimaryButton onClick={() => navigate(`/e/${slug}/register`)}>
          Start My Journey →
        </PrimaryButton>
        <GhostButton onClick={handleContinue}>
          Already registered? Continue to Dashboard
        </GhostButton>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-creamDark"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-cream text-textLight">OR</span>
          </div>
        </div>

        <GhostButton 
          onClick={() => setShowScanner(true)}
          className="w-full"
        >
          Scan QR Code to Login
        </GhostButton>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </AppShell>
  );
}
