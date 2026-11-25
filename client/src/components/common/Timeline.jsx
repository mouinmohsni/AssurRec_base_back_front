import { CircleUserRound } from "lucide-react";
import { formatDateTime } from "../../utils/format.js";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function Timeline({ events }) {
  return (
    <ol className="timeline">
      {events.map((event, i) => (
        <li key={`${event.date}-${i}`}>
          <span className="timeline-dot">
            {event.icon || <CircleUserRound size={14} />}
          </span>
          <div>
            <strong>{event.label}</strong>
            {event.detail && <p>{event.detail}</p>}
            <small>{formatDateTime(event.date)}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}
