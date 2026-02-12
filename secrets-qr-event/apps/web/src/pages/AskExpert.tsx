import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AppBar,
  AppShell,
  SectionCard,
  PrimaryButton,
} from "../components/ui";
import { MessageIcon } from "../components/Icons";
import { fetchExhibits, api } from "../lib/api";
import { getSession } from "../lib/session";
import type { ExhibitItem } from "../lib/types";

export default function AskExpert() {
  const { slug = "bangalore", id } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [item, setItem] = useState<ExhibitItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      navigate(`/e/${slug}`);
      return;
    }

    if (!id) {
      navigate(`/e/${slug}/dashboard`);
      return;
    }

    const loadItem = async () => {
      try {
        const exhibits = await fetchExhibits(slug);
        const found = exhibits.find((e: ExhibitItem) => e.id === id);
        if (found) {
          setItem(found);
        } else {
          navigate(`/e/${slug}/dashboard`);
        }
      } catch (err) {
        console.error("Failed to load exhibit:", err);
        navigate(`/e/${slug}/dashboard`);
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [id, slug, session, navigate]);

  if (loading) {
    return (
      <AppShell>
        <AppBar title="Ask Expert" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-textMedium">Loading...</div>
        </div>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell>
        <AppBar title="Ask Expert" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-body text-textMedium">Product not found</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppBar title="Ask Expert" />
      <div className="space-y-4">
        <SectionCard>
          <div className="mb-4">
            <h1 className="text-title text-textDark mb-2">{item.name}</h1>
            <p className="text-body text-textMedium">
              Get expert guidance about this product
            </p>
          </div>

          {item.askExpertContent ? (
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
              dangerouslySetInnerHTML={{ __html: item.askExpertContent }}
            />
          ) : (
            <div className="text-body text-textMedium text-center py-8">
              <p>Content coming soon...</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-creamDark">
            <PrimaryButton
              onClick={() => navigate(`/e/${slug}/consultation`)}
              className="w-full"
            >
              <div className="flex items-center justify-center gap-2">
                <MessageIcon size={18} />
                <span>Book Free Consultation</span>
              </div>
            </PrimaryButton>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
