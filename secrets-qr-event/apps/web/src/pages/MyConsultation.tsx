import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppBar, AppShell, PrimaryButton, SectionCard, Chip, GhostButton } from "../components/ui";
import { MessageIcon, ShoppingCartIcon } from "../components/Icons";
import { KundaliChart } from "../components/KundaliChart";
import { NavamsaChart } from "../components/NavamsaChart";
import { fetchVisitorSummary } from "../lib/api";
import { getSession } from "../lib/session";

export default function MyConsultation() {
  const { slug = "bangalore" } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [summary, setSummary] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);

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
  const report = consultation?.astrologyReport;

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

        {/* Astrology Report */}
        {report && (
          <SectionCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-heading text-textDark">Your Astrology Report</h3>
              <GhostButton onClick={() => setShowReport(!showReport)}>
                {showReport ? "Hide" : "Show"} Report
              </GhostButton>
            </div>
            {showReport && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {/* Kundali and Navamsa Charts */}
                {((report.houses_array_serialized && report.planets_in_houses_serialized) || report.result?.navamsa_houses_array || report.navamsa_houses_array) ? (
                  <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {report.houses_array_serialized && report.planets_in_houses_serialized && (
                        <div>
                          <KundaliChart
                            housesArray={report.houses_array_serialized}
                            planetsInHouses={report.planets_in_houses_serialized}
                            name={summary?.name || "Customer"}
                          />
                        </div>
                      )}
                      {(report.result?.navamsa_houses_array || report.navamsa_houses_array) && (
                        <div>
                          <NavamsaChart
                            navamsaHouses={report.result?.navamsa_houses_array || report.navamsa_houses_array}
                            name={summary?.name || "Customer"}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Basic Details */}
                {report.result && (report.result.lagna || report.result.rashi || report.result.nakshatra) && (
                  <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                    <h4 className="text-base font-semibold text-textDark mb-3">Basic Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {report.result.lagna && (
                        <div>
                          <p className="text-sm font-semibold text-textDark mb-1">Lagna</p>
                          <p className="text-body text-textMedium">{report.result.lagna}</p>
                          {report.result.lagna_ruling_planet && (
                            <p className="text-xs text-textLight">Ruling Planet: {report.result.lagna_ruling_planet}</p>
                          )}
                        </div>
                      )}
                      {report.result.rashi && (
                        <div>
                          <p className="text-sm font-semibold text-textDark mb-1">Rashi</p>
                          <p className="text-body text-textMedium">{report.result.rashi}</p>
                          {report.result.rashi_ruling_planet && (
                            <p className="text-xs text-textLight">Ruling Planet: {report.result.rashi_ruling_planet}</p>
                          )}
                        </div>
                      )}
                      {report.result.nakshatra && (
                        <div>
                          <p className="text-sm font-semibold text-textDark mb-1">Nakshatra</p>
                          <p className="text-body text-textMedium">{report.result.nakshatra}</p>
                          {report.result.nakshatra_ruling_planet && (
                            <p className="text-xs text-textLight">Ruling Planet: {report.result.nakshatra_ruling_planet}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Event Report */}
                {report.event_report && (() => {
                  const lines = report.event_report.split('\n');
                  const elements: React.ReactNode[] = [];
                  let currentTableRows: React.ReactNode[] = [];
                  let inTable = false;
                  
                  lines.forEach((line: string, idx: number) => {
                    const trimmed = line.trim();
                    
                    // Handle main headers (# Header)
                    if (trimmed.startsWith('# ') && !trimmed.startsWith('##')) {
                      if (inTable) {
                        elements.push(
                          <table key={`table-${idx}`} className="min-w-full my-2 border border-creamDark rounded-lg overflow-hidden">
                            <thead>{currentTableRows[0]}</thead>
                            <tbody>{currentTableRows.slice(1)}</tbody>
                          </table>
                        );
                        currentTableRows = [];
                        inTable = false;
                      }
                      elements.push(
                        <h2 key={idx} className="text-xl font-bold text-textDark mt-4 mb-2 first:mt-0">
                          {trimmed.substring(2).trim()}
                        </h2>
                      );
                      return;
                    }
                    
                    // Handle subheaders (## Subheader)
                    if (trimmed.startsWith('## ')) {
                      if (inTable) {
                        elements.push(
                          <table key={`table-${idx}`} className="min-w-full my-2 border border-creamDark rounded-lg overflow-hidden">
                            <thead>{currentTableRows[0]}</thead>
                            <tbody>{currentTableRows.slice(1)}</tbody>
                          </table>
                        );
                        currentTableRows = [];
                        inTable = false;
                      }
                      elements.push(
                        <h3 key={idx} className="text-lg font-semibold text-textDark mt-3 mb-1">
                          {trimmed.substring(3).trim()}
                        </h3>
                      );
                      return;
                    }
                    
                    // Handle markdown tables
                    if (trimmed.startsWith('|') && trimmed.includes('|')) {
                      if (trimmed.includes('---') || trimmed.includes('----')) {
                        return;
                      }
                      
                      const cells = trimmed.split('|').filter(cell => cell.trim() !== '');
                      const isFirstRow = !inTable;
                      
                      if (isFirstRow) {
                        inTable = true;
                        currentTableRows = [];
                      }
                      
                      const row = (
                        <tr key={`row-${idx}`} className={isFirstRow ? "border-b-2 border-creamDark" : "border-b border-creamDark/50"}>
                          {cells.map((cell, cellIdx) => {
                            const cellContent = cell.trim();
                            if (isFirstRow) {
                              return (
                                <th key={cellIdx} className="px-4 py-2 text-left text-sm font-semibold text-textDark bg-creamDark/50">
                                  {cellContent}
                                </th>
                              );
                            }
                            return (
                              <td key={cellIdx} className="px-4 py-2 text-sm text-textMedium">
                                {cellContent}
                              </td>
                            );
                          })}
                        </tr>
                      );
                      
                      currentTableRows.push(row);
                      return;
                    }
                    
                    if (inTable && trimmed) {
                      elements.push(
                        <table key={`table-${idx}`} className="min-w-full my-2 border border-creamDark rounded-lg overflow-hidden">
                          <thead>{currentTableRows[0]}</thead>
                          <tbody>{currentTableRows.slice(1)}</tbody>
                        </table>
                      );
                      currentTableRows = [];
                      inTable = false;
                    }
                    
                    if (trimmed && trimmed.includes('**')) {
                      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
                      elements.push(
                        <p key={idx} className="my-1">
                          {parts.map((part, pIdx) => 
                            part.startsWith('**') && part.endsWith('**') ? (
                              <strong key={pIdx} className="font-semibold text-textDark">
                                {part.slice(2, -2)}
                              </strong>
                            ) : (
                              <span key={pIdx}>{part}</span>
                            )
                          )}
                        </p>
                      );
                      return;
                    }
                    
                    if (trimmed) {
                      elements.push(
                        <p key={idx} className="my-1 text-textMedium">
                          {trimmed}
                        </p>
                      );
                      return;
                    }
                    
                    if (!trimmed && elements.length > 0) {
                      elements.push(<div key={`spacer-${idx}`} className="h-1" />);
                    }
                  });
                  
                  if (inTable && currentTableRows.length > 0) {
                    elements.push(
                      <table key="table-final" className="min-w-full my-2 border border-creamDark rounded-lg overflow-hidden">
                        <thead>{currentTableRows[0]}</thead>
                        <tbody>{currentTableRows.slice(1)}</tbody>
                      </table>
                    );
                  }
                  
                  return (
                    <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                      <h4 className="text-base font-semibold text-textDark mb-3">Astrology Report</h4>
                      <div className="text-body text-textMedium leading-relaxed">
                        {elements}
                      </div>
                    </div>
                  );
                })()}

                {/* Mahadasha and Antardasha */}
                {report.result?.current_mahadasha && (
                  <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                    <h4 className="text-base font-semibold text-textDark mb-3">Mahadasha & Antardasha</h4>
                    
                    {report.result.current_mahadasha && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-textDark">Current Mahadasha:</p>
                          <span className="px-3 py-1 rounded-lg bg-gold/20 text-gold font-semibold text-sm">
                            {report.result.current_mahadasha.name}
                          </span>
                        </div>
                        <p className="text-xs text-textMedium mb-2">
                          {new Date(report.result.current_mahadasha.start_date).toLocaleDateString()} - {new Date(report.result.current_mahadasha.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {report.result.current_antardasha && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-textDark">Current Antardasha:</p>
                          <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 font-semibold text-sm">
                            {report.result.current_antardasha.name}
                          </span>
                        </div>
                        <p className="text-xs text-textMedium mb-2">
                          {new Date(report.result.current_antardasha.start_date).toLocaleDateString()} - {new Date(report.result.current_antardasha.end_date).toLocaleDateString()}
                        </p>
                        {report.result.current_antardasha_significance && (
                          <p className="text-sm text-textMedium italic mt-2">
                            {report.result.current_antardasha_significance}
                          </p>
                        )}
                      </div>
                    )}

                    {report.result.current_mahadasha?.antardasha_sequence && report.result.current_mahadasha.antardasha_sequence.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-textDark mb-2">Antardasha Sequence:</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {report.result.current_mahadasha.antardasha_sequence.map((antardasha: any, idx: number) => (
                            <div key={idx} className="p-2 rounded-lg bg-white border border-creamDark">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-textDark">{antardasha.name}</span>
                                <span className="text-xs text-textMedium">
                                  {new Date(antardasha.start_date).toLocaleDateString()} - {new Date(antardasha.end_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Friendship Matrix */}
                {report.result?.friendship_matrix && report.result.friendship_matrix.length > 0 && (
                  <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                    <h4 className="text-base font-semibold text-textDark mb-3">Planet Friendship Matrix</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg border border-creamDark">
                        <thead>
                          <tr className="bg-creamDark">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-textDark">Planet</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Sun</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Moon</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Mars</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Mercury</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Jupiter</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Venus</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Saturn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.result.friendship_matrix.map((row: any, idx: number) => (
                            <tr key={idx} className="border-t border-creamDark">
                              <td className="px-3 py-2 text-sm font-medium text-textDark">{row.planet}</td>
                              {row.relations.map((relation: string, relIdx: number) => (
                                <td key={relIdx} className="px-3 py-2 text-center text-xs">
                                  {relation === "---" ? (
                                    <span className="text-textLight">-</span>
                                  ) : relation === "Friend" ? (
                                    <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">{relation}</span>
                                  ) : (
                                    <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">{relation}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {report.shopify_enriched_rudraksha_recommendation && (
                  <div className="p-4 rounded-xl bg-gold/5 border-2 border-gold">
                    <h4 className="text-base font-semibold text-textDark mb-3">Recommended Siddha Mala</h4>
                    {report.shopify_enriched_rudraksha_recommendation.siddha_mala?.recommended && (
                      <div className="p-3 rounded-lg bg-white">
                        <div className="font-semibold text-textDark">
                          {report.shopify_enriched_rudraksha_recommendation.siddha_mala.recommended.product?.title}
                        </div>
                        <div className="text-sm text-textMedium mt-1">
                          {report.shopify_enriched_rudraksha_recommendation.siddha_mala.recommended.product?.metafields?.short_description}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        )}

        {/* Consultation Summary */}
        <SectionCard>
          <h3 className="text-heading text-textDark mb-3">Consultation Summary</h3>
          <p className="text-body text-textMedium leading-relaxed">
            {consultation?.notes ?? "Your expert consultation notes will appear here after your session."}
          </p>
        </SectionCard>

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

        {/* Next Steps */}
        <SectionCard>
          <h3 className="text-heading text-textDark mb-3">Next Steps</h3>
          <p className="text-body text-textMedium mb-4">
            {consultation?.salesAssist?.checkoutLink
              ? "Click below to complete your purchase with the recommended items."
              : "Meet the sales team to receive your curated checkout link with recommended items."}
          </p>
          {consultation?.salesAssist?.checkoutLink ? (
            <PrimaryButton 
              onClick={() => window.open(consultation.salesAssist.checkoutLink, "_blank")}
            >
              <div className="flex items-center justify-center gap-2">
                <ShoppingCartIcon size={18} />
                <span>Complete Purchase</span>
              </div>
            </PrimaryButton>
          ) : (
            <p className="text-sm text-textLight">
              Your checkout link will be available after the sales team processes your recommendations.
            </p>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
