# Becoming a Verification Authority

HAP is an open protocol. Anyone can implement it. But being recognized as a trusted Verification Authority (VA) requires meeting certain standards.

## What VAs Do

A Verification Authority:

1. **Verifies human effort.** Through some costly or difficult-to-automate action.
2. **Signs claims.** Using Ed25519 cryptographic signatures.
3. **Hosts verification endpoints.** So anyone can verify the claims.

## Technical Requirements

To implement HAP, you must:

### 1. Generate an Ed25519 Keypair

```typescript
import * as jose from 'jose'

const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA', {
  crv: 'Ed25519'
})
```

Keep the private key secure. Never expose it.

### 2. Implement Required Endpoints

**`GET /.well-known/hap.json`** - Your public key(s)

```json
{
  "issuer": "your-domain.com",
  "keys": [{
    "kid": "your_key_001",
    "kty": "OKP",
    "crv": "Ed25519",
    "x": "<base64url-public-key>"
  }]
}
```

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
import * as jose from 'jose'

const claim = {
  v: '0.1',
  id: 'hap_' + generateId(),
  type: 'human_effort',
  method: 'your_method',
  to: { company: 'Target Corp' },
  at: new Date().toISOString(),
  iss: 'your-domain.com'
}

const jws = await new jose.CompactSign(
  new TextEncoder().encode(JSON.stringify(claim))
)
  .setProtectedHeader({ alg: 'EdDSA', kid: 'your_key_001' })
  .sign(privateKey)
```

### 4. Use Proper HAP IDs

Format: `hap_` + 12 alphanumeric characters

Use a cryptographically secure random generator:

```typescript
import { nanoid } from 'nanoid'
const hapId = `hap_${nanoid(12)}`
```

## Trust Requirements

Technical implementation is necessary but not sufficient. To be a trusted VA:

### Verification Method Must Be Costly

The action you verify should have real cost or friction:
- Financial cost (physical mail, paid services)
- Time cost (video interviews, assessments)
- Scarcity (referrals from existing network)

"Clicking a button" is not a verification method.

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

## Listing in the Directory

To be listed in the official HAP VA directory:

1. Implement all technical requirements
2. Document your verification method
3. Open a PR to [github.com/BlueScroll/hap](https://github.com/BlueScroll/hap)
4. Include evidence of your verification process

We'll review and either approve or provide feedback.

## Example VAs

| Type | Method | Example |
|------|--------|---------|
| Physical mail | Sends actual mail to companies | Ballista |
| Video verification | Live interview with a human | (future) |
| Paid assessment | Completes a paid skills test | (future) |
| Network referral | Referred by verified professional | (future) |

## Questions?

Open an issue at [github.com/BlueScroll/hap](https://github.com/BlueScroll/hap)
