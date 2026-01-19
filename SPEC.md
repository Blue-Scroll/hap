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

| Term | Definition |
|------|------------|
| **VA** | Verification Authority - an entity that creates signed verification claims |
| **Claim** | A structured assertion about an applicant's effort |
| **JWS** | JSON Web Signature - the signed payload format |
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
    "company": "Acme Corp"
  },
  "at": "2026-01-19T06:00:00Z",
  "iss": "ballista.app"
}
```

### 3.2 Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | string | Yes | Protocol version (currently "0.1") |
| `id` | string | Yes | Unique HAP ID for this claim |
| `type` | string | Yes | Claim type (see 3.3) |
| `method` | string | Yes | Verification method used |
| `tier` | string | No | Service tier (VA-specific) |
| `to.company` | string | Yes | Target company name |
| `at` | string | Yes | ISO 8601 timestamp of verification |
| `iss` | string | Yes | Issuer domain (VA's domain) |

### 3.3 Claim Types

| Type | Description |
|------|-------------|
| `human_effort` | Applicant demonstrated genuine effort through a costly action |

Future versions may add: `identity`, `credential`, `reference`.

### 3.4 Verification Methods

| Method | Description |
|--------|-------------|
| `physical_mail` | Application sent via physical mail |

Future versions may add: `video_interview`, `paid_assessment`, `referral`.

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

| Field | Description |
|-------|-------------|
| `alg` | Always "EdDSA" for Ed25519 |
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
  "issuer": "ballista.app",
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

| Field | Description |
|-------|-------------|
| `issuer` | VA's domain, must match `iss` in claims |
| `keys` | Array of JWK public keys |
| `keys[].kid` | Key identifier, matches `kid` in JWS header |
| `keys[].kty` | Key type, always "OKP" for Ed25519 |
| `keys[].crv` | Curve, always "Ed25519" |
| `keys[].x` | Base64url-encoded public key (32 bytes) |

### 5.2 Verification API Endpoint

```
GET /api/v1/verify/{hapId}
```

Returns the verification claim with its signature.

**Response (valid claim):**

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
      "company": "Acme Corp"
    },
    "at": "2026-01-19T06:00:00Z",
    "iss": "ballista.app"
  },
  "jws": "eyJhbGciOiJFZERTQSIsImtpZCI6ImJhX2tleV8wMDEifQ...",
  "issuer": "ballista.app",
  "verifyUrl": "https://ballista.app/v/hap_abc123xyz456"
}
```

**Response (invalid/not found):**

```json
{
  "valid": false,
  "error": "not_found"
}
```

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
2. Extract HAP ID from URL: `https://ballista.app/v/hap_abc123xyz456`
3. Fetch claim: `GET https://ballista.app/api/v1/verify/hap_abc123xyz456`
4. Optionally verify signature:
   a. Fetch public key: `GET https://ballista.app/.well-known/hap.json`
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
- VAs should not log verifier IP addresses or queries

---

## 9. Implementation Notes

### 9.1 Recommended Libraries

| Language | Library |
|----------|---------|
| JavaScript/TypeScript | `jose` |
| Python | `PyJWT` with `cryptography` |
| Go | `go-jose` |
| Rust | `jsonwebtoken` |

### 9.2 Example: Verify a Signature (TypeScript)

```typescript
import * as jose from 'jose'

async function verifyHapClaim(jws: string, issuerDomain: string): Promise<boolean> {
  // Fetch public keys
  const response = await fetch(`https://${issuerDomain}/.well-known/hap.json`)
  const { keys } = await response.json()

  // Parse JWS header to get kid
  const { kid } = jose.decodeProtectedHeader(jws)
  const jwk = keys.find(k => k.kid === kid)

  if (!jwk) throw new Error('Key not found')

  // Import public key and verify
  const publicKey = await jose.importJWK(jwk, 'EdDSA')
  const { payload } = await jose.compactVerify(jws, publicKey)

  return true // Signature valid
}
```

---

## 10. Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | January 2026 | Initial draft |

---

## 11. Authors

- BlueScroll Inc.

## 12. License

This specification is licensed under Apache 2.0.
