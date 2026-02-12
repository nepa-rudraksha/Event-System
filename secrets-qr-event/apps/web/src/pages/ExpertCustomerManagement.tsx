import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SectionCard, PrimaryButton, Field, Input, Chip, GhostButton } from "../components/ui";
import { EventSelector } from "../components/EventSelector";
import { getAdminToken, getAdminEventId, setAdminEventId } from "../lib/adminSession";
import { api } from "../lib/api";

export default function ExpertCustomerManagement() {
  const { eventId: urlEventId = "" } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(urlEventId || getAdminEventId() || "");

  useEffect(() => {
    if (selectedEventId) {
      loadCustomers();
    }
  }, [selectedEventId, search]);

  useEffect(() => {
    if (selected && customers.length > 0) {
      loadCustomerDetails(selected);
    }
  }, [selected]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/expert/event/${selectedEventId}/customers`, {
        params: { search },
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDetails = async (visitorId: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/expert/customers/${visitorId}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setSelectedCustomer(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (newEventId: string) => {
    setSelectedEventId(newEventId);
    if (newEventId) {
      setAdminEventId(newEventId);
      navigate(`/ops/expert/${newEventId}/customers`, { replace: true });
    }
  };

  const customer = selected ? customers.find((c) => c.id === selected) : null;

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display text-textDark">Customer Management</h1>
            <p className="text-body text-textLight -mt-2">View all customers, consultations, orders, and payment status</p>
          </div>
          <div className="flex gap-2">
            <GhostButton onClick={() => navigate(`/ops/expert/${selectedEventId}`)}>
              ← Back to Queue
            </GhostButton>
          </div>
        </div>

        <SectionCard>
          <EventSelector
            value={selectedEventId}
            onChange={handleEventChange}
            label="Select Event"
            hint="Choose an event to view customers"
          />
        </SectionCard>

        {selectedEventId && (
          <>
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                value={search}
                onChange={setSearch}
                placeholder="Search by name, phone, or email..."
                className="flex-1"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer List */}
              <div className="lg:col-span-1">
                <SectionCard>
                  <h2 className="text-heading text-textDark mb-4">
                    Customers ({customers.length})
                  </h2>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {loading && customers.length === 0 ? (
                      <div className="text-sm text-textLight text-center py-4">Loading...</div>
                    ) : customers.length === 0 ? (
                      <div className="text-sm text-textLight text-center py-4">No customers found</div>
                    ) : (
                      customers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelected(c.id)}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                            selected === c.id
                              ? "border-gold bg-gold/10"
                              : "border-creamDark bg-white hover:border-gold/50"
                          }`}
                        >
                          <div className="font-semibold text-textDark">{c.name}</div>
                          <div className="text-sm text-textLight">{c.phone}</div>
                          <div className="text-xs text-textMedium mt-1">{c.email}</div>
                          <div className="flex gap-2 mt-2">
                            {c.consultations && c.consultations.length > 0 && (
                              <Chip className="text-xs">
                                {c.consultations.length} Consultation{c.consultations.length > 1 ? "s" : ""}
                              </Chip>
                            )}
                            {c.orders && c.orders.length > 0 && (
                              <Chip className="text-xs bg-green-100 text-green-700">
                                {c.orders.length} Order{c.orders.length > 1 ? "s" : ""}
                              </Chip>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* Customer Details */}
              {selectedCustomer && (
                <div className="lg:col-span-2 space-y-4">
                  {/* Profile */}
                  <SectionCard>
                    <h2 className="text-heading text-textDark mb-4">Customer Profile</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-textLight">Name</div>
                        <div className="text-body text-textDark font-semibold">
                          {selectedCustomer.visitor.name}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-textLight">Phone</div>
                        <div className="text-body text-textDark">{selectedCustomer.visitor.phone}</div>
                      </div>
                      <div>
                        <div className="text-sm text-textLight">Email</div>
                        <div className="text-body text-textDark">{selectedCustomer.visitor.email}</div>
                      </div>
                      <div>
                        <div className="text-sm text-textLight">Existing Customer</div>
                        <div className="text-body text-textDark">
                          {selectedCustomer.visitor.existingCustomer ? "Yes" : "No"}
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Consultations */}
                  {selectedCustomer.visitor.consultations &&
                    selectedCustomer.visitor.consultations.length > 0 && (
                      <SectionCard>
                        <h2 className="text-heading text-textDark mb-4">
                          Consultations ({selectedCustomer.visitor.consultations.length})
                        </h2>
                        <div className="space-y-3">
                          {selectedCustomer.visitor.consultations.map((consultation: any) => (
                            <div
                              key={consultation.id}
                              className="p-4 rounded-lg border border-creamDark bg-white"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-semibold text-textDark">
                                    Consultation #{consultation.id.slice(-8)}
                                  </div>
                                  <div className="text-xs text-textMedium">
                                    {new Date(consultation.createdAt).toLocaleString()}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {consultation.recommendationLock && (
                                    <Chip className="text-xs bg-gold/20 text-gold">Locked</Chip>
                                  )}
                                  <PrimaryButton
                                    onClick={() =>
                                      navigate(
                                        `/ops/expert/${selectedEventId}/workspace/${consultation.id}`
                                      )
                                    }
                                    className="text-xs px-3 py-1"
                                  >
                                    Open
                                  </PrimaryButton>
                                </div>
                              </div>
                              {consultation.notes && (
                                <div className="text-sm text-textMedium mt-2">
                                  <strong>Notes:</strong> {consultation.notes}
                                </div>
                              )}
                              {consultation.recommendations && consultation.recommendations.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs text-textLight mb-1">
                                    {consultation.recommendations.length} Recommendation
                                    {consultation.recommendations.length > 1 ? "s" : ""}
                                  </div>
                                  <div className="space-y-1">
                                    {consultation.recommendations.slice(0, 3).map((rec: any) => (
                                      <div key={rec.id} className="text-xs text-textMedium">
                                        • {rec.reason} (Qty: {rec.quantity || 1})
                                      </div>
                                    ))}
                                    {consultation.recommendations.length > 3 && (
                                      <div className="text-xs text-textLight">
                                        +{consultation.recommendations.length - 3} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    )}

                  {/* Draft Orders */}
                  {selectedCustomer.draftOrders && selectedCustomer.draftOrders.length > 0 && (
                    <SectionCard>
                      <h2 className="text-heading text-textDark mb-4">
                        Draft Orders ({selectedCustomer.draftOrders.length})
                      </h2>
                      <div className="space-y-3">
                        {selectedCustomer.draftOrders.map((draft: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-4 rounded-lg border border-gold/30 bg-gold/5"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-semibold text-textDark">Draft Order</div>
                                <div className="text-xs text-textMedium">
                                  {draft.createdAt
                                    ? new Date(draft.createdAt).toLocaleString()
                                    : "N/A"}
                                </div>
                              </div>
                              <Chip className="text-xs">{draft.status || "PENDING"}</Chip>
                            </div>
                            {draft.checkoutUrl && (
                              <a
                                href={draft.checkoutUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gold hover:underline break-all block mt-2"
                              >
                                {draft.checkoutUrl}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {/* Local Orders */}
                  {selectedCustomer.visitor.orders && selectedCustomer.visitor.orders.length > 0 && (
                    <SectionCard>
                      <h2 className="text-heading text-textDark mb-4">
                        Event Orders ({selectedCustomer.visitor.orders.length})
                      </h2>
                      <div className="space-y-3">
                        {selectedCustomer.visitor.orders.map((order: any) => (
                          <div
                            key={order.id}
                            className="p-4 rounded-lg border border-creamDark bg-white"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-semibold text-textDark">
                                  {order.orderNumber || `Order #${order.id.slice(-8)}`}
                                </div>
                                <div className="text-xs text-textMedium">
                                  {new Date(order.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-textDark">
                                  {order.totalAmount ? `$${order.totalAmount.toFixed(2)}` : "N/A"}
                                </div>
                                <div className="flex gap-1 mt-1">
                                  <Chip className="text-xs">
                                    {order.paymentStatus}
                                  </Chip>
                                  <Chip className="text-xs">
                                    {order.orderStatus}
                                  </Chip>
                                </div>
                              </div>
                            </div>
                            {order.shopifyOrderId && (
                              <div className="text-xs text-textMedium mt-2">
                                Shopify Order: {order.shopifyOrderId}
                              </div>
                            )}
                            {order.shopifyCheckoutUrl && (
                              <a
                                href={order.shopifyCheckoutUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gold hover:underline block mt-1"
                              >
                                View Checkout Link
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {/* Shopify Orders */}
                  {selectedCustomer.shopifyOrders && selectedCustomer.shopifyOrders.length > 0 && (
                    <SectionCard>
                      <h2 className="text-heading text-textDark mb-4">
                        Shopify Orders ({selectedCustomer.shopifyOrders.length})
                      </h2>
                      <div className="space-y-3">
                        {selectedCustomer.shopifyOrders.map((order: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-4 rounded-lg border border-creamDark bg-white"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-semibold text-textDark">{order.name}</div>
                                <div className="text-xs text-textMedium">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-textDark">
                                  ${order.totalPrice}
                                </div>
                                <div className="flex gap-1 mt-1">
                                  <Chip className="text-xs">{order.financialStatus}</Chip>
                                  <Chip className="text-xs">{order.fulfillmentStatus}</Chip>
                                </div>
                              </div>
                            </div>
                            {order.lineItems?.edges && (
                              <div className="mt-2 space-y-1">
                                {order.lineItems.edges.map((edge: any, itemIdx: number) => (
                                  <div key={itemIdx} className="text-sm text-textMedium">
                                    • {edge.node.title} (Qty: {edge.node.quantity})
                                    {edge.node.variant?.price && ` - $${edge.node.variant.price}`}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {/* Tokens */}
                  {selectedCustomer.visitor.tokens && selectedCustomer.visitor.tokens.length > 0 && (
                    <SectionCard>
                      <h2 className="text-heading text-textDark mb-4">
                        Tokens ({selectedCustomer.visitor.tokens.length})
                      </h2>
                      <div className="space-y-2">
                        {selectedCustomer.visitor.tokens.map((token: any) => (
                          <div
                            key={token.id}
                            className="p-3 rounded-lg border border-creamDark bg-white flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-textDark">Token #{token.tokenNo}</div>
                              <div className="text-xs text-textMedium">
                                {new Date(token.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <Chip className="text-xs">{token.status}</Chip>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
