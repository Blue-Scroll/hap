# human-attestation

[![npm version](https://img.shields.io/npm/v/human-attestation.svg)](https://www.npmjs.com/package/human-attestation)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Official HAP (Human Attestation Protocol) SDK for JavaScript/TypeScript.

HAP is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

## Installation

```bash
npm install human-attestation
```

## Quick Start

### Verifying a Claim (For Recipients)

```typescript
import {
  verifyClaim,
  isClaimExpired,
  isClaimForRecipient,
} from "human-attestation";

// Verify a claim from a HAP ID
const claim = await verifyClaim("hap_abc123xyz456", "ballista.jobs");

if (claim) {
  // Check if not expired
  if (isClaimExpired(claim)) {
    console.log("Claim has expired");
    return;
  }

  // Verify it's for your organization
  if (!isClaimForRecipient(claim, "yourcompany.com")) {
    console.log("Claim is for a different recipient");
    return;
  }

  console.log(`Verified ${claim.method} application to ${claim.to.name}`);
}
```

### Verifying from a URL

```typescript
import { extractIdFromUrl, verifyClaim } from "human-attestation";

// Extract HAP ID from a verification URL
const url = "https://www.ballista.jobs/v/hap_abc123xyz456";
const hapId = extractIdFromUrl(url);

if (hapId) {
  const claim = await verifyClaim(hapId, "ballista.jobs");
  // ... verify claim
}
```

### Verifying Signature Manually

```typescript
import { fetchClaim, verifySignature } from "human-attestation";

// Fetch the claim
const response = await fetchClaim("hap_abc123xyz456", "ballista.jobs");

if (response.valid && "jws" in response) {
  // Verify the cryptographic signature
  const result = await verifySignature(response.jws, "ballista.jobs");

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
  createClaim,
  signClaim,
} from "human-attestation";

// Generate a key pair (do this once, store securely)
const { publicKey, privateKey } = await generateKeyPair();

// Export public key for /.well-known/hap.json
const jwk = await exportPublicKeyJwk(publicKey, "my_key_001");
console.log(JSON.stringify({ issuer: "my-va.com", keys: [jwk] }));

// Create and sign a claim
const claim = createClaim({
  method: "physical_mail",
  description: "Priority mail packet with handwritten cover letter",
  recipientName: "Acme Corp",
  domain: "acme.com",
  issuer: "my-va.com",
  expiresInDays: 730, // 2 years
  cost: { amount: 1500, currency: "USD" },
  time: 1800,
  physical: true,
});

const jws = await signClaim(claim, privateKey, { kid: "my_key_001" });
console.log("Signed JWS:", jws);
```

## API Reference

### Verification Functions

| Function                             | Description                                     |
| ------------------------------------ | ----------------------------------------------- |
| `verifyClaim(hapId, issuer)`         | Fetch and verify a claim, returns claim or null |
| `fetchClaim(hapId, issuer)`          | Fetch raw verification response from VA         |
| `verifySignature(jws, issuer)`       | Verify JWS signature against VA's public keys   |
| `fetchPublicKeys(issuer)`            | Fetch VA's public keys from well-known endpoint |
| `isValidId(id)`                      | Check if string matches HAP ID format           |
| `extractIdFromUrl(url)`              | Extract HAP ID from verification URL            |
| `isClaimExpired(claim)`              | Check if claim has passed expiration            |
| `isClaimForRecipient(claim, domain)` | Check if claim targets specific recipient       |

### Signing Functions (For VAs)

| Function                                | Description                              |
| --------------------------------------- | ---------------------------------------- |
| `generateKeyPair()`                     | Generate Ed25519 key pair                |
| `exportPublicKeyJwk(key, kid)`          | Export public key as JWK                 |
| `signClaim(claim, privateKey, options)` | Sign a claim, returns JWS                |
| `generateId()`                          | Generate cryptographically secure HAP ID |
| `createClaim(params)`                   | Create claim with defaults               |

### Types

```typescript
import type {
  Claim,
  ClaimCost,
  ClaimTarget,
  VerificationResponse,
  WellKnown,
  Jwk,
} from "human-attestation";
```

## Requirements

- Node.js 18+ (uses native fetch and crypto)
- For older Node.js versions, provide a custom `fetch` via options

## License

Apache-2.0
