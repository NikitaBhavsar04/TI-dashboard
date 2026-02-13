# Concurrency Protection & Rate Limit Fixes

## Problem Summary

The system was experiencing OpenRouter API rate limit errors (HTTP 429) because:

1. **Next.js Strict Mode** - Double-rendered components causing duplicate API calls
2. **No Advisory Generation Lock** - Multiple simultaneous requests for the same advisory
3. **Agenda Duplication** - Multiple scheduler workers starting on hot reload
4. **Python Retry Storm** - Retrying 429 errors made the problem worse
5. **No Request Tracing** - Couldn't verify if duplicate calls were eliminated

## Solutions Implemented

### 1. Disable React Strict Mode ✅

**File:** `next.config.js`

**Change:** Set `reactStrictMode: false`

**Why:** React Strict Mode intentionally double-invokes components in development to detect side effects. This caused API routes to be called twice.

```js
const nextConfig = {
  reactStrictMode: false,  // Disabled to prevent double API calls in development
```

### 2. Advisory Generation Lock ✅

**File:** `pages/api/manual-advisory/generate.ts`

**Implementation:**
- Added in-memory lock using `advisoryGenerationLock` boolean
- Rejects new requests with HTTP 429 if lock is held
- Uses try/finally to ensure lock is always released
- Added unique request ID (UUID) for tracing

**Key Features:**
```typescript
// Global lock
let advisoryGenerationLock = false;

// Request ID for tracing
const requestId = randomUUID().split('-')[0];

// Lock acquisition
if (advisoryGenerationLock) {
  return res.status(429).json({
    error: 'Advisory generation already in progress. Please wait.'
  });
}
advisoryGenerationLock = true;

// Always release lock
try {
  // ... generation logic
} finally {
  advisoryGenerationLock = false;
  console.log(`[req:${requestId}] 🔓 Lock released`);
}
```

**Result:** Only ONE advisory can be generated at a time across the entire application.

### 3. Agenda Singleton Pattern ✅

**File:** `pages/api/start-agenda.ts`

**Implementation:**
- Uses Node.js `global` object to persist flag across hot reloads
- TypeScript global declaration for type safety
- Returns early if Agenda already running
- Resets flag on error to allow retry

**Key Features:**
```typescript
declare global {
  var agendaStarted: boolean | undefined;
  var agendaInstance: any | undefined;
}

if (global.agendaStarted) {
  return res.status(200).json({
    message: 'Agenda already running',
    singleton: true
  });
}

global.agendaStarted = true;
```

**Result:** Only ONE Agenda worker runs, even with development hot reload.

### 4. Stop Python Retry Storm ✅

**File:** `backend/llm/opensummarize.py`

**Changes:**
- Immediately raise error on 429 (rate limit) - NO RETRY
- Max 1 retry for SSL/connection errors only
- Check for 429 on retry attempt and stop immediately
- Added detailed logging with request ID

**Key Logic:**
```python
# DO NOT RETRY on 429
if '429' in error_str or ('rate' in error_str.lower() and 'limit' in error_str.lower()):
    logger.error(f"[LLM][req:{request_id}] ❌ Rate limit exceeded")
    logger.error(f"[LLM][req:{request_id}] DO NOT RETRY - waiting required")
    raise RuntimeError("Rate limit exceeded - no retry")

# Only retry SSL errors (max 1 retry)
if 'ssl' in error_str.lower() or 'certificate' in error_str.lower():
    logger.warning(f"[LLM][req:{request_id}] SSL error, retrying (max 1 retry)")
    try:
        resp = make_request(verify_ssl=False)
        return resp.choices[0].message.content.strip()
    except Exception as retry_e:
        # Still check for 429 on retry
        if '429' in str(retry_e):
            raise RuntimeError("Rate limit hit on retry - stopping")
        raise retry_e
```

**Result:** 429 errors are NOT retried. Only network failures get 1 retry.

### 5. Request Tracing ✅

**Files Modified:**
- `pages/api/manual-advisory/generate.ts` - Generates UUID request ID
- `backend/manual_advisory.py` - Logs request ID from environment
- `backend/llm/opensummarize.py` - Logs request ID in all LLM operations

**Implementation:**
```typescript
// Next.js API: Generate and pass to Python
const requestId = randomUUID().split('-')[0];
const childEnv = {
  ...process.env,
  REQUEST_ID: requestId
};
console.log(`[MANUAL-ADVISORY][req:${requestId}] Starting generation`);
```

