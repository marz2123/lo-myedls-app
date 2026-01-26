import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Barèmes professionnels de réparation (prix indicatifs en €)
const repairPriceList: Record<string, { pricePerM2?: number; pricePerMl?: number; pricePerUnit?: number; laborHoursPerUnit: number }> = {
  fissure: { pricePerMl: 45, laborHoursPerUnit: 2 },
  humidite: { pricePerM2: 80, laborHoursPerUnit: 4 },
  moisissure: { pricePerM2: 95, laborHoursPerUnit: 3 },
  infiltration: { pricePerM2: 120, laborHoursPerUnit: 5 },
  decollement: { pricePerM2: 65, laborHoursPerUnit: 3 },
  degradation: { pricePerM2: 55, laborHoursPerUnit: 2.5 },
  amiante: { pricePerM2: 350, laborHoursPerUnit: 8 },  // désamiantage certifié
  plomb: { pricePerM2: 280, laborHoursPerUnit: 6 },    // déplombage certifié
  termites: { pricePerM2: 45, laborHoursPerUnit: 4 }   // traitement curatif
};

const laborHourlyRate = 55; // taux horaire main d'œuvre en €

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pathologyType, severity, affectedSurface, affectedVolume, arMeasurements } = await req.json();
    
    if (!pathologyType) {
      throw new Error('Pathology type is required');
    }

    console.log('Calculating repair costs for:', { pathologyType, severity, affectedSurface, arMeasurements });

    const priceData = repairPriceList[pathologyType];
    if (!priceData) {
      throw new Error(`No price data available for pathology type: ${pathologyType}`);
    }

    // Calculer la surface/linéaire affecté
    let quantity = 0;
    let unit: 'm²' | 'ml' | 'unité' = 'm²';
    let pricePerUnit = 0;

    if (affectedSurface && priceData.pricePerM2) {
      quantity = affectedSurface;
      unit = 'm²';
      pricePerUnit = priceData.pricePerM2;
    } else if (arMeasurements?.width && priceData.pricePerMl) {
      quantity = arMeasurements.width;
      unit = 'ml';
      pricePerUnit = priceData.pricePerMl;
    } else if (priceData.pricePerUnit) {
      quantity = 1;
      unit = 'unité';
      pricePerUnit = priceData.pricePerUnit;
    } else {
      // Fallback sur surface AR si disponible
      quantity = arMeasurements?.surfaceArea || 1;
      unit = 'm²';
      pricePerUnit = priceData.pricePerM2 || 50;
    }

    // Multiplicateur de sévérité
    const severityMultiplier: Record<string, number> = {
      faible: 0.8,
      modere: 1.0,
      grave: 1.3,
      critique: 1.6
    };
    const multiplier = severityMultiplier[severity] || 1.0;

    // Calculs de coûts
    const materialCost = quantity * pricePerUnit * multiplier * 0.4; // 40% matériaux
    const estimatedDuration = quantity * priceData.laborHoursPerUnit * multiplier;
    const laborCost = estimatedDuration * laborHourlyRate;
    const totalCost = materialCost + laborCost;

    const estimate = {
      laborCost: Math.round(laborCost * 100) / 100,
      materialCost: Math.round(materialCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      estimatedDuration: Math.round(estimatedDuration * 10) / 10,
      pricePerUnit: Math.round(pricePerUnit * multiplier * 100) / 100,
      unit,
      quantity: Math.round(quantity * 100) / 100
    };

    console.log('Repair cost estimate:', estimate);

    return new Response(
      JSON.stringify({
        success: true,
        estimate
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error calculating repair costs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
