# HAP - Human Attestation Protocol

**Built to prove your effort matters.**

Proof of human effort for the AI age.

When AI makes personalized outreach nearly as cheap as mass spam, proving you're real becomes a competitive advantage. HAP is the open standard for verified human effort.

## The Problem

When sending a message costs nothing, messages mean nothing.

| Channel          | What happened                              |
| ---------------- | ------------------------------------------ |
| Email            | Spam made cold outreach useless            |
| Job applications | "Easy Apply" made applications meaningless |
| Dating apps      | Copy-paste openers ruined first messages   |
| Public comments  | Bots flooded every policy discussion       |

The pattern repeats: friction is removed, volume explodes, signal drowns, recipients stop paying attention.

**AI accelerates this dramatically.** The cost of faking sincerity dropped significantly.

## The Insight

HAP doesn't detect AI. **It verifies that a human took costly action.**

We can't detect AI-generated content. But we can verify that someone:

- Spent real money
- Invested real time
- Moved physical atoms

**Effort suggests intent.** A cryptographic signature proves someone invested real money and time—but that alone doesn't guarantee quality, honesty, or good intentions. It's a signal that cuts through automated noise, not a vetting process.

## How It Works

A Verification Authority (VA) confirms you did something hard to fake. They sign a cryptographic claim. Recipients verify the signature. The claim is the proof.

```text
Sender    →  Takes costly action (sends mail, pays fee, completes interview)
VA        →  Signs verification claim
Message   →  Includes claim (QR code, URL, or header)
Recipient →  Verifies signature, sees proof of effort
```

**No API calls required to verify.** Once you have a VA's public keys (published at `/.well-known/hap.json`), verification happens offline. The signature is the proof.

## Use Cases

| Use Case                | The Problem                            | HAP Solution                           |
| ----------------------- | -------------------------------------- | -------------------------------------- |
| **Job applications**    | Easy Apply → meaningless applications  | Verified applicants signal serious intent |
| **Dating apps**         | Copy-paste openers → unusable inboxes  | $1-2 verified messages stand out       |
| **Freelancer proposals**| 50 identical bids → race to bottom     | Verified proposals signal commitment   |
| **Journalism tips**     | Noise buries real whistleblowers       | Verified tips can be prioritized       |
| **Public comments**     | Fake grassroots drown real voices      | Verified comments stand out            |

_For the full philosophy, see [docs/vision.md](docs/vision.md)._

## Why a Protocol?

Without a protocol, every verification service is a walled garden. Your proof only works where that vendor has integrations.

**HAP changes this:**

| Without Protocol               | With Protocol                                  |
| ------------------------------ | ---------------------------------------------- |
| Your proof works with one vendor | Your proof can work anywhere                 |
| Competitors are threats        | **Competitors grow the ecosystem**             |
| Vendor dies, claims worthless  | Claims verifiable with cached keys; unverifiable if VA offline |
| Network effects are zero-sum   | **Network effects are positive-sum**           |

This is the same shift that created email (SMTP), the web (HTTP), and secure connections (TLS). Open protocol, competitive ecosystem, trust earned by implementations.

**HAP provides the common language. VAs compete on service quality.**

### For Verification Authorities

Anyone can implement HAP. No approval required. See [Becoming a VA](docs/for-vas.md).

### For Recipients

Integrate once, accept claims from any VA. No approval required. See [HAP for Recipients](docs/for-recipients.md).

## Quick Start

### Verify a Claim (TypeScript)

```typescript
import { verifyClaim, isClaimExpired, isClaimForRecipient } from "human-attestation";

const claim = await verifyClaim("hap_abc123xyz456", "ballista.jobs");
if (claim && !isClaimExpired(claim) && isClaimForRecipient(claim, "yourorg.com")) {
  console.log(`Verified: ${claim.method} → ${claim.to.name}`);
}
```

### Manual Verification

```bash
# Fetch claim
curl https://www.ballista.jobs/api/v1/verify/hap_abc123xyz

# Fetch VA's public keys
curl https://www.ballista.jobs/.well-known/hap.json

# Verify Ed25519 signature locally
```

## SDKs

Official SDKs handle key fetching, signature verification, and claim validation:

| Language   | Install                                         | Package                                                                                                  |
| ---------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| TypeScript | `npm install human-attestation`                 | [human-attestation](https://www.npmjs.com/package/human-attestation)                                     |
| Python     | `pip install human-attestation`                 | [human-attestation](https://pypi.org/project/human-attestation/)                                         |
| Go         | `go get github.com/Blue-Scroll/hap/packages/go` | [humanattestation](https://pkg.go.dev/github.com/Blue-Scroll/hap/packages/go)                            |
| Java       | Maven/Gradle                                    | [io.bluescroll:human-attestation](https://central.sonatype.com/artifact/io.bluescroll/human-attestation) |
| Ruby       | `gem install human-attestation`                 | [human-attestation](https://rubygems.org/gems/human-attestation)                                         |
| PHP        | `composer require bluescroll/human-attestation` | [bluescroll/human-attestation](https://packagist.org/packages/bluescroll/human-attestation)              |
| C#         | `dotnet add package HumanAttestation`           | [HumanAttestation](https://www.nuget.org/packages/HumanAttestation)                                      |

See [`packages/`](./packages/) for complete SDK documentation.

## Verification Authorities

Verification Authorities (VAs) are services that verify human effort and sign HAP claims.

| VA       | Methods       | Domain                                     |
| -------- | ------------- | ------------------------------------------ |
| Ballista | Physical mail | [ballista.jobs](https://www.ballista.jobs) |

See [directory/](directory/) for the machine-readable list and listing criteria.

**Note:** Listing in the directory means a VA has published a valid HAP endpoint. Trust decisions remain with you—evaluate each VA's verification methods and reputation for your use case. External links may change; verify current VA websites directly.

## Technical Foundation

- **Cryptography**: Ed25519 signatures (fast, small, no parameter negotiation attacks)
- **Format**: JWS Compact Serialization
- **Offline**: Claims verify without network calls once you have public keys
- **Compact**: QR-friendly format fits in ~280 characters

HAP is a specification, not infrastructure. No central server. Each VA hosts their own endpoints.

See [SPEC.md](SPEC.md) for complete technical details.

## What HAP Does NOT Do

- **Identity verification** — We verify effort, not who you are
- **Content verification** — AI can help write; the effort to send is what matters
- **Trust authority** — The protocol places no restrictions on who can become a VA; you decide which VAs to trust
- **Quality guarantee** — Verified effort ≠ good content

## Learn More

- **[Full Specification](SPEC.md)** — Technical details, claim formats, cryptographic requirements
- **[Vision & Philosophy](docs/vision.md)** — Why HAP exists and where it's going
- **[Method Requirements](docs/method-requirements.md)** — What makes a verification method HAP-compliant
- **[For Verification Authorities](docs/for-vas.md)** — How to implement HAP and join the directory

## License

Apache 2.0 — See [LICENSE](./LICENSE)
