import { exchangeCodeForTokens } from './auth';

export interface Env {
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	// Add other environment variables or bindings here if needed
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/auth/google/callback') {
			const code = url.searchParams.get('code');

			if (code) {
				try {
					const tokens = await exchangeCodeForTokens(code, env, request);
					// IMPORTANT: In a real application, store the refresh_token securely.
					// For this example, we're logging it (not recommended for production).
					console.log('Refresh Token:', tokens.refresh_token);

					// Redirect back to your frontend application
					// Pass access_token and expires_in via URL fragment (hash)
					// The frontend can then parse these and store them (e.g., in localStorage)
					const frontendUrl = new URL(url.origin); // Or your specific frontend URL
					frontendUrl.pathname = '/'; // Or the specific path you want to redirect to
					frontendUrl.hash = `access_token=${tokens.access_token}&expires_in=${tokens.expires_in}&id_token=${tokens.id_token}`;
					
					return Response.redirect(frontendUrl.toString(), 302);
				} catch (error) {
					console.error('Error exchanging code for tokens:', error);
					return new Response(`Authentication failed: ${error.message}`, { status: 500 });
				}
			} else {
				const error = url.searchParams.get('error');
				if (error) {
					return new Response(`Authentication error: ${error}`, { status: 400 });
				}
				return new Response('Missing authorization code.', { status: 400 });
			}
		}

		if (request.method === 'POST' && url.pathname === '/api/appscript/create') {
			return handleCreateAppScript(request, env);
		}

		if (request.method === 'POST' && url.pathname === '/api/appscript/publish') {
			return handlePublishAppScript(request, env);
		}

		if (url.pathname.startsWith('/api/')) {
			// Example API route
			return Response.json({
				message: 'Hello from the API!',
				// You can access environment variables here if needed for other API routes
				// For example: clientIdAvailable: !!env.GOOGLE_CLIENT_ID
			});
		}

		// For any other path, return 404 or serve your SPA's index.html if configured
		// If you have 'assets' configured in wrangler.jsonc for SPA not_found_handling,
		// you might not need a specific 404 response here for unmatched paths.
		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;

