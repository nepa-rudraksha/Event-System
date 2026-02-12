import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SectionCard, PrimaryButton, Field, Input, GhostButton, Chip } from "../../components/ui";
import { AdminNav } from "../../components/AdminNav";
import { getAdminToken } from "../../lib/adminSession";
import { api } from "../../lib/api";
import { RichTextEditor } from "../../components/RichTextEditor";

export default function ExhibitCatalog() {
  const { eventId } = useParams<{ eventId: string }>();
  const [exhibits, setExhibits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (eventId) loadExhibits();
  }, [eventId]);

  const loadExhibits = async () => {
    try {
      const res = await api.get(`/admin/event/${eventId}/exhibits`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      setExhibits(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = () => {
    setFormData({
      type: "rudraksha",
      name: "",
      rarity: "",
      deity: "",
      planet: "",
      benefits: [],
      description: "",
      beejMantra: "",
      images: [],
      model3dUrl: "",
      darshanStart: "",
      darshanEnd: "",
      isVisible: true,
      tags: [],
      shopifyProductId: "",
      shopifyVariantId: "",
      qrCode: "",
    });
    setEditing("new");
  };

  const handleSave = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      // Prepare data for saving - convert string images/tags to arrays if needed
      const saveData = { ...formData };
      
      // Convert images string to array if it's a string
      if (typeof saveData.images === "string") {
        saveData.images = saveData.images.split(",").map((s: string) => s.trim()).filter((s: string) => s);
      }
      
      // Convert tags string to array if it's a string
      if (typeof saveData.tags === "string") {
        saveData.tags = saveData.tags.split(",").map((s: string) => s.trim()).filter((s: string) => s);
      }
      
      if (editing === "new") {
        await api.post(`/admin/event/${eventId}/exhibits`, saveData, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
        });
      } else {
        await api.put(`/admin/exhibits/${editing}`, saveData, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
        });
      }
      setEditing(null);
      loadExhibits();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to save exhibit";
      alert(`Failed to save exhibit: ${errorMessage}`);
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exhibit?")) return;
    try {
      await api.delete(`/admin/exhibits/${id}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      loadExhibits();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const filtered = exhibits.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <AdminNav title="Exhibit Catalog Manager" />
            <p className="text-body text-textLight -mt-4">Manage all Rudraksha, Shaligram, and other exhibit items</p>
          </div>
          <PrimaryButton onClick={handleCreate}>+ Add New Exhibit</PrimaryButton>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {["all", "rudraksha", "shaligram", "book", "bracelet"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${
                  filter === t
                    ? "bg-gold text-white"
                    : "border-2 border-creamDark bg-white text-textMedium"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <Input
            value={search}
            onChange={setSearch}
            placeholder="Search exhibits..."
            className="md:w-64"
          />
        </div>

        {editing && (
          <SectionCard>
            <h2 className="text-heading text-textDark mb-4">
              {editing === "new" ? "New Exhibit" : "Edit Exhibit"}
            </h2>
            <div className="space-y-4">
              <Field label="Type" required>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-xl border-2 border-creamDark bg-white px-4 py-4 text-base text-textDark outline-none focus:border-gold"
                >
                  <option value="rudraksha">Rudraksha</option>
                  <option value="shaligram">Shaligram</option>
                  <option value="book">Book</option>
                  <option value="bracelet">Bracelet</option>
                  <option value="mala">Mala</option>
                </select>
              </Field>
              <Field label="Name" required>
                <Input
                  value={formData.name}
                  onChange={(v) => setFormData({ ...formData, name: v })}
                />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Rarity">
                  <Input
                    value={formData.rarity || ""}
                    onChange={(v) => setFormData({ ...formData, rarity: v })}
                  />
                </Field>
                <Field label="Deity">
                  <Input
                    value={formData.deity || ""}
                    onChange={(v) => setFormData({ ...formData, deity: v })}
                  />
                </Field>
                <Field label="Planet">
                  <Input
                    value={formData.planet || ""}
                    onChange={(v) => setFormData({ ...formData, planet: v })}
                  />
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border-2 border-creamDark bg-white px-4 py-4 text-base text-textDark outline-none focus:border-gold"
                  rows={4}
                  placeholder="Enter product description. If Shopify Product ID is provided, description will be fetched from Shopify if this field is empty."
                />
              </Field>
              <Field label="Images (comma-separated URLs)">
                <textarea
                  value={Array.isArray(formData.images) ? formData.images.join(", ") : (formData.images || "")}
                  onChange={(e) => {
                    // Store the raw string value, only parse to array when saving
                    const rawValue = e.target.value;
                    setFormData({ ...formData, images: rawValue });
                  }}
                  onBlur={(e) => {
                    // Parse to array when user leaves the field
                    const urls = e.target.value.split(",").map((s) => s.trim()).filter((s) => s);
                    setFormData({ ...formData, images: urls });
                  }}
                  className="w-full rounded-xl border-2 border-creamDark bg-white px-4 py-4 text-base text-textDark outline-none focus:border-gold"
                  rows={3}
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                />
                {Array.isArray(formData.images) && formData.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.images.map((url: string, idx: number) => (
                      <div key={idx} className="relative">
                        <img
                          src={url}
                          alt={`Image ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-creamDark"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="3D Model URL (paste iframe tag or URL)">
                <Input
                  value={formData.model3dUrl || ""}
                  onChange={(v) => {
                    // Extract URL from iframe tag if user pastes the entire iframe
                    let url = v;
                    const iframeMatch = v.match(/src=["']([^"']+)["']/);
                    if (iframeMatch) {
                      url = iframeMatch[1];
                    }
                    setFormData({ ...formData, model3dUrl: url });
                  }}
                  placeholder="https://poly.cam/capture/... or paste iframe tag"
                />
                {formData.model3dUrl && formData.model3dUrl.includes("<iframe") && (
                  <p className="text-xs text-textMedium mt-1">
                    ✓ URL extracted from iframe tag
                  </p>
                )}
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Darshan Start">
                  <Input
                    type="datetime-local"
                    value={formData.darshanStart ? new Date(formData.darshanStart).toISOString().slice(0, 16) : ""}
                    onChange={(v) => setFormData({ ...formData, darshanStart: v ? new Date(v).toISOString() : "" })}
                  />
                </Field>
                <Field label="Darshan End">
                  <Input
                    type="datetime-local"
                    value={formData.darshanEnd ? new Date(formData.darshanEnd).toISOString().slice(0, 16) : ""}
                    onChange={(v) => setFormData({ ...formData, darshanEnd: v ? new Date(v).toISOString() : "" })}
                  />
                </Field>
              </div>
              <Field label="Tags (comma-separated)">
                <textarea
                  value={Array.isArray(formData.tags) ? formData.tags.join(", ") : (formData.tags || "")}
                  onChange={(e) => {
                    // Store the raw string value, only parse to array when saving
                    const rawValue = e.target.value;
                    setFormData({ ...formData, tags: rawValue });
                  }}
                  onBlur={(e) => {
                    // Parse to array when user leaves the field
                    const tags = e.target.value.split(",").map((s) => s.trim()).filter((s) => s);
                    setFormData({ ...formData, tags: tags });
                  }}
                  className="w-full rounded-xl border-2 border-creamDark bg-white px-4 py-4 text-base text-textDark outline-none focus:border-gold"
                  rows={2}
                  placeholder="Museum Grade, 1 Mukhi, Rare"
                />
              </Field>
              <Field label="Shopify Product ID">
                <Input
                  value={formData.shopifyProductId || ""}
                  onChange={(v) => setFormData({ ...formData, shopifyProductId: v })}
                  placeholder="gid://shopify/Product/123456 or just 123456"
                />
                <p className="text-xs text-textLight mt-1">
                  If provided, product description will be automatically fetched from Shopify when description field is empty.
                </p>
              </Field>
              <Field label="QR Code (unique identifier for QR redirect)">
                <Input
                  value={formData.qrCode || ""}
                  onChange={(v) => setFormData({ ...formData, qrCode: v })}
                  placeholder="e.g., RUD-001, SHAL-042"
                />
                {formData.qrCode && (
                  <div className="mt-2 p-3 bg-cream rounded-lg">
                    <p className="text-xs text-textMedium mb-1">QR Redirect URL:</p>
                    <code className="text-sm text-gold break-all">
                      {window.location.origin}/api/qr/{formData.qrCode}
                    </code>
                    <p className="text-xs text-textLight mt-2">
                      Use this URL in your QR code generator. When scanned, it will redirect to this exhibit.
                    </p>
                  </div>
                )}
              </Field>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isVisible !== false}
                  onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                  className="h-5 w-5 rounded border-2 border-gold text-gold"
                />
                <label className="text-body text-textDark">Visible on visitor app</label>
              </div>
              <div className="flex gap-3">
                <PrimaryButton onClick={handleSave} disabled={loading}>
                  Save
                </PrimaryButton>
                <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
              </div>
            </div>
          </SectionCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exhibit) => {
            const exhibitImages = Array.isArray(exhibit.images) ? exhibit.images : (exhibit.images ? [exhibit.images] : []);
            return (
              <SectionCard key={exhibit.id}>
                {exhibitImages.length > 0 && (
                  <div className="mb-3 h-32 rounded-lg bg-cream overflow-hidden">
                    <img
                      src={exhibitImages[0]}
                      alt={exhibit.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-heading text-textDark">{exhibit.name}</h3>
                    <Chip>{exhibit.type}</Chip>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // Ensure images and tags are arrays when loading for editing
                        const editData = {
                          ...exhibit,
                          images: exhibitImages,
                          tags: Array.isArray(exhibit.tags) ? exhibit.tags : (exhibit.tags ? [exhibit.tags] : []),
                          darshanStart: exhibit.darshanStart || "",
                          darshanEnd: exhibit.darshanEnd || "",
                          model3dUrl: exhibit.model3dUrl || "",
                          description: exhibit.description || "",
                          shopifyProductId: exhibit.shopifyProductId || "",
                          shopifyVariantId: exhibit.shopifyVariantId || "",
                          qrCode: exhibit.qrCode || "",
                        };
                        setFormData(editData);
                        setEditing(exhibit.id);
                      }}
                      className="text-gold hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(exhibit.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {exhibit.rarity && <p className="text-sm text-textMedium">{exhibit.rarity}</p>}
                {exhibit.qrCode && (
                  <div className="mt-2 p-2 bg-cream rounded-lg">
                    <p className="text-xs text-textMedium mb-1">QR Code:</p>
                    <code className="text-xs text-gold break-all">
                      {window.location.origin}/api/qr/{exhibit.qrCode}
                    </code>
                  </div>
                )}
                <div className="mt-2 text-xs text-textLight">
                  {exhibit.isVisible ? "✅ Visible" : "❌ Hidden"}
                </div>
              </SectionCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
