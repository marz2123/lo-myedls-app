import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalisation des unités
const normalizeUnite = (unite: string): string => {
  const u = unite?.toLowerCase().trim() || '';
  if (u.includes('m²') || u.includes('m2') || u === 'm2') return 'm2';
  if (u.includes('ml') || u === 'ml' || u.includes('mètre linéaire')) return 'ml';
  if (u === 'u' || u === 'unité' || u === 'pce' || u === 'piece') return 'u';
  if (u === 'lot' || u.includes('ensemble')) return 'lot';
  if (u === 'forfait' || u === 'ft' || u === 'ens') return 'forfait';
  if (u === 'm3' || u.includes('m³')) return 'm3';
  if (u === 'kg' || u === 'kilogramme') return 'kg';
  if (u === 't' || u === 'tonne') return 't';
  if (u === 'h' || u === 'heure') return 'h';
  if (u === 'j' || u === 'jour') return 'j';
  return u || 'u';
};

// Parse rendement (format français avec virgule)
const parseRendement = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(',', '.').replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { excelUrl, excelBase64, csvContent, csvUrl, clearExisting = true } = await req.json();

    console.log('Starting DSC import...');

    // Clear existing data if requested
    if (clearExisting) {
      console.log('Clearing existing DSC data...');
      await supabase.from('t_taches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sc_sous_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ct_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ft_familles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    let stats = { familles: 0, categories: 0, sousCategories: 0, taches: 0 };
    const batchSize = 500;

    // Handle Excel file (preferred)
    if (excelUrl || excelBase64) {
      console.log('Processing Excel file...');
      
      let workbook: XLSX.WorkBook;
      
      if (excelBase64) {
        // Decode base64
        const binaryString = atob(excelBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        workbook = XLSX.read(bytes, { type: 'array' });
      } else if (excelUrl) {
        console.log('Fetching Excel from URL:', excelUrl);
        const response = await fetch(excelUrl);
        if (!response.ok) {
          throw new Error(`Erreur téléchargement Excel: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      } else {
        throw new Error('Excel data required');
      }

      console.log('Excel sheets:', workbook.SheetNames);

      // Sheet 1: ft_familles
      const ftSheet = workbook.Sheets[workbook.SheetNames[0]];
      const ftData = XLSX.utils.sheet_to_json<Record<string, string>>(ftSheet);
      console.log(`FT sheet: ${ftData.length} rows`);

      // Deduplicate familles by ft_code
      const famillesMap = new Map<string, Record<string, unknown>>();
      ftData.forEach(row => {
        const ft_code = row['ft_code'] || '';
        if (ft_code && !famillesMap.has(ft_code)) {
          famillesMap.set(ft_code, {
            ft_code,
            ft_label: row['ft_label'] || '',
            ft_description: row['ft_description'] || null
          });
        }
      });
      const famillesData = Array.from(famillesMap.values());

      for (let i = 0; i < famillesData.length; i += batchSize) {
        const batch = famillesData.slice(i, i + batchSize);
        const { error } = await supabase.from('ft_familles').upsert(batch, { onConflict: 'ft_code' });
        if (error) throw new Error(`Erreur insertion familles: ${error.message}`);
      }
      stats.familles = famillesData.length;
      console.log(`Inserted ${stats.familles} familles`);

      // Sheet 2: ct_categories
      const ctSheet = workbook.Sheets[workbook.SheetNames[1]];
      const ctData = XLSX.utils.sheet_to_json<Record<string, string>>(ctSheet);
      console.log(`CT sheet: ${ctData.length} rows`);

      // Deduplicate categories by ct_code
      const categoriesMap = new Map<string, Record<string, unknown>>();
      ctData.forEach(row => {
        const ct_code = row['ct_code'] || '';
        const ft_code = row['ft_code'] || '';
        if (ct_code && ft_code && !categoriesMap.has(ct_code)) {
          categoriesMap.set(ct_code, { ct_code, ct_label: row['ct_label'] || '', ft_code });
        }
      });
      const categoriesData = Array.from(categoriesMap.values());

      for (let i = 0; i < categoriesData.length; i += batchSize) {
        const batch = categoriesData.slice(i, i + batchSize);
        const { error } = await supabase.from('ct_categories').upsert(batch, { onConflict: 'ct_code' });
        if (error) throw new Error(`Erreur insertion categories: ${error.message}`);
      }
      stats.categories = categoriesData.length;
      console.log(`Inserted ${stats.categories} categories`);

      // Sheet 3: sc_sous_categories
      const scSheet = workbook.Sheets[workbook.SheetNames[2]];
      const scData = XLSX.utils.sheet_to_json<Record<string, string>>(scSheet);
      console.log(`SC sheet: ${scData.length} rows`);

      // Deduplicate sous-categories by sc_code
      const scMap = new Map<string, Record<string, unknown>>();
      scData.forEach(row => {
        const sc_code = row['sc_code'] || '';
        const ct_code = row['ct_code'] || '';
        if (sc_code && ct_code && !scMap.has(sc_code)) {
          let pieces_typiques = null;
          let keywords_ia = null;
          try {
            pieces_typiques = row['pieces_typiques'] ? JSON.parse(row['pieces_typiques']) : null;
          } catch { /* ignore */ }
          try {
            keywords_ia = row['keywords_ia'] ? JSON.parse(row['keywords_ia']) : null;
          } catch { /* ignore */ }
          
          scMap.set(sc_code, {
            sc_code,
            sc_label: row['sc_label'] || '',
            ct_code,
            ft_code: row['ft_code'] || '',
            zone_type: row['zone_type'] || null,
            contexte: row['contexte'] || null,
            corps_metier: row['corps_metier'] || null,
            phase_chantier: row['phase_chantier'] || null,
            pieces_typiques,
            keywords_ia
          });
        }
      });
      const sousCategData = Array.from(scMap.values());

      for (let i = 0; i < sousCategData.length; i += batchSize) {
        const batch = sousCategData.slice(i, i + batchSize);
        const { error } = await supabase.from('sc_sous_categories').upsert(batch, { onConflict: 'sc_code' });
        if (error) throw new Error(`Erreur insertion sous-categories: ${error.message}`);
      }
      stats.sousCategories = sousCategData.length;
      console.log(`Inserted ${stats.sousCategories} sous-categories`);

      // Sheet 4: t_taches
      const tSheet = workbook.Sheets[workbook.SheetNames[3]];
      const tData = XLSX.utils.sheet_to_json<Record<string, unknown>>(tSheet);
      console.log(`T sheet: ${tData.length} rows`);

      // Deduplicate taches by t_code
      const tachesMap = new Map<string, Record<string, unknown>>();
      tData.forEach(row => {
        const t_code = String(row['t_code'] || '');
        const sc_code = String(row['sc_code'] || '');
        if (t_code && sc_code && !tachesMap.has(t_code)) {
          const rendementVal = row['rendement_h_par_unite'] ?? row['rendement_h_unite_raw'];
          tachesMap.set(t_code, {
            t_code,
            t_label: String(row['t_label'] || ''),
            sc_code,
            ct_code: String(row['ct_code'] || ''),
            ft_code: String(row['ft_code'] || ''),
            description_detaillee: String(row['description_detaillee'] || ''),
            unite: normalizeUnite(String(row['unite'] || '')),
            rendement_h_par_unite: parseRendement(rendementVal as string | number | null | undefined),
            commentaire_type_equipe: String(row['commentaire_type_equipe'] || ''),
            controle_qualite: String(row['controle_qualite'] || ''),
            normes_references: String(row['normes_references'] || '')
          });
        }
      });
      const tachesData = Array.from(tachesMap.values());

      for (let i = 0; i < tachesData.length; i += batchSize) {
        const batch = tachesData.slice(i, i + batchSize);
        const { error } = await supabase.from('t_taches').upsert(batch, { onConflict: 't_code' });
        if (error) {
          console.error('Taches insert error:', error);
          throw new Error(`Erreur insertion taches: ${error.message}`);
        }
        console.log(`Inserted taches batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tachesData.length / batchSize)}`);
      }
      stats.taches = tachesData.length;
      console.log(`Inserted ${stats.taches} taches`);

    } 
    // Fallback to CSV (legacy)
    else if (csvContent || csvUrl) {
      console.log('Processing CSV file (legacy)...');
      
      let content = csvContent;
      if (csvUrl && !content) {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error(`Erreur téléchargement CSV: ${response.status}`);
        content = await response.text();
      }

      if (!content) {
        return new Response(
          JSON.stringify({ error: 'csvContent ou csvUrl requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse CSV (legacy format)
      const lines = content.split('\n');
      const familles = new Map<string, { ft_code: string; ft_label: string; commentaire: string }>();
      const categories = new Map<string, { ct_code: string; ft_code: string; ct_label: string }>();
      const sousCategories = new Map<string, { sc_code: string; ct_code: string; ft_code: string; sc_label: string }>();
      const taches: Array<Record<string, unknown>> = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(';').map((v: string) => v.trim());
        
        const t_code = values[0] || '';
        const ft_code = values[1] || '';
        const ft_label = values[2] || '';
        const commentaire = values[3] || '';
        const ct_code = values[4] || '';
        const ct_label = values[5] || '';
        const sc_code = values[6] || '';
        const sc_label = values[7] || '';
        const t_label = values[8] || '';
        const description = values[9] || '';
        const unite = values[10] || '';
        const rendement = values[11] || '';
        const controle = values[12] || '';
        const normes = values[13] || '';

        if (!ft_code || !ct_code || !sc_code || !t_code) continue;

        if (!familles.has(ft_code)) {
          familles.set(ft_code, { ft_code, ft_label, commentaire });
        }
        if (!categories.has(ct_code)) {
          categories.set(ct_code, { ct_code, ft_code, ct_label });
        }
        if (!sousCategories.has(sc_code)) {
          sousCategories.set(sc_code, { sc_code, ct_code, ft_code, sc_label });
        }
        if (!taches.some(t => t.t_code === t_code)) {
          taches.push({
            t_code, sc_code, ct_code, ft_code, t_label,
            description_detaillee: description,
            unite: normalizeUnite(unite),
            rendement_h_par_unite: parseRendement(rendement),
            commentaire_type_equipe: commentaire,
            controle_qualite: controle,
            normes_references: normes
          });
        }
      }

      // Insert CSV data
      const famillesArray = Array.from(familles.values()).map(f => ({
        ft_code: f.ft_code, ft_label: f.ft_label, commentaire_type_equipe: f.commentaire
      }));
      for (let i = 0; i < famillesArray.length; i += batchSize) {
        const { error } = await supabase.from('ft_familles').insert(famillesArray.slice(i, i + batchSize));
        if (error) throw new Error(`Erreur familles: ${error.message}`);
      }
      stats.familles = familles.size;

      const categoriesArray = Array.from(categories.values()).map(c => ({
        ct_code: c.ct_code, ft_code: c.ft_code, ct_label: c.ct_label
      }));
      for (let i = 0; i < categoriesArray.length; i += batchSize) {
        const { error } = await supabase.from('ct_categories').insert(categoriesArray.slice(i, i + batchSize));
        if (error) throw new Error(`Erreur categories: ${error.message}`);
      }
      stats.categories = categories.size;

      const scArray = Array.from(sousCategories.values()).map(sc => ({
        sc_code: sc.sc_code, ct_code: sc.ct_code, ft_code: sc.ft_code, sc_label: sc.sc_label
      }));
      for (let i = 0; i < scArray.length; i += batchSize) {
        const { error } = await supabase.from('sc_sous_categories').insert(scArray.slice(i, i + batchSize));
        if (error) throw new Error(`Erreur sous-categories: ${error.message}`);
      }
      stats.sousCategories = sousCategories.size;

      for (let i = 0; i < taches.length; i += batchSize) {
        const { error } = await supabase.from('t_taches').insert(taches.slice(i, i + batchSize));
        if (error) throw new Error(`Erreur taches: ${error.message}`);
      }
      stats.taches = taches.length;
    } else {
      return new Response(
        JSON.stringify({ error: 'excelUrl, excelBase64, csvContent ou csvUrl requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('DSC import completed:', stats);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'DSC importée avec succès',
        stats 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('DSC import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'import DSC';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
