import { useEffect, useState } from "react";

const MYHOME_ORIGIN = "https://myhome-connect-suite.lovable.app";

type MyHomeUser = { id: string; name?: string; email?: string };
type MyHomeContext = { activeProjectId?: string; activeRole?: string; orgId?: string };

export function useMyHomeBridge() {
  const [user, setUser] = useState<MyHomeUser | null>(null);
  const [context, setContext] = useState<MyHomeContext | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    try {
      window.parent?.postMessage({ type: "APP_READY" }, MYHOME_ORIGIN);
    } catch {}

    function onMessage(ev: MessageEvent) {
      if (ev.origin !== MYHOME_ORIGIN) return;
      const msg = ev.data;

      if (msg?.type === "MYHOME_INIT") {
        setToken(msg.token);
        setUser(msg.user);
        setContext(msg.context);
        setPermissions(msg.permissions || []);
      }

      if (msg?.type === "MYHOME_CONTEXT") {
        setContext(msg.context);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const notifyEvent = (name: string, payload?: any) => {
    // Ne pas envoyer de postMessage si on n'est pas dans un iframe (app mobile standalone)
    if (window.parent === window) {
      return;
    }
    try {
      window.parent?.postMessage({ type: "APP_EVENT", name, payload }, MYHOME_ORIGIN);
    } catch (error) {
      // Ignorer silencieusement si on n'est pas embeddé
    }
  };

  return { user, context, token, permissions, notifyEvent };
}
