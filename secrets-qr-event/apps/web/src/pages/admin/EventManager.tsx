import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SectionCard, PrimaryButton, Field, Input, GhostButton } from "../../components/ui";
import { AdminNav } from "../../components/AdminNav";
import { getAdminToken } from "../../lib/adminSession";
import { api } from "../../lib/api";
import { RichTextEditor } from "../../components/RichTextEditor";

export default function EventManager() {
  const { eventId } = useParams<{ eventId: string }>();
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    venue: "",
    startTime: "",
    endTime: "",
    heroText: "",
    heroImage: "",
    askExpertContent: "",
  });

  useEffect(() => {
    if (!eventId) return;
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/event/${eventId}`);
      setEvent(res.data);
      setFormData({
        name: res.data.name || "",
        venue: res.data.venue || "",
        startTime: res.data.startTime ? new Date(res.data.startTime).toISOString().slice(0, 16) : "",
        endTime: res.data.endTime ? new Date(res.data.endTime).toISOString().slice(0, 16) : "",
        heroText: res.data.heroText || "",
        heroImage: res.data.heroImage || "",
        askExpertContent: res.data.askExpertContent || "",
      });
    } catch (err: any) {
      console.error("Failed to load event:", err);
      if (err.response?.status === 404) {
        alert(`Event not found. Please check the Event ID: ${eventId}`);
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        alert("Authentication failed. Please log in again.");
      } else {
        alert("Failed to load event. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      await api.put(`/admin/event/${eventId}`, formData);
      alert("Event updated successfully!");
      loadEvent();
    } catch (err: any) {
      console.error("Failed to update event:", err);
      if (err.response?.status === 404) {
        alert("Event not found. Please check the Event ID.");
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        alert("Authentication failed. Please log in again.");
      } else {
        alert("Failed to update event. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-cream p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <AdminNav title="Event Manager" />
          <p className="text-body text-textLight mt-4">
            {loading ? "Loading event details..." : "Event not found. Please check the Event ID."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <AdminNav title="Event Manager" />
        <p className="text-body text-textLight -mt-4">Manage event details, hero content, and theme settings</p>

        <SectionCard>
          <h2 className="text-heading text-textDark mb-4">Event Details</h2>
          <div className="space-y-6">
            <Field label="Event Name" required>
              <Input
                value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })}
                placeholder="Secrets of Rudraksha with Sukritya Khatiwada"
              />
            </Field>
            <Field label="Venue" required>
              <Input
                value={formData.venue}
                onChange={(v) => setFormData({ ...formData, venue: v })}
                placeholder="ITC Windsor, Bangalore"
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Start Time" required>
                <Input
                  value={formData.startTime}
                  onChange={(v) => setFormData({ ...formData, startTime: v })}
                  type="datetime-local"
                />
              </Field>
              <Field label="End Time" required>
                <Input
                  value={formData.endTime}
                  onChange={(v) => setFormData({ ...formData, endTime: v })}
                  type="datetime-local"
                />
              </Field>
            </div>
            <Field label="Hero Text" hint="Brief description shown on welcome screen">
              <textarea
                value={formData.heroText}
                onChange={(e) => setFormData({ ...formData, heroText: e.target.value })}
                placeholder="A calm, premium ritual entry into the largest Rudraksha display..."
                className="w-full rounded-xl border-2 border-creamDark bg-white px-4 py-4 text-base text-textDark placeholder:text-textLight outline-none focus:border-gold focus:shadow-soft min-h-[100px]"
              />
            </Field>
            <Field label="Hero Image URL" hint="URL to the hero background image">
              <Input
                value={formData.heroImage}
                onChange={(v) => setFormData({ ...formData, heroImage: v })}
                placeholder="https://example.com/hero-image.jpg"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard>
          <h2 className="text-heading text-textDark mb-4">Ask Expert Page Content</h2>
          <p className="text-body text-textLight mb-4">
            This content will be displayed on the "Ask Expert" page when visitors click the button from any product. 
            All products share the same Ask Expert page with this content.
          </p>
          <Field label="Rich Text Content">
            <RichTextEditor
              value={formData.askExpertContent}
              onChange={(v) => setFormData({ ...formData, askExpertContent: v })}
              placeholder="Enter content that will be displayed when visitors click 'Ask Expert'..."
            />
          </Field>
        </SectionCard>

        <div className="flex gap-3">
          <PrimaryButton onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "💾 Save Event Details"}
          </PrimaryButton>
          <GhostButton onClick={loadEvent}>↻ Reset</GhostButton>
        </div>
      </div>
    </div>
  );
}
