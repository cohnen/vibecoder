interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string; // Refresh token is not always returned
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string; // If 'openid' scope was requested
}

export async function exchangeCodeForTokens(
  code: string,
  env: { GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string },
  request: Request // Pass the original request to construct redirect_uri dynamically
): Promise<GoogleTokenResponse> {
  const redirectUri = new URL(request.url).origin + '/auth/google/callback';

  const params = new URLSearchParams();
  params.append('client_id', env.GOOGLE_CLIENT_ID);
  params.append('client_secret', env.GOOGLE_CLIENT_SECRET);
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', redirectUri);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to exchange code for tokens: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const tokens: GoogleTokenResponse = await response.json();
  return tokens;
}
