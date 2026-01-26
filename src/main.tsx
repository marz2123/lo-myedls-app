import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./components/ThemeProvider";
import "./index.css";
import { Capacitor } from "@capacitor/core";

console.log('[main.tsx] Starting application...');

// Masque le splash screen après un délai maximum pour éviter le blocage
const hideSplashScreen = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Utilise Capacitor.Plugins pour accéder au SplashScreen
      const SplashScreen = (Capacitor as any).Plugins?.SplashScreen;
      if (SplashScreen && SplashScreen.hide) {
        await SplashScreen.hide();
        console.log('[main.tsx] Splash screen hidden');
      } else {
        console.warn('[main.tsx] SplashScreen plugin not available');
      }
    } catch (error) {
      console.warn('[main.tsx] Failed to hide splash screen:', error);
    }
  }
};

// Timeout de sécurité : masque le splash screen après 5 secondes maximum
const splashTimeout = setTimeout(() => {
  console.warn('[main.tsx] Splash screen timeout - forcing hide');
  hideSplashScreen();
}, 5000);

const rootElement = document.getElementById("root");

if (rootElement) {
  console.log('[main.tsx] Root element found, rendering App...');
  createRoot(rootElement).render(
    <ThemeProvider defaultTheme="system" storageKey="edl-insight-theme">
      <App />
    </ThemeProvider>
  );
  
  // Masque le splash screen une fois que l'app est rendue
  // Le timeout de sécurité reste actif au cas où
  setTimeout(() => {
    clearTimeout(splashTimeout);
    hideSplashScreen();
  }, 1000);
} else {
  console.error('[main.tsx] Root element NOT found!');
  clearTimeout(splashTimeout);
  hideSplashScreen();
}
