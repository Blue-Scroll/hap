# HAP - Human Application Protocol

**An open standard for verified job applications.**

In a world flooded with AI-generated spam, HAP lets applicants prove they're real humans who made real effort. It's the technical foundation for **Human-First Hiring**.

## The Problem

Job searching is broken:

- **Applicants** submit into black holes, reduced to keywords, wondering if anyone saw their name
- **Employers** are flooded with low-effort applications, unable to identify genuine interest
- **AI tools** have accelerated a race to the bottom where authentic effort is indistinguishable from spam

## The Solution

HAP introduces **Verification Authorities (VAs)** that attest to human effort. When someone takes deliberate, costly action to apply for a job, a VA can cryptographically sign that claim.

Employers who see a HAP verification know:
- A real human made a real effort
- The effort was costly enough to deter spam
- The claim can be independently verified

## How It Works

```
1. Applicant applies through a VA (e.g., sends physical mail via Ballista)
2. VA creates a signed verification claim
3. Verification is embedded in the application (QR code, header, etc.)
4. Employer scans/clicks to verify authenticity
```

## Quick Start

### For Employers

Scan any QR code from a HAP-verified application, or hit the verification URL:

```bash
curl https://ballista.app/api/v1/verify/hap_abc123xyz
```

Response:
```json
{
  "valid": true,
  "claims": {
    "type": "human_effort",
    "method": "physical_mail",
    "tier": "standard",
    "to": { "company": "Acme Corp" },
    "at": "2026-01-19T06:00:00Z"
  },
  "issuer": "ballista.app"
}
```

### For Applicants

Use a HAP-compatible service like [Ballista](https://ballista.app) to send verified applications. Your packets automatically include verification that proves your genuine effort.

### For Developers

See [SPEC.md](./SPEC.md) for the complete technical specification.

## Verification Authorities

| VA | Method | Website |
|----|--------|---------|
| Ballista | Physical mail | [ballista.app](https://ballista.app) |

Want to become a VA? See [docs/for-vas.md](./docs/for-vas.md).

## What VAs Attest To

- A human took deliberate, costly action
- Real effort was expended (not automated spray-and-pray)
- Timestamp of verification

## What VAs Do NOT Attest To

- Applicant identity (no government ID verification)
- Content authenticity (whether AI helped write it)
- Credential validity (degrees, experience claims)

## Philosophy

1. **Process proves intent.** We can't detect AI, but we can verify costly action.
2. **Physical anchors digital trust.** Real-world actions are hard to fake at scale.
3. **Open standards beat proprietary moats.** Anyone can implement HAP.
4. **Both sides need trust.** Applicants need visibility. Employers need signal.

## License

Apache 2.0 - See [LICENSE](./LICENSE)

---

Built for people who refuse to be ignored.
