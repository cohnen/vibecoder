// Utility functions to call Google APIs through our worker proxy

const WORKER_URL = import.meta.env.DEV 
  ? 'http://localhost:8787' 
  : ''; // In production, use same origin

export async function callGoogleScriptAPI(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${WORKER_URL}/api/google/script/${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function callGoogleDriveAPI(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${WORKER_URL}/api/google/drive/${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
} 