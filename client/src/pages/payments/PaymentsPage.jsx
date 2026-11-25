import { useState } from "react";
import { useList } from "../../hooks/useList.js";
import { useDebounced } from "../../hooks/useDebounced.js";
import { CrudPageLayout } from "../../layouts/CrudPageLayout.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Plus } from "lucide-react";
import { TableState } from "../../components/common/TableState.jsx";
import { formatDate, formatTnd } from "../../utils/format.js";
import { paymentMethodLabel } from "../../constants/business.js";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { ReversePayment } from "./ReversePayment.jsx";
import { Pagination } from "../../components/common/Pagination.jsx";
import { PaymentForm } from "./PaymentForm.jsx";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { result, loading, error, reload } = useList("/api/payments", {
    page,
    pageSize: 10,
    search: useDebounced(search),
  });
  const [open, setOpen] = useState(false);
  return (
    <>
      <CrudPageLayout
        page="Paiements"
        description="Enregistrements fictifs validés, conservés et annulables par les rôles habilités."
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Enregistrer un paiement
          </Button>
        }
      >
        <TableState
          loading={loading}
          error={error}
          items={result?.items || []}
          onRetry={reload}
          headers={[
            "Référence",
            "Échéance / assuré",
            "Date",
            "Méthode",
            "Montant",
            "État",
            "Correction",
          ]}
          emptyTitle="Aucun paiement"
          emptyDescription="Les encaissements enregistrés par l’API apparaîtront ici."
        >
          <>
            {result?.items.map((item) => (
              <tr key={item.id}>
                <td className="reference">{item.reference}</td>
                <td>
                  <strong>{item.installmentReference}</strong>
                  <small className="table-sub">{item.insuredName}</small>
                </td>
                <td>{formatDate(item.paidAt)}</td>
                <td>{paymentMethodLabel[item.method]}</td>
                <td className="money">
                  <strong>{formatTnd(item.amountMilli)}</strong>
                </td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td>
                  {item.status === "valide" ? (
                    <ReversePayment payment={item} onDone={reload} />
                  ) : (
                    <span className="muted-copy">
                      {item.reversalReason || "Annulé"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </>
        </TableState>
        <Pagination
          page={page}
          pageSize={result?.pageSize || 10}
          total={result?.total || 0}
          onChange={setPage}
        />
      </CrudPageLayout>
      <PaymentForm
        open={open}
        installment={null}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          void reload();
        }}
      />
    </>
  );
}
