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
  const recommendations = consultation?.recommendations ?? [];

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

        {/* Recommendations */}
        <SectionCard>
          <h3 className="text-heading text-textDark mb-4">Expert Recommendations</h3>
          {recommendations.length === 0 ? (
            <p className="text-body text-textLight">
              Recommendations will appear here after your consultation is completed.
            </p>
          ) : (
            <div className="space-y-4">
              {recommendations
                .sort((a: any, b: any) => a.priority - b.priority)
                .map((item: any) => (
                  <div key={item.id} className="rounded-xl border-2 border-creamDark bg-white p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Chip>Priority {item.priority}</Chip>
                        </div>
                        <div className="text-base font-semibold text-textDark mb-2">
                          {item.productDetails?.title || item.reason}
                        </div>
                        {item.productDetails?.images?.[0] && (
                          <img
                            src={item.productDetails.images[0].url}
                            alt=""
                            className="w-32 h-32 object-cover rounded-lg mb-2"
                          />
                        )}
                        {item.productDetails?.metafields?.short_description && (
                          <div className="text-sm text-textMedium mb-2">
                            {item.productDetails.metafields.short_description}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-sm text-textMedium mt-2">{item.notes}</div>
                        )}
                        {item.checkoutLink && (
                          <div className="mt-3">
                            <PrimaryButton
                              onClick={() => window.open(item.checkoutLink, "_blank")}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <ShoppingCartIcon size={18} />
                                <span>Proceed to Checkout</span>
                              </div>
                            </PrimaryButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </SectionCard>

        {/* Shopify Invoice/Checkout Link */}
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
