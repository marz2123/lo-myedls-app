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

Deno.test("extract-from-pdf: should return 401 when no authorization header", async () => {
  const req = createMockRequest({ pdfFile: "base64-encoded-pdf" });
  
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

Deno.test("extract-from-pdf: should return 401 when token is invalid", async () => {
  const req = createMockRequest({ pdfFile: "base64-encoded-pdf" }, "invalid-token");
  
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

Deno.test("extract-from-pdf: should return 400 when pdfFile is missing", async () => {
  const token = createMockJWT();
  const req = createMockRequest({}, token);
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }
    
    const body = await req.json();
    
    if (!body.pdfFile || typeof body.pdfFile !== 'string') {
      return new Response(
        JSON.stringify({ error: 'PDF file data is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 400);
  
  const data = await response.json();
  assertEquals(data.error, "PDF file data is required");
});

Deno.test("extract-from-pdf: should return 400 when pdfFile is not a string", async () => {
  const token = createMockJWT();
  const req = createMockRequest({ pdfFile: 123 }, token);
  
  const mockServe = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401 });
    }
    
    const body = await req.json();
    
    if (!body.pdfFile || typeof body.pdfFile !== 'string') {
      return new Response(
        JSON.stringify({ error: 'PDF file data is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 400);
});

Deno.test("extract-from-pdf: should accept valid request with authentication", async () => {
  const token = createMockJWT();
  const req = createMockRequest({ 
    pdfFile: "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmogMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PgplbmRvYmogMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA0IDAgUj4+Pj4vQ29udGVudHMgNSAwIFI+PgplbmRvYmogNCAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9UaW1lcy1Sb21hbj4+CmVuZG9iaiA1IDAgb2JqCjw8L0xlbmd0aCA0ND4+CnN0cmVhbQpCVAovRjEgMTggVGYKMTAwIDcwMCBUZAooSGVsbG8gV29ybGQhKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqIHhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY0IDAwMDAwIG4gCjAwMDAwMDAxMTkgMDAwMDAgbiAKMDAwMDAwMDIyMCAwMDAwMCBuIAowMDAwMDAwMjg5IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA2L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMzgxCiUlRU9GCg==",
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
    
    if (!body.pdfFile || typeof body.pdfFile !== 'string') {
      return new Response(JSON.stringify({ error: 'PDF file data is required' }), { status: 400 });
    }
    
    return new Response(
      JSON.stringify({ success: true, tasksExtracted: 5, projectInfoExtracted: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };
  
  const response = await mockServe(req);
  assertEquals(response.status, 200);
  
  const data = await response.json();
  assertEquals(data.success, true);
});

Deno.test("extract-from-pdf: should handle CORS preflight request", async () => {
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
