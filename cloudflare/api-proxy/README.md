# zenmode API proxy

Serves the public API at `https://api.zenmode.work/v1/*`, forwarding to the
`api` Supabase Edge Function.

The Supabase URL (`https://hlyxiyvqmfupyqjgfajj.supabase.co/functions/v1/api/*`)
keeps working, so existing API keys and scripts are unaffected.

## Why a proxy rather than a Supabase custom domain

Supabase's custom domain add-on is a paid per-project feature and keeps the
`/functions/v1/api` path shape. This worker is free, and lets us serve a `/v1`
prefix we control if the response format ever has to change.

## Path mapping

```
api.zenmode.work/v1/items?dayKey=2026-09-09
  → <SUPABASE_URL>/functions/v1/api/items?dayKey=2026-09-09
```

The Edge Function strips a leading `/api` from `url.pathname` to route, and
Supabase strips `/functions/v1` before the function runs — so the upstream path
must be `/functions/v1/api/<route>`.

## Deploy

One-time, before the first deploy: add an `api` record to the `zenmode.work`
zone in the Cloudflare dashboard, proxied (orange cloud). A Workers-only
hostname conventionally uses `AAAA api 100::`. The route in `wrangler.toml`
attaches to it.

```bash
cd cloudflare/api-proxy
npm install
npx wrangler deploy
```

No secrets. `SUPABASE_URL` is a plain var in `wrangler.toml` — the worker
forwards the caller's `Authorization` header and holds no credentials of its
own.

## Verify

```bash
curl -i -H "Authorization: Bearer zmk_your_key_here" \
  "https://api.zenmode.work/v1/items?dayKey=$(date +%F)"
```
