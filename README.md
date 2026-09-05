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

The **Overview** page is complete. Every other section is routed, navigable and
backed by its data model, with a placeholder page describing what lands there
next — so navigation, active states and deep links all work while the sections
are filled in one at a time.

| Section | Status |
|---|---|
| Overview | Built |
| Courses, Schedule, Tasks, Exams, Notes, Analytics | Routed, placeholder page |

The Overview page carries a KPI row (study time, work due, streak, term GPA), a
14-day study-activity chart against the daily goal, a hero countdown to the next
assessment, today's timetable, the next tasks due, course progress, recent notes
and a per-course breakdown of the week's study time.

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
