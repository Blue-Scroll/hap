# HAP v0.1 Technical Specification

**Version:** 0.1
**Status:** Draft
**Last Updated:** January 2026

---

## 1. Overview

The Human Attestation Protocol (HAP) is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

HAP is a **specification**, not infrastructure. Each VA hosts their own endpoints. There is no central server.

---

## 2. Terminology

| Term          | Definition                                                                            |
| ------------- | ------------------------------------------------------------------------------------- |
| **VA**        | Verification Authority - an entity that creates signed verification claims            |
| **Claim**     | A structured assertion about a sender's effort                                        |
| **Sender**    | The party whose effort is being attested (e.g., job applicant, citizen, contributor)  |
| **Recipient** | The party receiving the claim (e.g., employer, government agency, maintainer)         |
| **JWS**       | JSON Web Signature - the signed payload format                                        |
| **HAP ID**    | A unique identifier for a verification claim (format: `hap_` + 12 alphanumeric chars) |

---

## 3. Verification Claims

### 3.1 Claim Schema

```json
{
  "v": "0.1",
  "id": "hap_abc123xyz456",
  "type": "human_effort",
  "method": "physical_mail",
  "tier": "standard",
  "to": {
    "name": "Acme Corp",
    "domain": "acme.com"
  },
  "at": "2026-01-19T06:00:00Z",
  "exp": "2028-01-19T06:00:00Z",
  "iss": "ballista.jobs"
}
```

### 3.2 Field Definitions

