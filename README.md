# Semester — personal study dashboard

A study management dashboard for a university term: courses, timetable, tasks,
exams, notes and study analytics, in one modern academic interface.

Built with **Next.js 16** (App Router), **TypeScript**, **HeroUI v3**,
**Tailwind CSS v4**, **Lucide** icons and **Recharts**.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`.

**Set up the database first** — the app needs a Supabase project to run at all.
See [Database setup](#database-setup).

## Deploying

The app is configured for **static export** — `npm run build` writes a plain
static site to `out/`, no Node server required:

```bash
npm run build      # -> out/
npm run preview    # serve out/ locally to check it
```

Every route prerenders (there are no server actions, route handlers or dynamic
rendering), so `out/` is the whole app as HTML, CSS and JS. Upload it to any
static host — Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3, or a plain
web server:

| Host | What to give it |
|---|---|
| Netlify / Cloudflare Pages | build `npm run build`, publish directory `out` |
| Vercel | detected automatically |
| GitHub Pages | push `out/` to the Pages branch (see `basePath` below) |
| S3 / nginx / Apache | copy `out/` to the document root |

`trailingSlash` is on, so routes are written as `courses/index.html` rather than
`courses.html` — directory indexes are the one URL shape every static host
serves correctly.

**Serving from a subdirectory** (a GitHub Pages project site, say) needs a
`basePath` in `next.config.ts`:

```ts
basePath: "/study-dashboard",
```

## What's built

Every section is functional and backed by Supabase. Nothing in the UI is mock
data.

| Section | What it does |
|---|---|
| Overview | Today's schedule, upcoming tasks, next exam, course progress, recent notes, weekly study time — all from your rows, with empty states when there are none |
| Courses | Full CRUD, plus a topic checklist that *derives* course progress |
| Tasks | Full CRUD, complete/incomplete, due date, priority, course link, filters |
| Exams | Full CRUD, countdown, weighting, revision progress, topics |
| Notes | Full CRUD plus full-text search running in Postgres |
| Schedule | Full CRUD on a navigable week view |
| Study sessions | Start/stop timer whose state lives in the database, so it survives a restart |
| Analytics | Total and weekly hours, hours by course, completion rate, streak, activity over time — computed from real sessions |
| Auth | Sign up, sign in, sign out, session persistence, protected routes, password reset, profile |

## Android app

The same web build is packaged as an Android app with Capacitor — no second
codebase, no React Native, no rewritten components. The APK ships the Next.js
static export in its assets and renders it in a WebView, so the UI is the UI.

```bash
npm run android:sync    # next build + cap sync android
npm run android:apk     # the above, then ./gradlew assembleDebug
npm run android:open    # open the project in Android Studio
```

Requires a JDK (17+) and the Android SDK. `android/local.properties` must point
at the SDK, or `ANDROID_HOME` must be set:

```
sdk.dir=/path/to/Android/sdk
```

The debug APK lands at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install it over USB with `adb install -r <path>`, or copy the file to the phone
and open it (Android will ask you to allow installs from that source).

| Setting | Value |
|---|---|
| App name | Study Dashboard |
| Package ID | `com.studydashboard.app` |
| Orientation | Portrait |
| Min / target SDK | 24 / 36 |
| Permissions | None |

### How it behaves natively

- **Offline by construction.** The demo data is compiled into the JavaScript
  bundle and the fonts are self-hosted, so the app makes no network requests at
  all — the `INTERNET` permission the Capacitor template ships with has been
  removed.
- **Status bar and safe areas.** The WebView draws edge to edge
  (`viewport-fit=cover`); the top bar, sidebar and bottom bar pad themselves out
  of `env(safe-area-inset-*)`. Status bar icons follow the in-app theme toggle,
  set at runtime from `NativeShell` rather than baked into the Android theme,
  because the in-app choice can differ from the system setting.
- **Splash screen.** `launchAutoHide` is off and the web layer calls
  `SplashScreen.hide()` after its first paint, so there is no white flash while
  the WebView boots. The splash background follows light/dark via `values-night`.
- **Back button.** Handled in `MainActivity` so it walks back through the
  dashboard's history and exits only from the home screen.

### Android limitations

- **A WebView reload returns to Overview.** Capacitor's asset server serves the
  root `index.html` for any path without a file extension, so `/courses/` cannot
  resolve to `courses/index.html`. Setting `server.html5mode: false` is worse —
  extensionless paths then match no handler and the WebView shows an error page.
  In practice this costs nothing: the app cold-starts at `/` and every in-app
  link is a client-side App Router transition, so all seven sections work
  normally. Only an explicit reload (or a low-memory restore) lands back on
  Overview, which is how a phone app is expected to restart.
- **Debug builds only.** No signing config is set up, so `assembleDebug`
  produces a debug-signed APK. A Play Store build needs a keystore and
  `assembleRelease`.
- **Demo data is read-only.** Ticking a task is local component state, as on the
  web; nothing persists across launches.

## Database setup

The app stores everything in Supabase (Postgres + Auth). It needs a project
before it will run.

### 1. Create a project

Create one at [supabase.com](https://supabase.com), then open
**Settings → API** and copy the **Project URL** and the **anon / publishable**
key.

> The **service_role** key must never be used here. It bypasses Row Level
> Security, and anything in this app's environment is inlined into the client
> bundle — including the bundle inside the APK.

### 2. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Where it comes from | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon key | Public; protected by RLS |

Both are read at **build time**, not runtime. Changing them means rebuilding.
A build without them still succeeds — the app then shows a configuration screen
instead of a login form, rather than failing silently.

### 3. Run the migrations

Paste each file in `supabase/migrations/` into the project's **SQL Editor**, in
order:

| File | What it does |
|---|---|
| `0001_initial_schema.sql` | 9 tables, enums, constraints, generated columns, indexes |
| `0002_rls_policies.sql` | Row Level Security on every table |
| `0003_triggers.sql` | `updated_at`, auto-profile on signup, task completion sync |
| `0004_grants.sql` | Grants for `authenticated`; revokes everything from `anon` |

With the Supabase CLI instead: `supabase db push`.

### 4. Authentication settings

In **Authentication → Providers**, Email is enabled by default. Two things worth
setting deliberately:

- **Confirm email** — on by default. Sign-up then shows a "check your inbox"
  screen instead of signing straight in. Turn it off for quicker local testing.
- **Redirect URLs** (Authentication → URL Configuration) — add the origins you
  will use, or password-reset links will refuse to complete:
  `http://localhost:3000`, your deployed origin, and `https://localhost` for the
  Android app.

