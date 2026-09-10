/**
 * Proxies api.zenmode.work/v1/* to the Supabase Edge Function that implements the
 * public API, so users get a zenmode-branded URL and a version prefix we control.
 *
 * The Edge Function routes on `url.pathname` after stripping a leading `/api`
 * (see `supabase/functions/api/index.ts`). Supabase itself strips `/functions/v1`
 * before the function runs, so the upstream path has to be
 * `/functions/v1/api/<route>` for the function to see `/api/<route>`. Forward to
 * anything else and every route 404s.
 */

interface Env {
  SUPABASE_URL: string;
}

const UPSTREAM_PREFIX = '/functions/v1/api';
const VERSION_PREFIX = '/v1';

// Hop-by-hop and Cloudflare-added headers that shouldn't be forwarded upstream.
const STRIPPED_REQUEST_HEADERS = [
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-host',
  'x-forwarded-proto',
];

// Upstream response headers that shouldn't reach API clients. `set-cookie` is the
// important one: Supabase's edge sets a bot-management cookie scoped to
// supabase.co, which a browser-based caller would store for a domain that has
// nothing to do with them. The rest just announce what is behind the proxy.
const STRIPPED_RESPONSE_HEADERS = [
  'set-cookie',
  'sb-gateway-version',
  'sb-project-ref',
  'sb-request-id',
  'x-deno-execution-id',
  'x-sb-edge-region',
  'x-served-by',
  'endpoint-load-metrics',
];

function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return corsPreflight();

    const url = new URL(request.url);

    // Everything the API serves lives under /v1. A bare / gets a pointer to the docs
    // rather than a bare 404 — people paste the base URL into a browser to see what
    // is there.
    if (url.pathname === '/' || url.pathname === '') {
      return Response.redirect('https://zenmode.work/api/', 302);
    }

    if (url.pathname !== VERSION_PREFIX && !url.pathname.startsWith(`${VERSION_PREFIX}/`)) {
      return jsonError(
        'Not found. The zenmode API is served under /v1 — see https://zenmode.work/api/',
        404,
      );
    }

    const route = url.pathname.slice(VERSION_PREFIX.length);
    const upstream = new URL(env.SUPABASE_URL);
    upstream.pathname = `${UPSTREAM_PREFIX}${route}`;
    upstream.search = url.search;

    const headers = new Headers(request.headers);
    for (const name of STRIPPED_REQUEST_HEADERS) headers.delete(name);

    const upstreamResponse = await fetch(upstream.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });

    // Rebuild the response so the body streams through and the headers stay mutable.
    const responseHeaders = new Headers(upstreamResponse.headers);
    for (const name of STRIPPED_RESPONSE_HEADERS) responseHeaders.delete(name);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};
