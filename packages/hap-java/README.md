# hap-java

Official HAP (Human Attestation Protocol) SDK for Java.

HAP is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

## Installation

### Maven

```xml
<dependency>
    <groupId>io.bluescroll</groupId>
    <artifactId>hap</artifactId>
    <version>0.1.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'io.bluescroll:hap:0.1.0'
```

## Quick Start

### Verifying a Claim (For Employers)

```java
import io.bluescroll.hap.*;

public class VerifyExample {
    public static void main(String[] args) throws Exception {
        // Verify a claim from a HAP ID
        HumanEffortClaim claim = Hap.verifyHapClaim("hap_abc123xyz456", "ballista.jobs");

        if (claim != null) {
            // Check if not expired
            if (Hap.isClaimExpired(claim)) {
                System.out.println("Claim has expired");
                return;
            }

            // Verify it's for your company
            if (!Hap.isClaimForCompany(claim, "yourcompany.com")) {
                System.out.println("Claim is for a different company");
                return;
            }

            System.out.printf("Verified %s application to %s%n",
                    claim.getMethod(), claim.getTo().getCompany());
        }
    }
}
```

### Verifying from a URL

```java
// Extract HAP ID from a verification URL
String url = "https://www.ballista.jobs/v/hap_abc123xyz456";
String hapId = Hap.extractHapIdFromUrl(url);

if (hapId != null) {
    HumanEffortClaim claim = Hap.verifyHapClaim(hapId, "ballista.jobs");
    // ... handle claim
}
```

### Verifying Signature Manually

```java
// Fetch the claim
VerificationResponse response = Hap.fetchClaim("hap_abc123xyz456", "ballista.jobs");

if (response.isValid() && response.getJws() != null) {
    // Verify the cryptographic signature
    Hap.SignatureVerificationResult result = Hap.verifySignature(response.getJws(), "ballista.jobs");

    if (result.isValid()) {
        System.out.println("Signature verified! Claim: " + result.getClaim());
    } else {
        System.out.println("Signature invalid: " + result.getError());
    }
}
```

### Signing Claims (For Verification Authorities)

```java
import io.bluescroll.hap.*;
import com.nimbusds.jose.jwk.OctetKeyPair;
import java.util.Map;

public class SignExample {
    public static void main(String[] args) throws Exception {
        // Generate a key pair (do this once, store securely)
        OctetKeyPair keyPair = HapSigner.generateKeyPair();

        // Export public key for /.well-known/hap.json
        Map<String, String> jwk = HapSigner.exportPublicKeyJwk(keyPair, "my_key_001");
        System.out.println("JWK: " + jwk);

        // Create and sign a claim
        HumanEffortClaim claim = HapSigner.createHumanEffortClaim(
                "physical_mail",   // method
                "Acme Corp",       // company
                "acme.com",        // domain
                "standard",        // tier
                "my-va.com",       // issuer
                730                // expires in 2 years
        );

        String jws = HapSigner.signClaim(claim, keyPair, "my_key_001");
        System.out.println("Signed JWS: " + jws);
    }
}
```

### Creating Employer Commitment Claims

```java
EmployerCommitmentClaim claim = HapSigner.createEmployerCommitmentClaim(
        "Acme Corp",         // employer name
        "acme.com",          // employer domain
        "review_verified",   // commitment level
        "my-va.com",         // issuer
        365                  // expires in 1 year
);

String jws = HapSigner.signClaim(claim, keyPair, "my_key_001");
```

## API Reference

### Verification Functions (Hap class)

| Method                             | Description                                     |
| ---------------------------------- | ----------------------------------------------- |
| `verifyHapClaim(hapId, issuer)`    | Fetch and verify a claim, returns claim or null |
| `fetchClaim(hapId, issuer)`        | Fetch raw verification response from VA         |
| `verifySignature(jws, issuer)`     | Verify JWS signature against VA's public keys   |
| `fetchPublicKeys(issuer)`          | Fetch VA's public keys from well-known endpoint |
| `isValidHapId(id)`                 | Check if string matches HAP ID format           |
| `extractHapIdFromUrl(url)`         | Extract HAP ID from verification URL            |
| `isClaimExpired(claim)`            | Check if claim has passed expiration            |
| `isClaimForCompany(claim, domain)` | Check if claim targets specific company         |
| `generateHapId()`                  | Generate cryptographically secure HAP ID        |

### Signing Functions (HapSigner class)

| Method                               | Description                              |
| ------------------------------------ | ---------------------------------------- |
| `generateKeyPair()`                  | Generate Ed25519 key pair (OctetKeyPair) |
| `exportPublicKeyJwk(keyPair, kid)`   | Export public key as JWK                 |
| `signClaim(claim, keyPair, kid)`     | Sign a claim, returns JWS                |
| `createHumanEffortClaim(...)`        | Create human_effort claim with defaults  |
| `createEmployerCommitmentClaim(...)` | Create employer_commitment claim         |

### Types

```java
import io.bluescroll.hap.*;

// Main claim types
HapClaim claim;
HumanEffortClaim humanEffort;
EmployerCommitmentClaim employerCommitment;

// Response types
VerificationResponse response;
HapWellKnown wellKnown;
HapWellKnown.HapJwk jwk;
```

## Requirements

- Java 17+

## License

Apache-2.0
