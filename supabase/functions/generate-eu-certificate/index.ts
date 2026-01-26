import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateRequest {
  complianceResultId: string;
  edlId?: string;
  projectId?: string;
  issuerName: string;
  issuerEmail?: string;
  jurisdiction?: string;
}

function generateHash(data: string): string {
  // Simple hash for demo - in production use crypto.subtle
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0').toUpperCase();
}

function generateCertificateNumber(country: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `EU-EDL-${country}-${year}${month}-${random}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
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

    const request: CertificateRequest = await req.json();
    const { complianceResultId, edlId, projectId, issuerName, issuerEmail, jurisdiction } = request;

    // Fetch compliance result
    const { data: complianceResult, error: complianceError } = await supabase
      .from('edl_compliance_results')
      .select('*')
      .eq('id', complianceResultId)
      .single();

    if (complianceError || !complianceResult) {
      return new Response(JSON.stringify({ error: 'Compliance result not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if score is sufficient for certification
    if (complianceResult.compliance_score < 70) {
      return new Response(JSON.stringify({ 
        error: 'Compliance score too low for certification',
        score: complianceResult.compliance_score,
        minimum_required: 70
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch country norms for additional info
    const { data: countryNorms } = await supabase
      .from('eu_country_norms')
      .select('*')
      .eq('country_code', complianceResult.country)
      .single();

    const certificateNumber = generateCertificateNumber(complianceResult.country);
    const issuedAt = new Date().toISOString();
    
    // Generate hash from certificate data
    const hashData = JSON.stringify({
      certificateNumber,
      complianceResultId,
      country: complianceResult.country,
      score: complianceResult.compliance_score,
      issuerName,
      issuedAt
    });
    const hash = generateHash(hashData);

    // Separate requirements met vs corrected
    const requirementsMet = (complianceResult.issues || [])
      .filter((i: any) => i.severity !== 'high')
      .map((i: any) => ({ id: i.id, message: i.message }));
    
    const requirementsCorrected = (complianceResult.corrections || [])
      .filter((c: any) => c.applied)
      .map((c: any) => ({ original: c.original, corrected: c.corrected }));

    // Create certificate
    const { data: certificate, error: certError } = await supabase
      .from('edl_certificates_eu')
      .insert({
        edl_id: edlId || complianceResult.edl_id,
        project_id: projectId || complianceResult.project_id,
        compliance_result_id: complianceResultId,
        country: complianceResult.country,
        region: complianceResult.region,
        certificate_number: certificateNumber,
        hash,
        issuer_name: issuerName,
        issuer_email: issuerEmail,
        jurisdiction: jurisdiction || countryNorms?.country_name,
        norms_applied: complianceResult.applied_norms || [],
        compliance_score: complianceResult.compliance_score,
        requirements_met: requirementsMet,
        requirements_corrected: requirementsCorrected,
        is_valid: true,
        issued_at: issuedAt,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        user_id: user.id,
        metadata: {
          country_info: {
            code: countryNorms?.country_code,
            name: countryNorms?.country_name,
            flag: countryNorms?.flag_emoji
          },
          generation_timestamp: Date.now()
        }
      })
      .select()
      .single();

    if (certError) {
      console.error('Error creating certificate:', certError);
      return new Response(JSON.stringify({ error: 'Failed to create certificate' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      certificate: {
        id: certificate.id,
        certificate_number: certificateNumber,
        hash,
        country: complianceResult.country,
        country_name: countryNorms?.country_name,
        country_flag: countryNorms?.flag_emoji,
        compliance_score: complianceResult.compliance_score,
        issuer_name: issuerName,
        issued_at: issuedAt,
        expires_at: certificate.expires_at,
        norms_applied: complianceResult.applied_norms,
        is_valid: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-eu-certificate:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
