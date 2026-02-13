import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SectionCard, PrimaryButton } from "../components/ui";
import { EventSelector } from "../components/EventSelector";
import { fetchExpertQueue, updateTokenStatus, sendWhatsAppNotification } from "../lib/api";
import { getAdminSession, getAdminEventId, setAdminEventId, clearAdminSession } from "../lib/adminSession";
import { MessageIcon, UserIcon, ClockIcon, CheckIcon } from "../components/Icons";

export default function ExpertQueue() {
  const { eventId: urlEventId = "" } = useParams();
  const navigate = useNavigate();
  const session = getAdminSession();
  const [tokens, setTokens] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(urlEventId || getAdminEventId() || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate("/ops/expert/login");
      return;
    }
    if (urlEventId) {
      setSelectedEventId(urlEventId);
      setAdminEventId(urlEventId);
    } else {
      const saved = getAdminEventId();
      if (saved) {
        setSelectedEventId(saved);
        navigate(`/ops/expert/${saved}`, { replace: true });
      }
    }
  }, [session, navigate, urlEventId]);

  const [stats, setStats] = useState({ waiting: 0, inProgress: 0, completed: 0, total: 0 });

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    fetchExpertQueue(selectedEventId)
      .then((data) => {
        // Handle both old format (array) and new format (object with tokens and stats)
        if (Array.isArray(data)) {
          setTokens(data);
        } else {
          setTokens(data.tokens || []);
          setStats(data.stats || { waiting: 0, inProgress: 0, completed: 0, total: 0 });
        }
      })
      .catch(() => {
        setTokens([]);
        setStats({ waiting: 0, inProgress: 0, completed: 0, total: 0 });
      })
      .finally(() => setLoading(false));
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchExpertQueue(selectedEventId)
        .then((data) => {
          if (Array.isArray(data)) {
            setTokens(data);
          } else {
            setTokens(data.tokens || []);
            setStats(data.stats || { waiting: 0, inProgress: 0, completed: 0, total: 0 });
          }
        })
        .catch(() => {
          setTokens([]);
          setStats({ waiting: 0, inProgress: 0, completed: 0, total: 0 });
        });
    }, 10000);
    
    return () => clearInterval(interval);
  }, [selectedEventId]);

  const handleEventChange = (newEventId: string) => {
    setSelectedEventId(newEventId);
    if (newEventId) {
      setAdminEventId(newEventId);
      navigate(`/ops/expert/${newEventId}`, { replace: true });
    }
  };

  const handleStatus = async (tokenId: string, status: string) => {
    setLoading(true);
    try {
      await updateTokenStatus(tokenId, status);
      const data = await fetchExpertQueue(selectedEventId);
      if (Array.isArray(data)) {
        setTokens(data);
      } else {
        setTokens(data.tokens || []);
        setStats(data.stats || { waiting: 0, inProgress: 0, completed: 0, total: 0 });
      }
    } finally {
      setLoading(false);
    }
  };

  const waitingTokens = tokens.filter((t) => t.status === "WAITING");
  const inProgressTokens = tokens.filter((t) => t.status === "IN_PROGRESS");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WAITING":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "IN_PROGRESS":
        return "bg-gold/20 text-gold border-gold/40";
      case "DONE":
        return "bg-green-100 text-green-700 border-green-300";
      case "NO_SHOW":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-display text-textDark mb-2">Expert Consultation Queue</h1>
            <p className="text-body text-textLight">Welcome, {session?.name}</p>
          </div>
          <div className="flex gap-3">
            {selectedEventId && (
              <Link
                to={`/ops/expert/${selectedEventId}/customers`}
                className="px-4 py-2 rounded-xl border-2 border-creamDark text-textDark font-semibold hover:bg-creamDark flex items-center gap-2"
              >
                <UserIcon size={18} />
                View All Customers
              </Link>
            )}
            <button
              onClick={() => {
                clearAdminSession();
                navigate("/ops/expert/login");
              }}
              className="px-4 py-2 rounded-xl border-2 border-creamDark text-textDark font-semibold hover:bg-creamDark"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Event Selector */}
        <SectionCard>
          <EventSelector
            value={selectedEventId}
            onChange={handleEventChange}
            label="Select Event"
            hint="Choose an event to view consultation queue"
            required
          />
        </SectionCard>

        {selectedEventId && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SectionCard>
                <div className="text-3xl font-bold text-blue-600 mb-2">{stats.waiting}</div>
                <div className="text-body text-textDark font-semibold">Waiting</div>
              </SectionCard>
              <SectionCard>
                <div className="text-3xl font-bold text-gold mb-2">{stats.inProgress}</div>
                <div className="text-body text-textDark font-semibold">In Progress</div>
              </SectionCard>
              <SectionCard>
                <div className="text-3xl font-bold text-green-600 mb-2">{stats.completed}</div>
                <div className="text-body text-textDark font-semibold">Completed</div>
              </SectionCard>
              <SectionCard>
                <div className="text-3xl font-bold text-purple-600 mb-2">{stats.total}</div>
                <div className="text-body text-textDark font-semibold">Total</div>
              </SectionCard>
            </div>

            {/* Queue Table - Desktop View */}
            {tokens.length > 0 ? (
              <SectionCard>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-creamDark">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-textDark">Token #</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-textDark">Customer</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-textDark">Phone</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-textDark">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-textDark">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((token) => (
                        <tr
                          key={token.id}
                          className="border-b border-creamDark/50 hover:bg-cream/50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="font-semibold text-textDark">#{token.tokenNo}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-textDark">{token.visitor?.name || "N/A"}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-textMedium">{token.visitor?.phone || "N/A"}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                                token.status
                              )}`}
                            >
                              {token.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {token.status === "WAITING" && (
                                <PrimaryButton
                                  onClick={() => handleStatus(token.id, "IN_PROGRESS")}
                                  className="text-xs px-3 py-1"
                                  disabled={loading}
                                >
                                  Start
                                </PrimaryButton>
                              )}
                              {token.status === "IN_PROGRESS" && (
                                <>
                                  <PrimaryButton
                                    onClick={() => handleStatus(token.id, "DONE")}
                                    className="text-xs px-3 py-1"
                                    disabled={loading}
                                  >
                                    <CheckIcon size={14} className="mr-1" />
                                    Complete
                                  </PrimaryButton>
                                </>
                              )}
                              {token.consultation?.id && (
                                <Link
                                  to={`/ops/expert/${selectedEventId}/workspace/${token.consultation.id}`}
                                  className="px-3 py-1 rounded-lg bg-gold text-white text-xs font-semibold hover:bg-gold/90 transition-colors"
                                >
                                  Open Workspace
                                </Link>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {token.consultation?.id && token.visitor?.phone ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={async () => {
                                    if (!token.consultation?.id) return;
                                    try {
                                      const result = await sendWhatsAppNotification(token.consultation.id, {
                                        templateKey: "consultation_ready",
                                        parameters: [
                                          { type: "text", text: token.visitor?.name || "Customer" },
                                          { type: "text", text: String(token.tokenNo) },
                                        ],
                                      });
                                      if (result.success) {
                                        alert("✅ Consultation Ready WhatsApp sent!");
                                      } else {
                                        alert(`❌ Failed: ${result.reason || "Unknown error"}`);
                                      }
                                    } catch (err: any) {
                                      alert(`❌ Error: ${err.response?.data?.error || err.message || "Failed to send"}`);
                                    }
                                  }}
                                  className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1"
                                  title="Send Consultation Ready"
                                >
                                  <MessageIcon size={14} />
                                  Ready
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!token.consultation?.id) return;
                                    try {
                                      const result = await sendWhatsAppNotification(token.consultation.id, {
                                        templateKey: "consultation_get_ready",
                                        parameters: [
                                          { type: "text", text: token.visitor?.name || "Customer" },
                                          { type: "text", text: String(token.tokenNo) },
                                        ],
                                      });
                                      if (result.success) {
                                        alert("✅ Get Ready WhatsApp sent!");
                                      } else {
                                        alert(`❌ Failed: ${result.reason || "Unknown error"}`);
                                      }
                                    } catch (err: any) {
                                      alert(`❌ Error: ${err.response?.data?.error || err.message || "Failed to send"}`);
                                    }
                                  }}
                                  className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
                                  title="Send Get Ready"
                                >
                                  <MessageIcon size={14} />
                                  Get Ready
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-textLight">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            ) : (
              <SectionCard>
                <div className="text-center py-12">
                  <ClockIcon size={48} className="mx-auto mb-4 text-textLight" />
                  <p className="text-body text-textMedium">No tokens in queue</p>
                  <p className="text-sm text-textLight mt-2">Tokens will appear here when customers book consultations</p>
                </div>
              </SectionCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
