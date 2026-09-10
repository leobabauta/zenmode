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

`wrangler.toml` declares `api.zenmode.work` as a Custom Domain, so the first
deploy creates the DNS record and provisions the TLS certificate. No dashboard
step is needed.

```bash
cd cloudflare/api-proxy
npm install
npx wrangler deploy
```

No secrets. `SUPABASE_URL` is a plain var in `wrangler.toml` — the worker
forwards the caller's `Authorization` header and holds no credentials of its
own.

## Verify

`api.zenmode.work` should resolve to Cloudflare anycast addresses (`104.x` or
`172.67.x`). An empty `dig` result means the custom domain has not finished
provisioning — it usually takes under a minute.

```bash
curl -i -H "Authorization: Bearer zmk_your_key_here" \
  "https://api.zenmode.work/v1/items?dayKey=$(date +%F)"
```
