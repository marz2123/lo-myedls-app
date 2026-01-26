import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Pages uniquement - code splitting par route (chargées à la demande)
          // Toutes les autres dépendances restent dans le chunk principal
          // pour garantir que React est toujours disponible
          if (id.includes("/src/pages/")) {
            const pageMatch = id.match(/\/src\/pages\/([^/]+)/);
            if (pageMatch) {
              const pageName = pageMatch[1];
              // Grouper les pages mobiles ensemble
              if (pageName === "mobile") {
                return "pages-mobile";
              }
              // Autres pages individuelles
              return `pages-${pageName}`;
            }
          }

          // TOUT LE RESTE reste dans le chunk principal (index)
          // Cela inclut React, React DOM, toutes les dépendances, etc.
          // Cela garantit que React est toujours chargé en premier et disponible
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 3000, // Augmenter la limite car tout est dans le chunk principal
  },
}));
