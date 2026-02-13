import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, AppShell, PrimaryButton, SectionCard, GhostButton, Chip, Input } from "../components/ui";
import { EventSelector } from "../components/EventSelector";
import { fetchSalesRecommendations, fetchSalesOrders, createOrder, processOrder, createDraftOrder, api } from "../lib/api";
import { getAdminSession, getAdminEventId, setAdminEventId } from "../lib/adminSession";

export default function SalesDesk() {
  const navigate = useNavigate();
  const session = getAdminSession();
  const [eventId, setEventId] = useState(getAdminEventId() || "");
  
  const handleEventChange = (newEventId: string) => {
    setEventId(newEventId);
    if (newEventId) {
      setAdminEventId(newEventId);
    } else {
      setAdminEventId("");
    }
  };
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [paymentId, setPaymentId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"recommendations" | "orders">("recommendations");
  const [accessoryPoojaPrices, setAccessoryPoojaPrices] = useState<Record<string, number>>({});
  const [selectedConsultationForDraft, setSelectedConsultationForDraft] = useState<any>(null);
  const [draftOrderDetails, setDraftOrderDetails] = useState<Record<string, any>>({});
  const [sendingInvoice, setSendingInvoice] = useState<Record<string, boolean>>({});
  const [creatingDraft, setCreatingDraft] = useState<Record<string, boolean>>({});
  
  // Discount state for draft orders
  const [discountType, setDiscountType] = useState<Record<string, "PERCENTAGE" | "FIXED_AMOUNT" | null>>({});
  const [discountValue, setDiscountValue] = useState<Record<string, string>>({});
  const [discountTitle, setDiscountTitle] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!session) {
      navigate("/ops/sales/login");
      return;
    }
    // Auto-load if eventId is available
    const savedEventId = getAdminEventId();
    if (savedEventId && !eventId) {
      setEventId(savedEventId);
    }
  }, [session, navigate]);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    try {
      const [recs, ords] = await Promise.all([
        fetchSalesRecommendations(eventId),
        fetchSalesOrders(eventId),
      ]);
      setRecommendations(recs);
      setOrders(ords);
      
      // Load draft order details for consultations that have draft orders
      const draftOrderDetailsMap: Record<string, any> = {};
      for (const consultation of recs) {
        if (consultation.salesAssist?.checkoutLink && consultation.draftOrderDetails) {
          draftOrderDetailsMap[consultation.id] = consultation.draftOrderDetails;
        }
      }
      setDraftOrderDetails(draftOrderDetailsMap);
      
      console.log("Loaded recommendations:", recs.length, "orders:", ords.length);
      console.log("Orders data:", ords);
      if (ords.length === 0 && recs.length > 0) {
        console.log("No orders found. Check if orders are being created properly.");
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      alert("Failed to load data. Please check console for details.");
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId && session) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, session]); // Removed loadData from dependencies to prevent infinite loop

  // Fetch accessory/pooja prices in INR on component mount
  useEffect(() => {
    const fetchAccessoryPoojaPrices = async () => {
      const allVariantIds = [
        "47409161699570", // Silver Capping
        "47409161666802", // Rudraksha Chain
        "47409161404658", // Silver Chain in Mala
        "47409161371890", // Silver Chain in Rudraksha
        "42114197815538", // Rudraksha Prana Pratishtha Pooja
        "48656302047474", // Trividha Prana Pratishtha Pooja
        "48656302801138", // Dwadasha Maha Prana Pratishtha Pooja
      ];
      
      if (allVariantIds.length > 0) {
        try {
          const { fetchVariantPrices } = await import("../lib/api");
          const prices = await fetchVariantPrices(allVariantIds);
          setAccessoryPoojaPrices(prices || {});
        } catch (err) {
          console.error("Failed to fetch accessory/pooja prices:", err);
          // Set fallback prices (these should be updated to INR values)
          const fallbackPrices: Record<string, number> = {
            "47409161699570": 5,
            "47409161666802": 150,
            "47409161404658": 90,
            "47409161371890": 60,
            "42114197815538": 299,
            "48656302047474": 599,
            "48656302801138": 1200,
          };
          setAccessoryPoojaPrices(fallbackPrices);
        }
      }
    };
    
    fetchAccessoryPoojaPrices();
  }, []);

  const calculateTotalFromRecommendations = (consultation: any): number => {
    if (!consultation?.recommendations) return 0;

    // Use fetched prices from Shopify, fallback to stored prices
    const ACCESSORIES_COSTS: Record<string, number> = {
      "47409161699570": accessoryPoojaPrices["47409161699570"] || accessoryPoojaPrices["gid://shopify/ProductVariant/47409161699570"] || 5,
      "47409161666802": accessoryPoojaPrices["47409161666802"] || accessoryPoojaPrices["gid://shopify/ProductVariant/47409161666802"] || 150,
      "47409161404658": accessoryPoojaPrices["47409161404658"] || accessoryPoojaPrices["gid://shopify/ProductVariant/47409161404658"] || 90,
      "47409161371890": accessoryPoojaPrices["47409161371890"] || accessoryPoojaPrices["gid://shopify/ProductVariant/47409161371890"] || 60,
    };

    const POOJAS_COSTS: Record<string, number> = {
      "42114197815538": accessoryPoojaPrices["42114197815538"] || accessoryPoojaPrices["gid://shopify/ProductVariant/42114197815538"] || 299,
      "48656302047474": accessoryPoojaPrices["48656302047474"] || accessoryPoojaPrices["gid://shopify/ProductVariant/48656302047474"] || 599,
      "48656302801138": accessoryPoojaPrices["48656302801138"] || accessoryPoojaPrices["gid://shopify/ProductVariant/48656302801138"] || 1200,
    };

    return consultation.recommendations.reduce((total: number, rec: any) => {
      let itemTotal = 0;
      const quantity = rec.quantity || 1;

      // Extract numeric ID from GID format if needed
      const getNumericVariantId = (variantId: string): string => {
        if (!variantId) return "";
        // Check if it's already numeric
        if (/^\d+$/.test(variantId)) return variantId;
        // Extract from GID format: "gid://shopify/ProductVariant/42265191416050" -> "42265191416050"
        const match = variantId.match(/\/(\d+)$/);
        return match ? match[1] : variantId;
      };

      const numericVariantId = getNumericVariantId(rec.mappedShopifyVariantId || "");

      // Check if it's an accessory or pooja first (these don't have productDetails)
      if (numericVariantId) {
        if (ACCESSORIES_COSTS[numericVariantId]) {
          itemTotal += ACCESSORIES_COSTS[numericVariantId] * quantity;
          return total + itemTotal; // Early return for accessories
        }
        if (POOJAS_COSTS[numericVariantId]) {
          itemTotal += POOJAS_COSTS[numericVariantId] * quantity;
          return total + itemTotal; // Early return for poojas
        }
      }

      // Base product price (only if it has productDetails)
      if (rec.productDetails && rec.mappedShopifyVariantId) {
        const variant = rec.productDetails.variants?.find(
          (v: any) => v.id === rec.mappedShopifyVariantId
        );
        if (variant) {
          // Handle both price formats: object with amount or string
          const price = typeof variant.price === "string" 
            ? parseFloat(variant.price) || 0
            : parseFloat(variant.price?.amount || "0");
          itemTotal += price * quantity;
        }
      }

      return total + itemTotal;
    }, 0);
  };

  const handleCreateOrder = async (consultationId: string) => {
    // Ensure we have the payment ID for this specific consultation
    if (selectedConsultation?.id !== consultationId || !paymentId) {
      alert("Please enter payment ID for this consultation");
      return;
    }
    setLoading(true);
    try {
      const consultation = recommendations.find((r) => r.id === consultationId);
      if (!consultation) {
        alert("Consultation not found");
        setLoading(false);
        return;
      }
      const calculatedTotal = calculateTotalFromRecommendations(consultation);
      const finalAmount = totalAmount ? parseFloat(totalAmount) : calculatedTotal;
      
      if (finalAmount <= 0) {
        alert("Please enter a valid total amount");
        setLoading(false);
        return;
      }

      const order = await createOrder({
        consultationId,
        paymentId,
        paymentStatus: "paid",
        totalAmount: finalAmount,
        currency: "INR",
        items: consultation?.recommendations || [],
      });
      alert("Order created successfully! Payment marked as completed.");
      // Clear only if this was the selected consultation
      if (selectedConsultation?.id === consultationId) {
        setPaymentId("");
        setTotalAmount("");
        setSelectedConsultation(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessOrder = async (orderId: string, status: string) => {
    setLoading(true);
    try {
      await processOrder(orderId, status);
      alert("Order processed successfully!");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to process order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display text-textDark mb-2">Sales Desk</h1>
            <p className="text-body text-textLight">Welcome, {session?.name}</p>
          </div>
          <GhostButton onClick={() => navigate("/ops/sales/login")}>Logout</GhostButton>
        </div>

        <SectionCard>
          <EventSelector
            value={eventId}
            onChange={handleEventChange}
            label="Select Event"
            hint="Choose an event to view recommendations and orders (selection is saved automatically)"
          />
          {eventId && (
            <p className="text-xs text-textLight mt-2">
              ✓ Event selected. Data will load automatically.
            </p>
          )}
        </SectionCard>

        {eventId && (
          <>
            <div className="flex gap-2 border-b-2 border-creamDark">
              <button
                onClick={() => setActiveTab("recommendations")}
                className={`px-4 py-2 font-semibold ${
                  activeTab === "recommendations"
                    ? "text-gold border-b-2 border-gold"
                    : "text-textLight"
                }`}
              >
                Confirmed Recommendations ({recommendations.length})
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-2 font-semibold ${
                  activeTab === "orders"
                    ? "text-gold border-b-2 border-gold"
                    : "text-textLight"
                }`}
              >
                Orders ({orders.length})
              </button>
            </div>

            {activeTab === "recommendations" && (
              <div className="space-y-3">
                {recommendations.length === 0 ? (
                  <SectionCard>
                    <p className="text-body text-textLight text-center py-8">
                      No confirmed recommendations yet.
                    </p>
                  </SectionCard>
                ) : (
                  recommendations.map((consultation) => (
                    <SectionCard key={consultation.id}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-heading text-textDark mb-1">
                              {consultation.visitor?.name}
                            </h3>
                            <p className="text-sm text-textMedium">
                              {consultation.visitor?.phone} • {consultation.visitor?.email}
                            </p>
                          </div>
                          {(consultation.orders && consultation.orders.length > 0) && (
                            <Chip className="bg-green-100 text-green-700">
                              {consultation.orders.length} Order{consultation.orders.length > 1 ? 's' : ''}
                            </Chip>
                          )}
                        </div>

                        {/* Draft Order Details - Show First */}
                        {consultation.salesAssist?.checkoutLink && (
                          <div className="p-3 rounded-lg bg-gold/10 border border-gold space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-textDark">Draft Order Created</div>
                              <Chip className="bg-green-100 text-green-700 text-xs">
                                {consultation.salesAssist.status || "INTERESTED"}
                              </Chip>
                            </div>
                            
                            {draftOrderDetails[consultation.id] && (
                              <div className="space-y-2 text-xs">
                                {draftOrderDetails[consultation.id].lineItems && draftOrderDetails[consultation.id].lineItems.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-textDark mb-1">Items:</p>
                                    <div className="space-y-1">
                                      {draftOrderDetails[consultation.id].lineItems.map((item: any, idx: number) => (
                                        <div key={idx} className="p-2 bg-white rounded border border-creamDark">
                                          <div className="flex justify-between">
                                            <span className="text-textDark">{item.title}</span>
                                            <span className="text-textDark">Qty: {item.quantity}</span>
                                          </div>
                                          {item.discountedUnitPrice && (
                                            <div className="text-right mt-1">
                                              <span className="font-semibold text-textDark">₹{parseFloat(item.discountedUnitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                              {item.originalUnitPrice && parseFloat(item.originalUnitPrice) !== parseFloat(item.discountedUnitPrice) && (
                                                <span className="text-textLight line-through ml-1">₹{parseFloat(item.originalUnitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {draftOrderDetails[consultation.id].appliedDiscount && (
                                  <div className="p-2 bg-green-50 rounded border border-green-200">
                                    <div className="flex justify-between">
                                      <span className="font-semibold text-green-700">
                                        {draftOrderDetails[consultation.id].appliedDiscount.description || "Discount"}
                                      </span>
                                      <span className="font-bold text-green-700">
                                        {draftOrderDetails[consultation.id].appliedDiscount.valueType === "PERCENTAGE" 
                                          ? `${draftOrderDetails[consultation.id].appliedDiscount.value}%`
                                          : `₹${draftOrderDetails[consultation.id].appliedDiscount.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                {draftOrderDetails[consultation.id].totalPrice && (
                                  <div className="pt-2 border-t border-creamDark">
                                    <div className="flex justify-between font-bold">
                                      <span className="text-textDark">Total:</span>
                                      <span className="text-gold">₹{parseFloat(draftOrderDetails[consultation.id].totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="text-xs text-textMedium">Checkout Link:</div>
                            <a
                              href={consultation.salesAssist.checkoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gold hover:underline break-all block"
                            >
                              {consultation.salesAssist.checkoutLink}
                            </a>
                            
                            <div className="flex gap-2 mt-2">
                              {draftOrderDetails[consultation.id]?.draftOrderId && (
                                <PrimaryButton
                                  onClick={async () => {
                                    const draftOrderId = draftOrderDetails[consultation.id].draftOrderId;
                                    setSendingInvoice({ ...sendingInvoice, [consultation.id]: true });
                                    try {
                                      // URL-encode the draft order ID to handle GID format with special characters
                                      const encodedDraftOrderId = encodeURIComponent(draftOrderId);
                                      await api.post(`/draft-orders/${encodedDraftOrderId}/send-invoice`);
                                      alert("Invoice email sent successfully to customer!");
                                      loadData();
                                    } catch (err: any) {
                                      alert(err.response?.data?.error || "Failed to send invoice email");
                                    } finally {
                                      setSendingInvoice({ ...sendingInvoice, [consultation.id]: false });
                                    }
                                  }}
                                  disabled={sendingInvoice[consultation.id]}
                                  className="text-xs py-1 px-3 flex-1"
                                >
                                  {sendingInvoice[consultation.id] ? "Sending..." : "📧 Send Invoice Email"}
                                </PrimaryButton>
                              )}
                              <GhostButton
                                onClick={() => {
                                  if (consultation.salesAssist.checkoutLink) {
                                    window.open(consultation.salesAssist.checkoutLink, '_blank');
                                  }
                                }}
                                className="text-xs py-1 px-3"
                              >
                                Open Link
                              </GhostButton>
                            </div>
                          </div>
                        )}
                        
                        {/* Create Draft Order Button - Show if no draft order exists */}
                        {!consultation.salesAssist?.checkoutLink && (
                          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
                            <p className="text-xs font-semibold text-textDark mb-2">Create Draft Order (For Online Checkout):</p>
                            <PrimaryButton
                              onClick={async () => {
                                setSelectedConsultationForDraft(consultation);
                                setCreatingDraft({ ...creatingDraft, [consultation.id]: true });
                                try {
                                  // Prepare line items from recommendations if available
                                  let lineItems: any[] = [];
                                  
                                  if (consultation.recommendations && consultation.recommendations.length > 0) {
                                    lineItems = consultation.recommendations
                                      .filter((rec: any) => rec.mappedShopifyVariantId)
                                      .map((rec: any) => {
                                        let variantId = rec.mappedShopifyVariantId;
                                        if (!variantId.startsWith("gid://")) {
                                          variantId = `gid://shopify/ProductVariant/${variantId}`;
                                        }
                                        return {
                                          variantId,
                                          quantity: rec.quantity || 1,
                                          customAttributes: rec.reason ? [{ key: "Reason", value: rec.reason }] : undefined,
                                        };
                                      });
                                  }

                                  // If no recommendations, allow sales to create an empty draft order
                                  // Shopify allows empty draft orders, which can be filled later
                                  if (lineItems.length === 0) {
                                    const confirmCreate = confirm("No recommendations found. Create an empty draft order? You can add items later in Shopify.");
                                    if (!confirmCreate) {
                                      setCreatingDraft({ ...creatingDraft, [consultation.id]: false });
                                      setSelectedConsultationForDraft(null);
                                      return;
                                    }
                                  }

                                  // Prepare discount if provided
                                  const discount = discountType[consultation.id] && discountValue[consultation.id]
                                    ? {
                                        type: discountType[consultation.id],
                                        value: parseFloat(discountValue[consultation.id]),
                                        title: discountTitle[consultation.id] || undefined,
                                      }
                                    : undefined;

                                  const draftOrder = await createDraftOrder(consultation.id, {
                                    lineItems,
                                    note: `Draft order for ${consultation.visitor?.name || "Customer"}`,
                                    discount,
                                  });

                                  setDraftOrderDetails({ ...draftOrderDetails, [consultation.id]: draftOrder });
                                  alert("Draft order created successfully!");
                                  loadData();
                                } catch (err: any) {
                                  alert(err.response?.data?.error || "Failed to create draft order");
                                } finally {
                                  setCreatingDraft({ ...creatingDraft, [consultation.id]: false });
                                  setSelectedConsultationForDraft(null);
                                }
                              }}
                              disabled={creatingDraft[consultation.id]}
                              className="w-full text-xs"
                            >
                              {creatingDraft[consultation.id] ? "Creating..." : "🛒 Create Draft Order"}
                            </PrimaryButton>
                            
                            {/* Discount Options */}
                            {selectedConsultationForDraft?.id === consultation.id && (
                              <div className="mt-3 p-3 bg-white rounded border border-creamDark space-y-2">
                                <p className="text-xs font-semibold text-textDark">Discount (Optional):</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={discountType[consultation.id] || ""}
                                    onChange={(e) => setDiscountType({ ...discountType, [consultation.id]: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT" | null || null })}
                                    className="text-xs rounded border border-creamDark px-2 py-1"
                                  >
                                    <option value="">No Discount</option>
                                    <option value="PERCENTAGE">Percentage</option>
                                    <option value="FIXED_AMOUNT">Fixed Amount</option>
                                  </select>
                                  {discountType[consultation.id] && (
                                    <>
                                      <Input
                                        value={discountValue[consultation.id] || ""}
                                        onChange={(v) => setDiscountValue({ ...discountValue, [consultation.id]: v })}
                                        placeholder={discountType[consultation.id] === "PERCENTAGE" ? "e.g., 10" : "e.g., 500"}
                                        type="number"
                                        className="text-xs"
                                      />
                                      <Input
                                        value={discountTitle[consultation.id] || ""}
                                        onChange={(v) => setDiscountTitle({ ...discountTitle, [consultation.id]: v })}
                                        placeholder="Discount Title (optional)"
                                        className="text-xs col-span-2"
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Recommendations List - Compact */}
                        <div>
                          <div className="text-xs font-semibold text-textDark mb-2">
                            Recommendations ({consultation.recommendations?.length || 0}):
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {consultation.recommendations?.map((rec: any) => (
                              <div
                                key={rec.id}
                                className="p-2 rounded-lg bg-cream border border-creamDark text-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-textDark truncate">
                                      {rec.productDetails?.title || rec.reason}
                                    </div>
                                    <div className="text-textLight mt-0.5">
                                      Qty: {rec.quantity || 1} • Priority: {rec.priority}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Create Order Form - Always show if no order exists */}
                        {(!consultation.orders || consultation.orders.length === 0) && (
                          <div className="pt-2 border-t border-creamDark space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-textDark">Create Order (After Payment):</div>
                              {consultation.salesAssist?.checkoutLink && (
                                <Chip className="text-xs bg-blue-100 text-blue-700">
                                  Draft Order Available
                                </Chip>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-textMedium mb-1 block">Payment ID *</label>
                                <Input
                                  value={selectedConsultation?.id === consultation.id ? paymentId : ""}
                                  onChange={(v) => {
                                    setSelectedConsultation(consultation);
                                    setPaymentId(v);
                                  }}
                                  placeholder="Transaction ID"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-textMedium mb-1 block">Amount (INR)</label>
                                <Input
                                  value={selectedConsultation?.id === consultation.id ? (totalAmount || calculateTotalFromRecommendations(consultation).toFixed(2)) : calculateTotalFromRecommendations(consultation).toFixed(2)}
                                  onChange={(v) => {
                                    setSelectedConsultation(consultation);
                                    setTotalAmount(v);
                                  }}
                                  type="number"
                                  placeholder={calculateTotalFromRecommendations(consultation).toFixed(2)}
                                  className="text-xs"
                                />
                              </div>
                            </div>
                            <div className="text-xs text-textLight">
                              Calculated: ₹{calculateTotalFromRecommendations(consultation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <PrimaryButton
                              onClick={() => {
                                setSelectedConsultation(consultation);
                                handleCreateOrder(consultation.id);
                              }}
                              disabled={loading || (selectedConsultation?.id === consultation.id && !paymentId)}
                              className="w-full text-sm"
                            >
                              ✓ Mark Payment Completed & Create Order
                            </PrimaryButton>
                            {consultation.salesAssist?.checkoutLink && (
                              <p className="text-xs text-textMedium text-center mt-2">
                                💡 Tip: You can create a draft order for online checkout, or create a regular order after receiving payment.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  ))
                )}
              </div>
            )}

            {activeTab === "orders" && (
              <div className="space-y-3">
                {orders.length === 0 ? (
                  <SectionCard>
                    <p className="text-body text-textLight text-center py-8">No orders yet.</p>
                    <p className="text-sm text-textMedium text-center">
                      Create orders from confirmed recommendations in the "Confirmed Recommendations" tab.
                    </p>
                  </SectionCard>
                ) : (
                  orders.map((order) => (
                    <SectionCard key={order.id}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-heading text-textDark mb-1">
                              Order {order.orderNumber}
                            </h3>
                            <p className="text-sm text-textMedium mb-1">
                              {order.consultation?.visitor?.name} • {order.consultation?.visitor?.phone}
                            </p>
                            <p className="text-sm font-semibold text-gold">
                              ₹{order.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {order.currency && order.currency !== "INR" ? `(${order.currency})` : ""}
                            </p>
                            {order.paymentId && (
                              <p className="text-xs text-textLight mt-1">
                                Payment ID: {order.paymentId}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <Chip className="mb-1">
                              {order.paymentStatus} / {order.orderStatus}
                            </Chip>
                            {order.whatsappSent && (
                              <div className="text-xs text-green-600">✓ WhatsApp Sent</div>
                            )}
                            {order.processedAt && (
                              <div className="text-xs text-textLight mt-1">
                                {new Date(order.processedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order Items */}
                        {order.items && (
                          <div className="pt-2 border-t border-creamDark">
                            <div className="text-xs font-semibold text-textDark mb-1">Items:</div>
                            <div className="space-y-1">
                              {Array.isArray(order.items) && order.items.length > 0 ? (
                                <>
                                  {order.items.slice(0, 3).map((item: any, idx: number) => (
                                    <div key={idx} className="text-xs text-textMedium">
                                      • {item.productDetails?.title || item.reason || "Item"} (Qty: {item.quantity || 1})
                                    </div>
                                  ))}
                                  {order.items.length > 3 && (
                                    <div className="text-xs text-textLight">+ {order.items.length - 3} more</div>
                                  )}
                                </>
                              ) : (
                                <div className="text-xs text-textLight">Items data not available</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-creamDark">
                          {order.orderStatus === "paid" && (
                            <PrimaryButton
                              onClick={() => handleProcessOrder(order.id, "processing")}
                              disabled={loading}
                              className="w-full"
                            >
                              📦 Start Preparing Order
                            </PrimaryButton>
                          )}
                          {order.orderStatus === "processing" && (
                            <PrimaryButton
                              onClick={() => handleProcessOrder(order.id, "completed")}
                              disabled={loading}
                              className="w-full"
                            >
                              ✓ Mark Completed & Send WhatsApp
                            </PrimaryButton>
                          )}
                          {order.orderStatus === "completed" && (
                            <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                              <p className="text-sm text-green-700 text-center">
                                ✓ Order completed and WhatsApp notification sent
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </SectionCard>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