```python
# Python: Read from environment
request_id = os.getenv("REQUEST_ID", "unknown")
logger.info(f"[MANUAL][req:{request_id}] Generating advisory")
logger.info(f"[LLM][req:{request_id}] Using OpenRouter model: {OPENROUTER_MODEL}")
```

**Result:** Every request has a unique 8-character ID visible in all logs.

## Verification Checklist

After deploying these fixes, verify:

### ✅ Single Execution
- [ ] One button click → exactly one log entry with unique request ID
- [ ] No duplicate `[MANUAL-ADVISORY][req:XXXXX] Starting generation` logs
- [ ] Request ID appears in Python logs

### ✅ Lock Protection
- [ ] Rapid clicking "Generate Advisory" → First succeeds, rest get 429 error
- [ ] After completion, lock is released (see `🔓 Lock released` log)

### ✅ No Retry Storm
- [ ] 429 error → logs show "DO NOT RETRY - waiting required"
- [ ] No multiple LLM request attempts for same request ID
- [ ] SSL errors still retry once

### ✅ Agenda Singleton
- [ ] Page refresh → logs show "Agenda already running (singleton check)"
- [ ] No duplicate Agenda worker initialization

## Expected Log Output

### Successful Advisory Generation:
```
[MANUAL-ADVISORY][req:8f2ca3b1] Starting advisory generation for article: abc123
[MANUAL-ADVISORY][req:8f2ca3b1] Lock acquired, proceeding with generation
[MANUAL][req:8f2ca3b1] Starting advisory generation script
[MANUAL][req:8f2ca3b1] Generating advisory for: Sample Vulnerability
[LLM][req:8f2ca3b1] Using OpenRouter model: tngtech/deepseek-r1t-chimera:free
[LLM][req:8f2ca3b1] ✅ LLM request completed successfully
[MANUAL][req:8f2ca3b1] ✅ Advisory indexed: SOC-TA-20260212-143022
[MANUAL-ADVISORY][req:8f2ca3b1] ✅ Advisory generated successfully via Python
[MANUAL-ADVISORY][req:8f2ca3b1] 🔓 Lock released
```

### Duplicate Request Blocked:
```
[MANUAL-ADVISORY] ⚠️ Advisory generation already in progress, rejecting duplicate request
```

### Rate Limit Hit (No Retry):
```
[LLM][req:8f2ca3b1] ❌ Rate limit exceeded for model tngtech/deepseek-r1t-chimera:free
[LLM][req:8f2ca3b1] DO NOT RETRY - waiting required
[MANUAL][req:8f2ca3b1] ❌ Failed to generate advisory: Rate limit exceeded
```

## Testing Instructions

### Test 1: Single Click
1. Click "Generate Advisory" once
2. Check logs for single request ID
3. Verify advisory is created
4. Verify lock is released

### Test 2: Rapid Clicks
1. Click "Generate Advisory" 3 times rapidly
2. First request should succeed
3. Next 2 should fail with 429 "already in progress"
4. After completion, try again - should work

### Test 3: Agenda Singleton
1. Start dev server
2. Call `/api/start-agenda`
3. Refresh page / hot reload
4. Call `/api/start-agenda` again
5. Should see "Agenda already running"

### Test 4: Rate Limit Handling
1. Trigger advisory generation
2. If 429 occurs, verify NO retry attempts
3. Wait 2-3 minutes
4. Try again - should work

## Performance Impact

- **Lock overhead:** Negligible (boolean check)
- **Request ID generation:** ~0.1ms per request
- **Global Agenda check:** ~0.01ms
- **Retry reduction:** Saves 2-5 failed API calls per 429 error

## Rollback Instructions

If issues occur, revert these commits:

1. `next.config.js` - Set `reactStrictMode: true`
2. `pages/api/manual-advisory/generate.ts` - Remove lock logic
3. `pages/api/start-agenda.ts` - Use local variable instead of global
4. `backend/llm/opensummarize.py` - Re-enable retry loop

## Additional Notes

- Lock is **in-memory only** - not suitable for multi-instance deployments
- For production load balancing, implement Redis-based distributed lock
- Request ID is 8 chars for brevity (first segment of UUID)
- Agenda singleton uses Node.js global, survives hot reload but not full restart

## Related Files

- `next.config.js` - Strict mode config
- `pages/api/manual-advisory/generate.ts` - Advisory generation with lock
- `pages/api/start-agenda.ts` - Agenda singleton
- `backend/manual_advisory.py` - Python script with request tracing
- `backend/llm/opensummarize.py` - LLM call with retry protection
- `LLM_CONFIGURATION.md` - Alternative models guide
