# JustTCG API Rate Limit Fix

## Problem
The sync was failing with errors like:
```
[Nest] 85179  - 01/27/2026, 8:35:42 PM    WARN [JustTcgClient] Key tcg_93a9... rate limited. Retry after 23058s
```

This was happening even though the daily limit (100 requests) was barely used (only 19/1000 monthly requests consumed).

## Root Cause
The JustTCG API has **two separate rate limits**:

1. **RPM Limit**: 10 requests per minute (rolling 60-second window)
2. **Daily Limit**: 100 requests per day (resets at 12 AM UTC)

The previous implementation was **confusing these two limits**:
- When the RPM window was exhausted (10 requests in the last minute), it was treating it as if the daily quota was exhausted
- This caused it to wait for the next UTC day reset (~6.4 hours) instead of just waiting 60 seconds for the RPM window to refresh

## Solution
Updated `justtcg.client.ts` to properly distinguish between:

### 1. RPM Window Exhaustion
- **Condition**: `apiRequestsUsed >= apiRateLimit` (e.g., 10/10 in the last minute)
- **Action**: Mark key for 60-second cooldown, immediately try next key in rotation
- **Log Level**: Debug (normal operation with multiple keys)

### 2. Daily Quota Exhaustion  
- **Condition**: `apiDailyRequestsRemaining <= 0` (e.g., 100/100 used today)
- **Action**: Mark key as unavailable for 24 hours
- **Log Level**: Error (critical - key is done for the day)

## How It Works Now

With 5 API keys configured:

1. **Normal Operation**: Keys rotate evenly, each handling ~2 requests per minute (well under the 10 RPM limit per key)

2. **RPM Window Hit**: When a key hits 10 RPM:
   - Key is marked for 60-second cooldown
   - Client immediately switches to the next available key
   - After 60 seconds, the key becomes available again
   - **No waiting** if other keys are available

3. **All Keys Rate-Limited**: If all 5 keys hit their RPM limits simultaneously:
   - Client identifies which key will be ready first
   - Logs: `All available keys are rate-limited. Next key ready in Xs`
   - Waits only the necessary time (max 60 seconds)

4. **Daily Quota Exhausted**: If a key runs out of daily quota:
   - Key is removed from rotation for the rest of the day
   - Other keys continue to work
   - Error logged for visibility

## Expected Behavior

### With 5 Keys
- **Throughput**: ~50 requests per minute (5 keys × 10 RPM each)
- **Daily Capacity**: 500 requests per day (5 keys × 100 daily limit each)
- **Sync Speed**: Can fetch 6000+ catalog items in ~2-3 minutes

### Logging
You'll see logs like:
```
[JustTcgClient] Key tcg_88a0... usage: daily 23/100, RPM window 8/10 (Free Tier)
[JustTcgClient] Key tcg_f16b... usage: daily 24/100, RPM window 9/10 (Free Tier)
[JustTcgClient] Key tcg_20e1... hit RPM limit (10). Will wait 60s or switch to another key.
```

## Configuration

In `.env`:
```env
JUSTTCG_API_KEY=key1,key2,key3,key4,key5
```

The more keys you add, the faster the sync will be (up to the API's total throughput limits).
