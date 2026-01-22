# HAP - Human Application Protocol

**The open standard for verified job applications.**

HAP enables Verification Authorities to cryptographically attest that an applicant took deliberate, costly action when applying for a job. Employers can verify these claims independently, without vendor lock-in.

## Why a Protocol?

Today, every verification service is a walled garden. If you verify through Service A, only employers integrated with Service A can check your proof. Switch services, and your verification history doesn't follow you. Employers must integrate with every service they want to support.

**HAP changes this.** By defining a standard format for verification claims, HAP turns human verification from a product into an ecosystem:

- **Portability**: Your verified applications work everywhere, not just where one vendor has integrations
- **Interoperability**: Employers verify claims from any VA using the same code
- **Choice**: Pick the Verification Authority that fits your needs; employers don't need to care which one you used
- **Cryptographic proof**: Claims are signed with Ed25519 keys and can be verified offline, without calling any API

The shift is fundamental: instead of "trust this company's API response," it's "verify this cryptographic signature." HAP is infrastructure that enables an ecosystem of Verification Authorities, all speaking the same language.

_For the full philosophy, see [docs/vision.md](docs/vision.md)._

## How It Works

```
1. Applicant applies through a VA (e.g., sends physical mail via Ballista)
2. VA creates a cryptographically signed verification claim (JWS)
3. Claim is embedded in the application (QR code, URL, or header)
4. Employer verifies the signature against the VA's public keys
```

The signature verification can happen entirely offline once you have the VA's public keys from their `/.well-known/hap.json` endpoint.

## Quick Start

### Verifying a Claim (TypeScript)

```typescript
import {
  verifyHapClaim,
  isClaimExpired,
  isClaimForCompany,
} from "@bluescroll/hap";

const claim = await verifyHapClaim("hap_abc123xyz456", "ballista.io");
if (
  claim &&
  !isClaimExpired(claim) &&
  isClaimForCompany(claim, "yourcompany.com")
) {
  console.log(`Verified ${claim.method} application to ${claim.to.company}`);
}
```

### Manual Verification

```bash
# Fetch claim from VA
curl https://ballista.io/api/v1/verify/hap_abc123xyz

# Fetch VA's public keys
curl https://ballista.io/.well-known/hap.json

# Verify JWS signature locally using the public keys
```

## SDKs

Official SDKs handle key fetching, signature verification, and claim validation:

| Language   | Install                                            | Package                                                                      |
| ---------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| TypeScript | `npm install @bluescroll/hap`                      | [@bluescroll/hap](https://www.npmjs.com/package/@bluescroll/hap)             |
| Python     | `pip install bluescroll-hap`                       | [bluescroll-hap](https://pypi.org/project/bluescroll-hap/)                   |
| Go         | `go get github.com/BlueScroll/hap/packages/hap-go` | [hap-go](https://pkg.go.dev/github.com/BlueScroll/hap/packages/hap-go)       |
| Java       | Maven/Gradle                                       | [io.bluescroll:hap](https://central.sonatype.com/artifact/io.bluescroll/hap) |
| Ruby       | `gem install bluescroll-hap`                       | [bluescroll-hap](https://rubygems.org/gems/bluescroll-hap)                   |
| PHP        | `composer require bluescroll/hap`                  | [bluescroll/hap](https://packagist.org/packages/bluescroll/hap)              |
| C#         | `dotnet add package BlueScroll.Hap`                | [BlueScroll.Hap](https://www.nuget.org/packages/BlueScroll.Hap)              |

See [`packages/`](./packages/) for complete SDK documentation.

## Verification Authorities

Verification Authorities (VAs) are services that verify human effort and sign HAP claims. The directory lists VAs that have published valid `/.well-known/hap.json` endpoints.

| VA       | Methods       | Domain                             |
| -------- | ------------- | ---------------------------------- |
| Ballista | Physical mail | [ballista.io](https://ballista.io) |

See [directory/](directory/) for the machine-readable list and listing criteria.

**Note:** Listing in the directory means a VA has published a valid HAP endpoint. Trust decisions remain with you—evaluate each VA's verification methods and reputation for your use case.

## What Claims Attest To

HAP claims verify that a human took deliberate, costly action:

- A real person made a real effort to apply
- The effort was costly enough to deter spray-and-pray spam
- The timestamp of verification
- The target company

HAP claims do **not** verify identity, credential validity, or whether AI assisted with content creation.

## Learn More

- **[Full Specification](SPEC.md)** — Technical details, claim formats, cryptographic requirements
- **[Vision & Philosophy](docs/vision.md)** — Why HAP exists and where it's going
- **[Method Requirements](docs/method-requirements.md)** — What makes a verification method HAP-compliant
- **[For Verification Authorities](docs/for-vas.md)** — How to implement HAP and join the directory

## License

Apache 2.0 — See [LICENSE](./LICENSE)

---

_Built for people who refuse to be ignored._
