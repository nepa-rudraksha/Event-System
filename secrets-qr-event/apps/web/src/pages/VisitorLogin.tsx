import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppBar, AppShell, SectionCard, PrimaryButton, GhostButton } from "../components/ui";
import { setSession } from "../lib/session";
import { api } from "../lib/api";
import { QRScanner } from "../components/QRScanner";

export default function VisitorLogin() {
  const { slug = "bangalore" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      // Decode the token in case it's URL-encoded
      const decodedToken = decodeURIComponent(tokenFromUrl);
      console.log("[VisitorLogin] Token from URL:", {
        original: tokenFromUrl?.substring(0, 50) + "...",
        decoded: decodedToken?.substring(0, 50) + "...",
        length: decodedToken?.length,
      });
      setToken(decodedToken);
    }
  }, [searchParams]);

  const handleLogin = async (loginToken: string) => {
    setLoading(true);
    setError(null);
    
    // Clean and decode the token
    const cleanToken = loginToken.trim();
    console.log("[VisitorLogin] Attempting login with token:", {
      tokenPreview: cleanToken.substring(0, 50) + "...",
      tokenLength: cleanToken.length,
      startsWithEyJ: cleanToken.startsWith("eyJ"),
    });
    
    try {
      // Verify token and get visitor info
      const response = await api.get("/auth/verify-visitor", {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
        },
      });

      const { visitor, event } = response.data;

      // Set session
      setSession({
        eventId: event.id,
        eventSlug: event.slug,
        visitorId: visitor.id,
        name: visitor.name,
        phone: visitor.phone,
        email: visitor.email,
      });

      // Mark OTP as verified
      await api.post(`/events/${event.slug}/visitors/verify-otp`, {
        phone: visitor.phone,
        otp: "ADMIN_CREATED", // Special flag for admin-created visitors
      });

      // Send welcome message on first login (only once)
      try {
        await api.post("/visitors/first-login", {}, {
          headers: {
            Authorization: `Bearer ${loginToken}`,
          },
        });
      } catch (err) {
        // Silently fail - welcome message is optional
        console.log("Welcome message already sent or failed");
      }

      // Redirect to dashboard
      navigate(`/e/${event.slug}/dashboard`);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || "Invalid or expired login link");
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (scannedText: string) => {
    setShowScanner(false);
    
    // Clean the scanned text
    const cleaned = scannedText.trim();
    
    // Try to extract token from various formats
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
    
    // 2. Check if it's a partial URL (missing protocol)
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
    
    // 4. If we found a token, use it
    if (token) {
      handleLogin(token);
      return;
    }
    
    // 5. If it's just numbers or short text, it's likely not a login QR code
    // Show a helpful error message
    if (/^\d+$/.test(cleaned) || cleaned.length < 20) {
      setError(
        "This QR code doesn't appear to be a login QR code. " +
        "Please scan the QR code you received via WhatsApp or email for login. " +
        "If you're trying to scan a product QR code, please use the product scanner from the dashboard."
      );
      return;
    }
    
    // 6. Last attempt: try to find token in any format
    const tokenMatch = cleaned.match(/(?:token=)?([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
    if (tokenMatch && tokenMatch[1]) {
      token = tokenMatch[1];
      handleLogin(token);
      return;
    }
    
    // If nothing worked, show error
    setError(
      "Could not read login information from this QR code. " +
      "Please make sure you're scanning the login QR code sent to you via WhatsApp or email."
    );
  };

  if (loading) {
    return (
      <AppShell>
        <AppBar title="Logging In" />
        <SectionCard>
          <div className="text-center py-8">
            <div className="text-body text-textMedium">Verifying your login...</div>
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  if (error && !token) {
    return (
      <AppShell>
        <AppBar title="Login" />
        <SectionCard>
          <div className="text-center py-8">
            <div className="text-body text-textMedium text-red-600 mb-4">{error}</div>
            <PrimaryButton onClick={() => navigate(`/e/${slug}`)}>
              Go to Home
            </PrimaryButton>
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppBar title="Welcome" />
      <SectionCard>
        <div className="space-y-6 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {token ? (
            <>
              <div className="text-center space-y-4">
                <h2 className="text-heading text-textDark">Ready to Start Your Journey?</h2>
                <p className="text-body text-textMedium">
                  Click the button below to access your personalized dashboard
                </p>
                <PrimaryButton
                  onClick={() => handleLogin(token)}
                  className="w-full sm:w-auto px-8 py-3 text-lg"
                >
                  Start My Journey
                </PrimaryButton>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-creamDark"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-textLight">OR</span>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-body text-textMedium">Scan your QR code to login</p>
                <GhostButton
                  onClick={() => setShowScanner(true)}
                  className="w-full sm:w-auto"
                >
                  Scan QR Code
                </GhostButton>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <h2 className="text-heading text-textDark">Login with QR Code</h2>
              <p className="text-body text-textMedium">
                Scan the QR code you received to access your dashboard
              </p>
              <PrimaryButton
                onClick={() => setShowScanner(true)}
                className="w-full sm:w-auto px-8 py-3"
              >
                Scan QR Code
              </PrimaryButton>
            </div>
          )}
        </div>
      </SectionCard>

      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </AppShell>
  );
}
