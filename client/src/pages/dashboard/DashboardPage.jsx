import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useApi } from "../../hooks/useApi.js";
import { insuranceLabel } from "../../constants/business.js";
import { PageHeader } from "../../components/common/PageHeader.jsx";
import { Button } from "../../components/common/Button.jsx";
import { FilterBar } from "../../components/common/FilterBar.jsx";
import { LoadingState } from "../../components/common/LoadingState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { FormError } from "../../components/common/FormError.jsx";
import { DashboardContent } from "./DashboardContent.jsx";
export function DashboardPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [insuranceType, setInsuranceType] = useState("");
  const [agentId, setAgentId] = useState("");
  const periodError =
    from && to && from > to
      ? "La date de début doit précéder la date de fin."
      : "";
  const { data, loading, error, reload } = useApi(
    "/api/dashboard",
    {
      from,
      to,
      insuranceType,
      agentId: user.role === "agent" ? undefined : agentId,
    },
    {
      enabled: !periodError,
    },
  );
  const { data: agents, error: agentsError } = useApi(
    "/api/agents",
    {},
    {
      enabled: user.role !== "agent",
    },
  );
  const reset = () => {
    setFrom("");
    setTo("");
    setInsuranceType("");
    setAgentId("");
  };
  return (
    <>
      <PageHeader
        eyebrow="Pilotage / période par échéance et paiement"
        title="Vue d’ensemble"
        description="Les chiffres sont calculés par l’API sur la période sélectionnée, sans projection locale."
        actions={
          <Button
            variant="secondary"
            disabled={loading || Boolean(periodError)}
            onClick={reload}
          >
            <RefreshCw size={16} />
            Actualiser
          </Button>
        }
      />
      <FilterBar onReset={reset}>
        <div className="filter-date">
          <label>
            Du
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <span>→</span>
          <label>
            Au
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>
        <label>
          Type
          <select
            value={insuranceType}
            onChange={(event) => setInsuranceType(event.target.value)}
          >
            <option value="">Tous les types</option>
            {Object.entries(insuranceLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {user.role !== "agent" && (
          <label>
            Agent
            <select
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
            >
              <option value="">Tous les agents</option>
              {(agents || []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </FilterBar>
      <p className="dashboard-filter-note">
        La période filtre les échéances par date d’échéance et les paiements par
        date de paiement. Les dossiers sont rattachés à leurs échéances.
        L’encours indique le solde actuel ; le taux rapporte les paiements
        valides des échéances filtrées à leur montant total. Données fictives,
        sans encaissement bancaire réel.
      </p>
      <FormError message={periodError || agentsError} />
      {!periodError &&
        (loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          data && <DashboardContent data={data} />
        ))}
    </>
  );
}
