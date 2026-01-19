# bluescroll-hap

Official HAP (Human Application Protocol) SDK for Python.

HAP is an open standard for verified job applications. It enables Verification Authorities (VAs) to cryptographically attest that an applicant took deliberate, costly action when applying for a job.

## Installation

```bash
pip install bluescroll-hap
```

## Quick Start

### Verifying a Claim (For Employers)

```python
import asyncio
from hap import verify_hap_claim, is_claim_expired, is_claim_for_company

async def main():
    # Verify a claim from a HAP ID
    claim = await verify_hap_claim("hap_abc123xyz456", "ballista.app")

    if claim:
        # Check if not expired
        if is_claim_expired(claim):
            print("Claim has expired")
            return

        # Verify it's for your company
        if not is_claim_for_company(claim, "yourcompany.com"):
            print("Claim is for a different company")
            return

        print(f"Verified {claim['method']} application to {claim['to']['company']}")

asyncio.run(main())
```

### Verifying from a URL

```python
from hap import extract_hap_id_from_url, verify_hap_claim

async def verify_from_url(url: str):
    # Extract HAP ID from a verification URL
    hap_id = extract_hap_id_from_url(url)

    if hap_id:
        claim = await verify_hap_claim(hap_id, "ballista.app")
        return claim
    return None
```

### Verifying Signature Manually

```python
from hap import fetch_claim, verify_signature

async def verify_with_signature(hap_id: str):
    # Fetch the claim
    response = await fetch_claim(hap_id, "ballista.app")

    if response.get("valid") and "jws" in response:
        # Verify the cryptographic signature
        result = await verify_signature(response["jws"], "ballista.app")

        if result["valid"]:
            print("Signature verified!", result["claim"])
        else:
            print("Signature invalid:", result["error"])
```

### Signing Claims (For Verification Authorities)

```python
import json
from hap import (
    generate_key_pair,
    export_public_key_jwk,
    create_human_effort_claim,
    sign_claim,
)

# Generate a key pair (do this once, store securely)
private_key, public_key = generate_key_pair()

# Export public key for /.well-known/hap.json
jwk = export_public_key_jwk(public_key, "my_key_001")
well_known = {"issuer": "my-va.com", "keys": [jwk]}
print(json.dumps(well_known, indent=2))

# Create and sign a claim
claim = create_human_effort_claim(
    method="physical_mail",
    company="Acme Corp",
    domain="acme.com",
    tier="standard",
    issuer="my-va.com",
    expires_in_days=730,  # 2 years
)

jws = sign_claim(claim, private_key, kid="my_key_001")
print("Signed JWS:", jws)
```

### Creating Employer Commitment Claims

```python
from hap import create_employer_commitment_claim, sign_claim

claim = create_employer_commitment_claim(
    employer_name="Acme Corp",
    employer_domain="acme.com",
    commitment="review_verified",
    issuer="my-va.com",
    expires_in_days=365,
)

jws = sign_claim(claim, private_key, kid="my_key_001")
```

## API Reference

### Verification Functions

| Function | Description |
|----------|-------------|
| `verify_hap_claim(hap_id, issuer)` | Fetch and verify a claim, returns claim or None |
| `fetch_claim(hap_id, issuer)` | Fetch raw verification response from VA |
| `verify_signature(jws, issuer)` | Verify JWS signature against VA's public keys |
| `fetch_public_keys(issuer)` | Fetch VA's public keys from well-known endpoint |
| `is_valid_hap_id(id)` | Check if string matches HAP ID format |
| `extract_hap_id_from_url(url)` | Extract HAP ID from verification URL |
| `is_claim_expired(claim)` | Check if claim has passed expiration |
| `is_claim_for_company(claim, domain)` | Check if claim targets specific company |

### Signing Functions (For VAs)

| Function | Description |
|----------|-------------|
| `generate_key_pair()` | Generate Ed25519 key pair |
| `export_public_key_jwk(key, kid)` | Export public key as JWK |
| `sign_claim(claim, private_key, kid)` | Sign a claim, returns JWS |
| `generate_hap_id()` | Generate cryptographically secure HAP ID |
| `create_human_effort_claim(...)` | Create human_effort claim with defaults |
| `create_employer_commitment_claim(...)` | Create employer_commitment claim |

### Types

```python
from hap import (
    HapClaim,
    HumanEffortClaim,
    EmployerCommitmentClaim,
    VerificationResponse,
    HapWellKnown,
    HapJwk,
)
```

## Requirements

- Python 3.9+
- httpx (for async HTTP)
- PyJWT with cryptography

## License

Apache-2.0
