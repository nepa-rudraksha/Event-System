import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard, PrimaryButton, Field, Input, GhostButton } from "../../components/ui";
import { AdminNav } from "../../components/AdminNav";
import { MessageIcon } from "../../components/Icons";
import { getAdminToken } from "../../lib/adminSession";
import { api } from "../../lib/api";

export default function AddVisitor() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "otp" | "success">("details");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [existingCustomer, setExistingCustomer] = useState(false);
  const [consentWhatsapp, setConsentWhatsapp] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>();
  
  const [result, setResult] = useState<{
    visitor: any;
    loginLink: string;
    qrCodeDataUrl: string;
    whatsappSent: boolean;
  } | null>(null);

  const handleSendOtp = async () => {
    if (!phone) {
      alert("Please enter phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/admin/event/${eventId}/visitors/send-otp`, {
        phone,
      }, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      
      setOtpSent(true);
      setDevOtp(res.data.otp); // Show OTP in dev mode
      setStep("otp");
      alert(res.data.message || "OTP sent successfully!");
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !phone || !email || !otp) {
      alert("Please fill in all required fields including OTP");
      return;
    }

    if (otp.length !== 6) {
      alert("OTP must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/admin/event/${eventId}/visitors/create`, {
        name,
        phone,
        email,
        otp,
        existingCustomer,
        consentWhatsapp,
      }, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      
      setResult(res.data);
      setStep("success");
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || "Failed to create visitor");
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!result) return;
    
    // The WhatsApp message should have been sent automatically, but we can show a confirmation
    alert(result.whatsappSent 
      ? "WhatsApp message sent successfully!" 
      : "WhatsApp message could not be sent. Please check visitor's consent and try again.");
  };

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <AdminNav title="Add Visitor" />
        <p className="text-body text-textLight -mt-4">Create a new visitor account with OTP, QR code, and login link</p>

        {step === "details" && (
          <SectionCard>
            <h2 className="text-heading text-textDark mb-4">Step 1: Visitor Details</h2>
            <div className="space-y-4">
              <Field label="Name *">
                <Input
                  value={name}
                  onChange={setName}
                  placeholder="Enter visitor name"
                />
              </Field>

              <Field label="Phone (WhatsApp) *">
                <div className="flex gap-2">
                  <Input
                    value={phone}
                    onChange={setPhone}
                    placeholder="Enter phone number"
                    type="tel"
                    className="flex-1"
                  />
                  <PrimaryButton 
                    onClick={handleSendOtp} 
                    disabled={loading || !phone}
                    className="whitespace-nowrap"
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </PrimaryButton>
                </div>
              </Field>

              <Field label="Email *">
                <Input
                  value={email}
                  onChange={setEmail}
                  placeholder="Enter email address"
                  type="email"
                />
              </Field>

              <Field label="Existing Customer">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={existingCustomer}
                    onChange={(e) => setExistingCustomer(e.target.checked)}
                    className="w-4 h-4 text-gold rounded border-creamDark focus:ring-gold"
                  />
                  <span className="text-body text-textMedium">Mark as existing customer</span>
                </label>
              </Field>

              <Field label="WhatsApp Consent">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentWhatsapp}
                    onChange={(e) => setConsentWhatsapp(e.target.checked)}
                    className="w-4 h-4 text-gold rounded border-creamDark focus:ring-gold"
                  />
                  <span className="text-body text-textMedium">Visitor consents to WhatsApp messages</span>
                </label>
              </Field>
            </div>
          </SectionCard>
        )}

        {step === "otp" && (
          <SectionCard>
            <h2 className="text-heading text-textDark mb-4">Step 2: Verify OTP</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gold/10 border-2 border-gold rounded-lg">
                <p className="text-body text-textDark font-semibold mb-2">
                  OTP has been sent to {phone} via WhatsApp
                </p>
                {devOtp && (
                  <p className="text-sm text-textMedium">
                    <strong>Dev OTP:</strong> <span className="font-mono">{devOtp}</span>
                  </p>
                )}
              </div>

              <Field label="Enter OTP *">
                <Input
                  value={otp}
                  onChange={setOtp}
                  placeholder="Enter 6-digit OTP"
                  type="text"
                  maxLength={6}
                />
              </Field>

              <div className="flex gap-3">
                <PrimaryButton onClick={handleCreate} disabled={loading || otp.length !== 6}>
                  {loading ? "Creating..." : "Verify OTP & Create Visitor"}
                </PrimaryButton>
                <GhostButton onClick={() => {
                  setStep("details");
                  setOtp("");
                  setOtpSent(false);
                }}>
                  Back
                </GhostButton>
              </div>
            </div>
          </SectionCard>
        )}

        {step === "success" && result && (
          <div className="space-y-6">
            <SectionCard>
              <h2 className="text-heading text-textDark mb-4">Visitor Created Successfully!</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-textLight">Name</div>
                  <div className="text-body text-textDark font-semibold">{result.visitor.name}</div>
                </div>
                <div>
                  <div className="text-sm text-textLight">Phone</div>
                  <div className="text-body text-textDark">{result.visitor.phone}</div>
                </div>
                <div>
                  <div className="text-sm text-textLight">Email</div>
                  <div className="text-body text-textDark">{result.visitor.email}</div>
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-heading text-textDark mb-4">QR Code</h2>
              {result.qrCodeDataUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={result.qrCodeDataUrl}
                    alt="Visitor Login QR Code"
                    className="border-2 border-creamDark rounded-lg p-4 bg-white max-w-full"
                  />
                  <a
                    href={result.qrCodeDataUrl}
                    download={`visitor-qr-${result.visitor.phone}.png`}
                    className="text-gold hover:underline"
                  >
                    Download QR Code
                  </a>
                </div>
              ) : (
                <div className="text-center py-8 text-textMedium">
                  QR code generation failed. Please try again or use the login link.
                </div>
              )}
            </SectionCard>

            <SectionCard>
              <h2 className="text-heading text-textDark mb-4">Login Link</h2>
              <div className="space-y-3">
                <div className="p-3 bg-creamDark/50 rounded-lg break-all">
                  <div className="text-sm text-textLight mb-1">Link:</div>
                  <div className="text-body text-textDark font-mono text-sm">{result.loginLink}</div>
                </div>
                <div className="flex gap-3">
                  <PrimaryButton
                    onClick={() => {
                      navigator.clipboard.writeText(result.loginLink);
                      alert("Login link copied to clipboard!");
                    }}
                  >
                    Copy Link
                  </PrimaryButton>
                  <a
                    href={result.loginLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <GhostButton>Open Link</GhostButton>
                  </a>
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <h2 className="text-heading text-textDark mb-4">Send via WhatsApp</h2>
              <div className="space-y-3">
                <div className="text-body text-textMedium">
                  {result.whatsappSent
                    ? "✅ WhatsApp message sent successfully!"
                    : "⚠️ WhatsApp message could not be sent. You can manually share the QR code and login link."}
                </div>
                <PrimaryButton onClick={handleSendWhatsApp}>
                  <div className="flex items-center gap-2">
                    <MessageIcon size={18} />
                    <span>Resend WhatsApp Message</span>
                  </div>
                </PrimaryButton>
              </div>
            </SectionCard>

            <div className="flex gap-3">
              <PrimaryButton onClick={() => {
                setResult(null);
                setStep("details");
                setName("");
                setPhone("");
                setEmail("");
                setOtp("");
                setExistingCustomer(false);
                setConsentWhatsapp(true);
                setOtpSent(false);
                setDevOtp(undefined);
              }}>
                Create Another Visitor
              </PrimaryButton>
              <GhostButton onClick={() => navigate(`/admin/event/${eventId}/visitors`)}>
                View All Visitors
              </GhostButton>
              <GhostButton onClick={() => navigate(`/admin/event/${eventId}/customers`)}>
                Back to Customer CRM
              </GhostButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
