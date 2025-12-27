# Verification Steps for Fallback Error Surfacing

## Implementation Summary

This implementation adds the ability to surface registry load failures while still rendering fallback data with a warning notice.

## Changes Made

### 1. Source Registry Service (`src/data/sourceRegistryService.ts`)

**Added:**
- `CacheStatus` type: `"fresh" | "stale" | "fallback"`
- `cacheStatus` private field to track data state
- `isUsingFallback()` method to check if currently using fallback data
- `getCacheStatus()` method to get current cache status

**Modified:**
- `getRegistry()`: Sets status to "fresh" on successful load
- `loadAndParse()`: Sets status to "fallback" when returning fallback registry
- `clearCache()`: Resets status to "fresh"

### 2. Sources Page (`src/pages/Sources.tsx`)

**Added:**
- `usingFallback` state to track if fallback data is active
- Yellow warning banner showing when fallback data is in use
- Checks `isUsingFallback()` after loading and refreshing

**Warning Message:**
```
Dados limitados disponíveis
Não foi possível carregar o registro completo. Estamos mostrando fontes oficiais básicas.
Tente atualizar a página ou use o botão "Atualizar" para tentar novamente.
```

### 3. Participation Shortcuts (`src/components/ParticipationShortcuts.tsx`)

**Added:**
- `usingFallback` state to track if fallback data is active
- Yellow warning banner showing when fallback data is in use
- Checks `isUsingFallback()` after loading shortcuts

**Warning Message:**
```
Dados limitados
Não foi possível carregar todos os atalhos. Alguns links podem não estar disponíveis.
```

## Verification Steps

### Option 1: Simulate Fetch Failure (Recommended)

1. **Set invalid data source URL:**
   ```bash
   # In your .env.local file, set an invalid URL
   VITE_DATA_SOURCE_URL="https://invalid-url-that-does-not-exist.example.com/data.json"
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Verify the behavior:**
   - Navigate to the home page
   - Expected: Yellow warning banner appears above the participation shortcuts
   - Message should say: "Dados limitados"
   - Fallback shortcuts (LAI and Transparency Portal) should still render
   - The links should be functional

4. **Navigate to Sources page:**
   - Click "Fontes" in the navigation
   - Expected: Yellow warning banner appears
   - Message should say: "Dados limitados disponíveis"
   - Fallback registry sections should render (even if empty)
   - Manual refresh button should be available

5. **Test refresh:**
   - Click the "Atualizar" button
   - Expected: Warning persists (since URL is still invalid)
   - Data remains available (fallback doesn't disappear)

### Option 2: Test with Valid Data (Normal Operation)

1. **Set valid data source URL:**
   ```bash
   # Use your actual data source
   VITE_DATA_SOURCE_URL="https://your-actual-data-source.com/bh-dados-publicos.json"
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Verify normal operation:**
   - No yellow warning banner should appear
   - Full registry data loads successfully
   - All sections and shortcuts render with complete data

4. **Test recovery scenario:**
   - Temporarily change URL to invalid
   - See warning appear
   - Change URL back to valid
   - Click "Atualizar" button
   - Expected: Warning disappears, full data loads

## Acceptance Criteria Verification

- ✅ On fetch failure, fallback data still renders
- ✅ UI displays a clear notice (not a hard error) indicating fallback/partial data
- ✅ The notice goes away when a fresh load succeeds
- ✅ TypeScript compilation passes
- ✅ ESLint checks pass
- ✅ Manual refresh button is available to retry loading

## Technical Notes

### Cache Status Flow

1. **Fresh State**: Initial state, set after successful load
2. **Stale State**: Set when cache expires (outside TTL but before refresh)
3. **Fallback State**: Set when `loadAndParse()` returns fallback registry

### Error Handling

- The service now tracks whether fallback data is in use via `cacheStatus`
- UI components check `isUsingFallback()` after each load/refresh
- Warning banners appear conditionally based on this flag
- Users can retry loading via the refresh button

### Design Decisions

- Used non-blocking warning alerts instead of destructive errors
- Yellow color scheme indicates "warning" not "error"
- Fallback data remains functional and accessible
- Clear messaging explains the situation and suggests actions
