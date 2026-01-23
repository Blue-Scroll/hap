# HAP Verification Authority Directory

This directory contains a machine-readable list of Verification Authorities (VAs) that implement the HAP protocol.

## What This Directory Is

**A discovery mechanism.** The directory helps developers and recipients find VAs that have published valid HAP endpoints. It answers the question: "What VAs exist that I could potentially accept claims from?"

## What This Directory Is NOT

**An endorsement or trust authority.** Being listed here means:

- The VA has published a valid `/.well-known/hap.json` endpoint
- The endpoint includes properly formatted public keys
- The VA follows the HAP protocol specification

It does **not** mean:

- We vouch for their verification quality
- We recommend trusting their claims
- We have audited their operations

## Trust Decisions Are Yours

HAP provides the infrastructure for verifiable claims. Trust decisions belong to you.

When evaluating a VA, consider:

- What verification methods do they use?
- What's their reputation in the market?
- What due diligence have they done on their verification process?
- Do you trust their attestations for your specific use case?

This is the same model as HTTPS: TLS proves you're talking to `example.com`, but whether to trust what `example.com` says is your judgment.

## Directory Format

The [`vas.json`](vas.json) file contains:

```json
{
  "version": "1.0",
  "description": "HAP Verification Authority Directory",
  "updated": "2026-01-20T00:00:00Z",
  "vas": [
    {
      "domain": "example-va.com",
      "addedAt": "2026-01-15",
      "lastVerifiedAt": "2026-01-20"
    }
  ]
}
```

### Fields

| Field            | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `domain`         | The VA's domain, which also serves as their issuer identifier       |
| `addedAt`        | Date the VA was added to the directory                              |
| `lastVerifiedAt` | Date we last confirmed their `/.well-known/hap.json` endpoint works |

## VA Self-Description

VAs can optionally include a `va` object in their `/.well-known/hap.json` to provide additional metadata:

```json
{
  "issuer": "example-va.com",
  "keys": [...],
  "va": {
    "name": "Example VA",
    "methods": ["physical_mail", "video_verification"],
    "status": "active",
    "description": "Human verification through physical mail and video calls"
  }
}
```

This allows VAs to self-describe their capabilities without requiring central directory updates.

## Requesting a Listing

To be listed in the directory:

1. Implement the HAP protocol per [SPEC.md](../SPEC.md)
2. Publish a valid `/.well-known/hap.json` endpoint with your public keys
3. Open a pull request adding your domain to `vas.json`
4. We'll verify your endpoint responds correctly

See [docs/for-vas.md](../docs/for-vas.md) for complete VA implementation guidance.

## Removal

VAs may be removed from the directory if:

- Their `/.well-known/hap.json` endpoint stops responding
- Their endpoint returns invalid or malformed data
- They request removal

Removal from the directory does not invalidate previously signed claims—those remain cryptographically verifiable as long as the public keys are known.
