// Adaptateur fetch pour Capacitor utilisant CapacitorHttp
// CapacitorHttp est nécessaire car le fetch natif ne fonctionne pas dans Capacitor Android

import { Capacitor } from '@capacitor/core';

// Type pour CapacitorHttp (disponible via @capacitor/core)
declare const CapacitorHttp: {
  request(options: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    data?: any;
    params?: Record<string, string>;
  }): Promise<{
    status: number;
    data: any;
    headers: Record<string, string>;
  }>;
};

// Convertit les Headers en objet simple
function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  
  if (headers instanceof Headers) {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  
  return headers as Record<string, string>;
}

// Adaptateur fetch compatible avec l'API fetch standard
export async function capacitorFetch(
  url: string | URL,
  options: RequestInit = {}
): Promise<Response> {
  const urlString = typeof url === 'string' ? url : url.toString();
  const isNative = Capacitor.isNativePlatform();
  
  // Sur web, utilise le fetch natif
  if (!isNative) {
    return fetch(url, options);
  }

  // Sur mobile, utilise CapacitorHttp (disponible via window.CapacitorHttp)
  try {
    const method = options.method || 'GET';
    const headers = headersToObject(options.headers);
    
    // Parse l'URL pour extraire les query params
    const urlObj = new URL(urlString);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Gère le body
    let data: any = undefined;
    if (options.body) {
      if (typeof options.body === 'string') {
        try {
          data = JSON.parse(options.body);
        } catch {
          // Si ce n'est pas du JSON, garde la string
          data = options.body;
        }
      } else if (options.body instanceof FormData) {
        // FormData : convertit en objet simple pour CapacitorHttp
        const formDataObj: Record<string, any> = {};
        for (const [key, value] of options.body.entries()) {
          if (value instanceof File || value instanceof Blob) {
            // Pour les fichiers, on doit utiliser une approche différente
            // Pour l'instant, on utilise fetch natif pour FormData
            console.warn('[CapacitorFetch] FormData detected, using native fetch');
            return fetch(url, options);
          }
          formDataObj[key] = value;
        }
        data = formDataObj;
      } else {
        data = options.body;
      }
    }

    // Utilise CapacitorHttp via Capacitor.Plugins (disponible dans Capacitor 7)
    const http = (Capacitor as any).Plugins?.Http || (Capacitor as any).Plugins?.CapacitorHttp;
    
    if (!http) {
      console.warn('[CapacitorFetch] CapacitorHttp not found via Plugins, trying window...');
      // Fallback : essaie via window
      const httpWindow = (window as any).CapacitorHttp || (globalThis as any).CapacitorHttp;
      if (!httpWindow) {
        console.warn('[CapacitorFetch] CapacitorHttp not found, falling back to native fetch');
        return fetch(url, options);
      }
      const response = await httpWindow.request({
        url: urlObj.origin + urlObj.pathname,
        method: method,
        headers: headers,
        data: data,
        params: Object.keys(params).length > 0 ? params : undefined,
      });
      const responseBody = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);
      return new Response(responseBody, {
        status: response.status,
        statusText: response.status >= 200 && response.status < 300 ? 'OK' : 'Error',
        headers: new Headers(response.headers as any),
      });
    }

    console.log('[CapacitorFetch] Using CapacitorHttp:', {
      url: urlObj.origin + urlObj.pathname,
      method,
      hasData: !!data,
      hasParams: Object.keys(params).length > 0,
    });

    // Fait la requête avec CapacitorHttp
    const response = await http.request({
      url: urlObj.origin + urlObj.pathname,
      method: method,
      headers: headers,
      data: data,
      params: Object.keys(params).length > 0 ? params : undefined,
    });

    // Convertit la réponse CapacitorHttp en Response standard
    const responseBody = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data);

    return new Response(responseBody, {
      status: response.status,
      statusText: response.status >= 200 && response.status < 300 ? 'OK' : 'Error',
      headers: new Headers(response.headers as any),
    });
  } catch (error: any) {
    // Détecte les erreurs DNS/réseau
    const isNetworkError = 
      error?.code === 'UnknownHostException' ||
      error?.message?.includes('Unable to resolve host') ||
      error?.message?.includes('No address associated with hostname') ||
      error?.message?.includes('Network request failed') ||
      error?.message?.includes('ENOTFOUND') ||
      error?.message?.includes('ECONNREFUSED');

    // Pour les erreurs réseau (DNS, connexion), on crée une Response avec un status approprié
    // au lieu de lancer une erreur, pour éviter les RangeError dans Supabase
    if (isNetworkError) {
      console.warn('[CapacitorFetch] Network error (DNS/connection):', {
        url: urlString.substring(0, 100),
        error: error.message,
        code: (error as any).code,
      });
      
      // Crée une Response avec un status 503 (Service Unavailable) pour les erreurs réseau
      // Cela permet à Supabase de gérer l'erreur correctement sans RangeError
      return new Response(
        JSON.stringify({ 
          error: 'Network error',
          message: error.message || 'Unable to connect to server',
          code: (error as any).code || 'NETWORK_ERROR'
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    // Pour les autres erreurs, on log et on crée une Response d'erreur
    console.error('[CapacitorFetch] Request failed:', {
      url: urlString.substring(0, 150),
      method: options.method || 'GET',
      error: error.message,
      errorType: error.constructor.name,
      isNative,
      errorCode: (error as any).code,
    });
    
    // Crée une Response avec un status 500 pour les autres erreurs
    return new Response(
      JSON.stringify({ 
        error: 'Request failed',
        message: error.message || 'Unknown error'
      }),
      {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
