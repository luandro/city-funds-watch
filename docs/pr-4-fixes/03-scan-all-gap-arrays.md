# Scan all relevant arrays for gaps

## Goal
Ensure gaps are detected across all relevant arrays in the registry sections, not just a subset.

## Why this matters
`RawRegistrySection` includes arrays that are currently ignored (`planos`, `relatorios`, `tipos_proposicoes`). Missing items there will never show up in the gaps list.

## Where
- `src/data/sourceRegistryParser.ts`

## Current behavior
`scanSectionForGaps()` only checks `documentos`, `plans`, and `conselhos`.

## Required change
Include all relevant arrays when scanning for `nao_localizado` or missing flags:
- `documentos`
- `plans`
- `planos`
- `relatorios`
- `tipos_proposicoes`
- `conselhos`

Keep existing validation checks (`isValidArray`, `isValidObject`, string validation).

## Acceptance criteria
- Gaps from all arrays above appear in the output list.
- Existing behavior for `documentos` and `conselhos` remains unchanged.

## Suggested verification
- Add/adjust tests in `src/data/sourceRegistryParser.test.ts` to cover at least one new array.
- Run `npm run test`.
