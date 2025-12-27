# Surface registry load failures while still using fallback data

## Goal
When the registry fetch fails, the UI must still render fallback data **and** display a non-blocking error/notice that data is incomplete or stale.

## Why this matters
Right now the service always returns fallback without throwing. That prevents error UI from ever showing, masking failures and reducing user trust.

## Where
- `src/data/sourceRegistryService.ts`
- `src/pages/Sources.tsx`
- `src/components/ParticipationShortcuts.tsx`
- (If needed) `src/data/sourceRegistryTypes.ts`

## Current behavior
`getRegistry()` never throws after failures because `loadAndParse()` returns fallback. The UI only shows error when an exception is thrown.

## Required change
Expose failure state **even when fallback data is returned**. Use one (or more) of these patterns:
- Set `this.error` and return fallback registry with metadata indicating `cacheStatus: "fallback"` or `error: "..."`.
- Allow `getRegistry()` to return fallback but also throw a custom error that includes the fallback payload (if you prefer to handle a dual-path in the UI).

Then update the UI to show a warning banner when fallback data is active. The alert should be informational and not block rendering.

## Acceptance criteria
- On fetch failure, fallback data still renders.
- UI displays a clear notice (not a hard error) indicating fallback/partial data.
- The notice should go away when a fresh load succeeds.

## Suggested verification
- Simulate a fetch failure (e.g., invalid `VITE_DATA_SOURCE_URL`).
- Confirm sources still render and a warning appears.
- Restore a valid URL and confirm the warning disappears.
