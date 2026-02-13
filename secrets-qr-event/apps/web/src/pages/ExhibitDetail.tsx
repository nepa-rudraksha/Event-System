import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppBar,
  AppShell,
  Chip,
  GhostButton,
  PrimaryButton,
  SectionCard,
} from "../components/ui";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { RudrakshaIcon, MessageIcon, StarIcon, ClockIcon } from "../components/Icons";
import { fetchExhibits, api } from "../lib/api";
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
  const [productHandle, setProductHandle] = useState<string | null>(null);
  const [loadingHandle, setLoadingHandle] = useState(false);
  const fetchedHandleRef = useRef<string | null>(null); // Track which product ID we've fetched handle for

  useEffect(() => {
    if (!session) {
      navigate(`/e/${slug}`);
      return;
    }
    
    let cancelled = false;
    
    fetchExhibits(session.eventId, type)
      .then((items) => {
        if (cancelled) return;
        
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
        
        // Fetch product handle if shopifyProductId exists and we haven't fetched it yet
        if (found?.shopifyProductId) {
          if (fetchedHandleRef.current !== found.shopifyProductId) {
            fetchedHandleRef.current = found.shopifyProductId;
            setProductHandle(null); // Reset handle for new product
            setLoadingHandle(true);
            
            api.get(`/shopify/product/${encodeURIComponent(found.shopifyProductId)}/handle`)
              .then((response) => {
                if (!cancelled && response.data?.handle) {
                  setProductHandle(response.data.handle);
                }
              })
              .catch((err) => {
                if (!cancelled) {
                  console.error("Failed to fetch product handle:", err);
                  // Don't set loading to false immediately - allow retry on button click
                }
              })
              .finally(() => {
                if (!cancelled) {
                  setLoadingHandle(false);
                }
              });
          }
        } else {
          // Reset if product doesn't have shopifyProductId
          fetchedHandleRef.current = null;
          setProductHandle(null);
          setLoadingHandle(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItem(null);
          setCurrentImageIndex(0);
          setIsImageLoading(false);
          setProductHandle(null);
          fetchedHandleRef.current = null;
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, [id, session?.eventId, slug, type]); // Use session.eventId instead of session object

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

  // Category display names mapping
  const categoryNames: Record<string, string> = {
    rudraksha: "Rudraksha",
    shaligram: "Shaligram",
    mala: "Siddha Mala",
    combination: "Combination",
    bracelet: "Bracelet",
    kanthamala: "Kanthamala",
  };
  
  const categoryName = categoryNames[type.toLowerCase()] || type;

  return (
    <AppShell>
      <AppBar title="Exhibit Details" />
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: `/e/${slug}/dashboard` },
          { label: "View Products", to: `/e/${slug}/exhibits` },
          { label: categoryName, to: `/e/${slug}/exhibits/${type}` },
          { label: item.name },
        ]}
      />
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

            {/* Price Display - After Tags */}
            {(item.actualPrice || item.discountedPrice) && (
              <div className="pt-4 border-t border-creamDark">
                <div className="flex items-center gap-3 flex-wrap">
                  {item.discountedPrice && item.actualPrice ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-textDark">₹{item.discountedPrice.toLocaleString('en-IN')}</span>
                        <span className="text-lg text-textLight line-through">₹{item.actualPrice.toLocaleString('en-IN')}</span>
                      </div>
                      {item.discountPercentage && (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                          {item.discountPercentage}% OFF
                        </span>
                      )}
                    </>
                  ) : item.actualPrice ? (
                    <span className="text-2xl font-semibold text-textDark">₹{item.actualPrice.toLocaleString('en-IN')}</span>
                  ) : null}
                </div>
              </div>
            )}

            {item.description && (
              <div className="pt-4 border-t border-creamDark">
                <h3 className="text-heading text-textDark mb-3">Description</h3>
                <div 
                  className="text-body text-textMedium leading-relaxed
                    [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-textDark [&_h1]:mb-4 [&_h1]:mt-6
                    [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-textDark [&_h2]:mb-3 [&_h2]:mt-5
                    [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-textDark [&_h3]:mb-2 [&_h3]:mt-4
                    [&_p]:mb-4 [&_p]:text-textMedium
                    [&_strong]:font-semibold [&_strong]:text-textDark
                    [&_em]:italic
                    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:text-textMedium
                    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:text-textMedium
                    [&_li]:mb-2 [&_li]:text-textMedium
                    [&_a]:text-gold [&_a]:underline hover:[&_a]:text-gold/80
                    [&_blockquote]:border-l-4 [&_blockquote]:border-gold [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-textLight [&_blockquote]:my-4
                    [&_hr]:border-creamDark [&_hr]:my-6
                    [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4
                    [&_code]:bg-cream [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                    [&_pre]:bg-cream [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PrimaryButton onClick={() => navigate(`/e/${slug}/exhibits/${type}/${id}/ask-expert`)}>
            <div className="flex items-center justify-center gap-2">
              <MessageIcon size={18} />
              <span>Ask Expert</span>
            </div>
          </PrimaryButton>
          {item.shopifyProductId && (
            <PrimaryButton
              onClick={() => {
                if (productHandle) {
                  // Use the correct domain
                  const shopifyDomain = 'nepalirudraksha.com';
                  window.open(`https://${shopifyDomain}/products/${productHandle}`, '_blank');
                } else if (!loadingHandle) {
                  // If handle not loaded yet, try to fetch it
                  setLoadingHandle(true);
                  api.get(`/shopify/product/${encodeURIComponent(item.shopifyProductId)}/handle`)
                    .then((response) => {
                      const handle = response.data.handle;
                      setProductHandle(handle);
                      const shopifyDomain = 'nepalirudraksha.com';
                      window.open(`https://${shopifyDomain}/products/${handle}`, '_blank');
                    })
                    .catch((err) => {
                      console.error("Failed to fetch product handle:", err);
                      alert("Unable to open product page. Please try again.");
                    })
                    .finally(() => {
                      setLoadingHandle(false);
                    });
                }
              }}
              disabled={loadingHandle}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-2">
                <span>{loadingHandle ? "Loading..." : "Visit Website"}</span>
              </div>
            </PrimaryButton>
          )}
        </div>
      </div>
    </AppShell>
  );
}
