import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, AppShell, PrimaryButton, SectionCard, Field, Input } from "../components/ui";
import { EventSelector } from "../components/EventSelector";
import { loginAdmin } from "../lib/api";
import { setAdminSession, setAdminEventId } from "../lib/adminSession";

export default function ExpertLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [eventId, setEventId] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loginAdmin({ email, password });
      if (data.user.role !== "EXPERT" && data.user.role !== "ADMIN") {
        setError("Access denied. Expert role required.");
        return;
      }
      setAdminSession({
        token: data.token,
        role: data.user.role,
        name: data.user.name,
      });
      if (eventId) {
        setAdminEventId(eventId);
        navigate(`/ops/expert/${eventId}`);
      } else {
        navigate("/ops/expert");
      }
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <AppBar title="Expert Login" />
      <SectionCard>
        <div className="space-y-3">
          <Field label="Email">
            <Input value={email} onChange={setEmail} placeholder="expert@neparudraksha.com" />
          </Field>
          <Field label="Password">
            <Input value={password} onChange={setPassword} type="password" />
          </Field>
          <EventSelector
            value={eventId}
            onChange={setEventId}
            label="Select Event (Optional)"
            hint="Choose an event to go directly to queue after login"
          />
          {error && <div className="text-xs text-red-400">{error}</div>}
          <PrimaryButton onClick={handleLogin} disabled={loading}>
            Sign In
          </PrimaryButton>
        </div>
      </SectionCard>
    </AppShell>
  );
}
