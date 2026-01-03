# BH Transparente (City Funds Watch)

Prototype civic transparency portal for Belo Horizonte. The app prioritizes public participation by surfacing live and upcoming hearings, then layers in a personalized civic feed and budget context.

Status: Prototype. Uses mocked data by default; external registry data can be configured.

## Table of contents
- Overview
- Features
- Getting started
- Scripts
- Configuration
- Data & services
- Landing page flow
- Project structure
- Testing
- Contributing

## Overview
BH Transparente helps residents track what is happening in their city today:
- Participation-first landing page with a state-driven hearing experience
- Personalized feed by neighborhood and topics
- Budget highlights tied to followed topics
- Curated source registry linking to official portals

## Features
- Live/next hearing states with agenda, transcript, and Q&A
- Reddit-style questions panel with voting and optimistic UI
- "Make it yours" personalization (neighborhood + topics) stored locally
- Civic feed grouped by "happening now", "delayed/at risk", and "changed this week"
- Money summary cards scoped to followed topics
- Safety measures: URL validation and localStorage schema validation

## Getting started
Prerequisites: Node.js and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Scripts
- `npm run dev` - start Vite dev server
- `npm run build` - production build to `dist/`
- `npm run build:dev` - development-mode build
- `npm run preview` - preview the production build locally
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
- `npm run test` - run Vitest in CLI mode
- `npm run test:ui` - run Vitest UI
- `npm run test:coverage` - run coverage report
- `npm run ci` - lint, typecheck, test, and build

## Configuration
External data source registry can be configured via environment variable:

- `VITE_DATA_SOURCE_URL` - URL to the registry JSON. If not set, the app falls back to
  `public/BH-dados-publicos.json`.

## Data & services
- `src/data/dataService.ts` - single entry point for data access (currently mock-backed).
- `src/data/sourceRegistryService.ts` - loads and parses the source registry.
- `src/data/mockData.ts` - mocked data for hearings, feed, questions, and money summaries.
- `src/data/types.ts` - shared data contracts.

## Landing page flow
The landing page is a simple state machine with four mutually exclusive modes:

| Mode | Trigger | UI Display |
|------|---------|------------|
| LIVE NOW | `liveSession.isLive === true` | Live badge, watch button, tabbed panel |
| NEXT HEARING | Scheduled hearing exists | Hearing card with countdown and CTAs |
| NO HEARINGS | No hearings found | Fallback message with official calendar link |
| ERROR | Data fetch fails | Error message with retry and cached data |

Section hierarchy:
1. Participar Agora (Participation Now)
2. Personalize (Make It Yours)
3. Seu Feed Cívico (Your Civic Feed)
4. Dinheiro, resumido (Money, briefly)

## Project structure
- `src/` application code
- `src/main.tsx` and `src/App.tsx` entry points
- `src/components/` shared UI components
- `src/pages/` route-level views
- `src/hooks/`, `src/utils/`, `src/lib/` shared logic
- `src/data/` mocked data and types
- `public/` static assets
- `dist/` build output (do not edit)

## Testing
Vitest is configured for unit and component tests:

```sh
npm run test
```

## Contributing
- Run `npm run lint`, `npm run typecheck`, and `npm run test` before opening a PR.
- Keep changes scoped and add screenshots for UI updates when applicable.
- Follow Conventional Commits for messages (e.g., `feat:`, `fix:`).
