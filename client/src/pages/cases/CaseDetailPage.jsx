import { useRoute, Link } from "wouter";
import { useAuth } from "../../context/AuthContext.jsx";
import { useState } from "react";
import { useApi } from "../../hooks/useApi.js";
import { mutation } from "../../services/http.js";
import { apiError } from "../../utils/errors.js";
import { LoadingState } from "../../components/common/LoadingState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { NotFoundPage } from "../errors/NotFoundPage.jsx";
import { notify } from "../../utils/notify.js";
import { PageHeader } from "../../components/common/PageHeader.jsx";
import { formatDate, formatTnd } from "../../utils/format.js";
import { Button } from "../../components/common/Button.jsx";
import {
  ArrowRight,
  Plus,
  UsersRound,
  CircleDollarSign,
  History,
} from "lucide-react";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import {
  toneForPriority,
  priorityLabel,
  insuranceLabel,
  paymentMethodLabel,
  reminderChannelLabel,
} from "../../constants/business.js";
import { DataTable } from "../../components/common/DataTable.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { Timeline } from "../../components/common/Timeline.jsx";
import { PaymentForm } from "../payments/PaymentForm.jsx";
import { ReminderForm } from "../reminders/ReminderForm.jsx";
import { PromiseForm } from "./PromiseForm.jsx";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function CaseDetailPage() {
  const [, params] = useRoute("/dossiers/:id");
  const id = params?.id || "";
  const { user } = useAuth();
  const {
    data: detail,
    loading,
    error,
    reload: load,
  } = useApi(`/api/cases/${id}/detail`);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [promiseOpen, setPromiseOpen] = useState(false);
  const [transitionBusy, setTransitionBusy] = useState(false);
  if (loading) return <LoadingState />;
  if (error)
    return (
      <ErrorState
        message={
          error.includes("404")
            ? "Ce dossier n’existe pas ou n’est pas accessible."
            : error
        }
        onRetry={load}
      />
    );
  if (!detail) return <NotFoundPage />;
  const item = detail.case;
  const canWrite = user?.role !== "agent" || item.agentId === user?.id;
  const transition = async (status, promiseDate) => {
    if (transitionBusy) return;
    setTransitionBusy(true);
    try {
      await mutation(`/api/cases/${id}/transition`, "POST", {
        status,
        ...(promiseDate
          ? {
              promiseDate,
            }
          : {}),
      });
      notify("Statut du dossier mis à jour.");
      await load();
    } catch (e) {
      notify(apiError(e), "error");
    } finally {
      setTransitionBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow={`Dossiers / ${item.reference}`}
        title={item.insuredName}
        description={`${item.contractReference} \xB7 \xE9ch\xE9ance ${formatDate(item.dueDate)}`}
        actions={
          <div className="header-actions">
            <Link href="/dossiers" className="button button-secondary">
              Retour aux dossiers
            </Link>
            {canWrite && item.status === "nouveau" && (
              <Button
                disabled={transitionBusy}
                onClick={() => void transition("en_cours")}
              >
                <ArrowRight size={16} /> Prendre en charge
              </Button>
            )}
            {canWrite && item.status === "en_cours" && (
              <Button
                disabled={transitionBusy}
                onClick={() => setPromiseOpen(true)}
              >
                Promesse de paiement
              </Button>
            )}
            {canWrite && item.status === "promesse_paiement" && (
              <Button
                variant="secondary"
                disabled={transitionBusy}
                onClick={() => void transition("en_cours")}
              >
                Revenir en cours
              </Button>
            )}
            {canWrite &&
              item.balanceMilli === 0 &&
              item.status !== "cloture" && (
                <Button
                  disabled={transitionBusy}
                  onClick={() => void transition("cloture")}
                >
                  Clôturer
                </Button>
              )}
            {canWrite && item.status !== "cloture" && item.balanceMilli > 0 && (
              <Button variant="secondary" onClick={() => setPaymentOpen(true)}>
                <Plus size={16} /> Enregistrer un paiement
              </Button>
            )}
          </div>
        }
      />
      <section className="detail-summary">
        <div className="detail-title">
          <span className="reference">{item.reference}</span>
          <StatusBadge status={item.status} />
          <Badge tone={toneForPriority(item.priority)}>
            {priorityLabel[item.priority]}
          </Badge>
        </div>
        <div className="detail-money">
          <span>Solde restant</span>
          <strong>{formatTnd(item.balanceMilli)}</strong>
          <small>
            Montant initial {formatTnd(item.amountMilli)} · réglé{" "}
            {formatTnd(item.paidMilli)}
          </small>
        </div>
      </section>
      <div className="detail-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Contexte assuré</p>
              <h2>{detail.insured.name}</h2>
            </div>
            <UsersRound size={20} />
          </div>
          <dl className="definition-list">
            <dt>Référence assuré</dt>
            <dd>{detail.insured.reference}</dd>
            <dt>E-mail</dt>
            <dd>{detail.insured.email}</dd>
            <dt>Téléphone</dt>
            <dd>{detail.insured.phone || "—"}</dd>
            <dt>Adresse</dt>
            <dd>{detail.insured.address || "—"}</dd>
            <dt>Contrat</dt>
            <dd>
              {detail.contract.reference} ·{" "}
              {insuranceLabel[detail.contract.insuranceType]}
            </dd>
            <dt>Période</dt>
            <dd>
              {formatDate(detail.contract.startDate)} –{" "}
              {formatDate(detail.contract.endDate)}
            </dd>
          </dl>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Fiche de recouvrement</p>
              <h2>Suivi financier</h2>
            </div>
            <CircleDollarSign size={20} />
          </div>
          <dl className="definition-list">
            <dt>Échéance</dt>
            <dd>
              {detail.installment.reference} ·{" "}
              {formatDate(detail.installment.dueDate)}
            </dd>
            <dt>Affectation</dt>
            <dd>{item.agentName || "Non affecté"}</dd>
            <dt>Promesse</dt>
            <dd>
              {item.promiseDate ? formatDate(item.promiseDate) : "Aucune"}
            </dd>
            <dt>Notes</dt>
            <dd>{item.notes || "Aucune note consignée."}</dd>
          </dl>
        </article>
      </div>
      <section className="detail-grid detail-grid-bottom">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Opérations</p>
              <h2>Paiements</h2>
            </div>
          </div>
          {detail.payments.length ? (
            <DataTable
              headers={["Référence", "Date", "Méthode", "Montant", "État"]}
            >
              {detail.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="reference">{payment.reference}</td>
                  <td>{formatDate(payment.paidAt)}</td>
                  <td>{paymentMethodLabel[payment.method]}</td>
                  <td className="money">{formatTnd(payment.amountMilli)}</td>
                  <td>
                    <StatusBadge status={payment.status} />
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState
              title="Aucun paiement"
              description="Le solde reste inchangé tant qu’aucun paiement n’est validé."
            />
          )}
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Contact fictif consigné</p>
              <h2>Relances</h2>
            </div>
            {canWrite && item.status !== "cloture" && (
              <Button variant="secondary" onClick={() => setReminderOpen(true)}>
                <Plus size={15} /> Ajouter
              </Button>
            )}
          </div>
          {detail.reminders.length ? (
            <div className="reminder-list">
              {detail.reminders.map((reminder) => (
                <div className="reminder-item" key={reminder.id}>
                  <div>
                    <strong>{reminder.subject}</strong>
                    <span>
                      {reminderChannelLabel[reminder.channel]} ·{" "}
                      {reminder.status === "consigne"
                        ? "Contact fictif consigné"
                        : "Brouillon"}
                    </span>
                  </div>
                  <small>
                    {reminder.scheduledDate
                      ? formatDate(reminder.scheduledDate)
                      : "Sans date"}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aucune relance"
              description="Aucun contact fictif n’est consigné sur ce dossier."
            />
          )}
        </article>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Traçabilité</p>
            <h2>Historique</h2>
          </div>
          <History size={20} />
        </div>
        <Timeline
          events={detail.audit.map((event) => ({
            label: `${event.action} \xB7 ${event.actorName}`,
            detail: event.details,
            date: event.createdAt,
          }))}
        />
      </section>
      <PaymentForm
        open={paymentOpen}
        installment={detail.installment}
        onClose={() => setPaymentOpen(false)}
        onSaved={() => {
          setPaymentOpen(false);
          void load();
        }}
      />
      <ReminderForm
        open={reminderOpen}
        caseId={item.id}
        onClose={() => setReminderOpen(false)}
        onSaved={() => {
          setReminderOpen(false);
          void load();
        }}
      />
      <PromiseForm
        open={promiseOpen}
        onClose={() => setPromiseOpen(false)}
        onSaved={(date) => {
          setPromiseOpen(false);
          void transition("promesse_paiement", date);
        }}
      />
    </>
  );
}
