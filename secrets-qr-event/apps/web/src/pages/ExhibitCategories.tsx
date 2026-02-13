import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppBar, AppShell, SectionCard } from "../components/ui";
import { Breadcrumbs } from "../components/Breadcrumbs";
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

export default function ExhibitCategories() {
  const { slug = "bangalore" } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      navigate(`/e/${slug}`);
      return;
    }

    const loadCategories = async () => {
      try {
        // Fetch all exhibits to determine available categories
        const allExhibits = await fetchExhibits(session.eventId);
        
        // Get unique categories from visible exhibits
        const uniqueCategories = Array.from(
          new Set(
            allExhibits
              .filter((item: ExhibitItem) => item.isVisible !== false)
              .map((item: ExhibitItem) => item.type)
              .filter((type: string) => type && categoryNames[type.toLowerCase()]) // Only include known categories
          )
        ) as string[];

        // Sort categories in a specific order
        const categoryOrder = ["rudraksha", "shaligram", "mala", "combination", "bracelet", "kanthamala"];
        const sorted = uniqueCategories.sort((a, b) => {
          const aIndex = categoryOrder.indexOf(a.toLowerCase());
          const bIndex = categoryOrder.indexOf(b.toLowerCase());
          if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });

        setCategories(sorted);
      } catch (err) {
        console.error("Failed to load categories:", err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [session, slug, navigate]);

  if (loading) {
    return (
      <AppShell>
        <AppBar title="View Products" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-textMedium">Loading categories...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppBar title="View Products" />
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: `/e/${slug}/dashboard` },
          { label: "View Products" },
        ]}
      />
      <div className="space-y-4">
        {categories.length === 0 ? (
          <SectionCard>
            <p className="text-body text-textLight text-center py-4">
              No products available yet. Check back soon!
            </p>
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {categories.map((category) => (
              <Link
                key={category}
                to={`/e/${slug}/exhibits/${category.toLowerCase()}`}
                className="rounded-xl border-2 border-creamDark bg-white px-5 py-4 text-center text-base font-semibold text-textDark shadow-soft transition-all hover:bg-cream hover:border-gold active:scale-[0.98]"
              >
                {categoryNames[category.toLowerCase()] || category}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