async function handleCreateAppScript(request: Request, env: Env) {
	try {
		const body = await request.json<{ scriptContent?: string; accessToken?: string; fileName?: string }>();
		const { scriptContent, accessToken, fileName } = body;

		if (!scriptContent || !accessToken) {
			return new Response(JSON.stringify({ success: false, error: 'Missing scriptContent or accessToken' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const actualFileName = fileName || 'GeneratedVibeCoderScript.gs';

		// Step 1: Create file metadata
		const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: actualFileName,
				mimeType: 'application/vnd.google-apps.script',
			}),
		});

		if (!metadataResponse.ok) {
			const errorData = await metadataResponse.text();
			console.error('Google Drive API Error (metadata):', errorData);
			let responseBody: { success: boolean; error: string; details?: string; needsReAuth?: boolean } = {
				success: false,
				error: `Failed to create script metadata. Status: ${metadataResponse.status}.`,
				details: errorData,
			};
			if (metadataResponse.status === 401) {
				responseBody = {
					success: false,
					error: 'Google API token expired. Please log in again.',
					details: errorData,
					needsReAuth: true,
				};
			}
			return new Response(JSON.stringify(responseBody), {
				status: metadataResponse.status,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const file = (await metadataResponse.json()) as { id: string; name: string; webViewLink: string };

		// Step 2: Upload file content
		const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/vnd.google-apps.script', // MIME type of the content being uploaded
			},
			body: scriptContent, // Raw script content
		});

		if (!uploadResponse.ok) {
			const errorData = await uploadResponse.text();
			console.error('Google Drive API Error (upload):', errorData);
			// Optional: Attempt to delete the empty file metadata created in step 1
			// await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${accessToken}` } });
			let responseBody: { success: boolean; error: string; details?: string; needsReAuth?: boolean } = {
				success: false,
				error: `Failed to upload script content. Status: ${uploadResponse.status}.`,
				details: errorData,
			};
			if (uploadResponse.status === 401) {
				responseBody = {
					success: false,
					error: 'Google API token expired. Please log in again.',
					details: errorData,
					needsReAuth: true,
				};
			}
			return new Response(JSON.stringify(responseBody), {
				status: uploadResponse.status,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const updatedFile = (await uploadResponse.json()) as { id: string; name: string; webViewLink: string };

		return new Response(
			JSON.stringify({
				success: true,
				fileId: updatedFile.id,
				webViewLink: updatedFile.webViewLink,
				name: updatedFile.name,
				scriptId: updatedFile.id, // For Apps Scripts created this way, fileId is usually the scriptId
			}),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		console.error('Error in /api/appscript/create:', e.message, e.stack);
		return new Response(JSON.stringify({ success: false, error: 'Internal server error: ' + e.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

async function handlePublishAppScript(request: Request, env: Env) {
	try {
		const body = await request.json<{ scriptId?: string; accessToken?: string; description?: string }>();
		const { scriptId, accessToken, description } = body;

		if (!scriptId || !accessToken) {
			return new Response(JSON.stringify({ success: false, error: 'Missing scriptId or accessToken' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const versionDescription = description || 'Published via VibeCoder';

		// Step 1: Create a Version
		const versionResponse = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/versions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ description: versionDescription }),
		});

		if (!versionResponse.ok) {
			const errorText = await versionResponse.text(); // Get raw text first
			let errorData;
			try {
				errorData = JSON.parse(errorText); // Try to parse as JSON
			} catch (e) {
				errorData = errorText; // If not JSON, use the raw text
			}
			console.error('Apps Script API Error (versions):', errorData);
			let errorMsg = `Failed to create script version. Status: ${versionResponse.status}.`;
			if (typeof errorData === 'object' && errorData?.error?.message) {
				errorMsg += ` Details: ${errorData.error.message}`;
			} else if (typeof errorData === 'string') {
				errorMsg += ` Details: ${errorData}`;
			}

			let responseBody: { success: boolean; error: string; details?: any; needsReAuth?: boolean } = {
				success: false,
				error: errorMsg,
				details: errorData,
			};

			if (versionResponse.status === 401) {
				responseBody = {
					success: false,
					error: 'Google API token expired. Please log in again.',
					details: errorData,
					needsReAuth: true,
				};
			}
			return new Response(JSON.stringify(responseBody), {
				status: versionResponse.status,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const versionData = (await versionResponse.json()) as { versionNumber: number };

		// Step 2: Create a Deployment
		const deploymentResponse = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/deployments`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				versionNumber: versionData.versionNumber,
				description: versionDescription, // Using the same description for deployment
			}),
		});

		if (!deploymentResponse.ok) {
			const errorText = await deploymentResponse.text(); // Get raw text first
			let errorData;
			try {
				errorData = JSON.parse(errorText); // Try to parse as JSON
			} catch (e) {
				errorData = errorText; // If not JSON, use the raw text
			}
			console.error('Apps Script API Error (deployments):', errorData);
			let errorMsg = `Failed to deploy script. Status: ${deploymentResponse.status}.`;
			if (typeof errorData === 'object' && errorData?.error?.message) {
				errorMsg += ` Details: ${errorData.error.message}`;
			} else if (typeof errorData === 'string') {
				errorMsg += ` Details: ${errorData}`;
			}
			
			let responseBody: { success: boolean; error: string; details?: any; needsReAuth?: boolean } = {
				success: false,
				error: errorMsg,
				details: errorData,
			};

			if (deploymentResponse.status === 401) {
				responseBody = {
					success: false,
					error: 'Google API token expired. Please log in again.',
					details: errorData,
					needsReAuth: true,
				};
			}
			return new Response(JSON.stringify(responseBody), {
				status: deploymentResponse.status,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const deploymentData = (await deploymentResponse.json()) as {
			deploymentId: string;
			entryPoints?: Array<{ entryPointType: string; webApp?: { url: string } }>;
		};

		let deploymentUrl = null;
		if (deploymentData.entryPoints) {
			const webAppEntryPoint = deploymentData.entryPoints.find((ep) => ep.entryPointType === 'WEB_APP' && ep.webApp);
			if (webAppEntryPoint && webAppEntryPoint.webApp) {
				deploymentUrl = webAppEntryPoint.webApp.url;
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				deploymentId: deploymentData.deploymentId,
				versionNumber: versionData.versionNumber,
				deploymentUrl: deploymentUrl,
			}),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e: any) {
		console.error('Error in /api/appscript/publish:', e.message, e.stack);
		return new Response(JSON.stringify({ success: false, error: 'Internal server error: ' + e.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
