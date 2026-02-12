import { Link } from "react-router-dom";
import { getAdminEventId } from "../lib/adminSession";

export function AdminNav({ title }: { title: string }) {
  const eventId = getAdminEventId();
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-display text-textDark mb-2">{title}</h1>
      </div>
      {eventId && (
        <Link
          to="/admin"
          className="px-4 py-2 rounded-xl border-2 border-creamDark text-textDark font-semibold hover:bg-creamDark whitespace-nowrap"
        >
          ← Back to Dashboard
        </Link>
      )}
    </div>
  );
}
