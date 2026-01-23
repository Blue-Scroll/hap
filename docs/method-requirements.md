# HAP Method Requirements

This document defines what makes a Verification Authority's method HAP-compliant. HAP is method-agnostic — it does not mandate physical mail, digital verification, or any specific mechanism. It mandates properties that any valid method must satisfy.

For technical implementation details, see [Becoming a Verification Authority](for-vas.md).

## Background: Why These Requirements Exist

HAP exists to verify that a human took deliberate, costly action. The history of proof-of-work systems (Hashcash, Penny Black, Bitcoin) offers hard-won lessons about what works and what doesn't.

**Computational proof-of-work failed for anti-spam because:**

- Costs could be externalized to botnets (victims pay the electricity)
- Hardware improvements constantly shifted the cost equilibrium
- Calibrating difficulty to deter abuse without blocking legitimate users proved impossible

**What succeeded:**

- Real money as friction (non-externalizable by definition)
- Linear cost scaling (no bulk discounts or amortization exploits)
- Cryptographic binding to specific content, recipient, and time

HAP encodes these lessons into protocol requirements.

-----

## Core Requirements

A verification method is HAP-compliant if and only if it satisfies all of the following:

### 1. Non-Externalizable Cost

The cost of verification **cannot be pushed to unwitting third parties**.

✅ Valid:

- Payment in real currency
- Physical postage
- Notarization fees
- Time spent in verifiable human activity

❌ Invalid:

- Computation alone (can be offloaded to botnets)
- CAPTCHAs alone (can be outsourced to CAPTCHA farms)
- Any mechanism where the payer and the cost-bearer can differ

### 2. Linear Scaling

The cost of N verifications **must be approximately N times the cost of one verification**.

✅ Valid:

- $10 per application, always
- One physical letter per application, always

❌ Invalid:

- Bulk discounts that reduce marginal cost significantly
- Subscription models with unlimited verifications
- Any mechanism where spray-and-pray becomes economical at scale

### 3. Cryptographic Binding

Each claim **must be cryptographically bound to**:

- The intended recipient (via `to` field)
- The timestamp of verification (via `at` field)

VAs **may optionally** bind claims to specific content using the `x-content-hash` custom dimension. This is appropriate when the VA reviews or processes the content itself.

This prevents:

- Replay attacks (reusing a claim for a different recipient)
- Pre-computation attacks (generating claims before knowing the target)

### 4. Verifiable Commitment

The claim **must be verifiable by any party** using only:

- The claim itself
- The VA's public keys (available at `/.well-known/hap.json`)

No API call to the VA should be required for basic verification. The cryptographic signature is the proof.

-----

## Method Categories

HAP recognizes three categories of verification methods. These are descriptive, not normative — a method's category does not affect its validity, only its properties.

> **Note:** Methods are VA-defined. The protocol does not prescribe specific methods. VAs SHOULD use a prefix based on their domain or brand to avoid namespace collision (e.g., `ba_priority_mail` for Ballista, `vi_video_30` for a video interview VA). Custom methods are first-class citizens in the protocol.

### Physical Methods

Methods where the cost is embedded in physical atoms.

Examples:

- `ba_standard_mail` — Standard postal delivery (Ballista)
- `ba_certified_mail` — Tracked postal delivery with proof of receipt
- `no_notarized` — In-person notarization (Notary VA)
- `ip_in_person` — Physical presence verification

Properties:

- Strongly non-externalizable
- Inherent time friction (often days)
- Cost anchored in physical infrastructure

### Digital Methods

Methods where the cost is purely monetary/digital with no physical component.

Examples:

- `pa_tech_assessment` — Fee-based technical skills assessment
- `pa_paid_digital` — Fee-based digital verification
- `es_escrow` — Refundable stake held during application period

Properties:

- Non-externalizable if using real currency
- No inherent time friction (instant)
- Must guard against bulk/automation exploits

### Hybrid Methods

Methods combining digital and physical elements.

Examples:

- `vi_video_30` — 30-minute live video interview with a human
- `ba_expedited_mail` — Digital claim issued instantly, physical mail follows

Properties:

- Can offer instant digital proof with physical reinforcement
- Flexibility in cost/speed tradeoffs

-----

## What HAP Does NOT Specify

HAP takes no position on:

- **Pricing** — VAs determine their own fee structures, subject to linear scaling
- **Delivery mechanism** — Physical, digital, or hybrid are all valid
- **Speed** — Instant or delayed delivery are both acceptable
- **Specific technologies** — Any cryptographic implementation meeting the spec is valid

These are VA-level decisions. Market competition and recipient preferences determine which methods succeed.

-----

## Guidance for Verification Authorities

### Minimum Viable Method

A VA can be HAP-compliant with:

1. A payment mechanism (real currency)
2. JWS claim generation with Ed25519 signatures
3. A `/.well-known/hap.json` endpoint publishing public keys
4. Recipient and timestamp binding (required claim fields)

No physical infrastructure required. No blockchain required.

For complete technical implementation details, see [Becoming a Verification Authority](for-vas.md).

### Choosing a Cost Point

HAP does not mandate pricing, but VAs should consider:

- **Too low** — Fails to deter spray-and-pray; dilutes the signal
- **Too high** — Excludes legitimate senders; reduces adoption
- **Context-dependent** — Entry-level roles may warrant lower friction than executive positions

VAs may offer multiple tiers at different price points.

### Combining Methods

VAs may combine multiple signals (e.g., payment + behavioral analysis + device attestation). The claim should reflect what verification was performed.

> **Note:** The `method_details` field shown below is an optional extension not defined in the core specification. VAs may include additional metadata as needed.

```json
{
  "method": "paid_assessment",
  "method_details": {
    "cost_usd": 5.00,
    "additional_signals": ["device_attestation", "behavioral"]
  }
}
```

Recipients can then filter based on method properties.

-----

## Guidance for Recipients

### Evaluating Methods

When deciding which HAP methods to accept, consider:

|Factor              |Physical Methods    |Digital Methods        |
|--------------------|--------------------|-----------------------|
|Cost signal strength|High                |Depends on price       |
|Timing              |Delayed (days)      |Instant                |
|Attention value     |High (desk presence)|Standard               |
|Externalization risk|Very low            |Low if well-implemented|

### Trust Decisions

Listing in the HAP directory indicates a VA has published a valid `/.well-known/hap.json` endpoint. It does not constitute endorsement.

Recipients should evaluate:

- The VA's verification method against these requirements
- The VA's reputation and operational history
- Whether the method's properties match the role's needs

-----

## Relationship to Proof-of-Work History

HAP descends from a lineage including Dwork-Naor (1992), Hashcash (1997), Penny Black (2003), and Bitcoin (2008). Key lessons incorporated:

|Historical System|Failure Mode                      |HAP Response                                      |
|-----------------|----------------------------------|--------------------------------------------------|
|Hashcash         |Botnet externalization            |Require real money, not computation               |
|Penny Black      |Calibration impossible            |VAs set own prices; market determines viability   |
|Penny Black      |Network effects blocked deployment|Open protocol; immediate value for early adopters |
|Bitcoin          |None (different goal)             |Adopt: cryptographic binding, public verifiability|

For deeper background, see the cited research in the specification.

-----

## Summary

A HAP-compliant verification method must:

1. ✅ Require non-externalizable cost
2. ✅ Scale linearly with volume
3. ✅ Cryptographically bind to recipient and timestamp
4. ✅ Be verifiable using only the claim and public keys

Content binding (via `x-content-hash`) is optional and VA discretion.
