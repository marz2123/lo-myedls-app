import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Keep console logs for debugging on real devices
    console.error("[ErrorBoundary]", error, info);
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      // noop
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error instanceof Error
        ? this.state.error.message
        : typeof this.state.error === "string"
          ? this.state.error
          : "Une erreur inconnue est survenue.";

    return (
      <main className="min-h-screen bg-background px-4 py-8 flex items-center justify-center">
        <Card className="max-w-lg w-full p-6">
          <header className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">MyEDLs – Erreur</h1>
            <p className="text-sm text-muted-foreground">
              L’application a rencontré un problème sur cet appareil.
            </p>
          </header>

          <section className="mt-4">
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Détail</p>
              <p className="mt-1 text-sm text-foreground break-words">{message}</p>
            </div>
          </section>

          <section className="mt-6 flex gap-2">
            <Button onClick={this.handleReload}>Recharger</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}
            >Accueil</Button>
          </section>
        </Card>
      </main>
    );
  }
}
