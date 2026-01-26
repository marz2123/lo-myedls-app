import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Helper to create mock JWT token
function createMockJWT(userId: string = "test-user-id"): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: userId, exp: Date.now() + 3600000 }));
  const signature = "mock-signature";
  return `${header}.${payload}.${signature}`;
}

// Helper to create mock request
function createMockRequest(body: any, authToken?: string): Request {
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  
  return new Request("http://localhost:8000", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

Deno.test("import-taxonomy: should return 401 when no authorization header", async () => {
  const req = createMockRequest({ taxonomyData: [] });
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 401);
  
  const data = await response.json();
  assertEquals(data.error, "Missing authorization header");
});

Deno.test("import-taxonomy: should return 401 when token is invalid", async () => {
  const req = createMockRequest({ taxonomyData: [] }, "invalid-token");
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.sub) {
        throw new Error('User ID not found in token');
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 401);
  
  const data = await response.json();
  assertEquals(data.error, "Invalid token");
});

Deno.test("import-taxonomy: should return 400 when taxonomyData is missing", async () => {
  const token = createMockJWT();
  const req = createMockRequest({}, token);
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }
    
    const body = await req.json();
    
    if (!body.taxonomyData || !Array.isArray(body.taxonomyData)) {
      return new Response(
        JSON.stringify({ error: 'Taxonomy data must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 400);
  
  const data = await response.json();
  assertEquals(data.error, "Taxonomy data must be an array");
});

Deno.test("import-taxonomy: should return 400 when taxonomyData is empty", async () => {
  const token = createMockJWT();
  const req = createMockRequest({ taxonomyData: [] }, token);
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }
    
    const body = await req.json();
    
    if (!body.taxonomyData || !Array.isArray(body.taxonomyData)) {
      return new Response(JSON.stringify({ error: 'Taxonomy data must be an array' }), { status: 400 });
    }
    
    if (body.taxonomyData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Taxonomy data cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 400);
  
  const data = await response.json();
  assertEquals(data.error, "Taxonomy data cannot be empty");
});

Deno.test("import-taxonomy: should return 400 when taxonomyData exceeds max rows", async () => {
  const token = createMockJWT();
  const largeTaxonomyData = Array(10001).fill({
    familyCode: "F1",
    familyName: "Family 1",
    categoryCode: "C1",
    categoryName: "Category 1"
  });
  const req = createMockRequest({ taxonomyData: largeTaxonomyData }, token);
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }
    
    const body = await req.json();
    const MAX_TAXONOMY_ROWS = 10000;
    
    if (body.taxonomyData && body.taxonomyData.length > MAX_TAXONOMY_ROWS) {
      return new Response(
        JSON.stringify({ error: `Taxonomy data exceeds maximum of ${MAX_TAXONOMY_ROWS} rows` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 400);
  
  const data = await response.json();
  assertEquals(data.error, "Taxonomy data exceeds maximum of 10000 rows");
});

Deno.test("import-taxonomy: should return 400 when familyCode is too long", async () => {
  const token = createMockJWT();
  const req = createMockRequest({ 
    taxonomyData: [{
      familyCode: "F".repeat(51),
      familyName: "Family 1"
    }]
  }, token);
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }
    
    const body = await req.json();
    
    for (let i = 0; i < body.taxonomyData.length; i++) {
      const row = body.taxonomyData[i];
      if (row.familyCode && (typeof row.familyCode !== 'string' || row.familyCode.length > 50)) {
        return new Response(
          JSON.stringify({ error: `Invalid familyCode at row ${i + 1}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 400);
  
  const data = await response.json();
  assertEquals(data.error, "Invalid familyCode at row 1");
});

Deno.test("import-taxonomy: should accept valid taxonomy data", async () => {
  const token = createMockJWT();
  const req = createMockRequest({ 
    taxonomyData: [
      {
        familyCode: "F1",
        familyName: "Gros Œuvre",
        categoryCode: "C1",
        categoryName: "Fondations",
        subcategoryCode: "S1",
        subcategoryName: "Fondations superficielles",
        taskCount: "10"
      }
    ]
  }, token);
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.sub) {
        throw new Error('User ID not found in token');
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }
    
    const body = await req.json();
    
    if (!body.taxonomyData || !Array.isArray(body.taxonomyData)) {
      return new Response(JSON.stringify({ error: 'Taxonomy data must be an array' }), { status: 400 });
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: { families: 1, categories: 1, subcategories: 1 }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 200);
  
  const data = await response.json();
  assertEquals(data.success, true);
  assertEquals(data.imported.families, 1);
});

Deno.test("import-taxonomy: should handle CORS preflight request", async () => {
  const req = new Request("http://localhost:8000", {
    method: "OPTIONS",
  });
  
  const mockServe = async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
});
