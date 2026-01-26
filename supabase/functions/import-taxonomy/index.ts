import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 imports per minute (stricter than extract-tasks)
const MAX_TAXONOMY_ROWS = 20000; // Maximum rows allowed in taxonomy import (increased for large CSV files)

// Input validation
interface TaxonomyRow {
  familyCode?: string;
  familyName?: string;
  categoryCode?: string;
  categoryName?: string;
  subcategoryCode?: string;
  subcategoryName?: string;
  taskCount?: string;
}

function validateTaxonomyInput(input: any): { valid: boolean; error?: string; data?: TaxonomyRow[] } {
  if (!input.taxonomyData || !Array.isArray(input.taxonomyData)) {
    return { valid: false, error: 'Taxonomy data must be an array' };
  }

  if (input.taxonomyData.length === 0) {
    return { valid: false, error: 'Taxonomy data cannot be empty' };
  }

  if (input.taxonomyData.length > MAX_TAXONOMY_ROWS) {
    return { valid: false, error: `Taxonomy data exceeds maximum of ${MAX_TAXONOMY_ROWS} rows` };
  }

  // Validate each row
  for (let i = 0; i < input.taxonomyData.length; i++) {
    const row = input.taxonomyData[i];
    
    // Check for code injection attempts
    if (row.familyCode && (typeof row.familyCode !== 'string' || row.familyCode.length > 50)) {
      return { valid: false, error: `Invalid familyCode at row ${i + 1}` };
    }
    if (row.categoryCode && (typeof row.categoryCode !== 'string' || row.categoryCode.length > 50)) {
      return { valid: false, error: `Invalid categoryCode at row ${i + 1}` };
    }
    if (row.subcategoryCode && (typeof row.subcategoryCode !== 'string' || row.subcategoryCode.length > 50)) {
      return { valid: false, error: `Invalid subcategoryCode at row ${i + 1}` };
    }

    // Validate names
    if (row.familyName && (typeof row.familyName !== 'string' || row.familyName.length > 500)) {
      return { valid: false, error: `Invalid familyName at row ${i + 1}` };
    }
    if (row.categoryName && (typeof row.categoryName !== 'string' || row.categoryName.length > 500)) {
      return { valid: false, error: `Invalid categoryName at row ${i + 1}` };
    }
    if (row.subcategoryName && (typeof row.subcategoryName !== 'string' || row.subcategoryName.length > 500)) {
      return { valid: false, error: `Invalid subcategoryName at row ${i + 1}` };
    }

    // Validate task count
    if (row.taskCount !== undefined && row.taskCount !== null) {
      const taskCount = parseInt(row.taskCount);
      if (isNaN(taskCount) || taskCount < 0 || taskCount > 1000000) {
        return { valid: false, error: `Invalid taskCount at row ${i + 1}` };
      }
    }
  }

  return { valid: true, data: input.taxonomyData };
}

