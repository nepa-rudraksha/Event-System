import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppBar,
  AppShell,
  Field,
  Input,
  PrimaryButton,
  SectionCard,
  StickyFooter,
} from "../components/ui";
import { PhoneIcon, ArrowRightIcon } from "../components/Icons";
import { registerVisitor, requestOtp } from "../lib/api";
import { setSession } from "../lib/session";

export default function Register() {
  const { slug = "bangalore" } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [existingCustomer, setExistingCustomer] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>();

  const canRegister = 
    name.trim().length > 2 && 
    email.includes("@") && 
    phone.trim().length >= 8 && 
    otp.length === 6;

  const otpHint = useMemo(() => {
    if (!devOtp) return null;
    return (
      <div className="text-xs text-gold/80">
        Dev OTP: <span className="font-semibold">{devOtp}</span>
      </div>
    );
  }, [devOtp]);

  const handleSendOtp = async () => {
    if (phone.length < 8) return;
    setLoading(true);
    try {
      const res = await requestOtp(phone);
      setOtpSent(true);
      setDevOtp(res.devOtp);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!canRegister) return;
    setLoading(true);
    try {
      const { visitor, event } = await registerVisitor(slug, {
        name,
        phone,
        email,
        otp,
        existingCustomer,
        consentWhatsapp: true,
      });
      setSession({
        eventId: event.id,
        eventSlug: event.slug,
        visitorId: visitor.id,
        name: visitor.name,
        phone: visitor.phone,
        email: visitor.email,
      });
      navigate(`/e/${slug}/dashboard`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <AppBar title="Register" />
      
      <div className="space-y-6">
        <div>
          <h2 className="text-title text-textDark mb-2">
            Enter Your Details
          </h2>
          <p className="text-body text-textLight">
            We'll send you a verification code to your WhatsApp number.
          </p>
        </div>

        <SectionCard>
          <div className="space-y-6">
            <Field label="Full Name" required>
              <Input 
                value={name} 
                onChange={setName} 
                placeholder="Enter your full name"
                autoFocus
              />
            </Field>

            <Field label="Email Address" required>
              <Input 
                value={email} 
                onChange={setEmail} 
                placeholder="your.email@example.com"
                type="email"
              />
            </Field>

            <Field label="WhatsApp Number" required hint="Include country code (e.g., +91)">
              <Input 
                value={phone} 
                onChange={setPhone} 
                placeholder="+91 90000 00000"
                type="tel"
              />
            </Field>

            {/* Show Send OTP button only after phone is entered */}
            {phone.length >= 8 && !otpSent && (
              <div className="pt-2">
                <PrimaryButton 
                  onClick={handleSendOtp} 
                  disabled={loading}
                >
                  <div className="flex items-center justify-center gap-2">
                    <PhoneIcon size={18} />
                    <span>Send Verification Code</span>
                  </div>
                </PrimaryButton>
              </div>
            )}

            {/* Show OTP field only after OTP is sent */}
            {otpSent && (
              <>
                <Field label="Verification Code (OTP)" required hint="Enter the 6-digit code sent to your WhatsApp">
                  <Input 
                    value={otp} 
                    onChange={(value) => {
                      // Limit to 6 digits
                      const digits = value.replace(/\D/g, '').slice(0, 6);
                      setOtp(digits);
                    }}
                    placeholder="123456"
                    type="tel"
                    autoFocus
                  />
                </Field>
                {otpHint && (
                  <div className="text-sm text-gold font-medium text-center p-3 bg-cream rounded-xl border border-gold/30">
                    Development Mode: Use code <strong>{devOtp}</strong>
                  </div>
                )}
                <div className="pt-2">
                  <PrimaryButton 
                    onClick={handleSendOtp} 
                    disabled={loading}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <PhoneIcon size={18} />
                      <span>Resend Verification Code</span>
                    </div>
                  </PrimaryButton>
                </div>
              </>
            )}

            {/* Show existing customer option only after OTP is entered */}
            {otp.length === 6 && (
              <div className="space-y-3">
                <label className="text-base font-semibold text-textDark block">
                  Are you an existing customer?
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setExistingCustomer(true)}
                    className={`flex-1 rounded-xl border-2 px-4 py-4 text-base font-semibold transition-all ${
                      existingCustomer
                        ? "border-gold bg-gold text-white"
                        : "border-creamDark bg-white text-textMedium"
                    }`}
                    style={{ minHeight: '56px' }}
                  >
                    Yes, I am
                  </button>
                  <button
                    onClick={() => setExistingCustomer(false)}
                    className={`flex-1 rounded-xl border-2 px-4 py-4 text-base font-semibold transition-all ${
                      !existingCustomer
                        ? "border-gold bg-gold text-white"
                        : "border-creamDark bg-white text-textMedium"
                    }`}
                    style={{ minHeight: '56px' }}
                  >
                    No, I'm new
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <StickyFooter>
        <PrimaryButton 
          disabled={!canRegister || loading} 
          onClick={handleRegister}
        >
          <div className="flex items-center justify-center gap-2">
            <span>Complete Registration & Enter Event</span>
            <ArrowRightIcon size={18} />
          </div>
        </PrimaryButton>
      </StickyFooter>
    </AppShell>
  );
}
