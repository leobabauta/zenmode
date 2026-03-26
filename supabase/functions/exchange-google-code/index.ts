import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Exchange a Google OAuth authorization code (from native mobile sign-in)
 * for access + refresh tokens. Stores the refresh token in user_preferences
 * so the existing refresh-google-token function can renew it silently.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  // Verify the user's JWT
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Parse the auth code from the request body
  let code: string;
  try {
    const body = await req.json();
    code = body.code;
    if (!code) throw new Error('Missing code');
  } catch {
    return new Response(JSON.stringify({ error: 'Missing or invalid "code" in request body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Exchange the authorization code for tokens with Google
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('Google token exchange failed:', err);
      return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenResponse.json();

    // Store the refresh token in user_preferences (same as web flow)
    if (tokenData.refresh_token) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({ google_refresh_token: tokenData.refresh_token })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to store Google refresh token:', updateError);
      }
    }

    return new Response(JSON.stringify({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      has_refresh_token: !!tokenData.refresh_token,
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Token exchange error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
