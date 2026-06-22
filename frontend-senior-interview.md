# Senior Frontend (React) Interview

Three questions. Adjust depth to the candidate; all are discussion-friendly.

---

## Question 1 — Rendering Strategies (discussion)

> "Walk me through the ways a React app can be rendered and delivered — CSR, SSR,
> SSG, and anything else you've used. When would you reach for each, and what are
> the trade-offs?"

**What good looks like — they should cover the spectrum:**

| Strategy | Renders | Good for | Cost / trade-off |
|----------|---------|----------|------------------|
| **CSR** (client-side) | in browser, after JS loads | highly interactive apps, dashboards behind auth | slow first paint, weak SEO, big JS bundle |
| **SSR** (server-side, per request) | HTML per request on server | personalized + SEO-sensitive pages | server cost/latency, TTFB sensitive to backend |
| **SSG** (static, build time) | HTML at build | marketing, docs, blogs — content stable | stale until rebuild; slow builds at scale |
| **ISR** (incremental static regen) | static + background re-gen | large catalogs that change occasionally | eventual consistency window |
| **Streaming SSR / Suspense** | HTML streamed in chunks | fast TTFB with slow data dependencies | complexity, needs Suspense-aware data |
| **RSC** (React Server Components) | components on server, zero-JS | reducing bundle, server data access | newer mental model, framework coupling |
| **Edge rendering** | SSR at CDN edge | low-latency global personalization | limited runtime APIs, cold-start nuances |

**Senior signals to listen for:**

- Frames it around **metrics** (TTFB, FCP, LCP, TTI, hydration cost) not buzzwords.
- Mentions **hydration** and its cost — and that RSC/streaming exist partly to reduce it.
- Knows **it's per-route, not per-app** — a real app mixes strategies (static
  marketing + SSR product + CSR dashboard).
- Names a **framework reality** (Next.js app vs pages router, Remix loaders,
  Astro islands) without being religious about it.
- Talks about **caching layers** (CDN, ISR, `stale-while-revalidate`) as the
  thing that actually makes SSR affordable.

**Follow-up probes:**

- "What breaks when you put a personalized widget on an SSG page?" (→
  caching/personalization tension; islands, client-only boundaries)