async function checkRateLimit(supabase: any, userId: string, endpoint: string): Promise<{ allowed: boolean; error?: string }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const { data: existingLimits, error: fetchError } = await supabase
    .from('rate_limits')
    .select('request_count')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Rate limit check error:', fetchError);
    return { allowed: true };
  }

  if (existingLimits && existingLimits.request_count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      error: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} imports per minute allowed.`
    };
  }

  if (existingLimits) {
    await supabase
      .from('rate_limits')
      .update({ request_count: existingLimits.request_count + 1 })
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString());
  } else {
    await supabase
      .from('rate_limits')
      .insert({
        user_id: userId,
        endpoint: endpoint,
        request_count: 1,
        window_start: new Date()
      });
  }

  if (Math.random() < 0.1) {
    await supabase.rpc('cleanup_old_rate_limits').catch((err: any) => {
      console.error('Cleanup error:', err);
    });
  }

  return { allowed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication (JWT is already verified by Supabase)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token and decode to get user ID
    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    
    try {
      // Decode JWT to extract user ID (token is already verified by Supabase)
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
      
      if (!userId) {
        throw new Error('User ID not found in token');
      }
    } catch (error) {
      console.error('Token decode error:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create a user object for compatibility with existing code
    const user = { id: userId };

    // Parse and validate input
    const requestBody = await req.json();
    const validation = validateTaxonomyInput(requestBody);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const taxonomyData = validation.data!;
    const mode = requestBody.mode || 'replace'; // 'replace' or 'merge'
    
    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(supabase, user.id, 'import-taxonomy');
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.error }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting taxonomy import for user ${user.id} with ${taxonomyData.length} rows...`);

    // Create initial progress record
    const { data: progressRecord, error: progressError } = await supabase
      .from('import_progress')
      .insert({
        user_id: user.id,
        status: 'processing',
        total_rows: taxonomyData.length,
        progress_percentage: 0,
        processed_rows: 0,
        families_count: 0,
        categories_count: 0,
        subcategories_count: 0,
        tasks_count: 0
      })
      .select()
      .single();

    if (progressError) {
      console.error('Failed to create progress record:', progressError);
    }

    const progressId = progressRecord?.id;

    // For large imports, process in background
    const processImport = async () => {
      const familiesMap = new Map<string, string>();
      const categoriesMap = new Map<string, string>();
      const subcategoriesMap = new Map<string, string>();

      // If merge mode, fetch existing data first
      if (mode === 'merge') {
        console.log('Merge mode: Fetching existing taxonomy data...');
        
        // Call AI merge function to intelligently merge taxonomies
        const { data: mergeResult, error: mergeError } = await supabase.functions.invoke('merge-taxonomy', {
          body: { 
            newTaxonomyData: taxonomyData,
            userId: user.id
          }
        });

        if (mergeError) {
          console.error('Merge error:', mergeError);
          throw new Error('Erreur lors de la fusion intelligente: ' + mergeError.message);
        }

        console.log('AI merge completed successfully');
        
        // Update the taxonomyData with merged results
        const mergedData = mergeResult.mergedTaxonomy;
        taxonomyData.length = 0;
        taxonomyData.push(...mergedData);
      }

      // First pass: collect unique families, categories, subcategories
      const uniqueFamilies = new Map<string, { code: string; name: string }>();
      const uniqueCategories = new Map<string, { code: string; name: string; familyCode: string }>();
      const uniqueSubcategories = new Map<string, { code: string; name: string; categoryCode: string; taskCount: number }>();

      for (const row of taxonomyData) {
        // Skip total rows
        if (row.subcategoryName && row.subcategoryName.includes('TOTAL')) {
          continue;
        }

        if (row.familyCode && row.familyName) {
          uniqueFamilies.set(row.familyCode, { code: row.familyCode, name: row.familyName });
        }

        if (row.categoryCode && row.categoryName && row.familyCode) {
          uniqueCategories.set(row.categoryCode, { 
            code: row.categoryCode, 
            name: row.categoryName,
            familyCode: row.familyCode
          });
        }

        if (row.subcategoryCode && row.subcategoryName && row.categoryCode) {
          const taskCountValue = row.taskCount ? parseInt(row.taskCount) : 0;
          uniqueSubcategories.set(row.subcategoryCode, {
            code: row.subcategoryCode,
            name: row.subcategoryName,
            categoryCode: row.categoryCode,
            taskCount: taskCountValue || 0
          });
        }
      }

      console.log(`Processing ${uniqueFamilies.size} unique families, ${uniqueCategories.size} categories, ${uniqueSubcategories.size} subcategories`);

      // Calculate total tasks count
      let totalTasks = 0;
      for (const [, subcategory] of uniqueSubcategories) {
        totalTasks += subcategory.taskCount;
      }
      console.log(`Total tasks: ${totalTasks}`);

      const totalItems = uniqueFamilies.size + uniqueCategories.size + uniqueSubcategories.size;
      let processedItems = 0;

      // Helper to update progress
      const updateProgress = async (processed: number, families: number, categories: number, subcategories: number, tasks: number) => {
        if (progressId) {
          const percentage = Math.round((processed / totalItems) * 100);
          await supabase
            .from('import_progress')
            .update({
              progress_percentage: percentage,
              processed_rows: processed,
              families_count: families,
              categories_count: categories,
              subcategories_count: subcategories,
              tasks_count: tasks,
              updated_at: new Date().toISOString()
            })
            .eq('id', progressId);
        }
      };

      // Batch insert families
      for (const [code, family] of uniqueFamilies) {
        const { data: familyData, error: familyError } = await supabase
          .from('task_families')
          .upsert({
            code: family.code,
            name: family.name
          }, { onConflict: 'code' })
          .select()
          .single();

        if (familyError) {
          console.error('Family insert error:', familyError);
        } else if (familyData) {
          familiesMap.set(code, familyData.id);
        }

        processedItems++;
        if (processedItems % 10 === 0) {
          await updateProgress(processedItems, familiesMap.size, 0, 0, totalTasks);
        }
      }

      // Batch insert categories
      for (const [code, category] of uniqueCategories) {
        const familyId = familiesMap.get(category.familyCode);
        if (familyId) {
          const { data: categoryData, error: categoryError } = await supabase
            .from('task_categories')
            .upsert({
              family_id: familyId,
              code: category.code,
              name: category.name
            }, { onConflict: 'code' })
            .select()
            .single();

          if (categoryError) {
            console.error('Category insert error:', categoryError);
          } else if (categoryData) {
            categoriesMap.set(code, categoryData.id);
          }
        }

        processedItems++;
        if (processedItems % 10 === 0) {
          await updateProgress(processedItems, familiesMap.size, categoriesMap.size, 0, totalTasks);
        }
      }

      // Batch insert subcategories
      for (const [code, subcategory] of uniqueSubcategories) {
        const categoryId = categoriesMap.get(subcategory.categoryCode);
        if (categoryId) {
          const { data: subcategoryData, error: subcategoryError } = await supabase
            .from('task_subcategories')
            .upsert({
              category_id: categoryId,
              code: subcategory.code,
              name: subcategory.name,
              task_count: subcategory.taskCount
            }, { onConflict: 'code' })
            .select()
            .single();

          if (subcategoryError) {
            console.error('Subcategory insert error:', subcategoryError);
          } else if (subcategoryData) {
            subcategoriesMap.set(code, subcategoryData.id);
          }
        }

        processedItems++;
        if (processedItems % 10 === 0) {
          await updateProgress(processedItems, familiesMap.size, categoriesMap.size, subcategoriesMap.size, totalTasks);
        }
      }

      // Final progress update
      if (progressId) {
        await supabase
          .from('import_progress')
          .update({
            status: 'completed',
            progress_percentage: 100,
            processed_rows: totalItems,
            families_count: familiesMap.size,
            categories_count: categoriesMap.size,
            subcategories_count: subcategoriesMap.size,
            tasks_count: totalTasks,
            updated_at: new Date().toISOString()
          })
          .eq('id', progressId);
      }

      console.log(`Import complete: ${familiesMap.size} families, ${categoriesMap.size} categories, ${subcategoriesMap.size} subcategories, ${totalTasks} tasks`);
      
      return {
        families: familiesMap.size,
        categories: categoriesMap.size,
        subcategories: subcategoriesMap.size,
        tasks: totalTasks
      };
    };

    // For large datasets, use background processing
    if (taxonomyData.length > 5000) {
      // Start processing in background (don't await)
      processImport().catch(async (error) => {
        console.error('Import failed:', error);
        if (progressId) {
          await supabase
            .from('import_progress')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString()
            })
            .eq('id', progressId);
        }
      });
      
      // Return immediate response with progress ID
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Import en cours en arrière-plan. Suivez la progression ci-dessous.',
          processing: true,
          progressId: progressId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // For smaller datasets, process synchronously
      try {
        const result = await processImport();
        
        return new Response(
          JSON.stringify({
            success: true,
            imported: result
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        if (progressId) {
          await supabase
            .from('import_progress')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString()
            })
            .eq('id', progressId);
        }
        throw error;
      }
    }

  } catch (error) {
    console.error('Error in import-taxonomy:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