## Data architecture

```
src/
  lib/supabase/       client, typed schema, env validation
  features/
    auth/             session provider, route guard, validation
    courses/  tasks/  exams/  notes/  schedule/  study-sessions/
                      one api.ts (data access) + form dialog each
    analytics/        figures derived from real rows
    overview/         the dashboard's combined query
    profile/  seed/   profile, and the demo-data utility
    shared/           useQuery / useMutation, badge counts, error mapping
  components/         unchanged HeroUI presentation layer
```

**Components never touch Supabase.** They call a feature's `api.ts` through
`useQuery` / `useMutation`, which own loading, error, empty and success states.
Swapping the backend means rewriting `features/*/api.ts` and nothing else.

### Row Level Security

Every table carries `user_id` (profiles use `id`) and has four policies —
select, insert, update, delete — all keyed on `auth.uid()`. `FORCE ROW LEVEL
SECURITY` is on, so the table owner is not exempt either.

This was verified against a real Postgres instance with two users. Reads,
updates and deletes across users all return zero rows; inserting a row owned by
another user raises `new row violates row-level security policy`; the anonymous
role is denied at the grant level before RLS is even consulted.

Security does **not** depend on the client: the static bundle is public by
design, so the database is the only place authorisation is enforced.

## Android build requirements

The Android app is the same web build in a WebView, so it inherits the setup
above, plus:

- **`INTERNET` permission** — declared in `AndroidManifest.xml`. The app was
  offline-only when it rendered demo data; with a real backend it cannot work
  without the network.
- **Credentials at build time** — `npm run android:sync` runs `next build`, so
  `.env.local` must exist locally. In CI, set `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` as **repository variables** (Settings →
  Secrets and variables → Actions → Variables). They are publishable values, so
  variables rather than secrets is correct.
