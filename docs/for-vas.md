# Becoming a Verification Authority

HAP is an open protocol. Anyone can implement it without permission or approval. This guide covers the technical requirements and operational standards for running a Verification Authority (VA).

For the authoritative requirements that define HAP-compliant verification methods, see **[Method Requirements](method-requirements.md)**.

## What VAs Do

A Verification Authority:

1. **Verifies human effort.** Through some costly or difficult-to-automate action.
2. **Signs claims.** Using Ed25519 cryptographic signatures.
3. **Hosts verification endpoints.** So anyone can verify the claims.

## Technical Requirements

To implement HAP, you must:

### 1. Generate an Ed25519 Keypair

```typescript
import * as jose from "jose";

const { publicKey, privateKey } = await jose.generateKeyPair("EdDSA", {
  crv: "Ed25519",
});
```

Keep the private key secure. Never expose it.

### 2. Implement Required Endpoints

**`GET /.well-known/hap.json`** - Your public key(s)

```json
{
  "issuer": "your-domain.com",
  "keys": [
    {
      "kid": "your_key_001",
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "<base64url-public-key>"
    }
  ]
}
```

You MAY include an optional `va` object to self-describe your service:

```json
{
  "issuer": "your-domain.com",
  "keys": [...],
  "va": {
    "name": "Your VA Name",
    "methods": ["physical_mail"],
    "status": "active",
    "description": "Brief description of your verification service"
  }
}
```

This allows verifiers to discover your capabilities without querying a central directory.

**`GET /api/v1/verify/{hapId}`** - Verification API

```json
{
  "valid": true,
  "id": "hap_abc123xyz456",
  "claims": { ... },
  "jws": "eyJ...",
  "issuer": "your-domain.com",
  "verifyUrl": "https://your-domain.com/v/hap_abc123xyz456"
}
```

**`GET /v/{hapId}`** - Human-readable verification page

A mobile-friendly HTML page displaying the claim details.

### 3. Sign Claims Correctly

```typescript
import * as jose from "jose";

const claim = {
  v: "0.1",
  id: "hap_" + generateId(),
  type: "human_effort",
  method: "your_method", // or use x- prefix for custom: "x-your-method"
  to: {
    name: "Target Corp",
    domain: "targetcorp.com", // optional but recommended
  },
  at: new Date().toISOString(),
  // exp: optional expiration timestamp
  iss: "your-domain.com",
};

const jws = await new jose.CompactSign(
  new TextEncoder().encode(JSON.stringify(claim)),
)
  .setProtectedHeader({ alg: "EdDSA", kid: "your_key_001" })
  .sign(privateKey);
```

### 4. Use Proper HAP IDs

Format: `hap_` + 12 alphanumeric characters

Use a cryptographically secure random generator:

```typescript
import { nanoid } from "nanoid";
const hapId = `hap_${nanoid(12)}`;
```

## Trust Requirements

Technical implementation is necessary but not sufficient. To be a trusted VA:

### Verification Method Must Meet HAP Requirements

Your verification method must satisfy the four core requirements defined in [Method Requirements](method-requirements.md):

1. **Non-externalizable cost** — The cost cannot be pushed to unwitting third parties
2. **Linear scaling** — N verifications must cost approximately N times one verification
3. **Cryptographic binding** — Claims bound to content, recipient, and timestamp
4. **Verifiable commitment** — Verifiable using only the claim and public keys

"Clicking a button" is not a verification method. See the [full requirements](method-requirements.md) for detailed criteria and examples.

### Claims Must Be Accurate

Only sign claims for actions that actually happened. Never pre-sign or batch-sign claims.

### Security Must Be Robust

- Private keys in secure storage (HSM preferred)
- HTTPS everywhere
- Regular security audits

### Transparency

- Document your verification method publicly
- Explain what you do and don't verify
- Be clear about your limitations

### Privacy Policy (Required)

VAs MUST publish a privacy policy that documents:

- What verifier information (if any) is logged
- How long logs are retained
- How sender data is handled

VAs SHOULD NOT log verifier IP addresses or queries.

### Claim Retention

- VAs MUST keep claims verifiable for a minimum of **2 years**
- VAs SHOULD keep claims indefinitely if operationally feasible
- Claims MAY include an optional `exp` (expiration) field

### Claim Revocation

VAs MUST support claim revocation for these cases:

| Reason         | Description                           |
| -------------- | ------------------------------------- |
| `fraud`        | Claim was issued fraudulently         |
| `error`        | Claim contained incorrect information |
| `legal`        | Legal requirement (court order, etc.) |
| `user_request` | Sender requested removal              |

When a claim is revoked, return a revoked response (see SPEC.md Section 5.2) rather than silently deleting it.

## Listing in the Directory

The HAP repository maintains a [VA directory](../directory/) for discovery purposes. Being listed means you've published a valid HAP endpoint—it does **not** imply endorsement or trust recommendation.

### To be listed:

1. Implement all technical requirements above
2. Publish your `/.well-known/hap.json` endpoint
3. Open a PR to [github.com/Blue-Scroll/hap](https://github.com/Blue-Scroll/hap) adding your domain to `directory/vas.json`
4. We'll verify your endpoint responds correctly

### What listing means:

- Your domain appears in `directory/vas.json`
- Verifiers can discover you exist
- You follow the HAP protocol

### What listing does NOT mean:

- We endorse your verification methods
- We recommend trusting your claims
- We have audited your operations

Trust decisions belong to verifiers (recipients), who should evaluate your verification methods, reputation, and operational practices for their specific use case.

## Example VAs

| Type               | Method                            | Example  |
| ------------------ | --------------------------------- | -------- |
| Physical mail      | Sends physical mail to recipients | Ballista |
| Video verification | Live interview with a human       | (future) |
| Paid assessment    | Completes a paid skills test      | (future) |
| Network referral   | Referred by verified professional | (future) |

## Questions?

Open an issue at [github.com/Blue-Scroll/hap](https://github.com/Blue-Scroll/hap)
