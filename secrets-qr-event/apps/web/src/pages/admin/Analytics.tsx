import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SectionCard } from "../../components/ui";
import { AdminNav } from "../../components/AdminNav";
import { getAdminToken } from "../../lib/adminSession";
import { api } from "../../lib/api";

export default function Analytics() {
  const { eventId } = useParams<{ eventId: string }>();
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    if (eventId) loadOverview();
  }, [eventId]);

  const loadOverview = async () => {
    try {
      const res = await api.get(`/admin/event/${eventId}/overview`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setOverview(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!overview) {
    return (
      <div className="min-h-screen bg-cream p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-body text-textLight">Loading...</p>
        </div>
      </div>
    );
  }

  const conversionRate =
    overview.consultations > 0
      ? ((overview.sales / overview.consultations) * 100).toFixed(1)
      : "0";

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <AdminNav title="Analytics Dashboard" />
          <p className="text-body text-textLight -mt-4">Event performance metrics and insights</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SectionCard>
            <div className="text-3xl font-bold text-gold mb-2">{overview.registrations}</div>
            <div className="text-body text-textDark font-semibold">Registrations</div>
            <div className="text-sm text-textLight mt-1">Total visitors registered</div>
          </SectionCard>
          <SectionCard>
            <div className="text-3xl font-bold text-blue-600 mb-2">{overview.tokens}</div>
            <div className="text-body text-textDark font-semibold">Tokens Issued</div>
            <div className="text-sm text-textLight mt-1">Consultation tokens booked</div>
          </SectionCard>
          <SectionCard>
            <div className="text-3xl font-bold text-green-600 mb-2">{overview.consultations}</div>
            <div className="text-body text-textDark font-semibold">Consultations</div>
            <div className="text-sm text-textLight mt-1">Completed sessions</div>
          </SectionCard>
          <SectionCard>
            <div className="text-3xl font-bold text-purple-600 mb-2">{overview.sales}</div>
            <div className="text-body text-textDark font-semibold">Sales Assisted</div>
            <div className="text-sm text-textLight mt-1">Checkout links generated</div>
          </SectionCard>
        </div>

        <SectionCard>
          <h2 className="text-heading text-textDark mb-4">Conversion Funnel</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-body text-textDark">Registrations → Tokens</span>
                <span className="text-body font-semibold text-textDark">
                  {overview.registrations > 0
                    ? ((overview.tokens / overview.registrations) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-creamDark rounded-full h-3">
                <div
                  className="bg-gold h-3 rounded-full"
                  style={{
                    width: `${overview.registrations > 0 ? (overview.tokens / overview.registrations) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-body text-textDark">Tokens → Consultations</span>
                <span className="text-body font-semibold text-textDark">
                  {overview.tokens > 0
                    ? ((overview.consultations / overview.tokens) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-creamDark rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{
                    width: `${overview.tokens > 0 ? (overview.consultations / overview.tokens) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-body text-textDark">Consultations → Sales</span>
                <span className="text-body font-semibold text-textDark">{conversionRate}%</span>
              </div>
              <div className="w-full bg-creamDark rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {overview.nowServing && (
          <SectionCard>
            <h2 className="text-heading text-textDark mb-4">Currently Serving</h2>
            <div className="text-2xl font-bold text-gold">
              Token #{overview.nowServing.tokenNo}
            </div>
            <div className="text-body text-textMedium mt-2">
              Consultation in progress
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
