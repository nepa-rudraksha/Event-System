import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SectionCard } from "../components/ui";
import { EventSelector } from "../components/EventSelector";
import { fetchAdminOverview } from "../lib/api";
import { clearAdminSession, getAdminSession, getAdminEventId, setAdminEventId } from "../lib/adminSession";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const admin = getAdminSession();
  const [eventId, setEventId] = useState(getAdminEventId() || "");
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
      return;
    }
    const savedEventId = getAdminEventId();
    if (savedEventId && !eventId) {
      setEventId(savedEventId);
    }
  }, [admin, navigate]);

  useEffect(() => {
    if (!eventId) return;
    setAdminEventId(eventId);
    fetchAdminOverview(eventId).then(setOverview).catch(() => setOverview(null));
    const interval = setInterval(() => {
      fetchAdminOverview(eventId).then(setOverview).catch(() => setOverview(null));
    }, 30000);
    return () => clearInterval(interval);
  }, [eventId]);

  const adminModules = [
    { path: `/admin/event/${eventId}/manager`, icon: "⚙️", title: "Event Manager", desc: "Update event details, hero image, theme" },
    { path: `/admin/event/${eventId}/exhibits`, icon: "📿", title: "Exhibit Catalog", desc: "Manage Rudraksha, Shaligram, and all exhibits" },
    { path: `/admin/event/${eventId}/inventory`, icon: "📦", title: "Inventory Checklist", desc: "Track items being taken to event" },
    { path: `/admin/event/${eventId}/consultation`, icon: "🎫", title: "Consultation Control", desc: "Manage token queue and consultation flow" },
    { path: `/admin/event/${eventId}/customers`, icon: "👥", title: "Customer CRM", desc: "Search and view visitor profiles" },
    { path: `/admin/event/${eventId}/notifications`, icon: "📱", title: "Notifications", desc: "WhatsApp templates and delivery logs" },
    { path: `/admin/event/${eventId}/analytics`, icon: "📊", title: "Analytics", desc: "Event performance metrics and insights" },
  ];

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-display text-textDark mb-2">Admin CRM Dashboard</h1>
            <p className="text-body text-textLight">Welcome, {admin?.name}</p>
          </div>
          <button
            onClick={() => {
              clearAdminSession();
              navigate("/admin/login");
            }}
            className="px-4 py-2 rounded-xl border-2 border-creamDark text-textDark font-semibold hover:bg-creamDark"
          >
            Logout
          </button>
        </div>

        <SectionCard>
          <EventSelector
            value={eventId}
            onChange={(v) => {
              setEventId(v);
              if (v) {
                setAdminEventId(v);
              } else {
                setAdminEventId("");
                setOverview(null);
              }
            }}
            label="Select Event"
            hint="Choose an event to manage (selection is saved automatically)"
            required
          />
          {eventId && (
            <p className="text-sm text-textLight mt-2">
              ✓ Event selected. You can navigate between admin pages without re-selecting.
            </p>
          )}
        </SectionCard>

        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SectionCard>
              <div className="text-3xl font-bold text-gold mb-2">{overview.registrations}</div>
              <div className="text-body text-textDark font-semibold">Registrations</div>
            </SectionCard>
            <SectionCard>
              <div className="text-3xl font-bold text-blue-600 mb-2">{overview.tokens}</div>
              <div className="text-body text-textDark font-semibold">Tokens Issued</div>
            </SectionCard>
            <SectionCard>
              <div className="text-3xl font-bold text-green-600 mb-2">{overview.consultations}</div>
              <div className="text-body text-textDark font-semibold">Consultations</div>
            </SectionCard>
            <SectionCard>
              <div className="text-3xl font-bold text-purple-600 mb-2">{overview.sales}</div>
              <div className="text-body text-textDark font-semibold">Sales Assisted</div>
            </SectionCard>
          </div>
        )}

        {eventId && (
          <>
            {/* Quick Actions */}
            <SectionCard>
              <div className="space-y-3">
                <h3 className="text-heading text-textDark mb-2">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/admin/event/${eventId}/visitors/add`}
                    className="px-6 py-3 rounded-xl border-2 border-gold bg-gold text-white font-semibold hover:bg-goldLight transition-all"
                  >
                    + Add Visitor
                  </Link>
                  <Link
                    to={`/admin/event/${eventId}/visitors`}
                    className="px-6 py-3 rounded-xl border-2 border-creamDark bg-white text-textDark font-semibold hover:bg-cream transition-all"
                  >
                    View Generated Visitors
                  </Link>
                </div>
              </div>
            </SectionCard>

            {/* Admin Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminModules.map((module) => (
                <Link
                  key={module.path}
                  to={module.path}
                  className="block p-6 rounded-xl border-2 border-creamDark bg-white hover:border-gold hover:shadow-medium transition-all"
                >
                  <div className="text-4xl mb-3">{module.icon}</div>
                  <h3 className="text-heading text-textDark mb-2">{module.title}</h3>
                  <p className="text-body text-textLight">{module.desc}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
