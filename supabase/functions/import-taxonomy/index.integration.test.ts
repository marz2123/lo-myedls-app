import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ Skipping integration tests - Supabase credentials not configured');
  Deno.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createTestUser(): Promise<{ userId: string; token: string }> {
  const email = `test-${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  
  const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (signUpError) {
    throw new Error(`Failed to create test user: ${signUpError.message}`);
  }
  
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (signInError || !sessionData.session) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }
  
  return {
    userId: authData.user!.id,
    token: sessionData.session.access_token
  };
}

async function cleanupTestUser(userId: string) {
  await supabase.auth.admin.deleteUser(userId);
}

async function cleanupTestTaxonomy(codes: string[]) {
  // Delete test taxonomy entries
  for (const code of codes) {
    await supabase.from('task_families').delete().eq('code', code);
    await supabase.from('task_categories').delete().eq('code', code);
    await supabase.from('task_subcategories').delete().eq('code', code);
  }
}

Deno.test("Integration: import-taxonomy should import valid taxonomy data", async () => {
  let testUser;
  const testCodes = ['TEST_FT01', 'TEST_CT01', 'TEST_SC01'];
  
  try {
    testUser = await createTestUser();
    
    const taxonomyData = [
      {
        familyCode: 'TEST_FT01',
        familyName: 'Test Family',
        categoryCode: 'TEST_CT01',
        categoryName: 'Test Category',
        subcategoryCode: 'TEST_SC01',
        subcategoryName: 'Test Subcategory',
        taskCount: '5'
      }
    ];
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/import-taxonomy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taxonomyData })
    });
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.success, true);
    assertEquals(data.imported.families, 1);
    assertEquals(data.imported.categories, 1);
    assertEquals(data.imported.subcategories, 1);
    
    // Verify data was inserted
    const { data: family } = await supabase
      .from('task_families')
      .select('*')
      .eq('code', 'TEST_FT01')
      .single();
    
    assertExists(family);
    assertEquals(family.name, 'Test Family');
    
  } finally {
    if (testUser) {
      await cleanupTestUser(testUser.userId);
    }
    await cleanupTestTaxonomy(testCodes);
  }
});

Deno.test("Integration: import-taxonomy should respect rate limiting", async () => {
  let testUser;
  
  try {
    testUser = await createTestUser();
    
    // Make 6 requests (limit is 5 per minute)
    const requests = [];
    for (let i = 0; i < 6; i++) {
      requests.push(
        fetch(`${SUPABASE_URL}/functions/v1/import-taxonomy`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testUser.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taxonomyData: [{
              familyCode: `TEST_${i}`,
              familyName: `Test ${i}`
            }]
          })
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    assertEquals(rateLimitedResponses.length > 0, true);
    
  } finally {
    if (testUser) {
      await cleanupTestUser(testUser.userId);
    }
  }
});

Deno.test("Integration: import-taxonomy should validate input size", async () => {
  let testUser;
  
  try {
    testUser = await createTestUser();
    
    // Create array exceeding max rows (10000)
    const largeTaxonomyData = Array(10001).fill({
      familyCode: 'TEST',
      familyName: 'Test'
    });
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/import-taxonomy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taxonomyData: largeTaxonomyData })
    });
    
    assertEquals(response.status, 400);
    
    const data = await response.json();
    assertExists(data.error);
    assertEquals(data.error.includes('maximum'), true);
    
  } finally {
    if (testUser) {
      await cleanupTestUser(testUser.userId);
    }
  }
});

console.log('✅ All integration tests configured');
