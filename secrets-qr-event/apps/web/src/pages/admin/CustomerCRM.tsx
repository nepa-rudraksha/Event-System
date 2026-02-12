import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard, PrimaryButton, Field, Input, Chip } from "../../components/ui";
import { AdminNav } from "../../components/AdminNav";
import { getAdminToken } from "../../lib/adminSession";
import { api } from "../../lib/api";

export default function CustomerCRM() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) loadCustomers();
  }, [eventId, search]);

  const loadCustomers = async () => {
    try {
      const res = await api.get(`/admin/event/${eventId}/customers`, {
        params: { search },
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const customer = selected ? customers.find((c) => c.id === selected) : null;

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <AdminNav title="Customer CRM" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 -mt-4">
            <p className="text-body text-textLight">Search and view visitor profiles</p>
            <PrimaryButton 
              onClick={() => navigate(`/admin/event/${eventId}/visitors/add`)}
              className="w-full md:w-auto"
            >
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SectionCard>
              <h2 className="text-heading text-textDark mb-4">Customers ({customers.length})</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      selected === c.id
                        ? "border-gold bg-gold/10"
                        : "border-creamDark bg-white"
                    }`}
                  >
                    <div className="font-semibold text-textDark">{c.name}</div>
                    <div className="text-sm text-textLight">{c.phone}</div>
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>

          {customer && (
            <div className="lg:col-span-2 space-y-4">
              <SectionCard>
                <h2 className="text-heading text-textDark mb-4">Profile</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-textLight">Name</div>
                    <div className="text-body text-textDark font-semibold">{customer.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-textLight">Phone</div>
                    <div className="text-body text-textDark">{customer.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm text-textLight">Email</div>
                    <div className="text-body text-textDark">{customer.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-textLight">Existing Customer</div>
                    <div className="text-body text-textDark">
                      {customer.existingCustomer ? "Yes" : "No"}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {customer.tokens && customer.tokens.length > 0 && (
                <SectionCard>
                  <h2 className="text-heading text-textDark mb-4">Tokens</h2>
                  <div className="space-y-2">
                    {customer.tokens.map((token: any) => (
                      <div key={token.id} className="p-3 rounded-xl border-2 border-creamDark bg-white">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-gold">#{token.tokenNo}</span>
                          <Chip>{token.status}</Chip>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {customer.consultations && customer.consultations.length > 0 && (
                <SectionCard>
                  <h2 className="text-heading text-textDark mb-4">Consultations</h2>
                  {customer.consultations.map((consultation: any) => (
                    <div key={consultation.id} className="space-y-4">
                      {consultation.recommendations && consultation.recommendations.length > 0 && (
                        <div>
                          <h3 className="text-heading text-textDark mb-2">Recommendations</h3>
                          <div className="space-y-2">
                            {consultation.recommendations.map((rec: any) => (
                              <div
                                key={rec.id}
                                className="p-3 rounded-xl border-2 border-creamDark bg-cream"
                              >
                                <div className="font-semibold text-textDark">
                                  Priority {rec.priority}: {rec.reason}
                                </div>
                                {rec.notes && (
                                  <div className="text-sm text-textMedium mt-1">{rec.notes}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {consultation.salesAssist && (
                        <div>
                          <h3 className="text-heading text-textDark mb-2">Sales Status</h3>
                          <Chip>{consultation.salesAssist.status}</Chip>
                          {consultation.salesAssist.checkoutLink && (
                            <a
                              href={consultation.salesAssist.checkoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block mt-2 text-gold hover:underline"
                            >
                              View Checkout Link →
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </SectionCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
