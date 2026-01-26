import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComplianceRequest {
  edlId?: string;
  projectId?: string;
  sessionId?: string;
  country: string;
  region?: string;
  edlContent: {
    generalInfo?: any;
    rooms?: any[];
    equipment?: any[];
    anomalies?: any[];
    tasks?: any[];
    photos?: any[];
    meters?: any[];
    keys?: any[];
    descriptions?: string[];
  };
}

interface ComplianceIssue {
  id: string;
  type: 'missing_section' | 'forbidden_term' | 'missing_photo' | 'format_error' | 'incomplete_data';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion?: string;
  location?: string;
  norm_reference?: string;
}

interface ComplianceCorrection {
  issue_id: string;
  original: string;
  corrected: string;
  applied: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const request: ComplianceRequest = await req.json();
    const { country, region, edlContent, edlId, projectId, sessionId } = request;

    console.log(`Checking European compliance for country: ${country}, region: ${region || 'none'}`);

    // Fetch country norms
    const { data: countryNorms, error: normsError } = await supabase
      .from('eu_country_norms')
      .select('*')
      .eq('country_code', country)
      .single();

    if (normsError || !countryNorms) {
      return new Response(JSON.stringify({ error: `Country norms not found for ${country}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const issues: ComplianceIssue[] = [];
    const corrections: ComplianceCorrection[] = [];
    let complianceScore = 100;

    // 1. Check required sections
    const requiredSections = countryNorms.required_sections || [];
    for (const section of requiredSections) {
      if (section.required) {
        const sectionId = section.id;
        let sectionPresent = false;

        switch (sectionId) {
          case 'general_info':
            sectionPresent = !!edlContent.generalInfo && Object.keys(edlContent.generalInfo).length > 0;
            break;
          case 'rooms':
            sectionPresent = Array.isArray(edlContent.rooms) && edlContent.rooms.length > 0;
            break;
          case 'equipment':
            sectionPresent = Array.isArray(edlContent.equipment) && edlContent.equipment.length > 0;
            break;
          case 'meters':
            sectionPresent = Array.isArray(edlContent.meters) && edlContent.meters.length > 0;
            break;
          case 'keys':
            sectionPresent = Array.isArray(edlContent.keys) && edlContent.keys.length > 0;
            break;
          case 'registration_number':
            sectionPresent = !!edlContent.generalInfo?.registrationNumber;
            break;
          case 'smoke_detectors':
            sectionPresent = edlContent.equipment?.some(e => 
              e.type?.toLowerCase().includes('détecteur') || e.type?.toLowerCase().includes('smoke')
            ) || false;
            break;
          case 'technical_installations':
            sectionPresent = edlContent.equipment?.some(e => 
              ['électrique', 'plomberie', 'chauffage', 'electrical', 'plumbing', 'heating'].some(
                term => e.type?.toLowerCase().includes(term)
              )
            ) || false;
            break;
          case 'electrical_check':
            sectionPresent = edlContent.equipment?.some(e => 
              e.type?.toLowerCase().includes('électr') || e.type?.toLowerCase().includes('electr')
            ) || false;
            break;
          case 'plumbing_check':
            sectionPresent = edlContent.equipment?.some(e => 
              e.type?.toLowerCase().includes('plomb') || e.type?.toLowerCase().includes('plumb')
            ) || false;
            break;
          default:
            sectionPresent = true;
        }

        if (!sectionPresent) {
          issues.push({
            id: `missing_${sectionId}`,
            type: 'missing_section',
            severity: 'high',
            message: `Section obligatoire manquante: ${sectionId}`,
            suggestion: `Ajoutez la section "${sectionId}" pour être conforme aux normes ${countryNorms.country_name}`,
            norm_reference: countryNorms.legal_references?.[0]?.name || ''
          });
          complianceScore -= 15;
        }
      }
    }

    // 2. Check forbidden terms
    const forbiddenTerms = countryNorms.forbidden_terms || [];
    const allTexts = [
      ...(edlContent.descriptions || []),
      ...(edlContent.anomalies?.map(a => a.description) || []),
      ...(edlContent.tasks?.map(t => t.description) || []),
      edlContent.generalInfo?.notes || ''
    ].filter(Boolean);

    for (const termConfig of forbiddenTerms) {
      const term = termConfig.term?.toLowerCase();
      if (!term) continue;

      for (const text of allTexts) {
        if (text.toLowerCase().includes(term)) {
          issues.push({
            id: `forbidden_${term}`,
            type: 'forbidden_term',
            severity: termConfig.severity || 'high',
            message: `Terme interdit détecté: "${term}"`,
            suggestion: `Reformulez pour éviter le terme "${term}" qui implique une responsabilité`,
            location: text.substring(0, 100) + '...'
          });
          complianceScore -= termConfig.severity === 'high' ? 10 : 5;
        }
      }
    }

    // 3. Check required photos
    const requiredPhotos = countryNorms.required_photos || [];
    for (const photoReq of requiredPhotos) {
      if (photoReq.required) {
        const photoType = photoReq.type;
        let photoPresent = false;

        if (photoType === 'all_rooms') {
          const roomCount = edlContent.rooms?.length || 0;
          const photosWithRoom = edlContent.photos?.filter(p => p.roomId)?.length || 0;
          photoPresent = photosWithRoom >= roomCount;
        } else {
          photoPresent = edlContent.photos?.some(p => 
            p.type?.toLowerCase().includes(photoType.toLowerCase()) ||
            p.category?.toLowerCase().includes(photoType.toLowerCase())
          ) || false;
        }

        if (!photoPresent) {
          issues.push({
            id: `missing_photo_${photoType}`,
            type: 'missing_photo',
            severity: 'medium',
            message: `Photos obligatoires manquantes: ${photoType}`,
            suggestion: `Ajoutez des photos de type "${photoType}" selon les normes ${countryNorms.country_name}`,
            norm_reference: countryNorms.legal_references?.[0]?.name || ''
          });
          complianceScore -= 8;
        }
      }
    }

    // 4. Check registration requirement (Belgium)
    if (countryNorms.registration_required && !edlContent.generalInfo?.registrationNumber) {
      issues.push({
        id: 'registration_required',
        type: 'missing_section',
        severity: 'high',
        message: `Numéro d'enregistrement obligatoire pour ${countryNorms.country_name}`,
        suggestion: 'Ajoutez le numéro d\'enregistrement EDL obligatoire',
        norm_reference: 'Enregistrement obligatoire'
      });
      complianceScore -= 20;
    }

    // Use AI for advanced compliance checking if available
    if (lovableApiKey && allTexts.length > 0) {
      try {
        const aiPrompt = `Analyse de conformité EDL pour ${countryNorms.country_name}.

Normes applicables: ${JSON.stringify(countryNorms.legal_references)}

Contenu EDL à analyser:
${allTexts.join('\n\n')}

Vérifie:
1. Objectivité du langage (pas de jugements subjectifs)
2. Complétude des descriptions
3. Absence de termes impliquant responsabilité
4. Conformité au format légal du pays

Retourne un JSON avec:
{
  "additional_issues": [{"type": "string", "severity": "high|medium|low", "message": "string", "suggestion": "string"}],
  "corrections": [{"original": "string", "corrected": "string"}],
  "overall_assessment": "string"
}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu es un expert en conformité EDL européenne. Réponds uniquement en JSON valide.' },
              { role: 'user', content: aiPrompt }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'compliance_analysis',
                description: 'Return compliance analysis results',
                parameters: {
                  type: 'object',
                  properties: {
                    additional_issues: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                          message: { type: 'string' },
                          suggestion: { type: 'string' }
                        },
                        required: ['type', 'severity', 'message']
                      }
                    },
                    corrections: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          original: { type: 'string' },
                          corrected: { type: 'string' }
                        },
                        required: ['original', 'corrected']
                      }
                    },
                    overall_assessment: { type: 'string' }
                  },
                  required: ['additional_issues', 'corrections', 'overall_assessment']
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'compliance_analysis' } }
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            const aiResult = JSON.parse(toolCall.function.arguments);
            
            // Add AI-detected issues
            for (const aiIssue of aiResult.additional_issues || []) {
              issues.push({
                id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'format_error',
                severity: aiIssue.severity,
                message: aiIssue.message,
                suggestion: aiIssue.suggestion
              });
              complianceScore -= aiIssue.severity === 'high' ? 8 : aiIssue.severity === 'medium' ? 4 : 2;
            }

            // Add AI corrections
            for (const aiCorrection of aiResult.corrections || []) {
              corrections.push({
                issue_id: `ai_correction_${Date.now()}`,
                original: aiCorrection.original,
                corrected: aiCorrection.corrected,
                applied: false
              });
            }
          }
        }
      } catch (aiError) {
        console.error('AI compliance check error:', aiError);
      }
    }

    // Ensure score is within bounds
    complianceScore = Math.max(0, Math.min(100, complianceScore));

    // Determine status
    let status: 'compliant' | 'partial' | 'non_compliant' = 'compliant';
    if (complianceScore < 50) {
      status = 'non_compliant';
    } else if (complianceScore < 80) {
      status = 'partial';
    }

    // Save compliance result
    const { data: complianceResult, error: saveError } = await supabase
      .from('edl_compliance_results')
      .upsert({
        edl_id: edlId || null,
        project_id: projectId || null,
        session_id: sessionId || null,
        country,
        region,
        compliance_score: complianceScore,
        status,
        issues,
        corrections,
        applied_norms: countryNorms.legal_references,
        forbidden_terms_detected: issues.filter(i => i.type === 'forbidden_term'),
        missing_requirements: issues.filter(i => i.type === 'missing_section'),
        audited_at: new Date().toISOString(),
        user_id: user.id,
        audit_metadata: {
          country_norms_version: countryNorms.updated_at,
          ai_assisted: !!lovableApiKey
        }
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving compliance result:', saveError);
    }

    return new Response(JSON.stringify({
      success: true,
      compliance_score: complianceScore,
      status,
      issues,
      corrections,
      applied_norms: countryNorms.legal_references,
      country_info: {
        code: countryNorms.country_code,
        name: countryNorms.country_name,
        flag: countryNorms.flag_emoji,
        registration_required: countryNorms.registration_required
      },
      result_id: complianceResult?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-european-compliance:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
