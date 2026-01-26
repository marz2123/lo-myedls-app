import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidationIssue {
  id: string;
  type: 'completeness' | 'technical' | 'redaction' | 'info';
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  suggestion?: string;
  elementId?: string;
  elementType?: string;
  roomName?: string;
  autoFixable: boolean;
}

interface ValidationResult {
  score: number;
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  completenessIssues: ValidationIssue[];
  technicalIssues: ValidationIssue[];
  redactionIssues: ValidationIssue[];
  summary: {
    totalRooms: number;
    completedRooms: number;
    totalPhotos: number;
    totalAnomalies: number;
    totalTasks: number;
    missingDescriptions: number;
    missingPhotos: number;
  };
  readyForSignature: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { edlData, projectId, sessionId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare context for AI analysis
    const edlContext = JSON.stringify({
      rooms: edlData.rooms || [],
      items: edlData.items || [],
      photos: edlData.photos || [],
      anomalies: edlData.anomalies || [],
      tasks: edlData.tasks || [],
      descriptions: edlData.descriptions || []
    });

    const systemPrompt = `Tu es un expert en états des lieux immobiliers (EDL) en France. 
Tu dois analyser un EDL et identifier tous les problèmes de:
1. COMPLÉTUDE: éléments manquants, photos obligatoires absentes, descriptions vides
2. COHÉRENCE TECHNIQUE: incohérences entre photos/descriptions, états/anomalies/tâches
3. RÉDACTION: descriptions vagues, non professionnelles, ou incohérentes

Retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{
  "completenessIssues": [{"id": "uuid", "category": "string", "title": "string", "description": "string", "suggestion": "string", "roomName": "string", "elementId": "string", "autoFixable": boolean}],
  "technicalIssues": [{"id": "uuid", "category": "string", "title": "string", "description": "string", "suggestion": "string", "roomName": "string", "autoFixable": boolean}],
  "redactionIssues": [{"id": "uuid", "category": "string", "title": "string", "originalText": "string", "suggestedText": "string", "roomName": "string", "elementId": "string", "autoFixable": true}],
  "summary": {"totalRooms": number, "completedRooms": number, "missingDescriptions": number, "missingPhotos": number}
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyse cet EDL et identifie les problèmes:\n\n${edlContext}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "{}";
    
    // Parse AI response
    let aiAnalysis;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      aiAnalysis = JSON.parse(jsonMatch[1] || content);
    } catch {
      console.error("Failed to parse AI response:", content);
      aiAnalysis = { completenessIssues: [], technicalIssues: [], redactionIssues: [], summary: {} };
    }

    // Build validation result
    const completenessIssues: ValidationIssue[] = (aiAnalysis.completenessIssues || []).map((issue: any, idx: number) => ({
      id: issue.id || `comp-${idx}`,
      type: 'completeness' as const,
      severity: 'warning' as const,
      category: issue.category || 'Complétude',
      title: issue.title || 'Élément manquant',
      description: issue.description || '',
      suggestion: issue.suggestion,
      elementId: issue.elementId,
      roomName: issue.roomName,
      autoFixable: issue.autoFixable || false
    }));

    const technicalIssues: ValidationIssue[] = (aiAnalysis.technicalIssues || []).map((issue: any, idx: number) => ({
      id: issue.id || `tech-${idx}`,
      type: 'technical' as const,
      severity: issue.severity === 'critical' ? 'critical' as const : 'warning' as const,
      category: issue.category || 'Cohérence',
      title: issue.title || 'Incohérence détectée',
      description: issue.description || '',
      suggestion: issue.suggestion,
      roomName: issue.roomName,
      autoFixable: issue.autoFixable || false
    }));

    const redactionIssues: ValidationIssue[] = (aiAnalysis.redactionIssues || []).map((issue: any, idx: number) => ({
      id: issue.id || `red-${idx}`,
      type: 'redaction' as const,
      severity: 'info' as const,
      category: issue.category || 'Rédaction',
      title: issue.title || 'Amélioration suggérée',
      description: issue.originalText || '',
      suggestion: issue.suggestedText,
      elementId: issue.elementId,
      roomName: issue.roomName,
      autoFixable: true
    }));

    const totalIssues = completenessIssues.length + technicalIssues.length + redactionIssues.length;
    const criticalIssues = [...completenessIssues, ...technicalIssues].filter(i => i.severity === 'critical').length;
    const warningIssues = [...completenessIssues, ...technicalIssues].filter(i => i.severity === 'warning').length;

    // Calculate quality score (100 - penalties)
    const score = Math.max(0, Math.min(100, 100 - (criticalIssues * 15) - (warningIssues * 5) - (redactionIssues.length * 2)));

    const result: ValidationResult = {
      score,
      totalIssues,
      criticalIssues,
      warningIssues,
      infoIssues: redactionIssues.length,
      completenessIssues,
      technicalIssues,
      redactionIssues,
      summary: {
        totalRooms: aiAnalysis.summary?.totalRooms || edlData.rooms?.length || 0,
        completedRooms: aiAnalysis.summary?.completedRooms || 0,
        totalPhotos: edlData.photos?.length || 0,
        totalAnomalies: edlData.anomalies?.length || 0,
        totalTasks: edlData.tasks?.length || 0,
        missingDescriptions: aiAnalysis.summary?.missingDescriptions || 0,
        missingPhotos: aiAnalysis.summary?.missingPhotos || 0
      },
      readyForSignature: criticalIssues === 0 && warningIssues <= 3
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("validate-edl error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
