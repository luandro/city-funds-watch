# Resolve unused FORCE_EXTERNAL_SOURCE config

## Goal
Eliminate dead configuration or wire it into the data source logic.

## Why this matters
Unused config adds confusion for developers and can mislead deploy docs.

## Where
- `src/config/data-source.ts`
- `.env.example`
- Any documentation referencing `VITE_FORCE_EXTERNAL_SOURCE`

## Required change
Pick **one** of the following:
1) **Use it**: If `VITE_FORCE_EXTERNAL_SOURCE=true`, force `DATA_SOURCE_URL` to use the external URL and ignore the local fallback.
2) **Remove it**: Delete `FORCE_EXTERNAL_SOURCE` from code and `.env.example` (and any docs).

## Acceptance criteria
- No dead/unused config remains.
- `.env.example` matches actual supported config.

## Suggested verification
- Run `npm run typecheck`.
