# human-attestation

Official HAP (Human Attestation Protocol) SDK for .NET.

HAP is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

## Installation

```bash
dotnet add package HumanAttestation
```

Or via Package Manager:

```powershell
Install-Package HumanAttestation
```

## Quick Start

### Verifying a Claim (For Recipients)

```csharp
using BlueScroll.HumanAttestation;

using var verifier = new Verifier();

// Verify a claim from a HAP ID
var claim = await verifier.VerifyClaimAsync("hap_abc123xyz456", "ballista.jobs");

if (claim != null)
{
    // Check if not expired
    if (Verifier.IsClaimExpired(claim))
    {
        Console.WriteLine("Claim has expired");
        return;
    }

    // Verify it's for your organization
    if (!Verifier.IsClaimForRecipient(claim, "yourcompany.com"))
    {
        Console.WriteLine("Claim is for a different recipient");
        return;
    }

    Console.WriteLine($"Verified {claim.Method} application to {claim.To.Name}");
}
```

### Verifying from a URL

```csharp
// Extract HAP ID from a verification URL
var url = "https://www.ballista.jobs/v/hap_abc123xyz456";
var hapId = Verifier.ExtractIdFromUrl(url);

if (hapId != null)
{
    using var verifier = new Verifier();
    var claim = await verifier.VerifyClaimAsync(hapId, "ballista.jobs");
    // ... handle claim
}
```

### Verifying Signature Manually

```csharp
using var verifier = new Verifier();

// Fetch the claim
var response = await verifier.FetchClaimAsync("hap_abc123xyz456", "ballista.jobs");

if (response.Valid && response.Jws != null)
{
    // Verify the cryptographic signature
    var result = await verifier.VerifySignatureAsync(response.Jws, "ballista.jobs");

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
using BlueScroll.HumanAttestation;
using System.Text.Json;

// Generate a key pair (do this once, store securely)
var (privateKey, publicKey) = Signer.GenerateKeyPair();

// Export public key for /.well-known/hap.json
var jwk = Signer.ExportPublicKeyJwk(publicKey, "my_key_001");
var wellKnown = new WellKnown
{
    Issuer = "my-va.com",
    Keys = new List<Jwk> { jwk }
};
Console.WriteLine(JsonSerializer.Serialize(wellKnown, new JsonSerializerOptions { WriteIndented = true }));

// Create and sign a claim
var claim = Signer.CreateClaim(
    method: "physical_mail",
    description: "Priority mail packet with handwritten cover letter",
    recipientName: "Acme Corp",
    issuer: "my-va.com",
    domain: "acme.com",
    expiresInDays: 730, // 2 years
    cost: new ClaimCost { Amount = 1500, Currency = "USD" },
    time: 1800,
    physical: true
);

var jws = Signer.SignClaim(claim, privateKey, "my_key_001");
Console.WriteLine($"Signed JWS: {jws}");
```

## API Reference

### Verifier Class

| Method                             | Description                                      |
| ---------------------------------- | ------------------------------------------------ |
| `VerifyClaimAsync(hapId, issuer)`  | Fetch and verify a claim, returns claim or null  |
| `FetchClaimAsync(hapId, issuer)`   | Fetch raw verification response from VA          |
| `VerifySignatureAsync(jws, issuer)`| Verify JWS signature against VA's public keys    |
| `FetchPublicKeysAsync(issuer)`     | Fetch VA's public keys from well-known endpoint  |
| `ExtractIdFromUrl(url)`            | Extract HAP ID from verification URL (static)    |
| `IsClaimExpired(claim)`            | Check if claim has passed expiration (static)    |
| `IsClaimForRecipient(claim, domain)` | Check if claim targets specific recipient (static) |

### HumanAttestation Class (Static Utilities)

| Method                           | Description                              |
| -------------------------------- | ---------------------------------------- |
| `HumanAttestation.IsValidId(id)` | Check if string matches HAP ID format    |
| `HumanAttestation.GenerateId()`  | Generate cryptographically secure HAP ID |

### Signer Class

| Method                             | Description                      |
| ---------------------------------- | -------------------------------- |
| `GenerateKeyPair()`                | Generate Ed25519 key pair        |
| `ExportPublicKeyJwk(key, kid)`     | Export public key as JWK         |
| `SignClaim(claim, privateKey, kid)`| Sign a claim, returns JWS        |
| `CreateClaim(...)`                 | Create claim with defaults       |

### Types

```csharp
using BlueScroll.HumanAttestation;

// Main types
Claim claim;
ClaimCost cost;
ClaimTarget target;

// Response types
VerificationResponse response;
WellKnown wellKnown;
Jwk jwk;
```

## Requirements

- .NET 8.0+

## License

Apache-2.0
