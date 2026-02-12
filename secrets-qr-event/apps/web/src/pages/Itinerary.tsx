import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppBar, AppShell, Chip, SectionCard } from "../components/ui";
import { CalendarIcon, ClockIcon } from "../components/Icons";
import { fetchItinerary } from "../lib/api";
import { getSession } from "../lib/session";
import type { ItineraryItem } from "../lib/types";

export default function Itinerary() {
  const { slug = "bangalore" } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [items, setItems] = useState<ItineraryItem[]>([]);

  useEffect(() => {
    if (!session) {
      navigate(`/e/${slug}`);
      return;
    }
    fetchItinerary(session.eventId).then(setItems).catch(() => setItems([]));
  }, [navigate, session, slug]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <AppShell>
      <AppBar 
        title={
          <div className="flex items-center gap-2">
            <CalendarIcon size={20} className="text-gold" />
            <span>Event Schedule</span>
          </div>
        } 
      />
      <div className="space-y-4">
        {items.length === 0 && (
          <SectionCard>
            <p className="text-body text-textLight text-center py-4">
              No schedule published yet. Check back soon!
            </p>
          </SectionCard>
        )}
        {items.map((item) => (
          <SectionCard key={item.id}>
            <button
              onClick={() => setExpanded({ ...expanded, [item.id]: !expanded[item.id] })}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Chip>{item.timeLabel}</Chip>
                  <h3 className="text-heading text-textDark">{item.title}</h3>
                </div>
                <span className="text-gold text-xl">
                  {expanded[item.id] ? "−" : "+"}
                </span>
              </div>
            </button>
            {expanded[item.id] && (
              <div className="mt-4 pt-4 border-t border-creamDark">
                {item.description && (
                  <p className="text-body text-textMedium leading-relaxed">{item.description}</p>
                )}
                <button className="flex items-center gap-2 mt-4 text-base font-semibold text-gold hover:underline">
                  <ClockIcon size={18} />
                  <span>Set Reminder</span>
                </button>
              </div>
            )}
          </SectionCard>
        ))}
      </div>
    </AppShell>
  );
}
