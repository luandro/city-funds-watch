# Validate section tags before use

## Goal
Prevent runtime errors caused by non-string values in `section.tags`.

## Why this matters
`getSectionIcon()` uses `tag.toLowerCase()`. If `tags` contains non-strings, this will throw.

## Where
- `src/data/sourceRegistryParser.ts`

## Current behavior
`extractTags()` returns `section.tags` without validation.

## Required change
Filter `section.tags` using `isValidString` before returning. Drop invalid values.

## Acceptance criteria
- `extractTags()` only returns string tags.
- No runtime errors from `.toLowerCase()` even with malformed data.

## Suggested verification
- Add a parser test where `tags` includes non-string values.
- Run `npm run test`.
