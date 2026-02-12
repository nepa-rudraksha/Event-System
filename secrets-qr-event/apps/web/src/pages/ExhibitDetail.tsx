import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppBar,
  AppShell,
  Chip,
  GhostButton,
  PrimaryButton,
  SectionCard,
} from "../components/ui";
import { RudrakshaIcon, MessageIcon, StarIcon, ClockIcon } from "../components/Icons";
import { fetchExhibits } from "../lib/api";
import { getSession } from "../lib/session";
import type { ExhibitItem } from "../lib/types";

export default function ExhibitDetail() {
  const { slug = "bangalore", type = "rudraksha", id } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [item, setItem] = useState<ExhibitItem | null>(null);
  // Show 3D first if available, otherwise show photo
  const [viewMode, setViewMode] = useState<"photo" | "3d">(
    item?.model3dUrl ? "3d" : "photo"
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate(`/e/${slug}`);
      return;
    }
    fetchExhibits(session.eventId, type)
      .then((items) => {
        const found = items.find((exhibit) => exhibit.id === id) ?? null;
        setItem(found);
        setCurrentImageIndex(0); // Reset image index when item changes
        setIsImageLoading(false);
        // Set view mode to 3D if available, otherwise photo
        if (found?.model3dUrl) {
          setViewMode("3d");
        } else {
          setViewMode("photo");
        }
      })
      .catch(() => {
        setItem(null);
        setCurrentImageIndex(0);
        setIsImageLoading(false);
      });
  }, [id, navigate, session, slug, type]);

  if (!item) {
    return (
      <AppShell>
        <AppBar title="Exhibit Detail" />
        <SectionCard>
          <div className="text-sm text-textPrimary/60">Exhibit not found.</div>
        </SectionCard>
      </AppShell>
    );
  }

  // Ensure images is always an array
  const itemImages = Array.isArray(item.images) ? item.images : (item.images ? [item.images] : []);

  return (
    <AppShell>
      <AppBar title="Exhibit Details" />
      
      <div className="space-y-6">
        {/* Hero Image - Bigger and better */}
        <div className="relative h-[500px] md:h-[600px] rounded-xl bg-cream border-2 border-creamDark overflow-hidden">
          {viewMode === "3d" && item.model3dUrl ? (
            <iframe
              src={item.model3dUrl}
              title="3D Model Viewer"
              className="w-full h-full"
              style={{ minHeight: "500px" }}
              frameBorder="0"
            />
          ) : viewMode === "photo" && itemImages.length > 0 ? (
            <>
              <div className="relative w-full h-full">
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-cream">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
                  </div>
                )}
                <img
                  key={itemImages[currentImageIndex]} // Force re-render on image change
                  src={itemImages[currentImageIndex]}
                  alt={item.name}
                  className={`w-full h-full object-contain transition-opacity duration-300 ${
                    isImageLoading ? "opacity-0" : "opacity-100"
                  }`}
                  onLoad={() => setIsImageLoading(false)}
                  onLoadStart={() => setIsImageLoading(true)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    setIsImageLoading(false);
                    const fallback = (e.target as HTMLImageElement).parentElement?.querySelector(".fallback-icon");
                    if (fallback) (fallback as HTMLElement).style.display = "flex";
                  }}
                />
              </div>
              {itemImages.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      setIsImageLoading(true);
                      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : itemImages.length - 1));
                    }}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white px-4 py-3 rounded-lg text-gold font-semibold z-10 shadow-lg transition-all hover:scale-110"
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => {
                      setIsImageLoading(true);
                      setCurrentImageIndex((prev) => (prev < itemImages.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white px-4 py-3 rounded-lg text-gold font-semibold z-10 shadow-lg transition-all hover:scale-110"
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center fallback-icon">
              <RudrakshaIcon size={120} className="text-gold/40" />
            </div>
          )}
          {(item.model3dUrl || itemImages.length > 0) && (
            <div className="absolute bottom-4 right-4 flex gap-2 z-10">
              {item.model3dUrl && (
                <button
                  onClick={() => setViewMode("3d")}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    viewMode === "3d"
                      ? "bg-gold text-white"
                      : "bg-white/80 text-textDark hover:bg-white"
                  }`}
                >
                  3D View
                </button>
              )}
              {itemImages.length > 0 && (
                <button
                  onClick={() => {
                    setViewMode("photo");
                    setCurrentImageIndex(0);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    viewMode === "photo"
                      ? "bg-gold text-white"
                      : "bg-white/80 text-textDark hover:bg-white"
                  }`}
                >
                  Photo
                </button>
              )}
            </div>
          )}
          {/* Image gallery dots if multiple images */}
          {viewMode === "photo" && itemImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
              {itemImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsImageLoading(true);
                    setCurrentImageIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentImageIndex ? "bg-gold w-6" : "bg-white/60 w-2"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <SectionCard>
          <div className="space-y-4">
            <div>
              <h1 className="text-title text-textDark mb-2">{item.name}</h1>
              {item.rarity && (
                <div className="inline-block px-3 py-1 rounded-full bg-gold/10 border-2 border-gold text-gold text-sm font-semibold">
                  {item.rarity}
                </div>
              )}
            </div>
            
            {(item.deity || item.planet) && (
              <div className="flex flex-wrap gap-2">
                {item.deity && <Chip>{item.deity}</Chip>}
                {item.planet && <Chip>{item.planet}</Chip>}
              </div>
            )}

            {item.description && (
              <div className="pt-4 border-t border-creamDark">
                <h3 className="text-heading text-textDark mb-3">Description</h3>
                <div className="text-body text-textMedium whitespace-pre-line leading-relaxed">
                  {item.description}
                </div>
              </div>
            )}

            {item.darshanStart && (
              <div className="pt-4 border-t border-creamDark">
                <Chip>
                  <div className="flex items-center gap-1">
                    <ClockIcon size={14} />
                    <span>Darshan: {String(item.darshanStart).slice(11, 16)} - {String(item.darshanEnd).slice(11, 16)}</span>
                  </div>
                </Chip>
              </div>
            )}
          </div>
        </SectionCard>

        <div className="grid grid-cols-2 gap-3">
          <PrimaryButton onClick={() => navigate(`/e/${slug}/consultation`)}>
            <div className="flex items-center justify-center gap-2">
              <MessageIcon size={18} />
              <span>Ask Expert</span>
            </div>
          </PrimaryButton>
          <GhostButton>
            <div className="flex items-center justify-center gap-2">
              <StarIcon size={18} />
              <span>Save</span>
            </div>
          </GhostButton>
        </div>
      </div>
    </AppShell>
  );
}
