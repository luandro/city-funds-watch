# Add tests to CI workflow

## Goal
Ensure Vitest runs in GitHub Actions so PRs catch test regressions.

## Why this matters
The PR introduced a full test suite but CI currently only runs lint + typecheck. Tests should be a required gate before build.

## Where
- `.github/workflows/deploy.yml`

## Required change
Add a dedicated `test` job or include `npm run test` in existing workflow. Prefer a separate job that runs in parallel with lint/typecheck and is required by `build`.

## Acceptance criteria
- CI runs `npm run test` on PRs.
- `build` depends on lint + typecheck + test.

## Suggested verification
- Validate workflow YAML locally and confirm expected job dependencies.
