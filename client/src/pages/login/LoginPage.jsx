import { useEffect, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { ArrowRight, ChevronDown, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useApi } from "../../hooks/useApi.js";
import { LoadingState } from "../../components/common/LoadingState.jsx";
import { Field } from "../../components/common/Field.jsx";
import { FormError } from "../../components/common/FormError.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import { roleLabel } from "../../constants/business.js";
export function LoginPage() {
  const { user, loading, login, error } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: demo, error: demoError } = useApi("/api/demo-info");
  const requestedNext =
    new URLSearchParams(window.location.search).get("next") || "/";
  const next =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.includes("\\") &&
    !requestedNext.startsWith("/connexion")
      ? requestedNext
      : "/";
  useEffect(() => {
    if (error) setPassword("");
  }, [error]);
  if (loading) return <LoadingState label="Ouverture de session…" />;
  if (user) return <Redirect to={next} />;
  const submit = async (event) => {
    event.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
      setLocation(next);
    } catch {
      /* AuthContext affiche l'erreur de connexion sans la masquer. */
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login-screen">
      <section className="login-visual">
        <img src="/logo.svg" alt="AssurRec" />
        <div>
          <p className="eyebrow">Espace de recouvrement</p>
          <h1>
            Le recouvrement d’assurance,
            <br />
            <em>suivi avec précision.</em>
          </h1>
          <p>
            Un registre opérationnel pour transformer chaque échéance en
            prochaine action claire.
          </p>
        </div>
        <div className="login-footnote">
          <ShieldAlert size={16} />
          Session sécurisée · données servies par l’API AssurRec
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <p className="eyebrow">Connexion</p>
          <h2>Retrouver votre espace</h2>
          <p className="login-intro">
            Utilisez vos identifiants professionnels. La session est protégée
            par cookie et contrôle CSRF.
          </p>
          <form onSubmit={submit}>
            <Field label="Adresse e-mail" required>
              <input
                type="email"
                autoComplete="username"
                value={email}
                maxLength={254}
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nom@assurrec.tn"
                required
              />
            </Field>
            <Field label="Mot de passe" required>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                maxLength={200}
                disabled={busy}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
                required
              />
            </Field>
            <FormError message={error} />
            <Button type="submit" loading={busy} className="login-submit">
              Se connecter
              <ArrowRight size={16} />
            </Button>
          </form>
          {demo?.enabled && (
            <div className="demo-panel">
              <div className="demo-title">
                <span>Accès de démonstration</span>
                <Badge tone="teal">Comptes fictifs</Badge>
              </div>
              <p>
                Mot de passe fictif par défaut :{" "}
                <code>AssurRec-Demo-2026!</code>. Si le seed a été configuré
                avec un autre mot de passe, utilisez cette valeur. Sélectionnez
                un rôle pour préremplir l’adresse, puis connectez-vous
                normalement.
              </p>
              {demo.accounts?.map((account) => (
                <button
                  type="button"
                  disabled={busy}
                  className="demo-account"
                  key={account.email}
                  onClick={() => setEmail(account.email)}
                >
                  <span>
                    <strong>{account.name}</strong>
                    <small>
                      {roleLabel[account.role]} · {account.email}
                    </small>
                  </span>
                  <ChevronDown size={15} />
                </button>
              ))}
              <small className="demo-note">
                Aucune session n’est créée automatiquement.
              </small>
            </div>
          )}
          {demoError && (
            <p className="demo-note" role="status">
              Aide de démonstration indisponible : {demoError}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
