import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useParentAuth() {
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      // Accepter uniquement les messages MyHome
      if (event.data?.type === "MYHOME_AUTH") {
        const { access_token, refresh_token } = event.data.payload;
        await supabase.auth.setSession({ access_token, refresh_token });
        // ACK pour confirmer à MyHome que la session est établie
        window.parent.postMessage({ type: "MYHOME_AUTH_ACK" }, "*");
      } else if (event.data?.type === "MYHOME_SIGNOUT") {
        await supabase.auth.signOut();
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
}
