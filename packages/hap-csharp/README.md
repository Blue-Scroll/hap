# BlueScroll.Hap

Official HAP (Human Attestation Protocol) SDK for .NET.

HAP is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

## Installation

```bash
dotnet add package BlueScroll.Hap
```

Or via Package Manager:

```powershell
Install-Package BlueScroll.Hap
```

## Quick Start

### Verifying a Claim (For Employers)

```csharp
using BlueScroll.Hap;

using var verifier = new HapVerifier();

// Verify a claim from a HAP ID
var claim = await verifier.VerifyHapClaimAsync("hap_abc123xyz456", "ballista.io");

if (claim != null)
{
    // Check if not expired
    if (HapVerifier.IsClaimExpired(claim))
    {
        Console.WriteLine("Claim has expired");
        return;
    }

    // Verify it's for your company
    if (!HapVerifier.IsClaimForCompany(claim, "yourcompany.com"))
    {
        Console.WriteLine("Claim is for a different company");
        return;
    }

    Console.WriteLine($"Verified {claim.Method} application to {claim.To.Company}");
}
```

### Verifying from a URL

```csharp
// Extract HAP ID from a verification URL
var url = "https://ballista.io/v/hap_abc123xyz456";
var hapId = HapVerifier.ExtractHapIdFromUrl(url);

if (hapId != null)
{
    using var verifier = new HapVerifier();
    var claim = await verifier.VerifyHapClaimAsync(hapId, "ballista.io");
    // ... handle claim
}
```

### Verifying Signature Manually

```csharp
using var verifier = new HapVerifier();

// Fetch the claim
var response = await verifier.FetchClaimAsync("hap_abc123xyz456", "ballista.io");

if (response.Valid && response.Jws != null)
{
    // Verify the cryptographic signature
    var result = await verifier.VerifySignatureAsync(response.Jws, "ballista.io");

    if (result.Valid)
    {
        Console.WriteLine($"Signature verified! Claim: {result.Claim}");
    }
    else
    {
        Console.WriteLine($"Signature invalid: {result.Error}");
    }
}
```

### Signing Claims (For Verification Authorities)

```csharp
using BlueScroll.Hap;
using System.Text.Json;

// Generate a key pair (do this once, store securely)
var (privateKey, publicKey) = HapSigner.GenerateKeyPair();

// Export public key for /.well-known/hap.json
var jwk = HapSigner.ExportPublicKeyJwk(publicKey, "my_key_001");
var wellKnown = new HapWellKnown
{
    Issuer = "my-va.com",
    Keys = new List<HapJwk> { jwk }
};
Console.WriteLine(JsonSerializer.Serialize(wellKnown, new JsonSerializerOptions { WriteIndented = true }));

// Create and sign a claim
var claim = HapSigner.CreateHumanEffortClaim(
    method: "physical_mail",
    company: "Acme Corp",
    issuer: "my-va.com",
    domain: "acme.com",
    tier: "standard",
    expiresInDays: 730 // 2 years
);

var jws = HapSigner.SignClaim(claim, privateKey, "my_key_001");
Console.WriteLine($"Signed JWS: {jws}");
```

### Creating Employer Commitment Claims

```csharp
var claim = HapSigner.CreateEmployerCommitmentClaim(
    employerName: "Acme Corp",
    commitment: "review_verified",
    issuer: "my-va.com",
    employerDomain: "acme.com",
    expiresInDays: 365
);

var jws = HapSigner.SignClaim(claim, privateKey, "my_key_001");
```

## API Reference

### HapVerifier Class

| Method                               | Description                                      |
| ------------------------------------ | ------------------------------------------------ |
| `VerifyHapClaimAsync(hapId, issuer)` | Fetch and verify a claim, returns claim or null  |
| `FetchClaimAsync(hapId, issuer)`     | Fetch raw verification response from VA          |
| `VerifySignatureAsync(jws, issuer)`  | Verify JWS signature against VA's public keys    |
| `FetchPublicKeysAsync(issuer)`       | Fetch VA's public keys from well-known endpoint  |
| `ExtractHapIdFromUrl(url)`           | Extract HAP ID from verification URL (static)    |
| `IsClaimExpired(claim)`              | Check if claim has passed expiration (static)    |
| `IsClaimForCompany(claim, domain)`   | Check if claim targets specific company (static) |

### Hap Class (Static Utilities)

| Method                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `Hap.IsValidHapId(id)` | Check if string matches HAP ID format    |
| `Hap.GenerateHapId()`  | Generate cryptographically secure HAP ID |

### HapSigner Class

| Method                               | Description                             |
| ------------------------------------ | --------------------------------------- |
| `GenerateKeyPair()`                  | Generate Ed25519 key pair               |
| `ExportPublicKeyJwk(key, kid)`       | Export public key as JWK                |
| `SignClaim(claim, privateKey, kid)`  | Sign a claim, returns JWS               |
| `CreateHumanEffortClaim(...)`        | Create human_effort claim with defaults |
| `CreateEmployerCommitmentClaim(...)` | Create employer_commitment claim        |

### Constants

```csharp
// Claim types
Hap.ClaimTypes.HumanEffort        // "human_effort"
Hap.ClaimTypes.EmployerCommitment // "employer_commitment"

// Verification methods
Hap.Methods.PhysicalMail   // "physical_mail"
Hap.Methods.VideoInterview // "video_interview"
Hap.Methods.PaidAssessment // "paid_assessment"
Hap.Methods.Referral       // "referral"

// Commitment levels
Hap.CommitmentLevels.ReviewVerified     // "review_verified"
Hap.CommitmentLevels.PrioritizeVerified // "prioritize_verified"
Hap.CommitmentLevels.RespondVerified    // "respond_verified"
```

## Requirements

- .NET 8.0+

## License

Apache-2.0
