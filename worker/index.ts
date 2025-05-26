interface Env {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Enable CORS for all API routes
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Proxy Google Apps Script API requests
    if (url.pathname.startsWith('/api/google/script/')) {
      const authHeader = request.headers.get('Authorization');
      const accessToken = authHeader?.replace('Bearer ', '');
      
      console.log('Apps Script API request:', {
        method: request.method,
        path: url.pathname,
        hasAuthHeader: !!authHeader,
        tokenLength: accessToken?.length || 0
      });
      
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'No access token provided' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract the Google API path
      const googleApiPath = url.pathname.replace('/api/google/script/', '');
      const googleApiUrl = `https://script.googleapis.com/v1/${googleApiPath}${url.search}`;

      try {
        // Forward the request to Google Apps Script API
        const googleResponse = await fetch(googleApiUrl, {
          method: request.method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: request.method !== 'GET' ? await request.text() : undefined,
        });

        const responseData = await googleResponse.text();
        
        return new Response(responseData, {
          status: googleResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': googleResponse.headers.get('Content-Type') || 'application/json',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to proxy request', details: error }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Proxy Google Drive API requests
    if (url.pathname.startsWith('/api/google/drive/')) {
      const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
      
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'No access token provided' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract the Google API path
      const googleApiPath = url.pathname.replace('/api/google/drive/', '');
      const googleApiUrl = `https://www.googleapis.com/drive/v3/${googleApiPath}${url.search}`;

      try {
        // Forward the request to Google Drive API
        const googleResponse = await fetch(googleApiUrl, {
          method: request.method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: request.method !== 'GET' ? await request.text() : undefined,
        });

        const responseData = await googleResponse.text();
        
        return new Response(responseData, {
          status: googleResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': googleResponse.headers.get('Content-Type') || 'application/json',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to proxy request', details: error }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Default API response
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({
        name: "VibeCoder API",
        version: "1.0.0",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For non-API routes, let the static assets handler take over
    // This will serve the React app and handle client-side routing
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
