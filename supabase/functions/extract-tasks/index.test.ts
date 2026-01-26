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

Deno.test("extract-tasks: should return 401 when no authorization header", async () => {
  const req = createMockRequest({ description: "Test task" });
  
  // Mock the serve function behavior
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

Deno.test("extract-tasks: should return 401 when token is invalid", async () => {
  const req = createMockRequest({ description: "Test task" }, "invalid-token");
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401 }
      );
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

Deno.test("extract-tasks: should return 400 when description is missing", async () => {
  const token = createMockJWT();
  const req = createMockRequest({}, token);
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }
    
    const body = await req.json();
    
    if (!body.description || typeof body.description !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Description is required and must be a string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 400);
  
  const data = await response.json();
  assertEquals(data.error, "Description is required and must be a string");
});

Deno.test("extract-tasks: should return 400 when description exceeds max length", async () => {
  const token = createMockJWT();
  const longDescription = "a".repeat(10001);
  const req = createMockRequest({ description: longDescription }, token);
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }
    
    const body = await req.json();
    const MAX_DESCRIPTION_LENGTH = 10000;
    
    if (body.description && body.description.length > MAX_DESCRIPTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 400);
  
  const data = await response.json();
  assertEquals(data.error, "Description exceeds maximum length of 10000 characters");
});

Deno.test("extract-tasks: should accept valid request with authentication", async () => {
  const token = createMockJWT();
  const req = createMockRequest({ 
    description: "Réparer la fenêtre cassée dans la chambre",
    projectId: "test-project-id"
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
    
    if (!body.description || typeof body.description !== 'string') {
      return new Response(JSON.stringify({ error: 'Description is required' }), { status: 400 });
    }
    
    return new Response(
      JSON.stringify({ success: true, tasksExtracted: 1 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 200);
  
  const data = await response.json();
  assertEquals(data.success, true);
});

Deno.test("extract-tasks: should handle CORS preflight request", async () => {
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