| Field       | Type   | Required | Description                                           |
| ----------- | ------ | -------- | ----------------------------------------------------- |
| `v`         | string | Yes      | Protocol version (currently "0.1")                    |
| `id`        | string | Yes      | Unique HAP ID for this claim                          |
| `type`      | string | Yes      | Claim type (see 3.3)                                  |
| `method`    | string | Yes      | Verification method used (see 3.4)                    |
| `tier`      | string | No       | Service tier (VA-specific)                            |
| `to.name`   | string | Yes      | Target recipient name                                 |
| `to.domain` | string | No       | Target recipient domain for unambiguous identification|
| `at`        | string | Yes      | ISO 8601 timestamp of verification                    |
| `exp`       | string | No       | ISO 8601 timestamp of claim expiration                |
| `iss`       | string | Yes      | Issuer domain (VA's domain)                           |

### 3.3 Claim Types

The `type` field identifies what the claim attests to. Types are extensible using the same model as methods.

#### Registered Types

| Type                   | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `human_effort`         | Sender demonstrated genuine effort through a costly action   |
| `recipient_commitment` | Recipient has committed to reviewing HAP-verified messages   |

#### Custom Types

VAs MAY define additional claim types using an `x-` prefix (e.g., `x-identity`, `x-credential`). Custom types are first-class; the prefix is a namespace convention.

To register a type, submit documentation to the HAP repository.

#### Recipient Commitment Claims

The `recipient_commitment` type allows VAs to certify that a recipient has committed to engaging with HAP-verified messages.

```json
{
  "v": "0.1",
  "id": "hap_rcp_abc123xyz",
  "type": "recipient_commitment",
  "recipient": {
    "name": "Acme Corp",
    "domain": "acme.com"
  },
  "commitment": "review_verified",
  "at": "2026-01-19T06:00:00Z",
  "exp": "2027-01-19T06:00:00Z",
  "iss": "ballista.jobs"
}
```

| Commitment Level      | Description                             |
| --------------------- | --------------------------------------- |
| `review_verified`     | Will review all HAP-verified messages   |
| `prioritize_verified` | HAP messages receive priority review    |
| `respond_verified`    | Commits to responding to HAP messages   |

VAs MAY define additional commitment levels with an `x-` prefix.

### 3.4 Verification Methods

The `method` field identifies what verification action the VA performed. Methods are VA-defined; recipients decide which methods to accept.

#### Registered Methods

The following methods are documented in the HAP repository. Any VA may use them:

| Method            | Description                         |
| ----------------- | ----------------------------------- |
| `physical_mail`   | Application sent via physical mail  |
| `video_interview` | Live video interview with a human   |
| `paid_assessment` | Completed a paid skills assessment  |
| `referral`        | Referred by a verified professional |

#### Custom Methods

VAs MAY define additional methods. To avoid namespace collision with future registered methods, custom methods SHOULD use an `x-` prefix:

| Example              | Description             |
| -------------------- | ----------------------- |
| `x-live-coding`      | Live coding assessment  |
| `x-portfolio-review` | Manual portfolio review |
| `x-in-person`        | In-person verification  |

**Custom methods are first-class.** The `x-` prefix is a namespace convention, not a status indicator. Recipients MAY accept any method that meets the requirements in [Method Requirements](/docs/method-requirements.md).

To register a method (remove the `x-` prefix), submit documentation to the HAP repository. Registration requires only documentation, not approval.

---

## 4. Cryptographic Signatures

### 4.1 Algorithm

VAs MUST use **Ed25519** (EdDSA) for signing claims.

Rationale:

- Fast verification
- Small key and signature sizes
- No parameter negotiation attacks
- Widely supported (jose, libsodium, etc.)

### 4.2 JWS Format

Claims are signed using JWS Compact Serialization:

```
<base64url-header>.<base64url-payload>.<base64url-signature>
```

#### Header

```json
{
  "alg": "EdDSA",
  "kid": "ba_key_001"
}
```

| Field | Description                            |
| ----- | -------------------------------------- |
| `alg` | Always "EdDSA" for Ed25519             |
| `kid` | Key ID referencing the VA's public key |

#### Payload

The claim object from Section 3.1, JSON-encoded.

#### Signature

Ed25519 signature over `<header>.<payload>`.

---

## 5. Required Endpoints

Every VA MUST implement these endpoints:

### 5.1 Public Key Endpoint

```
GET /.well-known/hap.json
```

Returns the VA's public keys in JWK format.

**Response:**

```json
{
  "issuer": "ballista.jobs",
  "keys": [
    {
      "kid": "ba_key_001",
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "<base64url-encoded-public-key>"
    }
  ]
}
```

| Field        | Description                                 |
| ------------ | ------------------------------------------- |
| `issuer`     | VA's domain, must match `iss` in claims     |
| `keys`       | Array of JWK public keys                    |
| `keys[].kid` | Key identifier, matches `kid` in JWS header |
| `keys[].kty` | Key type, always "OKP" for Ed25519          |
| `keys[].crv` | Curve, always "Ed25519"                     |
| `keys[].x`   | Base64url-encoded public key (32 bytes)     |

#### VA Self-Description Extension

VAs MAY include an optional `va` object to provide additional metadata about their service:

```json
{
  "issuer": "ballista.jobs",
  "keys": [...],
  "va": {
    "name": "Ballista",
    "methods": ["physical_mail"],
    "status": "active",
    "description": "Physical mail verification for job applications"
  }
}
```

| Field            | Type     | Required | Description                           |
| ---------------- | -------- | -------- | ------------------------------------- |
| `va.name`        | string   | Yes      | Human-readable VA name                |
| `va.methods`     | string[] | Yes      | Array of verification methods offered |
| `va.status`      | string   | Yes      | Operational status (see below)        |
| `va.description` | string   | No       | Brief description of the VA's service |

**Status values:**

| Status       | Description                             |
| ------------ | --------------------------------------- |
| `active`     | VA is operational and issuing claims    |
| `deprecated` | VA will cease operations; no new claims |
| `suspended`  | Temporarily not issuing claims          |

This extension allows VAs to self-describe their capabilities without requiring central directory updates.

### 5.2 Verification API Endpoint

```
GET /api/v1/verify/{hapId}
```

Returns the verification claim with its signature.

#### HTTP Status Codes

| Status | Condition                      |
| ------ | ------------------------------ |
| 200    | Claim found (valid or revoked) |
| 400    | Invalid HAP ID format          |
| 404    | Claim not found                |

#### Response (valid claim)

```json
{
  "valid": true,
  "id": "hap_abc123xyz456",
  "claims": {
    "v": "0.1",
    "id": "hap_abc123xyz456",
    "type": "human_effort",
    "method": "physical_mail",
    "tier": "standard",
    "to": {
      "name": "Acme Corp",
      "domain": "acme.com"
    },
    "at": "2026-01-19T06:00:00Z",
    "exp": "2028-01-19T06:00:00Z",
    "iss": "ballista.jobs"
  },
  "jws": "eyJhbGciOiJFZERTQSIsImtpZCI6ImJhX2tleV8wMDEifQ...",
  "issuer": "ballista.jobs",
  "verifyUrl": "https://www.ballista.jobs/v/hap_abc123xyz456"
}
```

#### Response (revoked claim)

```json
{
  "valid": false,
  "id": "hap_abc123xyz456",
  "revoked": true,
  "revocationReason": "user_request",
  "revokedAt": "2026-02-01T12:00:00Z",
  "issuer": "ballista.jobs"
}
```

| Revocation Reason | Description                           |
| ----------------- | ------------------------------------- |
| `fraud`           | Claim was issued fraudulently         |
| `error`           | Claim contained incorrect information |
| `legal`           | Revoked due to legal requirement      |
| `user_request`    | Applicant requested removal           |

#### Response (not found)

```json
{
  "valid": false,
  "error": "not_found"
}
```

#### Error Codes

| Error            | HTTP Status | Description              |
| ---------------- | ----------- | ------------------------ |
| `not_found`      | 404         | HAP ID does not exist    |
| `invalid_format` | 400         | HAP ID format is invalid |

### 5.3 Human-Readable Verification Page

```
GET /v/{hapId}
```

A mobile-friendly HTML page showing verification details. This is where the VA's branding lives. The page should display:

- Company name
- Verification date
- Verification method
- VA identity

This is the URL encoded in QR codes.

---

## 6. HAP ID Format

HAP IDs follow this format:

```
hap_[a-zA-Z0-9]{12}
```

Examples:

- `hap_abc123xyz456`
- `hap_7KqMn2pR9xYz`

The 12-character suffix should be generated using a cryptographically secure random generator.

---

## 7. Verification Flow

### 7.1 For Recipients (Verifiers)

1. Receive message with HAP verification (QR code or URL)
2. Extract HAP ID from URL: `https://www.ballista.jobs/v/hap_abc123xyz456`
3. Fetch claim: `GET https://www.ballista.jobs/api/v1/verify/hap_abc123xyz456`
4. Optionally verify signature:
   a. Fetch public key: `GET https://www.ballista.jobs/.well-known/hap.json`
   b. Verify JWS signature against the claim payload

### 7.2 For VAs (Issuers)

1. Sender completes verification action (e.g., sends physical mail, pays fee)
2. Generate HAP ID
3. Create claim object
4. Sign claim with Ed25519 private key
5. Store claim + JWS
6. Include verification in delivered message (QR code, etc.)

---

## 8. Security Considerations

### 8.1 Key Management

- VAs MUST store private keys securely (HSM, encrypted at rest)
- VAs SHOULD support key rotation via multiple keys in `/.well-known/hap.json`
- VAs MUST NOT include private keys in JWK responses

### 8.2 Replay Protection

- Each HAP ID is unique and bound to a specific message
- Verifiers should check the `to.domain` field matches their organization
- Timestamps (`at` field) can be used to reject stale claims

### 8.3 Privacy

- Claims intentionally exclude sender identity
- Only the target recipient is recorded
- VAs SHOULD NOT log verifier IP addresses or queries
- VAs MUST publish a privacy policy documenting what verifier information, if any, is logged

### 8.4 Claim Retention

- VAs MUST keep claims verifiable for a minimum of **2 years** from the `at` timestamp
- VAs SHOULD keep claims verifiable indefinitely if operationally feasible
- Claims MAY include an `exp` field for explicit expiration before the 2-year minimum
- If a VA ceases operations, claims become unverifiable (this is acceptable)

### 8.5 Claim Revocation

VAs MAY revoke claims under specific circumstances:

| Reason         | When to Use                                   |
| -------------- | --------------------------------------------- |
| `fraud`        | Claim was issued based on fraudulent activity |
| `error`        | Claim contains incorrect information          |
| `legal`        | Legal requirement (court order, etc.)         |
| `user_request` | Sender requests removal (GDPR, etc.)          |

Revocation requirements:

- VAs MUST return a revoked response (see Section 5.2) rather than silently deleting claims
- VAs SHOULD retain revocation records for the original claim retention period
- Revoked claims MUST NOT be restored once revoked

---

## 9. Implementation Notes

### 9.1 Recommended Libraries

| Language              | Library                     |
| --------------------- | --------------------------- |
| JavaScript/TypeScript | `jose`                      |
| Python                | `PyJWT` with `cryptography` |
| Go                    | `go-jose`                   |
| Rust                  | `jsonwebtoken`              |

### 9.2 Example: Verify a Signature (TypeScript)

```typescript
import * as jose from "jose";

async function verifyHapClaim(
  jws: string,
  issuerDomain: string,
): Promise<boolean> {
  // Fetch public keys
  const response = await fetch(`https://${issuerDomain}/.well-known/hap.json`);
  const { keys } = await response.json();

  // Parse JWS header to get kid
  const { kid } = jose.decodeProtectedHeader(jws);
  const jwk = keys.find((k) => k.kid === kid);

  if (!jwk) throw new Error("Key not found");

  // Import public key and verify
  const publicKey = await jose.importJWK(jwk, "EdDSA");
  const { payload } = await jose.compactVerify(jws, publicKey);

  return true; // Signature valid
}
```

---

## 10. VA Directory

### 10.1 Purpose

The official HAP repository maintains a machine-readable directory of Verification Authorities at `directory/vas.json`. This directory serves as a **discovery mechanism**, not a trust authority.

**The directory answers:** "What VAs exist that implement HAP?"

**The directory does NOT answer:** "Which VAs should I trust?"

Trust decisions remain with recipients, who must evaluate each VA's verification methods and reputation for their specific use case.

### 10.2 Directory Schema

```json
{
  "$schema": "https://hap.dev/schemas/directory-v1.json",
  "version": "1.0",
  "description": "HAP Verification Authority Directory",
  "updated": "2026-01-20T00:00:00Z",
  "vas": [
    {
      "domain": "ballista.jobs",
      "addedAt": "2026-01-15",
      "lastVerifiedAt": "2026-01-20"
    }
  ]
}
```

| Field                  | Type   | Description                                         |
| ---------------------- | ------ | --------------------------------------------------- |
| `$schema`              | string | JSON Schema reference for validation                |
| `version`              | string | Directory format version                            |
| `description`          | string | Human-readable description                          |
| `updated`              | string | ISO 8601 timestamp of last directory update         |
| `vas`                  | array  | Array of VA entries                                 |
| `vas[].domain`         | string | VA's domain (also their issuer identifier)          |
| `vas[].addedAt`        | string | Date the VA was added to the directory (YYYY-MM-DD) |
| `vas[].lastVerifiedAt` | string | Date endpoint was last verified (YYYY-MM-DD)        |

### 10.3 Listing Criteria

A VA may be listed in the directory if:

1. They have published a valid `/.well-known/hap.json` endpoint
2. The endpoint returns properly formatted public keys
3. They follow the HAP protocol specification

Listing does **not** imply endorsement, audit, or trust recommendation.

### 10.4 Removal

VAs may be removed from the directory if:

- Their `/.well-known/hap.json` endpoint stops responding
- Their endpoint returns invalid or malformed data
- They request removal

Removal from the directory does not invalidate previously signed claims—those remain cryptographically verifiable as long as the public keys are known.

---

## 11. Governance

### 11.1 Open Protocol

HAP is an open protocol. Anyone can implement it technically without permission or approval. The protocol defines the format; trust decisions belong to verifiers.

### 11.2 Verification Authority Independence

VAs operate independently. They:

- Choose their own verification methods
- Set their own pricing and terms
- Build their own reputation
- Are responsible for their own security and operations

HAP provides the common language. VAs compete on service quality.

### 11.3 Platform Compatibility

Platforms may claim "HAP Compatible" status if they:

- Can ingest HAP claims from incoming messages
- Display verification status to recipients
- Link to VA verification pages

This is a self-declared technical capability. No approval process required.

### 11.4 Protocol Evolution

The HAP specification is maintained by BlueScroll Inc. Changes follow semantic versioning:

- **Patch versions** (0.1.x): Clarifications, typo fixes
- **Minor versions** (0.x.0): Backward-compatible additions
- **Major versions** (x.0.0): Breaking changes (rare)

VAs and verifiers should implement based on the `v` field in claims.

---

## 12. Version History

| Version | Date         | Changes       |
| ------- | ------------ | ------------- |
| 0.1     | January 2026 | Initial draft |

---

## 13. Authors

- BlueScroll Inc.

## 14. License

This specification is licensed under Apache 2.0.
