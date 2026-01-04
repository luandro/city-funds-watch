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
- Pre-push hook is currently disabled (skips all checks) to accommodate git workflows without upstream branches. Developers should manually run `npm run ci` before pushing to ensure code quality.
- GitHub Actions runs lint and typecheck as separate jobs before the build; deploys to Pages only on `main`.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (examples in history: `feat:`, `fix:`, `refactor:`).
- PRs should include: a clear summary, steps to verify, and screenshots or GIFs for UI changes.
- Link relevant issues or discussions when applicable.
- **After addressing PR review comments**: Add a +1 reaction to acknowledge that feedback has been addressed.
  - Extract comment ID from the URL (e.g., `issuecomment-3691607909` → `3691607909`)
  - Use: `gh api repos/OWNER/REPO/issues/comments/COMMENT_ID/reactions -X POST -f content="+1"`
  - This signals to reviewers that their feedback has been implemented and can be verified.

## Configuration & Architecture Notes
- The landing page uses a state-machine style flow under `src/components/ParticipationNow.tsx` and `src/pages/Index.tsx`.
- Data access is centralized in `src/data/dataService.ts`, which currently serves mock data.
- Source registry data is loaded via `src/data/sourceRegistryService.ts`, with configurable external data source via `src/config/data-source.ts` and `VITE_DATA_SOURCE_URL` environment variable.

## GitHub CLI Reference
- **Add reaction to PR comment**: `gh api repos/OWNER/REPO/issues/comments/COMMENT_ID/reactions -X POST -f content="+1"`
  - Example: `gh api repos/luandro/city-funds-watch/issues/comments/3691607909/reactions -X POST -f content="+1"`
  - Note: Use the comment ID from the URL (issuecomment-XXXXXXXXX) to react to specific review comments
- **View PR comments**: `gh pr view 4 --json comments,reviews`
- **View PR review comments**: `gh pr view 4 --json reviews --jq '.reviews[] | select(.author.login == "bot-name")'`