- "What is hydration and why is it expensive?"
- "Your SSR page's TTFB regressed — how do you debug it?"
- "When is plain CSR genuinely the right call?" (Don't let them say "never.")

---

## Question 2 — `canReachExactly` (the frog)

> **`canReachExactly(jumps, target)`** — A frog sits at position `0` on a
> **timeline** (a number line). It always hops **forward** along the timeline —
> time only moves one way, so it can never revisit a position. Given a
> collection of jump sizes and a `target` position, can the frog land
> **exactly** on `target` using **at most two different** jumps? (One jump alone
> counts.)
>
> Return `true` / `false`.
>
> _The "frog on a timeline" framing is deliberate: forward-only motion is what
> communicates that jumps are distinct and never repeated. Watch whether the
> candidate picks up on that — it's the tell for whether they actually
> understood the constraint vs. pattern-matched two-sum._

### Parameter Properties (state these up front)

| Param    | Type / property                  | Notes                                      |
|----------|----------------------------------|--------------------------------------------|
| `jumps`  | a **set** → no duplicates        | distinctness is given for free by the type |
|          | elements are **unsigned int**    | the underflow trap lives here              |
|          | elements are **positive** (`> 0`)| frog always moves forward                  |
|          | may be **empty**                 | valid input                                |
|          | unordered                        | no sorting assumption                      |
| `target` | single **unsigned int**          |                                            |
| return   | `bool`                           |                                            |

### Cases

| `jumps`              | `target` | →       | Catches                          |
|----------------------|----------|---------|----------------------------------|
| `{2, 5, 7}`          | `9`      | `true`  | two-jump works (`2 + 7`)         |
| `{1, 3, 8}`          | `8`      | `true`  | one jump (target is in the set)  |
| `{4}`                | `8`      | `false` | can't reuse the same element     |
| `{1, 2, 3}`          | `6`      | `false` | only two jumps allowed (not three)|
| `{}`                 | `5`      | `false` | empty set                        |
| `{15, UINT_MAX - 4}` | `10`     | `false` | unsigned underflow trap          |

_Two yes (pair, single), four no (reuse, ceiling, empty, overflow)._

### What Good Looks Like

- **O(n)** with a hash set (complement lookup), not the O(n²) double loop.
- Handles the **one-jump** case (`target` itself in the set).
- Handles **distinctness** (`j !== target - j`).
- **Guards the subtraction**: `if (j < target)` *before* computing `target - j`,
  so unsigned never wraps. (Watch for the dead `if (target - j >= 0)` — always
  true for unsigned.)

### Reference Solution (TypeScript)

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

### Stretch Questions

1. **Up to three jumps** instead of two → leads into 3-sum and the O(n²) wall.
2. **Return the actual jumps**, not just a bool.
3. **Streaming input** — jumps arrive once, can't be re-read → forces the
   running-`seen`-set version, not "probe the whole set."
4. **Allow the same value twice** (multiset / array with repeats) → how does
   `{4, 4}, 8` change? Tests why the set type mattered.
5. **No unsigned ints** (JS/TS) → does the trap still exist? Tests whether they
   understand it was about *representation*, not logic.

---

## Question 3 — Model a Zoo in TypeScript (open-ended)

> "Model a zoo using TypeScript types. Animals, enclosures, staff — your call on
> scope. I care about the type design: how you represent the domain, not a
> working program. Talk me through your choices."

Deliberately open so you can watch how they reach for the language's modeling
tools. Steer toward enums and inheritance if they don't get there on their own.

### A reference shape (one good answer — there are many)

```typescript
// --- Enum-style modeling ---
// Union of string literals (often preferred over `enum` in TS)
type Species = "lion" | "penguin" | "python" | "elephant";

type Diet = "carnivore" | "herbivore" | "omnivore";

// When you genuinely want a named, iterable set with a runtime value:
enum Habitat {
  Savanna = "SAVANNA",
  Arctic  = "ARCTIC",
  Jungle  = "JUNGLE",
}

// --- Inheritance via interface extension ---
interface Animal {
  id: string;
  name: string;
  species: Species;
  diet: Diet;
  dateOfBirth: Date;
}

interface Mammal extends Animal {
  legs: number;
  gestationDays: number;
}

interface Bird extends Animal {
  canFly: boolean;
  wingspanCm: number;
}

interface Reptile extends Animal {
  coldBlooded: true;
  venomous: boolean;
}

// --- Discriminated union (the TS-idiomatic "polymorphism") ---
type ZooAnimal =
  | ({ kind: "mammal" } & Mammal)
  | ({ kind: "bird" } & Bird)
  | ({ kind: "reptile" } & Reptile);

// --- Composition: enclosures, staff ---
interface Enclosure {
  id: string;
  habitat: Habitat;
  capacity: number;
  residents: ZooAnimal[];
}

type StaffRole = "keeper" | "vet" | "admin";

interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  assignedEnclosures: Enclosure["id"][];
}

interface Zoo {
  name: string;
  enclosures: Enclosure[];
  staff: StaffMember[];
}
```

### Concepts to make sure get captured (nudge if missing)

- **Enums / closed sets** — Do they reach for `enum` or string-literal unions?
  *Senior tell:* they can argue the trade-off — `enum` gives a runtime object and
  iterability but has known footguns (numeric enums, bidirectional mapping,
  bundle weight); **string-literal unions** are type-only, tree-shakeable, and
  usually preferred. `as const` objects as a third option is a bonus.
- **Inheritance** — `interface extends` for the `Animal → Mammal/Bird/Reptile`
  hierarchy. Can they explain **interface vs type**, and `extends` vs
  intersection (`&`)?
- **Discriminated unions** — the idiomatic way to do polymorphism + exhaustive
  `switch` narrowing. Watch for a `kind`/`type` discriminant and whether they'd
  add a `never` exhaustiveness check.
- **Composition over inheritance** — does the zoo *contain* enclosures that
  *contain* animals, rather than over-modeling deep hierarchies? Senior instinct.

### Stretch / steering questions

1. "Some animals are venomous, some aren't — how do you keep an invalid combo
   (e.g. a venomous penguin) **unrepresentable**?" (→ make illegal states
   impossible; per-variant fields.)
2. "Add a function `feed(animal)` that must handle every species — how does the
   compiler force you to update it when a new species is added?" (→ discriminated
   union + `never` exhaustiveness.)
3. "`enum Habitat` vs `type Habitat = '...'` — defend your choice."
4. "Reference an animal's enclosure and the enclosure's animals — how do you
   model the relationship without a circular-reference mess?" (→ ID references vs
   nested objects; `Enclosure["id"]` indexed access.)
5. "Make `Enclosure` generic so a `ReptileHouse` only holds reptiles." (→
   `Enclosure<T extends ZooAnimal>`.)
6. "Where would `unknown`, `readonly`, or branded types
   (`type AnimalId = string & { __brand: 'AnimalId' }`) improve this?"

**Red flags:** reaching only for `any`, deep class hierarchies where unions fit
better, numeric enums without knowing the pitfalls, or no exhaustiveness strategy.
