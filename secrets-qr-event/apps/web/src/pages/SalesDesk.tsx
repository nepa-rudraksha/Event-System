import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, AppShell, PrimaryButton, SectionCard, GhostButton, Chip, Input } from "../components/ui";
import { EventSelector } from "../components/EventSelector";
import { fetchSalesRecommendations, fetchSalesOrders, createOrder, processOrder } from "../lib/api";
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

  const [accessoryPoojaPrices, setAccessoryPoojaPrices] = useState<Record<string, number>>({});

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
    if (!paymentId) {
      alert("Please enter payment ID");
      return;
    }
    setLoading(true);
    try {
      const consultation = recommendations.find((r) => r.id === consultationId);
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
      setPaymentId("");
      setTotalAmount("");
      setSelectedConsultation(null);
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

                        {/* Checkout Link - Show First */}
                        {consultation.recommendations?.[0]?.checkoutLink && (
                          <div className="p-2 rounded-lg bg-gold/5 border border-gold">
                            <div className="text-xs font-semibold text-textDark mb-1">Checkout Link:</div>
                            <a
                              href={consultation.recommendations[0].checkoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gold hover:underline break-all block"
                            >
                              {consultation.recommendations[0].checkoutLink}
                            </a>
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

                        {/* Create Order Form - Compact */}
                        {(!consultation.orders || consultation.orders.length === 0) && (
                          <div className="pt-2 border-t border-creamDark space-y-2">
                            <div className="text-xs font-semibold text-textDark">Create Order (After Payment):</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-textMedium mb-1 block">Payment ID *</label>
                                <Input
                                  value={paymentId}
                                  onChange={setPaymentId}
                                  placeholder="Transaction ID"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-textMedium mb-1 block">Amount (INR)</label>
                                <Input
                                  value={totalAmount || calculateTotalFromRecommendations(consultation).toFixed(2)}
                                  onChange={setTotalAmount}
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
                              onClick={() => handleCreateOrder(consultation.id)}
                              disabled={loading || !paymentId}
                              className="w-full text-sm"
                            >
                              ✓ Mark Payment Completed & Create Order
                            </PrimaryButton>
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
