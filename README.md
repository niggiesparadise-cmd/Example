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

Other scripts: `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`.

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
