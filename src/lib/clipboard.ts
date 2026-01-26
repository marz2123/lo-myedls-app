// Utilitaire sécurisé pour l'accès au clipboard
// Gère les erreurs de permission et les cas où l'app n'est pas au premier plan

/**
 * Copie du texte dans le presse-papiers de manière sécurisée
 * @param text Le texte à copier
 * @returns true si la copie a réussi, false sinon
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Vérifie que le clipboard API est disponible
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    console.warn('[Clipboard] Clipboard API not available');
    return false;
  }

  try {
    // Vérifie que l'app est au premier plan (document.hasFocus)
    if (typeof document !== 'undefined' && !document.hasFocus()) {
      console.warn('[Clipboard] App is not in focus, clipboard access may fail');
      // On essaie quand même, mais on s'attend à une erreur
    }

    await navigator.clipboard.writeText(text);
    return true;
  } catch (error: any) {
    // Erreur commune sur Android : "application is not in focus"
    if (error.message?.includes('not in focus') || error.message?.includes('focus')) {
      console.warn('[Clipboard] Clipboard access denied - app not in focus:', error.message);
    } else {
      console.error('[Clipboard] Failed to copy to clipboard:', error);
    }
    return false;
  }
}

/**
 * Lit le texte depuis le presse-papiers de manière sécurisée
 * @returns Le texte lu ou null en cas d'erreur
 */
export async function readFromClipboard(): Promise<string | null> {
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    console.warn('[Clipboard] Clipboard read API not available');
    return null;
  }

  try {
    if (typeof document !== 'undefined' && !document.hasFocus()) {
      console.warn('[Clipboard] App is not in focus, clipboard read may fail');
    }

    const text = await navigator.clipboard.readText();
    return text;
  } catch (error: any) {
    if (error.message?.includes('not in focus') || error.message?.includes('focus')) {
      console.warn('[Clipboard] Clipboard read denied - app not in focus:', error.message);
    } else {
      console.error('[Clipboard] Failed to read from clipboard:', error);
    }
    return null;
  }
}
