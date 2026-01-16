# Cache Mismatch Issue - FIXED

## Problem Summary
The "No new advisories generated" error occurred because of a **cache file mismatch**:

- **Backend** (`generate_advisories.py`) uses: `seen_ids.json`
- **Clear Cache API** was clearing: `seen_items.json` (wrong file!)

This meant that when users clicked "Clear Cache", it wasn't actually clearing the cache that the advisory generation system was checking.

## Root Cause
Located in [pages/api/clear-advisory-cache.ts](pages/api/clear-advisory-cache.ts):
```typescript
// OLD CODE (WRONG)
const CACHE_FILE = path.join(WORKSPACE_PATH, 'seen_items.json')
```

But the backend uses:
```python
# backend/generate_advisories.py line 48
SEEN_FILE = "seen_ids.json"
```

## The Fix
Updated [pages/api/clear-advisory-cache.ts](pages/api/clear-advisory-cache.ts) to:
1. Clear the **correct file** (`seen_ids.json`) that the backend actually uses
2. Also clear the legacy file (`seen_items.json`) for backwards compatibility
3. Report which files were cleared and how many items

### Changes Made
```typescript
// NEW CODE (CORRECT)
const CACHE_FILE = path.join(WORKSPACE_PATH, 'seen_ids.json')
const LEGACY_CACHE_FILE = path.join(WORKSPACE_PATH, 'seen_items.json')

// Now clears BOTH files and reports detailed results
```

## How to Test the Fix
1. **Start the application:**
   ```powershell
   cd C:\Threat-Advisory
   npm run dev
   ```

2. **Open browser:** http://localhost:3000

3. **Navigate to:** Advisories page

4. **Click:** "Clear Cache" button

5. **Verify:** You should see a message like:
   ```
   ✓ Cache cleared successfully!
   
   Cleared X cached items from:
   - seen_ids.json (X items)
   - seen_items.json (X items)
   ```

6. **Click:** "Auto Advisory" button

7. **Result:** New advisories should now be generated successfully!

## Verification
Before the fix:
```
seen_ids.json: 1 item (f78c709bb967089c112d4509e13e8a1600acbb6a)
seen_items.json: 0 items
Clear Cache: Only cleared seen_items.json ❌
Result: Backend still saw cached items → No new advisories
```

After the fix:
```
seen_ids.json: Will be cleared ✅
seen_items.json: Will be cleared ✅
Clear Cache: Clears BOTH files
Result: Backend sees no cached items → Generates new advisories ✅
```

## Files Modified
- ✅ [pages/api/clear-advisory-cache.ts](pages/api/clear-advisory-cache.ts) - Fixed cache file path

## Additional Notes
- The fix is backward compatible - it clears both cache files
- No changes needed to backend code
- No database changes required
- Existing advisories are NOT affected
- Only the RSS feed deduplication cache is cleared

## Related Files
- Backend cache handling: [backend/generate_advisories.py](backend/generate_advisories.py) (line 48-66)
- Frontend UI: [pages/advisories/index.tsx](pages/advisories/index.tsx) (line 247-261)
- Cache utilities: [backend/collectors/cache.py](backend/collectors/cache.py)

---

**Issue Status:** ✅ RESOLVED

**Testing Required:** Manual testing via UI to confirm cache clearing works correctly
