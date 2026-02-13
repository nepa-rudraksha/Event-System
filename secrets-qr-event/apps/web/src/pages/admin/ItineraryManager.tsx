import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SectionCard, PrimaryButton, Field, Input, GhostButton } from "../../components/ui";
import { AdminNav } from "../../components/AdminNav";
import { getAdminToken } from "../../lib/adminSession";
import { api } from "../../lib/api";
import { fetchAdminItinerary, createItineraryItem, updateItineraryItem, deleteItineraryItem } from "../../lib/api";

export default function ItineraryManager() {
  const { eventId } = useParams<{ eventId: string }>();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    timeLabel: "",
    title: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    if (eventId) loadItems();
  }, [eventId]);

  const loadItems = async () => {
    if (!eventId) return;
    try {
      const data = await fetchAdminItinerary(eventId);
      setItems(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load itinerary items");
    }
  };

  const handleCreate = async () => {
    if (!eventId || !formData.timeLabel || !formData.title) {
      alert("Please fill in time label and title");
      return;
    }
    setLoading(true);
    try {
      await createItineraryItem(eventId, formData);
      setShowForm(false);
      setFormData({ timeLabel: "", title: "", description: "", isActive: true });
      loadItems();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create itinerary item");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.timeLabel || !formData.title) {
      alert("Please fill in time label and title");
      return;
    }
    setLoading(true);
    try {
      await updateItineraryItem(editingId, formData);
      setEditingId(null);
      setShowForm(false);
      setFormData({ timeLabel: "", title: "", description: "", isActive: true });
      loadItems();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update itinerary item");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this itinerary item?")) return;
    setLoading(true);
    try {
      await deleteItineraryItem(id);
      loadItems();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete itinerary item");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      timeLabel: item.timeLabel || "",
      title: item.title || "",
      description: item.description || "",
      isActive: item.isActive ?? true,
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({ timeLabel: "", title: "", description: "", isActive: true });
  };

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <AdminNav title="Event Schedule Manager" />
        <p className="text-body text-textLight -mt-4">Add, edit, or remove event schedule items</p>

        <div className="flex gap-3">
          <PrimaryButton
            onClick={() => {
              cancelEdit();
              setShowForm(true);
            }}
            disabled={showForm && !editingId}
          >
            + Add Schedule Item
          </PrimaryButton>
        </div>

        {showForm && (
          <SectionCard>
            <h2 className="text-heading text-textDark mb-4">
              {editingId ? "Edit Schedule Item" : "Add Schedule Item"}
            </h2>
            <div className="space-y-4">
              <Field label="Time Label *" hint="e.g., '10:30 AM', '2:00 PM'">
                <Input
                  value={formData.timeLabel}
                  onChange={(v) => setFormData({ ...formData, timeLabel: v })}
                  placeholder="10:30 AM"
                />
              </Field>
              <Field label="Title *">
                <Input
                  value={formData.title}
                  onChange={(v) => setFormData({ ...formData, title: v })}
                  placeholder="Talk + Book Launch"
                />
              </Field>
              <Field label="Description" hint="Optional detailed description">
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of the event..."
                  className="w-full rounded-xl border-2 border-creamDark bg-white px-4 py-4 text-base text-textDark placeholder:text-textLight outline-none focus:border-gold focus:shadow-soft min-h-[100px]"
                />
              </Field>
              <Field label="Status">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-gold rounded border-creamDark focus:ring-gold"
                  />
                  <span className="text-body text-textMedium">Active (visible to visitors)</span>
                </label>
              </Field>
              <div className="flex gap-3">
                <PrimaryButton
                  onClick={editingId ? handleUpdate : handleCreate}
                  disabled={loading || !formData.timeLabel || !formData.title}
                >
                  {loading ? "Saving..." : editingId ? "Update Item" : "Create Item"}
                </PrimaryButton>
                <GhostButton onClick={cancelEdit}>Cancel</GhostButton>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard>
          <h2 className="text-heading text-textDark mb-4">Schedule Items</h2>
          {items.length === 0 ? (
            <p className="text-body text-textLight text-center py-8">
              No schedule items yet. Click "Add Schedule Item" to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border-2 border-creamDark bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 rounded-lg bg-gold/20 text-gold font-semibold text-sm">
                          {item.timeLabel}
                        </span>
                        <h3 className="text-heading text-textDark">{item.title}</h3>
                        {!item.isActive && (
                          <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-semibold">
                            Inactive
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-body text-textMedium mt-2">{item.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <GhostButton
                        onClick={() => startEdit(item)}
                        className="text-xs px-3 py-1"
                      >
                        Edit
                      </GhostButton>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={loading}
                        className="px-3 py-1 rounded-lg border-2 border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
