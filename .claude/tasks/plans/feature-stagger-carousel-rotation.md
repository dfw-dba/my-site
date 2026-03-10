# Stagger Carousel Rotation Timing

## Context
All carousel instances (RecommendationCarousel + multiple PerformanceReviewCarousels) use `setInterval(rotate, 8000)` starting at component mount. Since they all mount at the same time during page load, every carousel rotates simultaneously, creating an unnatural synchronized sliding effect.

## Approach
Add a random initial delay (0–4 seconds) before each carousel starts its interval. This staggers the rotations so they feel independent and organic.

### Files modified
1. **`frontend/src/components/RecommendationCarousel.tsx`** (line 51–55)
2. **`frontend/src/components/PerformanceReviewCarousel.tsx`** (line 48–51)

### Change (identical in both files)
Replace the `useEffect` that sets up the interval:

```typescript
// Before
useEffect(() => {
  if (items.length <= 1) return;
  const id = setInterval(rotate, intervalMs);
  return () => clearInterval(id);
}, [rotate, intervalMs, items.length]);

// After
useEffect(() => {
  if (items.length <= 1) return;
  let intervalId: ReturnType<typeof setInterval>;
  const delayId = setTimeout(() => {
    rotate();
    intervalId = setInterval(rotate, intervalMs);
  }, Math.random() * (intervalMs / 2));
  return () => {
    clearTimeout(delayId);
    clearInterval(intervalId);
  };
}, [rotate, intervalMs, items.length]);
```

The random delay is `0 to intervalMs/2` (0–4s with default 8s interval). After the delay, it does one immediate rotation then starts the regular interval. This ensures no two carousels stay in sync.

## Verification
1. `cd frontend && npx tsc --noEmit` — no type errors
2. `cd frontend && npx vitest run` — tests pass
3. Load the resume page in browser and observe that carousels rotate at different times

## Status: Complete
