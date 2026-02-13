import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppBar, AppShell, Chip, SectionCard } from "../components/ui";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { RudrakshaIcon, ClockIcon } from "../components/Icons";
import { fetchExhibits } from "../lib/api";
import { getSession } from "../lib/session";
import type { ExhibitItem } from "../lib/types";

// Category display names mapping
const categoryNames: Record<string, string> = {
  rudraksha: "Rudraksha",
  shaligram: "Shaligram",
  mala: "Siddha Mala",
  combination: "Combination",
  bracelet: "Bracelet",
  kanthamala: "Kanthamala",
};

export default function ExhibitList() {
  const { slug = "bangalore", type = "rudraksha" } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [items, setItems] = useState<ExhibitItem[]>([]);
  const [filter, setFilter] = useState("All");
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    if (!session) {
      navigate(`/e/${slug}`);
      return;
    }
    fetchExhibits(session.eventId, type)
      .then((exhibits) => {
        setItems(exhibits);
        // Extract all unique tags from visible items
        const allTags = new Set<string>();
        exhibits.forEach((item: ExhibitItem) => {
          if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach((tag: string) => {
              if (tag && tag.trim()) {
                allTags.add(tag.trim());
              }
            });
          }
        });
        setAvailableTags(Array.from(allTags).sort());
      })
      .catch(() => {
        setItems([]);
        setAvailableTags([]);
      });
  }, [navigate, session, slug, type]);

  const filteredItems = useMemo(() => {
    if (filter === "All") return items;
    return items.filter((item) => {
      if (!item.tags || !Array.isArray(item.tags)) return false;
      return item.tags.some((tag: string) => tag.trim() === filter);
    });
  }, [filter, items]);

  const categoryName = categoryNames[type.toLowerCase()] || type;

  return (
    <AppShell>
      <AppBar title={categoryName} />
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: `/e/${slug}/dashboard` },
          { label: "View Products", to: `/e/${slug}/exhibits` },
          { label: categoryName },
        ]}
      />
      
      {availableTags.length > 0 && (
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter("All")}
              className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                filter === "All"
                  ? "bg-gold text-white shadow-medium"
                  : "border-2 border-creamDark bg-white text-textMedium hover:border-gold"
              }`}
            >
              All
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilter(tag)}
                className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                  filter === tag
                    ? "bg-gold text-white shadow-medium"
                    : "border-2 border-creamDark bg-white text-textMedium hover:border-gold"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {filteredItems.length === 0 && (
          <div className="col-span-2">
            <SectionCard>
              <p className="text-body text-textLight text-center py-4">
                No exhibits published yet. Check back soon!
              </p>
            </SectionCard>
          </div>
        )}
        {filteredItems.map((item) => {
          const itemImages = Array.isArray(item.images) ? item.images : (item.images ? [item.images] : []);
          return (
            <Link
              key={item.id}
              to={`/e/${slug}/exhibits/${type}/${item.id}`}
              className="rounded-xl border-2 border-creamDark bg-white p-4 shadow-soft transition-all hover:shadow-medium hover:border-gold active:scale-[0.98]"
            >
              <div className="mb-3 h-32 rounded-lg bg-cream overflow-hidden relative flex items-center justify-center">
                {itemImages.length > 0 ? (
                  <img
                    src={itemImages[0]}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      const fallback = (e.target as HTMLImageElement).parentElement?.querySelector(".fallback-icon");
                      if (fallback) (fallback as HTMLElement).style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center fallback-icon" style={{ display: itemImages.length > 0 ? "none" : "flex" }}>
                  <RudrakshaIcon size={48} className="text-gold/60" />
                </div>
              </div>
              <div className="text-base font-semibold text-textDark mb-1">{item.name}</div>
              {item.rarity && (
                <div className="text-sm text-gold font-medium mb-2">{item.rarity}</div>
              )}
              {item.darshanStart && (
                <Chip>
                  <div className="flex items-center gap-1">
                    <ClockIcon size={14} />
                    <span>Darshan Available</span>
                  </div>
                </Chip>
              )}
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
