# Fix invalid default LinkKind in registry parser

## Goal
Ensure the default link kind derived from sections is always a valid `LinkKind` value. Avoid values like "a"/"b"/"c" that currently appear when the section letter is lowercased and cast.

## Why this matters
`LinkKind` drives filtering, shortcuts, and UI badges. Invalid kinds can break `findLinkByKind` and lead to incorrect or missing shortcuts and filters.

## Where
- `src/data/sourceRegistryParser.ts`

## Current behavior
`parseSection()` passes `letter.toLowerCase() as LinkKind` into `findAllLinks()`. This produces invalid `LinkKind` values when inference doesn’t override them.

## Required change
Replace the invalid cast with a valid `LinkKind` default.

Choose one of these approaches:
1) Map each section letter to a valid kind (recommended). Example mapping:
   - A -> `structure`
   - B -> `legislation`
   - C -> `planning`
   - D -> `amendments`
   - E -> `accountability`
   - F -> `external_control`
   - G -> `sector_plan`
   - H -> `legislative`
   - I -> `other`
2) Use `other` as a safe default and rely on inference logic.

## Acceptance criteria
- No `RegistryLink.kind` values outside the `LinkKind` union.
- TypeScript does not rely on invalid casts for `LinkKind`.
- Existing inference still works as expected.

## Suggested verification
- Run `npm run typecheck` and `npm run test`.
- Spot-check a section with no inferred kind to confirm it defaults to a valid `LinkKind`.
