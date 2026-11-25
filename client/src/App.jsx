import { lazy, Suspense } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { AppLayout } from "./layouts/AppLayout.jsx";
import { LoadingState } from "./components/common/LoadingState.jsx";
import { ErrorState } from "./components/common/ErrorState.jsx";
import { roleLabel } from "./constants/business.js";

// Chaque écran a son fichier et son chunk ; pas de pages monolithiques.
const LoginPage = lazy(() =>
  import("./pages/login/LoginPage.jsx").then((m) => ({
    default: m.LoginPage,
  })),
);
const DashboardPage = lazy(() =>
  import("./pages/dashboard/DashboardPage.jsx").then((m) => ({
    default: m.DashboardPage,
  })),
);
const InsuredsPage = lazy(() =>
  import("./pages/insureds/InsuredsPage.jsx").then((m) => ({
    default: m.InsuredsPage,
  })),
);
const ContractsPage = lazy(() =>
  import("./pages/contracts/ContractsPage.jsx").then((m) => ({
    default: m.ContractsPage,
  })),
);
const InstallmentsPage = lazy(() =>
  import("./pages/installments/InstallmentsPage.jsx").then((m) => ({
    default: m.InstallmentsPage,
  })),
);
const CasesPage = lazy(() =>
  import("./pages/cases/CasesPage.jsx").then((m) => ({
    default: m.CasesPage,
  })),
);
const CaseDetailPage = lazy(() =>
  import("./pages/cases/CaseDetailPage.jsx").then((m) => ({
    default: m.CaseDetailPage,
  })),
);
const PaymentsPage = lazy(() =>
  import("./pages/payments/PaymentsPage.jsx").then((m) => ({
    default: m.PaymentsPage,
  })),
);
const RemindersPage = lazy(() =>
  import("./pages/reminders/RemindersPage.jsx").then((m) => ({
    default: m.RemindersPage,
  })),
);
const UsersPage = lazy(() =>
  import("./pages/users/UsersPage.jsx").then((m) => ({
    default: m.UsersPage,
  })),
);
const AuditPage = lazy(() =>
  import("./pages/audit/AuditPage.jsx").then((m) => ({
    default: m.AuditPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./pages/errors/NotFoundPage.jsx").then((m) => ({
    default: m.NotFoundPage,
  })),
);
function Allowed({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user.role))
    return (
      <ErrorState
        message={`Cet écran n'est pas accessible au profil ${roleLabel[user.role]}.`}
      />
    );
  return children;
}
function ProtectedRoutes() {
  const { user, loading, error, refresh } = useAuth();
  const [location] = useLocation();
  if (loading) return <LoadingState label="Vérification de la session…" />;
  if (!user && error && !error.startsWith("Session expirée"))
    return <ErrorState message={error} onRetry={() => refresh()} />;
  if (!user)
    return <Redirect to={`/connexion?next=${encodeURIComponent(location)}`} />;
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/assures" component={InsuredsPage} />
        <Route path="/contrats" component={ContractsPage} />
        <Route path="/echeances" component={InstallmentsPage} />
        <Route path="/dossiers/:id" component={CaseDetailPage} />
        <Route path="/dossiers" component={CasesPage} />
        <Route path="/paiements" component={PaymentsPage} />
        <Route path="/relances" component={RemindersPage} />
        <Route path="/utilisateurs">
          <Allowed roles={["admin"]}>
            <UsersPage />
          </Allowed>
        </Route>
        <Route path="/audit">
          <Allowed roles={["admin", "manager"]}>
            <AuditPage />
          </Allowed>
        </Route>
        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
    </AppLayout>
  );
}
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense
          fallback={<LoadingState label="Chargement de l’interface…" />}
        >
          <Switch>
            <Route path="/connexion" component={LoginPage} />
            <Route path="/404" component={NotFoundPage} />
            <Route>
              <ProtectedRoutes />
            </Route>
          </Switch>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}
