// Les notifications ne sont pas stockées ; un fournisseur React les affiche.
export function notify(message, kind = "success") {
  window.dispatchEvent(
    new CustomEvent("assurrec:toast", {
      detail: {
        message,
        kind,
      },
    }),
  );
}
