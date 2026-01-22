# hap-go

Official HAP (Human Attestation Protocol) SDK for Go.

HAP is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

## Installation

```bash
go get github.com/BlueScroll/hap/packages/hap-go
```

## Quick Start

### Verifying a Claim (For Employers)

```go
package main

import (
    "context"
    "fmt"
    "log"

    hap "github.com/BlueScroll/hap/packages/hap-go"
)

func main() {
    ctx := context.Background()

    // Verify a claim from a HAP ID
    claim, err := hap.VerifyHapClaim(ctx, "hap_abc123xyz456", "ballista.io")
    if err != nil {
        log.Fatal(err)
    }

    if claim != nil {
        // Check if not expired
        if hap.IsClaimExpired(claim) {
            fmt.Println("Claim has expired")
            return
        }

        // Verify it's for your company
        if !hap.IsClaimForCompany(claim, "yourcompany.com") {
            fmt.Println("Claim is for a different company")
            return
        }

        fmt.Printf("Verified %s application to %s\n", claim.Method, claim.To.Company)
    }
}
```

### Verifying from a URL

```go
// Extract HAP ID from a verification URL
url := "https://ballista.io/v/hap_abc123xyz456"
hapID := hap.ExtractHapIDFromURL(url)

if hapID != "" {
    claim, err := hap.VerifyHapClaim(ctx, hapID, "ballista.io")
    // ... handle claim
}
```

### Verifying Signature Manually

```go
// Fetch the claim
resp, err := hap.FetchClaim(ctx, "hap_abc123xyz456", "ballista.io", hap.DefaultVerifyOptions())
if err != nil {
    log.Fatal(err)
}

if resp.Valid && resp.JWS != "" {
    // Verify the cryptographic signature
    result, err := hap.VerifySignature(ctx, resp.JWS, "ballista.io", hap.DefaultVerifyOptions())
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

    hap "github.com/BlueScroll/hap/packages/hap-go"
)

func main() {
    // Generate a key pair (do this once, store securely)
    privateKey, publicKey, err := hap.GenerateKeyPair()
    if err != nil {
        log.Fatal(err)
    }

    // Export public key for /.well-known/hap.json
    jwk := hap.ExportPublicKeyJWK(publicKey, "my_key_001")
    wellKnown := hap.HapWellKnown{
        Issuer: "my-va.com",
        Keys:   []hap.HapJWK{jwk},
    }
    wellKnownJSON, _ := json.MarshalIndent(wellKnown, "", "  ")
    fmt.Println(string(wellKnownJSON))

    // Create and sign a claim
    claim, err := hap.CreateHumanEffortClaim(hap.HumanEffortClaimParams{
        Method:        "physical_mail",
        Company:       "Acme Corp",
        Domain:        "acme.com",
        Tier:          "standard",
        Issuer:        "my-va.com",
        ExpiresInDays: 730, // 2 years
    })
    if err != nil {
        log.Fatal(err)
    }

    jws, err := hap.SignClaim(claim, privateKey, "my_key_001")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Signed JWS: %s\n", jws)
}
```

### Creating Employer Commitment Claims

```go
claim, err := hap.CreateEmployerCommitmentClaim(hap.EmployerCommitmentClaimParams{
    EmployerName:   "Acme Corp",
    EmployerDomain: "acme.com",
    Commitment:     "review_verified",
    Issuer:         "my-va.com",
    ExpiresInDays:  365,
})
if err != nil {
    log.Fatal(err)
}

jws, err := hap.SignClaim(claim, privateKey, "my_key_001")
```

## API Reference

### Verification Functions

| Function                                  | Description                                     |
| ----------------------------------------- | ----------------------------------------------- |
| `VerifyHapClaim(ctx, hapID, issuer)`      | Fetch and verify a claim, returns claim or nil  |
| `FetchClaim(ctx, hapID, issuer, opts)`    | Fetch raw verification response from VA         |
| `VerifySignature(ctx, jws, issuer, opts)` | Verify JWS signature against VA's public keys   |
| `FetchPublicKeys(ctx, issuer, opts)`      | Fetch VA's public keys from well-known endpoint |
| `IsValidHapID(id)`                        | Check if string matches HAP ID format           |
| `ExtractHapIDFromURL(url)`                | Extract HAP ID from verification URL            |
| `IsClaimExpired(claim)`                   | Check if claim has passed expiration            |
| `IsClaimForCompany(claim, domain)`        | Check if claim targets specific company         |

### Signing Functions (For VAs)

| Function                                | Description                              |
| --------------------------------------- | ---------------------------------------- |
| `GenerateKeyPair()`                     | Generate Ed25519 key pair                |
| `ExportPublicKeyJWK(key, kid)`          | Export public key as JWK                 |
| `SignClaim(claim, privateKey, kid)`     | Sign a claim, returns JWS                |
| `GenerateHapID()`                       | Generate cryptographically secure HAP ID |
| `CreateHumanEffortClaim(params)`        | Create human_effort claim with defaults  |
| `CreateEmployerCommitmentClaim(params)` | Create employer_commitment claim         |

### Types

```go
import hap "github.com/BlueScroll/hap/packages/hap-go"

// Main claim types
var _ hap.HumanEffortClaim
var _ hap.EmployerCommitmentClaim

// Response types
var _ hap.VerificationResponse
var _ hap.HapWellKnown
var _ hap.HapJWK
```

## Requirements

- Go 1.21+

## License

Apache-2.0
