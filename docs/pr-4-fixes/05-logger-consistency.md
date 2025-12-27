# Replace console.error with centralized logger

## Goal
Use the shared logger consistently for error reporting.

## Why this matters
Logging should be consistent and environment-aware. Direct `console.error` bypasses the logger’s production behavior and format.

## Where
- `src/components/ParticipationNow.tsx`

## Current behavior
`loadScheduleUrl()` uses `console.error` on failure.

## Required change
Replace `console.error` with `logger.error` and ensure the logger is imported at the top.

## Acceptance criteria
- No new direct `console.error` calls.
- `logger.error` includes a clear message and error context.

## Suggested verification
- Run `npm run lint` and `npm run typecheck`.
