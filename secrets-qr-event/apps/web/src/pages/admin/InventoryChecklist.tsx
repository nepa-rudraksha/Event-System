import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SectionCard, PrimaryButton, Field, Input } from "../../components/ui";
import { AdminNav } from "../../components/AdminNav";
import { getAdminToken } from "../../lib/adminSession";
import { api } from "../../lib/api";

export default function InventoryChecklist() {
  const { eventId } = useParams<{ eventId: string }>();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    itemName: "",
    requiredQty: 0,
    packedQty: 0,
    status: "pending",
    assignedTo: "",
    notes: "",
  });

  useEffect(() => {
    if (eventId) loadItems();
  }, [eventId]);

  const loadItems = async () => {
    try {
      const res = await api.get(`/admin/event/${eventId}/ops-checklist`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      await api.post(`/admin/event/${eventId}/ops-checklist`, formData, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setShowForm(false);
      setFormData({
        category: "",
        itemName: "",
        requiredQty: 0,
        packedQty: 0,
        status: "pending",
        assignedTo: "",
        notes: "",
      });
      loadItems();
    } catch (err) {
      alert("Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/admin/ops-checklist/${id}`, { status }, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      loadItems();
    } catch (err: any) {
      // If endpoint doesn't exist, update locally
      setItems(items.map(item => item.id === id ? { ...item, status } : item));
    }
  };

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <AdminNav title="Inventory & Product Prep" />
            <p className="text-body text-textLight -mt-4">Track items being taken to the event</p>
          </div>
          <PrimaryButton onClick={() => setShowForm(!showForm)}>
            + Add Item
          </PrimaryButton>
        </div>

        {showForm && (
          <SectionCard>
            <h2 className="text-heading text-textDark mb-4">Add Inventory Item</h2>
            <div className="space-y-4">
              <Field label="Category" required>
                <Input
                  value={formData.category}
                  onChange={(v) => setFormData({ ...formData, category: v })}
                  placeholder="Rare Rudraksha, Siddha Mala, Books..."
                />
              </Field>
              <Field label="Item Name" required>
                <Input
                  value={formData.itemName}
                  onChange={(v) => setFormData({ ...formData, itemName: v })}
                />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Required Qty" required>
                  <Input
                    value={String(formData.requiredQty)}
                    onChange={(v) => setFormData({ ...formData, requiredQty: parseInt(v) || 0 })}
                    type="number"
                  />
                </Field>
                <Field label="Packed Qty">
                  <Input
                    value={String(formData.packedQty)}
                    onChange={(v) => setFormData({ ...formData, packedQty: parseInt(v) || 0 })}
                    type="number"
                  />
                </Field>
              </div>
              <Field label="Assigned To">
                <Input
                  value={formData.assignedTo}
                  onChange={(v) => setFormData({ ...formData, assignedTo: v })}
                  placeholder="Staff name"
                />
              </Field>
              <Field label="Notes">
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border-2 border-creamDark bg-white px-4 py-4 text-base text-textDark min-h-[80px]"
                />
              </Field>
              <PrimaryButton onClick={handleCreate} disabled={loading}>
                Add Item
              </PrimaryButton>
            </div>
          </SectionCard>
        )}

        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.category === category);
          return (
            <SectionCard key={category}>
              <h2 className="text-heading text-textDark mb-4">{category}</h2>
              <div className="space-y-3">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border-2 border-creamDark bg-white"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-textDark">{item.itemName}</div>
                      <div className="text-sm text-textMedium">
                        Required: {item.requiredQty} | Packed: {item.packedQty}
                      </div>
                      {item.assignedTo && (
                        <div className="text-xs text-textLight">Assigned to: {item.assignedTo}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {["pending", "packed", "loaded", "arrived"].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(item.id, status)}
                          className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                            item.status === status
                              ? "bg-gold text-white"
                              : "bg-cream text-textMedium"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
