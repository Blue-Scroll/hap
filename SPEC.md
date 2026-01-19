# HAP v0.1 Technical Specification

**Version:** 0.1
**Status:** Draft
**Last Updated:** January 2026

---

## 1. Overview

The Human Application Protocol (HAP) is an open standard for verified job applications. It enables Verification Authorities (VAs) to cryptographically attest that an applicant took deliberate, costly action when applying for a job.

HAP is a **specification**, not infrastructure. Each VA hosts their own endpoints. There is no central server.

---

## 2. Terminology

| Term       | Definition                                                                            |
| ---------- | ------------------------------------------------------------------------------------- |
| **VA**     | Verification Authority - an entity that creates signed verification claims            |
| **Claim**  | A structured assertion about an applicant's effort                                    |
| **JWS**    | JSON Web Signature - the signed payload format                                        |
| **HAP ID** | A unique identifier for a verification claim (format: `hap_` + 12 alphanumeric chars) |

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
    "company": "Acme Corp",
    "domain": "acme.com"
  },
  "at": "2026-01-19T06:00:00Z",
  "exp": "2028-01-19T06:00:00Z",
  "iss": "ballista.io"
}
```

### 3.2 Field Definitions

| Field        | Type   | Required | Description                                          |
| ------------ | ------ | -------- | ---------------------------------------------------- |
| `v`          | string | Yes      | Protocol version (currently "0.1")                   |
| `id`         | string | Yes      | Unique HAP ID for this claim                         |
| `type`       | string | Yes      | Claim type (see 3.3)                                 |
| `method`     | string | Yes      | Verification method used (see 3.4)                   |
| `tier`       | string | No       | Service tier (VA-specific)                           |
| `to.company` | string | Yes      | Target company name                                  |
| `to.domain`  | string | No       | Target company domain for unambiguous identification |
| `at`         | string | Yes      | ISO 8601 timestamp of verification                   |
| `exp`        | string | No       | ISO 8601 timestamp of claim expiration               |
| `iss`        | string | Yes      | Issuer domain (VA's domain)                          |

### 3.3 Claim Types

| Type                  | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| `human_effort`        | Applicant demonstrated genuine effort through a costly action |
| `employer_commitment` | Employer has committed to reviewing HAP-verified applications |

Future versions may add: `identity`, `credential`, `reference`.

#### Employer Commitment Claims

The `employer_commitment` type allows VAs to certify that an employer has committed to engaging with HAP-verified applications.

```json
{
  "v": "0.1",
  "id": "hap_emp_abc123xyz",
  "type": "employer_commitment",
  "employer": {
    "name": "Acme Corp",
    "domain": "acme.com"
  },
  "commitment": "review_verified",
  "at": "2026-01-19T06:00:00Z",
  "exp": "2027-01-19T06:00:00Z",
  "iss": "ballista.io"
}
```

| Commitment Level      | Description                               |
| --------------------- | ----------------------------------------- |
| `review_verified`     | Will review all HAP-verified applications |
| `prioritize_verified` | HAP applications receive priority review  |
| `respond_verified`    | Commits to responding to HAP applications |

VAs MAY define additional commitment levels with an `x-` prefix.

### 3.4 Verification Methods

#### Core Methods

| Method            | Description                         |
| ----------------- | ----------------------------------- |
| `physical_mail`   | Application sent via physical mail  |
| `video_interview` | Live video interview with a human   |
| `paid_assessment` | Completed a paid skills assessment  |
| `referral`        | Referred by a verified professional |

#### Custom Methods

VAs MAY define custom verification methods using an `x-` prefix:

| Example              | Description             |
| -------------------- | ----------------------- |
| `x-live-coding`      | Live coding assessment  |
| `x-portfolio-review` | Manual portfolio review |
| `x-in-person`        | In-person verification  |

Custom methods that gain adoption MAY be promoted to core methods in future spec versions.

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
  "issuer": "ballista.io",
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
      "company": "Acme Corp",
      "domain": "acme.com"
    },
    "at": "2026-01-19T06:00:00Z",
    "exp": "2028-01-19T06:00:00Z",
    "iss": "ballista.io"
  },
  "jws": "eyJhbGciOiJFZERTQSIsImtpZCI6ImJhX2tleV8wMDEifQ...",
  "issuer": "ballista.io",
  "verifyUrl": "https://ballista.io/v/hap_abc123xyz456"
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
  "issuer": "ballista.io"
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

### 7.1 For Employers (Verifiers)

1. Receive application with HAP verification (QR code or URL)
2. Extract HAP ID from URL: `https://ballista.io/v/hap_abc123xyz456`
3. Fetch claim: `GET https://ballista.io/api/v1/verify/hap_abc123xyz456`
4. Optionally verify signature:
   a. Fetch public key: `GET https://ballista.io/.well-known/hap.json`
   b. Verify JWS signature against the claim payload

### 7.2 For VAs (Issuers)

1. Applicant completes verification action (e.g., sends physical mail)
2. Generate HAP ID
3. Create claim object
4. Sign claim with Ed25519 private key
5. Store claim + JWS
6. Include verification in delivered application (QR code, etc.)

---

## 8. Security Considerations

### 8.1 Key Management

- VAs MUST store private keys securely (HSM, encrypted at rest)
- VAs SHOULD support key rotation via multiple keys in `/.well-known/hap.json`
- VAs MUST NOT include private keys in JWK responses

### 8.2 Replay Protection

- Each HAP ID is unique and bound to a specific application
- Verifiers should check the `to.company` field matches their organization
- Timestamps (`at` field) can be used to reject stale claims

### 8.3 Privacy

- Claims intentionally exclude applicant identity
- Only the target company is recorded
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
| `user_request` | Applicant requests removal (GDPR, etc.)       |

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

## 10. Governance

### 10.1 Verification Authority Recognition

HAP is an open protocol. Anyone can implement it technically. Recognition in official directories follows a tiered model:

#### Tier 1: Self-Declared VAs

- Anyone can implement HAP and sign claims
- No approval needed for technical implementation
- May be listed in community directories

#### Tier 2: Recognized VAs

Listed in the official HAP VA directory (README.md). Requirements:

- Working technical implementation
- Documented verification method
- Published privacy policy
- Review by HAP maintainers

To apply: Open a PR to [github.com/BlueScroll/hap](https://github.com/BlueScroll/hap) with evidence of your implementation.

#### Tier 3: Founding VAs (Future)

Reserved for VAs with established track records. May include:

- Third-party security audits
- Demonstrated operational history
- Higher trust signals for employers

### 10.2 Platform Compatibility

Job platforms (ATS, job boards) may claim "HAP Compatible" status if they:

- Can ingest HAP claims from applications
- Display verification status to employers
- Link to VA verification pages

This is a self-declared technical capability. No approval process required.

### 10.3 Directory Management

The HAP maintainers (currently BlueScroll Inc.) manage the official VA directory. VAs may be removed for:

- Signing claims without actual verification
- Ceasing operations
- Significant security incidents
- Repeated protocol violations

---

## 11. Version History

| Version | Date         | Changes       |
| ------- | ------------ | ------------- |
| 0.1     | January 2026 | Initial draft |

---

## 12. Authors

- BlueScroll Inc.

## 13. License

This specification is licensed under Apache 2.0.
