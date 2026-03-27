# zenmode

A calm, intentional task planner with web, mobile (iOS/Android), and desktop (macOS/Windows) apps.

## Architecture

- **Web:** Vite + React + TypeScript + Zustand + Tailwind. Entry: `src/App.tsx`. State-based routing via `usePlannerStore.view`.
- **Mobile:** React Native + Expo. Entry: `mobile/App.tsx`. Own Zustand store at `mobile/src/store/usePlannerStore.ts`.
- **Desktop:** Tauri v2 (Rust). Entry: `desktop-tauri/src-tauri/src/lib.rs`. Wraps the web app build.
- **Shared:** `shared/` directory for sync logic, types, dates, Supabase client — used by web and mobile.
- **Backend:** Supabase (auth, database, Edge Functions). Edge Functions in `supabase/functions/`.
- **Static pages:** `public/` directory — standalone HTML (about, privacy, downloads, testers, etc.)

## Development

```bash
npm run dev          # Web dev server (localhost:5173)
cd mobile && npx expo start   # Mobile dev
cd desktop-tauri && npm run tauri dev  # Desktop dev
```

## Build & Deploy

- **Web:** Push to `main` → GitHub Pages auto-deploy
- **Mobile:** `cd mobile && npx eas build --platform [android|ios] --profile production --non-interactive`
  - Bump `versionCode` (Android) / `buildNumber` (iOS) in `mobile/app.json` before each build
  - iOS submit: `npx eas submit --platform ios --latest --non-interactive`
- **Desktop:** Tag `desktop-v*` → CI builds macOS + Windows, creates GitHub Release with updater artifacts
  - Bump version in `desktop-tauri/src-tauri/tauri.conf.json` before tagging
  - Update download links in `public/downloads/index.html`
- **Edge Functions:** `npx supabase functions deploy <function-name>`

## Key Conventions

- Sync uses timestamp-based merge with "completed wins" rule (see `shared/lib/sync.ts`)
- PWA service worker: add new static page paths to `navigateFallbackDenylist` in `vite.config.ts`
- Desktop overlay title bar: add top padding for interactive elements near the top of views
- Supabase anon key format is `sb_publishable_...` (not JWT)
- Static HTML pages need manual favicon links: `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`

## Type Checking

```bash
npx tsc --noEmit                    # Web
cd mobile && npx tsc --noEmit       # Mobile
```
