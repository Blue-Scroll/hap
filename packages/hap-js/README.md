# @bluescroll/hap

Official HAP (Human Application Protocol) SDK for JavaScript/TypeScript.

HAP is an open standard for verified job applications. It enables Verification Authorities (VAs) to cryptographically attest that an applicant took deliberate, costly action when applying for a job.

## Installation

```bash
npm install @bluescroll/hap
```

## Quick Start

### Verifying a Claim (For Employers)

```typescript
import { verifyHapClaim, isClaimExpired, isClaimForCompany } from "@bluescroll/hap";

// Verify a claim from a HAP ID
const claim = await verifyHapClaim("hap_abc123xyz456", "ballista.app");

if (claim) {
  // Check if not expired
  if (isClaimExpired(claim)) {
    console.log("Claim has expired");
    return;
  }

  // Verify it's for your company
  if (!isClaimForCompany(claim, "yourcompany.com")) {
    console.log("Claim is for a different company");
    return;
  }

  console.log(`Verified ${claim.method} application to ${claim.to.company}`);
}
```

### Verifying from a URL

```typescript
import { extractHapIdFromUrl, verifyHapClaim } from "@bluescroll/hap";

// Extract HAP ID from a verification URL
const url = "https://ballista.app/v/hap_abc123xyz456";
const hapId = extractHapIdFromUrl(url);

if (hapId) {
  const claim = await verifyHapClaim(hapId, "ballista.app");
  // ... verify claim
}
```

### Verifying Signature Manually

```typescript
import { fetchClaim, verifySignature } from "@bluescroll/hap";

// Fetch the claim
const response = await fetchClaim("hap_abc123xyz456", "ballista.app");

if (response.valid && "jws" in response) {
  // Verify the cryptographic signature
  const result = await verifySignature(response.jws, "ballista.app");

  if (result.valid) {
    console.log("Signature verified!", result.claim);
  } else {
    console.log("Signature invalid:", result.error);
  }
}
```

### Signing Claims (For Verification Authorities)

```typescript
import {
  generateKeyPair,
  exportPublicKeyJwk,
  createHumanEffortClaim,
  signClaim,
} from "@bluescroll/hap";

// Generate a key pair (do this once, store securely)
const { publicKey, privateKey } = await generateKeyPair();

// Export public key for /.well-known/hap.json
const jwk = await exportPublicKeyJwk(publicKey, "my_key_001");
console.log(JSON.stringify({ issuer: "my-va.com", keys: [jwk] }));

// Create and sign a claim
const claim = createHumanEffortClaim({
  method: "physical_mail",
  company: "Acme Corp",
  domain: "acme.com",
  tier: "standard",
  issuer: "my-va.com",
  expiresInDays: 730, // 2 years
});

const jws = await signClaim(claim, privateKey, { kid: "my_key_001" });
console.log("Signed JWS:", jws);
```

### Creating Employer Commitment Claims

```typescript
import { createEmployerCommitmentClaim, signClaim } from "@bluescroll/hap";

const claim = createEmployerCommitmentClaim({
  employerName: "Acme Corp",
  employerDomain: "acme.com",
  commitment: "review_verified",
  issuer: "my-va.com",
  expiresInDays: 365,
});

const jws = await signClaim(claim, privateKey, { kid: "my_key_001" });
```

## API Reference

### Verification Functions

| Function | Description |
|----------|-------------|
| `verifyHapClaim(hapId, issuer)` | Fetch and verify a claim, returns claim or null |
| `fetchClaim(hapId, issuer)` | Fetch raw verification response from VA |
| `verifySignature(jws, issuer)` | Verify JWS signature against VA's public keys |
| `fetchPublicKeys(issuer)` | Fetch VA's public keys from well-known endpoint |
| `isValidHapId(id)` | Check if string matches HAP ID format |
| `extractHapIdFromUrl(url)` | Extract HAP ID from verification URL |
| `isClaimExpired(claim)` | Check if claim has passed expiration |
| `isClaimForCompany(claim, domain)` | Check if claim targets specific company |

### Signing Functions (For VAs)

| Function | Description |
|----------|-------------|
| `generateKeyPair()` | Generate Ed25519 key pair |
| `exportPublicKeyJwk(key, kid)` | Export public key as JWK |
| `signClaim(claim, privateKey, options)` | Sign a claim, returns JWS |
| `generateHapId()` | Generate cryptographically secure HAP ID |
| `createHumanEffortClaim(params)` | Create human_effort claim with defaults |
| `createEmployerCommitmentClaim(params)` | Create employer_commitment claim |

### Types

```typescript
import type {
  HapClaim,
  HumanEffortClaim,
  EmployerCommitmentClaim,
  VerificationResponse,
  HapWellKnown,
  HapJwk,
} from "@bluescroll/hap";
```

## Requirements

- Node.js 18+ (uses native fetch and crypto)
- For older Node.js versions, provide a custom `fetch` via options

## License

Apache-2.0
