import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SectionCard, PrimaryButton, Field, Input } from "../../components/ui";
import { AdminNav } from "../../components/AdminNav";
import { fetchWhatsAppTemplates, createWhatsAppTemplate, sendAnnouncement, api } from "../../lib/api";

export default function NotificationsConsole() {
  const { eventId } = useParams();
  const [templates, setTemplates] = useState<any[]>([]);
  const [newTemplate, setNewTemplate] = useState({ templateKey: "", templateName: "", description: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Announcement sending state
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementResult, setAnnouncementResult] = useState<{ sent: number; failed: number; total: number; batches: number; message: string } | null>(null);
  
  // Visitor Welcome Configuration
  const [event, setEvent] = useState<any>(null);
  const [welcomeConfig, setWelcomeConfig] = useState({
    eventName: "",
    eventGuide: "",
    emergencyContact: "",
  });
  const [savingWelcomeConfig, setSavingWelcomeConfig] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadTemplates();
      loadEvent();
    }
  }, [eventId]);
  
  const loadEvent = async () => {
    if (!eventId) return;
    try {
      const res = await api.get(`/admin/event/${eventId}`);
      setEvent(res.data);
      const themeConfig = res.data.themeConfig || {};
      setWelcomeConfig({
        eventName: themeConfig.visitorWelcomeEventName || res.data.name || "",
        eventGuide: themeConfig.visitorWelcomeEventGuide || themeConfig.welcomePdfLink || "",
        emergencyContact: themeConfig.visitorWelcomeEmergencyContact || themeConfig.emergencyContact || "",
      });
    } catch (err) {
      console.error("Failed to load event:", err);
    }
  };
  
  const handleSaveWelcomeConfig = async () => {
    if (!eventId) return;
    setSavingWelcomeConfig(true);
    try {
      const currentEvent = await api.get(`/admin/event/${eventId}`);
      const currentThemeConfig = currentEvent.data.themeConfig || {};
      
      await api.put(`/admin/event/${eventId}`, {
        themeConfig: {
          ...currentThemeConfig,
          visitorWelcomeEventName: welcomeConfig.eventName,
          visitorWelcomeEventGuide: welcomeConfig.eventGuide,
          visitorWelcomeEmergencyContact: welcomeConfig.emergencyContact,
        },
      });
      
      alert("Visitor Welcome configuration saved successfully!");
      loadEvent();
    } catch (err: any) {
      console.error("Failed to save welcome config:", err);
      alert(err.response?.data?.error || "Failed to save configuration");
    } finally {
      setSavingWelcomeConfig(false);
    }
  };

  const loadTemplates = async () => {
    if (!eventId) return;
    try {
      const data = await fetchWhatsAppTemplates(eventId);
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  };

  const handleAddTemplate = async () => {
    if (!eventId || !newTemplate.templateKey || !newTemplate.templateName) {
      alert("Please fill in template key and name");
      return;
    }
    try {
      await createWhatsAppTemplate(eventId, {
        templateKey: newTemplate.templateKey,
        templateName: newTemplate.templateName,
        description: newTemplate.description,
      });
      setNewTemplate({ templateKey: "", templateName: "", description: "" });
      setShowAddForm(false);
      loadTemplates();
      alert("Template added successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to add template");
    }
  };

  const handleSendAnnouncement = async () => {
    if (!eventId || !announcementTitle || !announcementMessage) {
      alert("Please fill in both title and message");
      return;
    }

    if (!confirm(`Are you sure you want to send this announcement to ALL visitors?\n\nTitle: ${announcementTitle}\n\nMessage: ${announcementMessage}`)) {
      return;
    }

    setSendingAnnouncement(true);
    setAnnouncementResult(null);
    try {
      const result = await sendAnnouncement(eventId, {
        title: announcementTitle,
        message: announcementMessage,
      });
      setAnnouncementResult(result);
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      alert(`Announcement sent!\n\nSent: ${result.sent}\nFailed: ${result.failed}\nTotal: ${result.total}\nBatches: ${result.batches}`);
    } catch (err: any) {
      console.error("Failed to send announcement:", err);
      alert(err.response?.data?.error || "Failed to send announcement");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const defaultTemplates = [
    { key: "consultation_time_event", name: "Consultation Time Event", desc: "Notifies visitor about consultation time" },
    { key: "order_completed", name: "Order Completed", desc: "Sent after order is processed and completed" },
    { key: "token_booked", name: "Token Booked", desc: "Sent when visitor books a consultation token" },
    { key: "token_near", name: "Token Near", desc: "Sent when visitor's token is about to be called" },
  ];

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <AdminNav title="WhatsApp Notifications Console" />
          <p className="text-body text-textLight -mt-4">
            Manage notification template names. Templates must be created in WhatsApp Business first.
          </p>
        </div>

        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading text-textDark">Template Names</h2>
            <PrimaryButton onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? "Cancel" : "+ Add Template Name"}
            </PrimaryButton>
          </div>

          {showAddForm && (
            <div className="mb-4 p-4 rounded-xl bg-cream border-2 border-creamDark space-y-3">
              <Field label="Template Key" required hint="e.g., consultation_time_event, order_completed">
                <Input
                  value={newTemplate.templateKey}
                  onChange={(v) => setNewTemplate({ ...newTemplate, templateKey: v })}
                  placeholder="consultation_time_event"
                />
              </Field>
              <Field label="Template Name" required hint="Display name for this template">
                <Input
                  value={newTemplate.templateName}
                  onChange={(v) => setNewTemplate({ ...newTemplate, templateName: v })}
                  placeholder="Consultation Time Event"
                />
              </Field>
              <Field label="Description" hint="Optional description">
                <Input
                  value={newTemplate.description}
                  onChange={(v) => setNewTemplate({ ...newTemplate, description: v })}
                  placeholder="Notifies visitor about consultation time"
                />
              </Field>
              <PrimaryButton onClick={handleAddTemplate}>Add Template</PrimaryButton>
            </div>
          )}

          <div className="space-y-3">
            {templates.length === 0 && (
              <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                <p className="text-body text-textLight text-center py-4">
                  No templates configured yet. Add template names that match your WhatsApp Business templates.
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-textDark">Default Templates (add these):</p>
                  {defaultTemplates.map((t) => (
                    <div key={t.key} className="text-sm text-textMedium">
                      • <strong>{t.key}</strong> - {t.name} ({t.desc})
                    </div>
                  ))}
                </div>
              </div>
            )}
            {templates.map((template) => (
              <div key={template.id} className="p-4 rounded-xl border-2 border-creamDark bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-textDark mb-1">{template.templateName}</div>
                    <div className="text-sm text-textMedium font-mono mb-2">{template.templateKey}</div>
                    {template.description && (
                      <div className="text-sm text-textLight">{template.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {template.isActive ? (
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <h2 className="text-heading text-textDark mb-4">Send Announcement to All Visitors</h2>
          <p className="text-body text-textLight mb-4">
            Send a WhatsApp announcement to all registered visitors. Messages are automatically split into batches of 250 if needed.
          </p>
          
          <div className="space-y-4">
            <Field label="Announcement Title" required>
              <Input
                value={announcementTitle}
                onChange={(v) => setAnnouncementTitle(v)}
                placeholder="Important Announcement"
              />
            </Field>
            <Field label="Message" required>
              <textarea
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                placeholder="Please proceed to the main hall for the closing ceremony."
                className="w-full px-4 py-3 rounded-xl border-2 border-creamDark bg-white text-body text-textDark focus:outline-none focus:border-primary resize-none"
                rows={4}
              />
            </Field>
            <PrimaryButton 
              onClick={handleSendAnnouncement} 
              disabled={sendingAnnouncement || !announcementTitle || !announcementMessage}
            >
              {sendingAnnouncement ? "Sending..." : "📢 Send Announcement to All Visitors"}
            </PrimaryButton>
            
            {announcementResult && (
              <div className={`p-4 rounded-xl border-2 ${
                announcementResult.failed === 0 
                  ? "bg-green-50 border-green-200" 
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <div className="text-sm space-y-1">
                  <div className="font-semibold text-textDark">Result:</div>
                  <div>✅ Sent: {announcementResult.sent}</div>
                  {announcementResult.failed > 0 && (
                    <div>❌ Failed: {announcementResult.failed}</div>
                  )}
                  <div>📊 Total: {announcementResult.total}</div>
                  <div>📦 Batches: {announcementResult.batches}</div>
                  <div className="text-textMedium mt-2">{announcementResult.message}</div>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard>
          <h2 className="text-heading text-textDark mb-4">Configure Visitor Welcome Message</h2>
          <p className="text-body text-textLight mb-4">
            Configure the variables for the <code className="text-sm bg-creamDark px-2 py-1 rounded">visitor_welcome</code> template that is sent automatically after visitor registration.
          </p>
          
          <div className="space-y-4">
            <Field label="Event Name ({{2}})" required hint="The event name to display in the welcome message">
              <Input
                value={welcomeConfig.eventName}
                onChange={(v) => setWelcomeConfig({ ...welcomeConfig, eventName: v })}
                placeholder={event?.name || "Enter event name"}
              />
            </Field>
            <Field label="Event Guide URL ({{3}})" required hint="URL to the event guide PDF or document">
              <Input
                value={welcomeConfig.eventGuide}
                onChange={(v) => setWelcomeConfig({ ...welcomeConfig, eventGuide: v })}
                placeholder="https://example.com/event-guide.pdf"
              />
            </Field>
            <Field label="Emergency Contact ({{4}})" required hint="Emergency contact number in international format (e.g., +9779863832800)">
              <Input
                value={welcomeConfig.emergencyContact}
                onChange={(v) => setWelcomeConfig({ ...welcomeConfig, emergencyContact: v })}
                placeholder="+9779863832800"
              />
            </Field>
            <PrimaryButton 
              onClick={handleSaveWelcomeConfig} 
              disabled={savingWelcomeConfig || !welcomeConfig.eventName || !welcomeConfig.eventGuide || !welcomeConfig.emergencyContact}
            >
              {savingWelcomeConfig ? "Saving..." : "💾 Save Welcome Message Configuration"}
            </PrimaryButton>
            <div className="text-sm text-textLight bg-creamDark p-3 rounded-lg">
              <strong>Note:</strong> The welcome message template format is:<br/>
              <code className="text-xs mt-2 block whitespace-pre-wrap">
{`Welcome {{1}}! 

Thank you for registering for {{2}}.

Event Guide: {{3}}

Emergency Contact: {{4}}

 See you soon!`}
              </code>
              <div className="mt-2 text-xs">
                • {'{{1}}'} = Visitor name (automatically filled)<br/>
                • {'{{2}}'} = Event name (configured above)<br/>
                • {'{{3}}'} = Event guide URL (configured above)<br/>
                • {'{{4}}'} = Emergency contact (configured above)
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <h2 className="text-heading text-textDark mb-4">How It Works</h2>
          <div className="space-y-3 text-body text-textMedium">
            <p>
              <strong>1. Create Templates in WhatsApp Business:</strong> First, create your message templates in WhatsApp Business Manager with the exact template keys listed above.
            </p>
            <p>
              <strong>2. Add Template Names Here:</strong> Add the template keys and names that match your WhatsApp templates. This helps the system know which template to use.
            </p>
            <p>
              <strong>3. Automatic Sending:</strong> When orders are completed, the system will automatically send WhatsApp notifications using the configured template names.
            </p>
            <p>
              <strong>4. Send Announcements:</strong> Use the "Send Announcement" section above to broadcast messages to all visitors. Messages are automatically split into batches of 250 if you have more than 250 visitors.
            </p>
            <p className="text-sm text-textLight mt-4">
              <strong>Note:</strong> The actual template creation happens in WhatsApp Business Manager. This console only stores the template names for reference.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
