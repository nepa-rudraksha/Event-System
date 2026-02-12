import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SectionCard, PrimaryButton, Chip } from "../../components/ui";
import { AdminNav } from "../../components/AdminNav";
import { getAdminToken } from "../../lib/adminSession";
import { api } from "../../lib/api";

export default function ConsultationControl() {
  const { eventId } = useParams<{ eventId: string }>();
  const [tokens, setTokens] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadTokens();
      const interval = setInterval(loadTokens, 5000);
      return () => clearInterval(interval);
    }
  }, [eventId]);

  const loadTokens = async () => {
    try {
      const res = await api.get(`/admin/event/${eventId}/tokens`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setTokens(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (tokenId: string, status: string) => {
    try {
      await api.patch(
        `/admin/tokens/${tokenId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${getAdminToken()}` } }
      );
      loadTokens();
    } catch (err) {
      alert("Failed to update token");
    }
  };

  const waiting = tokens.filter((t) => t.status === "WAITING");
  const inProgress = tokens.filter((t) => t.status === "IN_PROGRESS");
  const done = tokens.filter((t) => t.status === "DONE");

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <AdminNav title="Consultation System Control" />
            <p className="text-body text-textLight -mt-4">Manage token queue and consultation flow</p>
          </div>
          <PrimaryButton
            onClick={() => setPaused(!paused)}
            className={paused ? "bg-red-600" : ""}
          >
            {paused ? "▶ Resume Tokens" : "⏸ Pause Tokens"}
          </PrimaryButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SectionCard>
            <div className="text-3xl font-bold text-gold mb-2">{waiting.length}</div>
            <div className="text-body text-textDark font-semibold">Waiting</div>
          </SectionCard>
          <SectionCard>
            <div className="text-3xl font-bold text-blue-600 mb-2">{inProgress.length}</div>
            <div className="text-body text-textDark font-semibold">In Progress</div>
          </SectionCard>
          <SectionCard>
            <div className="text-3xl font-bold text-green-600 mb-2">{done.length}</div>
            <div className="text-body text-textDark font-semibold">Completed</div>
          </SectionCard>
        </div>

        <SectionCard>
          <h2 className="text-heading text-textDark mb-4">Token Queue</h2>
          <div className="space-y-3">
            {tokens.length === 0 && (
              <p className="text-body text-textLight text-center py-4">No tokens yet</p>
            )}
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border-2 border-creamDark bg-white"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gold">#{token.tokenNo}</span>
                    <span className="text-body text-textDark font-semibold">{token.visitor.name}</span>
                    <Chip>{token.status}</Chip>
                  </div>
                  <div className="text-sm text-textLight mt-1">{token.visitor.phone}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {token.status === "WAITING" && (
                    <button
                      onClick={() => handleStatusChange(token.id, "IN_PROGRESS")}
                      className="px-4 py-2 rounded-lg bg-gold text-white text-sm font-semibold"
                    >
                      Call Next
                    </button>
                  )}
                  {token.status === "IN_PROGRESS" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(token.id, "DONE")}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold"
                      >
                        Mark Done
                      </button>
                      <button
                        onClick={() => handleStatusChange(token.id, "NO_SHOW")}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold"
                      >
                        No Show
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
