import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppBar, AppShell, PrimaryButton, SectionCard, Chip } from "../components/ui";
import { MessageIcon, ShoppingCartIcon } from "../components/Icons";
import { fetchVisitorSummary } from "../lib/api";
import { getSession } from "../lib/session";

export default function MyConsultation() {
  const { slug = "bangalore" } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!session) {
      navigate(`/e/${slug}`);
      return;
    }
    let cancelled = false;
    fetchVisitorSummary(session.visitorId)
      .then((data) => !cancelled && setSummary(data))
      .catch(() => !cancelled && setSummary(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.visitorId, slug]); // Removed navigate from deps to prevent loops

  const consultation = summary?.consultations?.[0];
  const draftOrderDetails = consultation?.draftOrderDetails;
  const draftOrderProducts = draftOrderDetails?.lineItems ?? [];

  return (
    <AppShell>
      <AppBar 
        title={
          <div className="flex items-center gap-2">
            <MessageIcon size={20} className="text-gold" />
            <span>My Consultation</span>
          </div>
        } 
      />
      
      <div className="space-y-6">
        {/* Token Status */}
        <SectionCard>
          <h3 className="text-heading text-textDark mb-3">Token Status</h3>
          {summary?.tokens?.[0] ? (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gold">#{summary.tokens[0].tokenNo}</div>
              <div className="text-base text-textMedium">
                Status: <span className="font-semibold text-textDark">{summary.tokens[0].status.replace("_", " ")}</span>
              </div>
            </div>
          ) : (
            <p className="text-body text-textLight">No token booked yet.</p>
          )}
        </SectionCard>

        {/* Consultation Notes */}
        {consultation?.notes && (
          <SectionCard>
            <h3 className="text-heading text-textDark mb-3">Consultation Notes</h3>
            <p className="text-body text-textMedium leading-relaxed whitespace-pre-wrap">
              {consultation.notes}
            </p>
          </SectionCard>
        )}

        {/* Draft Order Products */}
        {draftOrderProducts.length > 0 && (
          <SectionCard>
            <h3 className="text-heading text-textDark mb-4">Draft Order Products</h3>
            <div className="space-y-3">
              {draftOrderProducts.map((item: any, index: number) => (
                <div key={item.id || index} className="rounded-xl border-2 border-creamDark bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-base font-semibold text-textDark mb-1">
                        {item.title || "Product"}
                      </div>
                      {item.variant?.title && (
                        <div className="text-sm text-textMedium mb-2">
                          Variant: {item.variant.title}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-textMedium">
                        <span>Quantity: {item.quantity || 1}</span>
                        {item.discountedUnitPrice && (
                          <span className="font-semibold text-textDark">
                            Price: ₹{parseFloat(item.discountedUnitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      {item.customAttributes && item.customAttributes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {item.customAttributes.map((attr: any, attrIdx: number) => (
                            <div key={attrIdx} className="text-xs text-textLight">
                              <span className="font-semibold">{attr.key}:</span> {attr.value}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {draftOrderDetails?.appliedDiscount && (
                <div className="mt-3 p-3 rounded-lg bg-gold/10 border border-gold">
                  <div className="text-sm font-semibold text-textDark mb-1">Discount Applied</div>
                  <div className="text-sm text-textMedium">
                    {draftOrderDetails.appliedDiscount.description || draftOrderDetails.appliedDiscount.title || "Discount"}
                    {draftOrderDetails.appliedDiscount.valueType === "PERCENTAGE" 
                      ? `: ${draftOrderDetails.appliedDiscount.value}%`
                      : `: ₹${(typeof draftOrderDetails.appliedDiscount.amount === 'number' ? draftOrderDetails.appliedDiscount.amount : parseFloat(draftOrderDetails.appliedDiscount.amount || "0")).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </div>
                </div>
              )}
              {draftOrderDetails?.totalPrice && (
                <div className="mt-3 p-3 rounded-lg bg-cream border border-creamDark">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-textDark">Total:</span>
                    <span className="text-lg font-bold text-gold">
                      ₹{parseFloat(draftOrderDetails.totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Checkout Invoice Link */}
        {consultation?.salesAssist?.checkoutLink && (
          <SectionCard>
            <h3 className="text-heading text-textDark mb-3">Complete Your Purchase</h3>
            <p className="text-body text-textMedium mb-4">
              Click below to complete your purchase with the recommended items.
            </p>
            <PrimaryButton 
              onClick={() => window.open(consultation.salesAssist.checkoutLink, "_blank")}
              className="w-full"
            >
              <div className="flex items-center justify-center gap-2">
                <ShoppingCartIcon size={18} />
                <span>Buy Now - Complete Purchase</span>
              </div>
            </PrimaryButton>
            <div className="mt-3">
              <p className="text-xs text-textLight mb-2">Checkout Link:</p>
              <a
                href={consultation.salesAssist.checkoutLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gold hover:underline break-all block"
              >
                {consultation.salesAssist.checkoutLink}
              </a>
            </div>
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}
