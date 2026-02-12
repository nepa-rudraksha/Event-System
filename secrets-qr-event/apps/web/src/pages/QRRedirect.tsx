import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { AppShell, SectionCard } from "../components/ui";

export default function QRRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setError("QR code is required");
      setLoading(false);
      return;
    }

    // Call the backend API to get the redirect URL (request JSON response)
    api
      .get(`/qr/${code}`, {
        headers: {
          Accept: "application/json",
        },
      })
      .then((response) => {
        const redirectUrl = response.data?.redirectUrl;
        if (redirectUrl) {
          // Navigate to the exhibit detail page
          navigate(redirectUrl);
        } else {
          setError("Redirect URL not found in response");
          setLoading(false);
        }
      })
      .catch((err) => {
        let errorMessage = "Exhibit not found for this QR code";
        
        if (err.response?.status === 404) {
          errorMessage = `No exhibit found with QR code "${code}". Please make sure:\n\n1. The QR code is assigned to an exhibit in the admin panel\n2. The QR code matches exactly (case-sensitive)\n3. The exhibit is saved with the QR code`;
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setLoading(false);
      });
  }, [code, navigate]);

  if (loading) {
    return (
      <AppShell>
        <SectionCard>
          <div className="text-center py-8">
            <p className="text-body text-textMedium">Redirecting...</p>
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <SectionCard>
          <div className="text-center py-8">
            <p className="text-body text-textDark mb-2">QR Code Error</p>
            <p className="text-sm text-textMedium whitespace-pre-line">{error}</p>
            <p className="text-xs text-textLight mt-4">QR Code: <code className="bg-cream px-2 py-1 rounded">{code}</code></p>
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  return null;
}
