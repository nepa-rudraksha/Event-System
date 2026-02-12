import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, AppShell, Field, Input, PrimaryButton, SectionCard } from "../components/ui";
import { loginAdmin } from "../lib/api";
import { setAdminSession } from "../lib/adminSession";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loginAdmin({ email, password });
      setAdminSession({
        token: data.token,
        role: data.user.role,
        name: data.user.name,
      });
      navigate("/admin");
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <AppBar title="Admin Login" />
      <SectionCard>
        <div className="space-y-3">
          <Field label="Email">
            <Input value={email} onChange={setEmail} placeholder="admin@neparudraksha.com" />
          </Field>
          <Field label="Password">
            <Input value={password} onChange={setPassword} type="password" />
          </Field>
          {error && <div className="text-xs text-red-400">{error}</div>}
          <PrimaryButton onClick={handleLogin} disabled={loading}>
            Sign In
          </PrimaryButton>
        </div>
      </SectionCard>
    </AppShell>
  );
}
