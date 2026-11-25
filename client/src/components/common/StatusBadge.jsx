import { Badge } from "./Badge.jsx";
import { statusLabel } from "../../constants/business.js";
export function StatusBadge({ status = "" }) {
  const tone = ["cloture", "regle", "valide", "consigne", "actif"].includes(
    status,
  )
    ? "green"
    : ["impaye", "haute", "annule", "resilie"].includes(status)
      ? "red"
      : ["partiel", "promesse_paiement", "expire"].includes(status)
        ? "amber"
        : "blue";
  return (
    <Badge tone={tone}>
      {statusLabel[status] || status.replaceAll("_", " ")}
    </Badge>
  );
}
