/**
 * Client Gemini direct - Remplace les appels Lovable
 * Utilise l'API Google Gemini directement via generativelanguage.googleapis.com
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }>;
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Appelle l'API Gemini directement
 * @param model - Modèle Gemini (ex: 'gemini-2.5-pro', 'gemini-2.5-flash')
 * @param messages - Messages au format OpenAI (sera converti en format Gemini)
 * @param systemPrompt - Prompt système optionnel
 * @param apiKey - Clé API Google (GOOGLE_API_KEY)
 * @returns Réponse Gemini
 */
export async function callGeminiDirect(
  model: string,
  messages: Array<{ role: string; content: string | any[] }>,
  systemPrompt?: string,
  apiKey?: string
): Promise<GeminiResponse> {
  const googleApiKey = apiKey || Deno.env.get('GOOGLE_API_KEY');
  
  if (!googleApiKey) {
    throw new Error('GOOGLE_API_KEY is not configured. Please set it in Supabase Edge Functions secrets.');
  }

  // Convertir les messages OpenAI en format Gemini
  const contents: GeminiMessage[] = [];
  
  // Ajouter le system prompt si fourni
  let systemInstruction: { parts: Array<{ text: string }> } | undefined;
  if (systemPrompt) {
    systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  // Convertir les messages
  for (const msg of messages) {
    if (msg.role === 'system' && !systemInstruction) {
      // Si pas de systemInstruction, on l'ajoute
      systemInstruction = {
        parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
      };
      continue;
    }

    if (msg.role === 'user' || msg.role === 'model') {
      const parts: GeminiMessage['parts'] = [];

      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        // Gérer le contenu multimodal (texte + images)
        for (const item of msg.content) {
          if (item.type === 'text') {
            parts.push({ text: item.text });
          } else if (item.type === 'image_url') {
            const imageUrl = item.image_url?.url || '';
            if (imageUrl.startsWith('data:')) {
              // Extraire le base64 et le mime type
              const match = imageUrl.match(/data:([^;]+);base64,(.+)/);
              if (match) {
                parts.push({
                  inlineData: {
                    mimeType: match[1] || 'image/jpeg',
                    data: match[2]
                  }
                });
              }
            } else {
              // URL externe - Gemini ne supporte que base64, donc on doit télécharger l'image
              // Pour l'instant, on skip les URLs externes
              console.warn('External image URLs not supported in direct Gemini API, skipping:', imageUrl);
            }
          }
        }
      }

      if (parts.length > 0) {
        contents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts
        });
      }
    }
  }

  // Construire la requête Gemini
  const requestBody: GeminiRequest = {
    contents,
    ...(systemInstruction && { systemInstruction }),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    }
  };

  // Déterminer le nom du modèle Gemini
  const geminiModelName = model.includes('gemini') 
    ? model.replace('google/', '').replace('gemini-', 'gemini-')
    : `gemini-${model}`;

  const url = `${GEMINI_API_BASE}/models/${geminiModelName}:generateContent?key=${googleApiKey}`;

  console.log(`[Gemini Direct] Calling ${geminiModelName} with ${contents.length} messages`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini Direct] API error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Google API key. Please check GOOGLE_API_KEY configuration.');
    }
    if (response.status === 400) {
      throw new Error(`Invalid request to Gemini API: ${errorText}`);
    }
    
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data: GeminiResponse = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No candidates returned from Gemini API');
  }

  return data;
}

/**
 * Convertit une réponse Gemini en format compatible avec l'ancien format Lovable
 * (pour faciliter la migration)
 */
export function convertGeminiToLovableFormat(geminiResponse: GeminiResponse): any {
  const candidate = geminiResponse.candidates[0];
  const text = candidate.content.parts[0]?.text || '';
  
  return {
    choices: [{
      message: {
        content: text,
        role: 'assistant'
      },
      finish_reason: candidate.finishReason
    }],
    usage: geminiResponse.usageMetadata ? {
      prompt_tokens: geminiResponse.usageMetadata.promptTokenCount,
      completion_tokens: geminiResponse.usageMetadata.candidatesTokenCount,
      total_tokens: geminiResponse.usageMetadata.totalTokenCount
    } : undefined
  };
}
