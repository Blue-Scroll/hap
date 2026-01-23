# human-attestation (Go)

[![Go Reference](https://pkg.go.dev/badge/github.com/Blue-Scroll/hap/packages/go.svg)](https://pkg.go.dev/github.com/Blue-Scroll/hap/packages/go)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Official HAP (Human Attestation Protocol) SDK for Go.

HAP is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

## Installation

```bash
go get github.com/Blue-Scroll/hap/packages/go
```

## Quick Start

### Verifying a Claim (For Recipients)

```go
package main

import (
    "context"
    "fmt"
    "log"

    humanattestation "github.com/Blue-Scroll/hap/packages/go"
)

func main() {
    ctx := context.Background()

    // Verify a claim from a HAP ID
    claim, err := humanattestation.VerifyClaim(ctx, "hap_abc123xyz456", "ballista.jobs")
    if err != nil {
        log.Fatal(err)
    }

    if claim != nil {
        // Check if not expired
        if humanattestation.IsClaimExpired(claim) {
            fmt.Println("Claim has expired")
            return
        }

        // Verify it's for your organization
        if !humanattestation.IsClaimForRecipient(claim, "yourcompany.com") {
            fmt.Println("Claim is for a different recipient")
            return
        }

        fmt.Printf("Verified %s application to %s\n", claim.Method, claim.To.Name)
    }
}
```

### Verifying from a URL

```go
// Extract HAP ID from a verification URL
url := "https://www.ballista.jobs/v/hap_abc123xyz456"
hapID := humanattestation.ExtractIDFromURL(url)

if hapID != "" {
    claim, err := humanattestation.VerifyClaim(ctx, hapID, "ballista.jobs")
    // ... handle claim
}
```

### Verifying Signature Manually

```go
// Fetch the claim
resp, err := humanattestation.FetchClaim(ctx, "hap_abc123xyz456", "ballista.jobs", humanattestation.DefaultVerifyOptions())
if err != nil {
    log.Fatal(err)
}

if resp.Valid && resp.JWS != "" {
    // Verify the cryptographic signature
    result, err := humanattestation.VerifySignature(ctx, resp.JWS, "ballista.jobs", humanattestation.DefaultVerifyOptions())
    if err != nil {
        log.Fatal(err)
    }

    if result.Valid {
        fmt.Printf("Signature verified! Claim: %+v\n", result.Claim)
    } else {
        fmt.Printf("Signature invalid: %s\n", result.Error)
    }
}
```

### Signing Claims (For Verification Authorities)

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"

    humanattestation "github.com/Blue-Scroll/hap/packages/go"
)

func main() {
    // Generate a key pair (do this once, store securely)
    privateKey, publicKey, err := humanattestation.GenerateKeyPair()
    if err != nil {
        log.Fatal(err)
    }

    // Export public key for /.well-known/hap.json
    jwk := humanattestation.ExportPublicKeyJWK(publicKey, "my_key_001")
    wellKnown := humanattestation.WellKnown{
        Issuer: "my-va.com",
        Keys:   []humanattestation.JWK{jwk},
    }
    wellKnownJSON, _ := json.MarshalIndent(wellKnown, "", "  ")
    fmt.Println(string(wellKnownJSON))

    // Create and sign a claim
    claim, err := humanattestation.CreateClaim(humanattestation.CreateClaimParams{
        Method:        "physical_mail",
        Description:   "Priority mail packet with handwritten cover letter",
        RecipientName: "Acme Corp",
        Domain:        "acme.com",
        Issuer:        "my-va.com",
        ExpiresInDays: 730, // 2 years
        Cost:          &humanattestation.ClaimCost{Amount: 1500, Currency: "USD"},
        Time:          humanattestation.IntPtr(1800),
        Physical:      humanattestation.BoolPtr(true),
    })
    if err != nil {
        log.Fatal(err)
    }

    jws, err := humanattestation.SignClaim(claim, privateKey, "my_key_001")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Signed JWS: %s\n", jws)
}
```

## API Reference

### Verification Functions

| Function                                    | Description                                     |
| ------------------------------------------- | ----------------------------------------------- |
| `VerifyClaim(ctx, hapID, issuer)`           | Fetch and verify a claim, returns claim or nil  |
| `FetchClaim(ctx, hapID, issuer, opts)`      | Fetch raw verification response from VA         |
| `VerifySignature(ctx, jws, issuer, opts)`   | Verify JWS signature against VA's public keys   |
| `FetchPublicKeys(ctx, issuer, opts)`        | Fetch VA's public keys from well-known endpoint |
| `IsValidID(id)`                             | Check if string matches HAP ID format           |
| `ExtractIDFromURL(url)`                     | Extract HAP ID from verification URL            |
| `IsClaimExpired(claim)`                     | Check if claim has passed expiration            |
| `IsClaimForRecipient(claim, domain)`        | Check if claim targets specific recipient       |

### Signing Functions (For VAs)

| Function                            | Description                              |
| ----------------------------------- | ---------------------------------------- |
| `GenerateKeyPair()`                 | Generate Ed25519 key pair                |
| `ExportPublicKeyJWK(key, kid)`      | Export public key as JWK                 |
| `SignClaim(claim, privateKey, kid)` | Sign a claim, returns JWS                |
| `GenerateID()`                      | Generate cryptographically secure HAP ID |
| `CreateClaim(params)`               | Create claim with defaults               |

### Types

```go
import humanattestation "github.com/Blue-Scroll/hap/packages/go"

// Main types
var _ humanattestation.Claim
var _ humanattestation.ClaimCost
var _ humanattestation.ClaimTarget

// Response types
var _ humanattestation.VerificationResponse
var _ humanattestation.WellKnown
var _ humanattestation.JWK
```

## Requirements

- Go 1.21+

## License

Apache-2.0
