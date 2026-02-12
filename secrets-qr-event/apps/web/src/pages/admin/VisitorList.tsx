import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard, PrimaryButton, Field, Input, Chip, GhostButton } from "../../components/ui";
import { AdminNav } from "../../components/AdminNav";
import { getAdminToken } from "../../lib/adminSession";
import { api } from "../../lib/api";

export default function VisitorList() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) loadVisitors();
  }, [eventId, search]);

  const loadVisitors = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/event/${eventId}/visitors`, {
        params: { search },
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setVisitors(res.data);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to load visitors");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <AdminNav title="Generated Visitors" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 -mt-4">
            <p className="text-body text-textLight">View all visitors created by admin</p>
            <PrimaryButton onClick={() => navigate(`/admin/event/${eventId}/visitors/add`)}>
              + Add New Visitor
            </PrimaryButton>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <Input
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone, or email..."
            className="flex-1"
          />
        </div>

        {loading ? (
          <SectionCard>
            <div className="text-center py-8 text-textMedium">Loading visitors...</div>
          </SectionCard>
        ) : visitors.length === 0 ? (
          <SectionCard>
            <div className="text-center py-8 text-textMedium">
              {search ? "No visitors found matching your search" : "No visitors created yet"}
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-4">
            <SectionCard>
              <h2 className="text-heading text-textDark mb-4">Visitors ({visitors.length})</h2>
              <div className="space-y-3">
                {visitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className="border-2 border-creamDark rounded-xl p-4 bg-white hover:border-gold transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-heading text-textDark">{visitor.name}</h3>
                          <div className="flex flex-wrap gap-2">
                            {visitor.otpVerified && (
                              <Chip className="bg-green-100 text-green-800 text-xs">OTP Verified</Chip>
                            )}
                            {visitor.existingCustomer && (
                              <Chip className="bg-blue-100 text-blue-800 text-xs">Existing Customer</Chip>
                            )}
                            {visitor.consentWhatsapp && (
                              <Chip className="bg-purple-100 text-purple-800 text-xs">WhatsApp</Chip>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-textMedium mb-3">
                          <div><strong>Phone:</strong> {visitor.phone}</div>
                          <div><strong>Email:</strong> {visitor.email}</div>
                          <div className="flex gap-4">
                            <span>Tokens: {visitor._count.tokens}</span>
                            <span>Consultations: {visitor._count.consultations}</span>
                            <span>Orders: {visitor._count.orders}</span>
                          </div>
                          <div className="text-textLight">
                            Created: {new Date(visitor.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <GhostButton
                          onClick={() => setExpandedVisitor(expandedVisitor === visitor.id ? null : visitor.id)}
                          className="text-sm"
                        >
                          {expandedVisitor === visitor.id ? "Hide" : "Show"} Login Link & QR Code
                        </GhostButton>
                      </div>
                    </div>

                    {expandedVisitor === visitor.id && (
                      <div className="mt-4 pt-4 border-t border-creamDark space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-textDark mb-2">Login Link</h4>
                          {visitor.loginLink ? (
                            <div className="space-y-2">
                              <div className="flex flex-col sm:flex-row gap-2">
                                <div className="flex-1 p-3 bg-creamDark/50 rounded-lg border border-creamDark/30 overflow-x-auto">
                                  <p className="text-xs font-mono text-textDark break-all select-all">
                                    {visitor.loginLink}
                                  </p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  <PrimaryButton
                                    onClick={() => {
                                      navigator.clipboard.writeText(visitor.loginLink);
                                      alert("Login link copied to clipboard!");
                                    }}
                                    className="whitespace-nowrap min-w-[80px]"
                                  >
                                    Copy
                                  </PrimaryButton>
                                  <a
                                    href={visitor.loginLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0"
                                  >
                                    <GhostButton className="whitespace-nowrap min-w-[80px]">Open</GhostButton>
                                  </a>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-textMedium p-2 bg-creamDark/50 rounded-lg">
                              Login link not available
                            </div>
                          )}
                        </div>

                        {visitor.qrCodeDataUrl ? (
                          <div>
                            <h4 className="text-sm font-semibold text-textDark mb-2">QR Code</h4>
                            <div className="flex items-start gap-4">
                              <img
                                src={visitor.qrCodeDataUrl}
                                alt={`QR Code for ${visitor.name}`}
                                className="border-2 border-creamDark rounded-lg p-2 bg-white max-w-[200px]"
                              />
                              <div className="flex flex-col gap-2">
                                <a
                                  href={visitor.qrCodeDataUrl}
                                  download={`visitor-qr-${visitor.phone}.png`}
                                  className="text-gold hover:underline text-sm"
                                >
                                  Download QR Code
                                </a>
                                <p className="text-xs text-textLight">
                                  Scan this QR code to access the visitor's login page
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-textMedium">
                            QR code generation failed. You can still use the login link above.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
