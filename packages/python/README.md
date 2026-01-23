# human-attestation

[![PyPI version](https://img.shields.io/pypi/v/human-attestation.svg)](https://pypi.org/project/human-attestation/)
[![CI](https://github.com/Blue-Scroll/hap/actions/workflows/ci.yml/badge.svg)](https://github.com/Blue-Scroll/hap/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Official HAP (Human Attestation Protocol) SDK for Python.

HAP is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

## Installation

```bash
pip install human-attestation
```

## Quick Start

### Verifying a Claim (For Recipients)

```python
import asyncio
from human_attestation import verify_claim, is_claim_expired, is_claim_for_recipient

async def main():
    # Verify a claim from a HAP ID
    claim = await verify_claim("hap_abc123xyz456", "ballista.jobs")

    if claim:
        # Check if not expired
        if is_claim_expired(claim):
            print("Claim has expired")
            return

        # Verify it's for your organization
        if not is_claim_for_recipient(claim, "yourcompany.com"):
            print("Claim is for a different recipient")
            return

        print(f"Verified {claim['method']} application to {claim['to']['name']}")

asyncio.run(main())
```

### Verifying from a URL

```python
from human_attestation import extract_id_from_url, verify_claim

async def verify_from_url(url: str):
    # Extract HAP ID from a verification URL
    hap_id = extract_id_from_url(url)

    if hap_id:
        claim = await verify_claim(hap_id, "ballista.jobs")
        return claim
    return None
```

### Verifying Signature Manually

```python
from human_attestation import fetch_claim, verify_signature

async def verify_with_signature(hap_id: str):
    # Fetch the claim
    response = await fetch_claim(hap_id, "ballista.jobs")

    if response.get("valid") and "jws" in response:
        # Verify the cryptographic signature
        result = await verify_signature(response["jws"], "ballista.jobs")

        if result["valid"]:
            print("Signature verified!", result["claim"])
        else:
            print("Signature invalid:", result["error"])
```

### Signing Claims (For Verification Authorities)

```python
import json
from human_attestation import (
    generate_key_pair,
    export_public_key_jwk,
    create_claim,
    sign_claim,
)

# Generate a key pair (do this once, store securely)
private_key, public_key = generate_key_pair()

# Export public key for /.well-known/hap.json
jwk = export_public_key_jwk(public_key, "my_key_001")
well_known = {"issuer": "my-va.com", "keys": [jwk]}
print(json.dumps(well_known, indent=2))

# Create and sign a claim
claim = create_claim(
    method="physical_mail",
    description="Priority mail packet with handwritten cover letter",
    recipient_name="Acme Corp",
    domain="acme.com",
    issuer="my-va.com",
    expires_in_days=730,  # 2 years
    cost={"amount": 1500, "currency": "USD"},
    time=1800,
    physical=True,
)

jws = sign_claim(claim, private_key, kid="my_key_001")
print("Signed JWS:", jws)
```

## API Reference

### Verification Functions

| Function                                | Description                                     |
| --------------------------------------- | ----------------------------------------------- |
| `verify_claim(hap_id, issuer)`          | Fetch and verify a claim, returns claim or None |
| `fetch_claim(hap_id, issuer)`           | Fetch raw verification response from VA         |
| `verify_signature(jws, issuer)`         | Verify JWS signature against VA's public keys   |
| `fetch_public_keys(issuer)`             | Fetch VA's public keys from well-known endpoint |
| `is_valid_id(id)`                       | Check if string matches HAP ID format           |
| `extract_id_from_url(url)`              | Extract HAP ID from verification URL            |
| `is_claim_expired(claim)`               | Check if claim has passed expiration            |
| `is_claim_for_recipient(claim, domain)` | Check if claim targets specific recipient       |

### Signing Functions (For VAs)

| Function                              | Description                              |
| ------------------------------------- | ---------------------------------------- |
| `generate_key_pair()`                 | Generate Ed25519 key pair                |
| `export_public_key_jwk(key, kid)`     | Export public key as JWK                 |
| `sign_claim(claim, private_key, kid)` | Sign a claim, returns JWS                |
| `generate_id()`                       | Generate cryptographically secure HAP ID |
| `create_claim(...)`                   | Create claim with defaults               |

### Types

```python
from human_attestation import (
    Claim,
    ClaimCost,
    ClaimTarget,
    VerificationResponse,
    WellKnown,
    Jwk,
)
```

## Requirements

- Python 3.9+
- httpx (for async HTTP)
- PyJWT with cryptography

## License

Apache-2.0
