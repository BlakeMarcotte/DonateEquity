# Screen Flicker Fix Pattern

## The Problem
When loading async data in React, you often see unwanted screen flashing/flickering. This happens due to **race conditions** between multiple async data sources (auth, database queries, API calls) where:

1. A loading flag turns `false`
2. But the actual data hasn't been set in state yet
3. React renders the "no data" state briefly
4. Then the data arrives and React renders the "has data" state
5. User sees a flash between these states

## The Solution Pattern

### 1. **Track First Successful Load with `useRef`**

```typescript
// Track if we've ever successfully loaded the data
const hasEverHadData = useRef(false)
if (dataObject) {
  hasEverHadData.current = true
}
```

**Why this works:** `useRef` doesn't cause re-renders when updated, and persists across renders. This lets us distinguish between "loading for the first time" vs "data loaded then disappeared" (which would be a real error).

### 2. **Compose Loading States Properly**

```typescript
// Step 1: Wait for auth to fully load
const isAuthFullyLoaded = !authLoading && (user ? customClaims !== null : true)

// Step 2: Check if data queries are loading
const isLoadingData = campaignLoading || tasksLoading

// Step 3: CRITICAL - Detect the race condition gap
// If auth is ready and we have a user, but data hasn't loaded yet
const waitingForInitialLoad = isAuthFullyLoaded && user && !hasEverHadData.current && !dataObject

// Step 4: Combine all loading states
const showLoadingScreen = !isAuthFullyLoaded || isLoadingData || waitingForInitialLoad
```

**Why this works:** The `waitingForInitialLoad` check catches the race condition where:
- Auth is fully loaded ✓
- User exists ✓
- We've never successfully loaded data before ✗
- Data doesn't exist yet ✗

This means we're in the gap between `loading=false` and `data` being set.

### 3. **Smart Conditional Rendering**

```typescript
// Only show "No Data Found" if ALL of these are true
if (!dataObject && relatedData.length === 0 && !relatedId) {
  return <NoDataFoundScreen />
}
```

**Why this works:** If you have ANY evidence of participation/data (related data, IDs, etc.), keep showing the loading screen rather than flash "No Data Found".

## Full Example Implementation

```typescript
'use client'

import { useEffect, useState, useRef } from 'react'

export default function MyPage() {
  const { user, customClaims, loading: authLoading } = useAuth()
  const { data, loading: dataLoading } = useMyData()
  const { relatedData, loading: relatedLoading } = useRelatedData()

  // STEP 1: Track first successful load
  const hasEverHadData = useRef(false)
  if (data) {
    hasEverHadData.current = true
  }

  // STEP 2: Compose loading states
  const isAuthFullyLoaded = !authLoading && (user ? customClaims !== null : true)
  const isLoadingData = dataLoading || relatedLoading

  // STEP 3: Detect race condition gap
  const waitingForInitialLoad = isAuthFullyLoaded && user && !hasEverHadData.current && !data

  // STEP 4: Combine all loading conditions
  const showLoadingScreen = !isAuthFullyLoaded || isLoadingData || waitingForInitialLoad

  // Show loading until EVERYTHING is ready
  if (showLoadingScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Only show "No Data" if truly no data (not just race condition)
  if (!data && relatedData.length === 0) {
    return <NoDataFoundScreen />
  }

  // Render actual content
  return <YourContent />
}
```

## Real-World Example

See `/app/my-campaign/page.tsx` (lines 35-128) for the actual implementation that fixed campaign page flicker.

### Key Lines:
- **Line 35-39:** useRef tracking
- **Line 74-79:** Loading state composition
- **Line 81-83:** Race condition detection (THE CRITICAL FIX)
- **Line 85:** Final combined loading state
- **Line 138:** Smart "No Data" conditional

## When to Use This Pattern

Use this pattern whenever you have:
1. Multiple async data sources (auth + database queries)
2. Conditional rendering based on data presence
3. Users seeing brief flashes of "No Data" or error states
4. Race conditions between `loading` flags and actual data

## Common Mistakes to Avoid

❌ **Don't do this:**
```typescript
if (loading) return <Loading />
if (!data) return <NoData />
```
**Problem:** Gap between `loading=false` and `data` being set causes flicker.

❌ **Don't do this:**
```typescript
const [hasData, setHasData] = useState(false)
if (data) setHasData(true)
```
**Problem:** `useState` causes re-renders and doesn't persist correctly.

✅ **Do this:**
```typescript
const hasEverHadData = useRef(false)
if (data) hasEverHadData.current = true

const waitingForInitialLoad = user && !hasEverHadData.current && !data
const showLoading = loading || waitingForInitialLoad
```

## Summary

The key insight is: **Don't trust loading flags alone - also check if you're waiting for the first successful data load using a persistent ref.**

This pattern has eliminated flicker issues across the my-campaign page and can be applied anywhere you have async data loading.
