import { useEffect, useState } from "react";
import { Field } from "./ui";
import { fetchEvents } from "../lib/api";

type Event = {
  id: string;
  name: string;
  slug: string;
  venue: string;
  startTime: string;
};

type EventSelectorProps = {
  value: string;
  onChange: (eventId: string) => void;
  label?: string;
  hint?: string;
  required?: boolean;
  className?: string;
};

export function EventSelector({
  value,
  onChange,
  label = "Select Event",
  hint,
  required,
  className = "",
}: EventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEvents()
      .then((data) => {
        if (!cancelled) {
          setEvents(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError("Failed to load events");
          setLoading(false);
          console.error("Failed to fetch events:", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatEventName = (event: Event) => {
    const date = new Date(event.startTime);
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${event.name} - ${event.venue} (${dateStr})`;
  };

  return (
    <Field label={label} hint={hint} required={required}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className={`w-full rounded-xl border-2 border-creamDark bg-white px-4 py-4 text-base text-textDark outline-none transition-all focus:border-gold disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        style={{ minHeight: "56px" }}
      >
        <option value="">{loading ? "Loading events..." : "Select an event..."}</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {formatEventName(event)}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      {!loading && events.length === 0 && !error && (
        <p className="text-sm text-textLight mt-1">No events available</p>
      )}
    </Field>
  );
}
