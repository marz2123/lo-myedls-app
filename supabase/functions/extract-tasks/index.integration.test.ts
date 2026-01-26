import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Integration tests require real Supabase connection
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ Skipping integration tests - Supabase credentials not configured');
  Deno.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to create test user and get auth token
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
  
  // Sign in to get session token
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

// Helper to cleanup test user
async function cleanupTestUser(userId: string) {
  await supabase.auth.admin.deleteUser(userId);
  
  // Cleanup any tasks created by test user
  await supabase
    .from('extracted_tasks')
    .delete()
    .eq('user_id', userId);
}

// Helper to seed test taxonomy data
async function seedTestTaxonomy() {
  const { data: existingFamily } = await supabase
    .from('task_families')
    .select('id')
    .eq('code', 'FT01')
    .single();
  
  if (existingFamily) {
    return; // Already seeded
  }
  
  // Insert test family
  const { data: family } = await supabase
    .from('task_families')
    .insert({ code: 'FT01', name: 'Gros Œuvre' })
    .select()
    .single();
  
  if (!family) return;
  
  // Insert test category
  const { data: category } = await supabase
    .from('task_categories')
    .insert({ 
      family_id: family.id, 
      code: 'CT01', 
      name: 'Fondations' 
    })
    .select()
    .single();
  
  if (!category) return;
  
  // Insert test subcategory
  await supabase
    .from('task_subcategories')
    .insert({ 
      category_id: category.id, 
      code: 'SC01', 
      name: 'Fondations superficielles' 
    });
}

Deno.test("Integration: extract-tasks should create task with valid DSC classification", async () => {
  let testUser;
  
  try {
    // Setup
    await seedTestTaxonomy();
    testUser = await createTestUser();
    
    // Create test request
    const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'Réparer les fondations fissurées dans le sous-sol',
        contentType: 'text'
      })
    });
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertExists(data.tasks);
    assertEquals(data.tasks.length > 0, true);
    
    // Verify task was inserted in database
    const { data: dbTasks } = await supabase
      .from('extracted_tasks')
      .select('*, task_families(code, name), task_categories(code, name), task_subcategories(code, name)')
      .eq('user_id', testUser.userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    assertExists(dbTasks);
    assertEquals(dbTasks.length, 1);
    
    const task = dbTasks[0];
    assertExists(task.title);
    assertExists(task.family_id);
    assertExists(task.category_id);
    assertExists(task.subcategory_id);
    
    // Verify DSC classification is not null
    assertExists(task.task_families);
    assertExists(task.task_categories);
    assertExists(task.task_subcategories);
    
  } finally {
    // Cleanup
    if (testUser) {
      await cleanupTestUser(testUser.userId);
    }
  }
});

Deno.test("Integration: extract-tasks should respect rate limiting", async () => {
  let testUser;
  
  try {
    testUser = await createTestUser();
    
    // Make 11 requests (limit is 10 per minute)
    const requests = [];
    for (let i = 0; i < 11; i++) {
      requests.push(
        fetch(`${SUPABASE_URL}/functions/v1/extract-tasks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testUser.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: `Test task ${i}`,
            contentType: 'text'
          })
        })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // At least one request should be rate limited (429)
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    assertEquals(rateLimitedResponses.length > 0, true);
    
  } finally {
    if (testUser) {
      await cleanupTestUser(testUser.userId);
    }
  }
});

Deno.test("Integration: extract-tasks should validate input length", async () => {
  let testUser;
  
  try {
    testUser = await createTestUser();
    
    // Send content exceeding max length
    const longContent = 'a'.repeat(10001);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: longContent,
        contentType: 'text'
      })
    });
    
    assertEquals(response.status, 400);
    
    const data = await response.json();
    assertExists(data.error);
    assertEquals(data.error.includes('maximum length'), true);
    
  } finally {
    if (testUser) {
      await cleanupTestUser(testUser.userId);
    }
  }
});

Deno.test("Integration: extract-tasks should handle image content type", async () => {
  let testUser;
  
  try {
    testUser = await createTestUser();
    
    // Create a small test image (1x1 red pixel PNG)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: testImageBase64,
        contentType: 'image',
        imageFile: testImageBase64
      })
    });
    
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertExists(data.tasks);
    
  } finally {
    if (testUser) {
      await cleanupTestUser(testUser.userId);
    }
  }
});

console.log('✅ All integration tests configured');
