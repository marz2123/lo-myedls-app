// Adapter de stockage pour mobile (Capacitor) et web (localStorage)
// Permet d'utiliser le même code sur web et mobile
// Compatible avec l'interface synchrone attendue par Supabase Auth

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Interface de stockage compatible avec Supabase Auth
 * Supabase attend une interface synchrone comme localStorage
 * On utilise un cache en mémoire pour rendre l'API asynchrone de Capacitor synchrone
 */
class MobileStorageAdapter {
  private cache: Map<string, string | null> = new Map();
  private initialized = false;

  // Initialise le cache au démarrage (appelé une fois)
  async initialize() {
    if (this.initialized || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Charge toutes les clés Supabase au démarrage
      const keys = await Preferences.keys();
      for (const key of keys.keys) {
        const { value } = await Preferences.get({ key });
        this.cache.set(key, value);
      }
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize mobile storage cache:', error);
      this.initialized = true; // Continue quand même
    }
  }

  // Interface synchrone pour Supabase (comme localStorage)
  getItem(key: string): string | null {
    if (Capacitor.isNativePlatform()) {
      // Retourne depuis le cache (synchronisé en arrière-plan)
      return this.cache.get(key) ?? null;
    }
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (Capacitor.isNativePlatform()) {
      // Met à jour le cache immédiatement (synchrone)
      this.cache.set(key, value);
      // Sauvegarde en arrière-plan (asynchrone)
      Preferences.set({ key, value }).catch((error) => {
        console.warn(`Failed to save ${key} to Preferences:`, error);
      });
    } else {
      localStorage.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    if (Capacitor.isNativePlatform()) {
      // Supprime du cache immédiatement (synchrone)
      this.cache.delete(key);
      // Supprime en arrière-plan (asynchrone)
      Preferences.remove({ key }).catch((error) => {
        console.warn(`Failed to remove ${key} from Preferences:`, error);
      });
    } else {
      localStorage.removeItem(key);
    }
  }
}

// Instance singleton pour Supabase
export const mobileStorage = new MobileStorageAdapter();

// Initialise le cache au démarrage de l'application
if (typeof window !== 'undefined') {
  mobileStorage.initialize();
}

