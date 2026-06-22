# Interview Exercise: `canReachExactly`

## Exercise

> **`canReachExactly(jumps, target)`** — A frog starts at position `0`. Given a
> collection of jump sizes and a `target`, can it land **exactly** on `target`
> using **at most two different** jumps, always moving forward? (One jump alone
> counts.)
>
> Return `true` / `false`.

## Parameter Properties (state these up front)

| Param    | Type / property                  | Notes                                      |
|----------|----------------------------------|--------------------------------------------|
| `jumps`  | a **set** → no duplicates        | distinctness is given for free by the type |
|          | elements are **unsigned int**    | the underflow trap lives here              |
|          | elements are **positive** (`> 0`)| frog always moves forward                  |
|          | may be **empty**                 | valid input                                |
|          | unordered                        | no sorting assumption                      |
| `target` | single **unsigned int**          |                                            |
| return   | `bool`                           |                                            |

## Cases

| `jumps`              | `target` | →       | Catches                          |
|----------------------|----------|---------|----------------------------------|
| `{2, 5, 7}`          | `9`      | `true`  | two-jump works (`2 + 7`)         |
| `{1, 3, 8}`          | `8`      | `true`  | one jump (target is in the set)  |
| `{4}`                | `8`      | `false` | can't reuse the same element     |
| `{1, 2, 3}`          | `6`      | `false` | only two jumps allowed (not three)|
| `{}`                 | `5`      | `false` | empty set                        |
| `{15, UINT_MAX - 4}` | `10`     | `false` | unsigned underflow trap          |

_Two yes (pair, single), four no (reuse, ceiling, empty, overflow)._

## What Good Looks Like

- **O(n)** with a hash set (complement lookup), not the O(n²) double loop.
- Handles the **one-jump** case (`target` itself in the set).
- Handles **distinctness** (`j !== target - j`).
- **Guards the subtraction**: `if (j < target)` *before* computing `target - j`,
  so unsigned never wraps. (Watch for the dead `if (target - j >= 0)` — always
  true for unsigned.)

## Reference Solution (C++)

```cpp
#include <unordered_set>

bool canReachExactly(const std::unordered_set<unsigned int>& jumps,
                     unsigned int target) {
    if (jumps.count(target)) return true;          // one jump
    for (unsigned int j : jumps) {
        if (j < target && j != target - j          // guard underflow + distinct
            && jumps.count(target - j)) {
            return true;                            // two distinct jumps
        }
    }
    return false;
}
```

## Reference Solution (TypeScript)

```typescript
function canReachExactly(jumps: Set<number>, target: number): boolean {
  if (jumps.has(target)) return true;              // one jump
  for (const j of jumps) {
    if (j < target && j !== target - j && jumps.has(target - j)) {
      return true;                                 // two distinct jumps
    }
  }
  return false;
}
```

## Stretch Questions

1. **Up to three jumps** instead of two → leads into 3-sum and the O(n²) wall.
2. **Return the actual jumps**, not just a bool.
3. **Streaming input** — jumps arrive once, can't be re-read → forces the
   running-`seen`-set version, not "probe the whole set."
4. **Allow the same value twice** (multiset / array with repeats) → how does
   `{4, 4}, 8` change? Tests why the set type mattered.
5. **Exactly two jumps required** (no single-jump shortcut) → small spec change,
   watch them adjust the one-jump branch.
6. **What changes in a language with no unsigned ints** (e.g. TS/Python)? →
   tests whether they understand the trap was about *representation*, not logic.
7. **Negative jumps allowed** (frog can move backward) → does the complement
   trick still hold? (Yes, but the `j < target` guard logic changes.)
