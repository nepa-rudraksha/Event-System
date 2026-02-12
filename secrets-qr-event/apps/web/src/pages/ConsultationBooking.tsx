import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AppBar,
  AppShell,
  PrimaryButton,
  SectionCard,
  StickyFooter,
} from "../components/ui";
import { TicketIcon, EditIcon, CheckIcon, ClockIcon } from "../components/Icons";
import { createToken, fetchVisitorSummary } from "../lib/api";
import { getSession } from "../lib/session";

export default function ConsultationBooking() {
  const { slug = "bangalore" } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    if (!session) return;
    fetchVisitorSummary(session.visitorId).then(setSummary).catch(() => setSummary(null));
  };

  useEffect(() => {
    if (!session?.visitorId) {
      navigate(`/e/${slug}`);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, session?.visitorId, slug]); // Only depend on visitorId, not entire session object

  const token = summary?.tokens?.[0];

  const handleToken = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await createToken(session.eventId, session.visitorId);
      refresh();
    } finally {
      setLoading(false);
    }
  };

  const [expanded, setExpanded] = useState(false);

  return (
    <AppShell>
      <AppBar 
        title={
          <div className="flex items-center gap-2">
            <TicketIcon size={20} className="text-gold" />
            <span>Free Consultation</span>
          </div>
        } 
      />
      
      {!token ? (
        <>
          <SectionCard>
            <div className="text-center space-y-4">
              <h2 className="text-title text-textDark">Get Your Consultation Token</h2>
              <p className="text-body text-textMedium">
                Reserve your free 1:1 spiritual consultation. You'll receive a token number and live queue updates.
              </p>
              <div className="mt-6 p-4 rounded-xl bg-cream border-2 border-creamDark">
                <div className="text-sm font-semibold text-textDark mb-2">Queue Status</div>
                <div className="text-base text-gold font-semibold">Available Now</div>
                <div className="text-sm text-textLight mt-1">Estimated wait: 10-15 minutes</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-left flex items-center justify-between"
            >
              <h3 className="text-heading text-textDark">How consultation works (10-15 min)</h3>
              <span className="text-gold text-xl">{expanded ? "−" : "+"}</span>
            </button>
            {expanded && (
              <div className="mt-4 pt-4 border-t border-creamDark space-y-3 text-body text-textMedium">
                <div className="flex items-start gap-3">
                  <span className="text-gold">1.</span>
                  <span>Meet the expert when your token is called</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-gold">2.</span>
                  <span>Share your birth details for accurate guidance</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-gold">3.</span>
                  <span>Receive personalized recommendations</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-gold">4.</span>
                  <span>Recommendations are locked for sales follow-up</span>
                </div>
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        <>
          <SectionCard>
            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-gold mb-2">#{token.tokenNo}</div>
              <div className="text-base font-semibold text-textDark">Your Consultation Token</div>
              <div className="mt-4 p-4 rounded-xl bg-cream border-2 border-gold">
                <div className="text-sm text-textMedium mb-1">Status</div>
                <div className="flex items-center gap-2 text-base font-semibold text-gold">
                  {token.status === "WAITING" && (
                    <>
                      <ClockIcon size={18} />
                      <span>Waiting in Queue</span>
                    </>
                  )}
                  {token.status === "IN_PROGRESS" && (
                    <>
                      <ClockIcon size={18} />
                      <span>Consultation in Progress</span>
                    </>
                  )}
                  {token.status === "DONE" && (
                    <>
                      <CheckIcon size={18} />
                      <span>Consultation Completed</span>
                    </>
                  )}
                </div>
              </div>
              <Link 
                to={`/e/${slug}/consultation/details`}
                className="inline-flex items-center gap-2 mt-4 text-base font-semibold text-gold hover:underline"
              >
                <EditIcon size={18} />
                <span>Update My Birth Details</span>
              </Link>
            </div>
          </SectionCard>
        </>
      )}

      <StickyFooter>
        <PrimaryButton onClick={handleToken} disabled={loading || !!token}>
          <div className="flex items-center justify-center gap-2">
            {token ? (
              <>
                <CheckIcon size={18} />
                <span>Token Booked</span>
              </>
            ) : (
              <>
                <TicketIcon size={18} />
                <span>Get My Token Now</span>
              </>
            )}
          </div>
        </PrimaryButton>
      </StickyFooter>
    </AppShell>
  );
}
