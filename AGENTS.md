# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds all application code. Entry points are `src/main.tsx` and `src/App.tsx`.
- Feature UI is in `src/components/` and route-level views in `src/pages/` (e.g., `src/pages/Index.tsx`).
- Shared logic is split into `src/hooks/`, `src/utils/`, and `src/lib/`.
- Mocked data and types are in `src/data/` (see `src/data/mockData.ts` and `src/data/types.ts`).
- Static assets live in `public/`. Build output is in `dist/` (do not edit by hand).

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts Vite with hot reload.
- `npm run build` produces a build in `dist/`.
- `npm run build:dev` builds with development mode.
- `npm run ci` runs lint, typecheck, and build (CI/hooks).
- `npm run preview` serves the production build locally.
- `npm run lint` runs ESLint (`eslint.config.js`) across the repo.
- `npm run lint-staged` lints staged JS/TS files (pre-commit).
- `npm run typecheck` runs `tsc --noEmit` against `tsconfig.app.json`.

## Coding Style & Naming Conventions
- Language: TypeScript + React (Vite). Styling uses Tailwind CSS (`tailwind.config.ts`).
- Formatting: 2-space indent, double quotes, semicolons.
- Prefer module path aliases using `@/` (configured in `tsconfig.json`).
- Component and hook files use PascalCase and `useX` naming (e.g., `src/components/ParticipationNow.tsx`, `src/hooks/useUserPreferences.ts`).

## Testing Guidelines
- No automated test runner is configured yet (no `*.test.tsx` or `vitest` deps).
- If you introduce tests, keep them close to source files (e.g., `src/components/__tests__/`) and add scripts to `package.json`.

## Git Hooks & CI Checks
- Pre-commit hooks are managed by Husky (`.husky/pre-commit`). Run `npm install` to install hooks via the `prepare` script.
- Pre-commit runs staged-file linting plus a full TypeScript typecheck to keep commits clean.
- Pre-push runs `npm run ci`, but skips the build step for docs/config-only changes (e.g., `*.md`, `docs/`, `README*`, `.github/`).
- GitHub Actions runs lint and typecheck as separate jobs before the build; deploys to Pages only on `main`.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (examples in history: `feat:`, `fix:`, `refactor:`).
- PRs should include: a clear summary, steps to verify, and screenshots or GIFs for UI changes.
- Link relevant issues or discussions when applicable.

## Configuration & Architecture Notes
- The landing page uses a state-machine style flow under `src/components/ParticipationNow.tsx` and `src/pages/Index.tsx`.
- Data access is centralized in `src/data/dataService.ts`, which currently serves mock data.

## GitHub CLI Reference
- **Add reaction to PR**: `gh api -X POST repos/OWNER/REPO/issues/PR_NUMBER/reactions -f content="+1"`
  - Example: `gh api -X POST repos/luandro/city-funds-watch/issues/4/reactions -f content="+1"`
  - Note: React to the PR itself (issues/4), not individual comments, as comment reactions may not be accessible via API
- **View PR comments**: `gh pr view 4 --json comments,reviews`
- **Fetch specific comment**: `gh api repos/OWNER/REPO/issues/COMMENT_ID` (may return 404 if comment is from a bot or deleted)
