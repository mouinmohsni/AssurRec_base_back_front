import { Kpi } from "./Kpi.jsx";
import { formatTnd, formatDate, formatDateTime } from "../../utils/format.js";
import {
  WalletCards,
  HandCoins,
  FileWarning,
  ClipboardCheck,
  CircleDollarSign,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { Badge } from "../../components/common/Badge.jsx";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  BarChart,
  Bar,
} from "recharts";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { Link } from "wouter";
import {
  toneForPriority,
  priorityLabel,
  paymentMethodLabel,
} from "../../constants/business.js";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function DashboardContent({ data }) {
  const k = data.kpis;
  return (
    <>
      <section className="kpi-grid">
        <Kpi
          label="Encours à recouvrer"
          value={formatTnd(k.outstandingMilli)}
          note="Solde des échéances filtrées"
          icon={<WalletCards />}
        />
        <Kpi
          label="Paiements enregistrés"
          value={formatTnd(k.collectedMilli)}
          note="Paiements valides de la période"
          icon={<HandCoins />}
        />
        <Kpi
          label="Échéances impayées"
          value={String(k.overdueCount)}
          note="À date, selon le périmètre"
          icon={<FileWarning />}
        />
        <Kpi
          label="Dossiers actifs"
          value={String(k.activeCases)}
          note="Hors dossiers clôturés"
          icon={<ClipboardCheck />}
        />
        <Kpi
          label="Taux de récupération"
          value={`${Number(k.recoveryRate || 0).toFixed(1)} %`}
          note="Paiements valides / total échéances"
          icon={<CircleDollarSign />}
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel chart-panel panel-wide">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Flux mensuel</p>
              <h2>Attendu et paiements enregistrés</h2>
            </div>
            <Badge tone="blue">{data.monthly.length} mois</Badge>
          </div>
          {data.monthly.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(v) =>
                      `${new Intl.NumberFormat("fr-TN", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(v / 1000)} TND`
                    }
                  />
                  <Tooltip formatter={(value) => formatTnd(Number(value))} />
                  <Line
                    type="monotone"
                    dataKey="expectedMilli"
                    name="Attendu"
                    stroke="#9aabb8"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="collectedMilli"
                    name="Enregistré"
                    stroke="#087f8c"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="Pas de données mensuelles"
              description="La période ne contient pas de flux agrégé."
            />
          )}
        </article>
        <article className="panel chart-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Ancienneté de dette</p>
              <h2>Répartition des encours</h2>
            </div>
          </div>
          {data.aging.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.aging} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) =>
                      `${new Intl.NumberFormat("fr-TN", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(v / 1000)} TND`
                    }
                  />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={92}
                    tick={{
                      fontSize: 11,
                    }}
                  />
                  <Tooltip formatter={(value) => formatTnd(Number(value))} />
                  <Bar
                    dataKey="amountMilli"
                    name="Encours"
                    fill="#087f8c"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Aucun retard classé" />
          )}
        </article>
        <article className="panel priority-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">À traiter en premier</p>
              <h2>Dossiers prioritaires</h2>
            </div>
            <Link href="/dossiers" className="text-link">
              Voir tous <ArrowRight size={14} />
            </Link>
          </div>
          {data.priorityCases.length ? (
            <div className="priority-list">
              {data.priorityCases.map((item) => (
                <Link
                  href={`/dossiers/${item.id}`}
                  className="priority-item"
                  key={item.id}
                >
                  <div>
                    <strong>{item.reference}</strong>
                    <span>
                      {item.insuredName} · {formatDate(item.dueDate)}
                    </span>
                  </div>
                  <div className="priority-amount">
                    <Badge tone={toneForPriority(item.priority)}>
                      {priorityLabel[item.priority]}
                    </Badge>
                    <strong>{formatTnd(item.balanceMilli)}</strong>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aucun dossier prioritaire"
              description="Le périmètre ne remonte aucune action urgente."
            />
          )}
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Activité financière</p>
              <h2>Paiements récents</h2>
            </div>
            <Link href="/paiements" className="text-link">
              Journal <ArrowRight size={14} />
            </Link>
          </div>
          {data.recentPayments.length ? (
            <div className="mini-list">
              {data.recentPayments.map((payment) => (
                <div className="mini-item" key={payment.id}>
                  <div className="mini-icon">
                    <CreditCard size={15} />
                  </div>
                  <div>
                    <strong>{payment.insuredName}</strong>
                    <span>
                      {paymentMethodLabel[payment.method]} ·{" "}
                      {formatDateTime(payment.paidAt)}
                    </span>
                  </div>
                  <strong className="money">
                    {formatTnd(payment.amountMilli)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Aucun paiement récent" />
          )}
        </article>
      </section>
    </>
  );
}