- **Password-reset links open the phone browser**, not the app — the WebView
  origin is `https://localhost`, which an email link cannot target. The reset
  completes in the browser and the user returns to the app to sign in. An
  in-app flow would need Android App Links plus `@capacitor/app` URL handling.

## Demo data

Settings → **Load demo data** writes a sample term (5 courses with topics, 13
tasks, 4 exams, 6 notes, 4 weeks of timetable, 30 days of study sessions) into
your account through the normal API, so it exercises the same write path and RLS
policies as the UI. **Clear my data** removes everything you own.

Nothing in the production UI is mocked: every screen renders your rows, and an
account with no data shows empty states rather than placeholder figures.

## Architecture

```
src/
  app/                    routes — one folder per section, plus the root layout
  components/
    layout/               app shell: sidebar, top bar, mobile bottom navigation
    ui/                   shared primitives (section card, stat card, chips…)
    charts/               Recharts wrappers and their shared frame and tooltip
    overview/             the Overview page's sections, one file each
  config/                 navigation and site metadata
  data/                   the data layer — mock records plus query functions
  hooks/                  client hooks (chart palette)
  lib/                    date, number and colour helpers
  types/                  the domain model
```

**The data layer is the seam.** Components import from `@/data` only, never from
an individual mock file, so replacing the mock records with API calls means
changing that folder alone. Every record is plain serialisable data.

**Dates are fixed and computed in UTC.** `src/lib/date.ts` exports a `TODAY`
constant that anchors the demo dataset to a point in the Autumn 2026 term, so
the UI is deterministic; swap it for `new Date()` when real data is wired up.
Date maths runs in UTC so the server and the browser never disagree across
midnight and break hydration.

## Layout

Navigation adapts at three sizes, all from CSS so nothing shifts on hydration:

- **Mobile** — a bottom bar with four sections plus a “More” drawer holding the
  rest.
- **Tablet** (`md`) — an 88px icon rail with labels under the icons.
- **Desktop** (`lg`) — the full 264px labelled sidebar with term progress.

## Theming

Dark mode runs through `next-themes`, writing both the `dark` class and
`data-theme` — the two selectors HeroUI's theme responds to — with light, dark
and system options in the top bar. HeroUI's design tokens carry the UI colours;
`src/app/globals.css` adds only what the app needs on top: the fonts, the course
palette and the delta colours.

## Components

HeroUI v3 supplies the components — cards, chips, buttons, progress bars,
checkboxes, menus, drawers, tooltips, disclosures, search fields, avatars,
badges, skeletons and empty states. Nothing that HeroUI already ships is
reimplemented; the components in `src/components/ui` compose HeroUI parts into
the dashboard's own patterns.

## Charts

The chart palette in `src/lib/chart-palette.ts` mirrors the CSS custom
properties in `globals.css`, because Recharts needs real colour values rather
than `var()` references. It is five categorical slots, validated for
colour-vision deficiency against the surfaces they actually render on:

| | worst adjacent CVD ΔE | worst adjacent normal-vision ΔE |
|---|---|---|
| light (on `#ffffff`) | 9.1 | 19.6 |
| dark (on `#18181b`) | 8.4 | 19.3 |

Both clear the ΔE ≥ 8 and ≥ 15 gates. Three light-mode slots sit below 3:1
contrast against the card, so charts using them carry visible value labels and
repeat the same figures in a table — colour is never load-bearing.

A course's slot follows the course, never its rank in a sorted list, so
filtering or re-sorting never repaints the survivors. The per-course bar chart
deliberately draws in slot order rather than by size: ranking by hours would
seat yellow next to orange, a pair that fails both gates in dark mode.

## Accessibility

HeroUI sits on React Aria, so focus management, keyboard interaction and screen
reader semantics come from the components. On top of that: a skip link, visible
focus rings on every custom control, `aria-current` on the active navigation
item, labelled progress bars and charts, status meaning always doubled by text
or an icon rather than carried by colour alone, and a `prefers-reduced-motion`
rule that drops animation.
