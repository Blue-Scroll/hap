# human-attestation

[![Maven Central](https://img.shields.io/maven-central/v/io.bluescroll/human-attestation.svg)](https://central.sonatype.com/artifact/io.bluescroll/human-attestation)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Official HAP (Human Attestation Protocol) SDK for Java.

HAP is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

## Installation

### Maven

```xml
<dependency>
    <groupId>io.bluescroll</groupId>
    <artifactId>human-attestation</artifactId>
    <version>0.4.2</version>
</dependency>
```

### Gradle

```groovy
implementation 'io.bluescroll:human-attestation:0.4.2'
```

## Quick Start

### Verifying a Claim (For Recipients)

```java
import io.bluescroll.humanattestation.*;

public class VerifyExample {
    public static void main(String[] args) throws Exception {
        // Verify a claim from a HAP ID
        Claim claim = HumanAttestation.verifyClaim("hap_abc123xyz456", "ballista.jobs");

        if (claim != null) {
            // Check if not expired
            if (HumanAttestation.isClaimExpired(claim)) {
                System.out.println("Claim has expired");
                return;
            }

            // Verify it's for your organization
            if (!HumanAttestation.isClaimForRecipient(claim, "yourcompany.com")) {
                System.out.println("Claim is for a different recipient");
                return;
            }

            System.out.printf("Verified %s application to %s%n",
                    claim.getMethod(), claim.getTo().getName());
        }
    }
}
```

### Verifying from a URL

```java
// Extract HAP ID from a verification URL
String url = "https://www.ballista.jobs/v/hap_abc123xyz456";
String hapId = HumanAttestation.extractIdFromUrl(url);

if (hapId != null) {
    Claim claim = HumanAttestation.verifyClaim(hapId, "ballista.jobs");
    // ... handle claim
}
```

### Verifying Signature Manually

```java
// Fetch the claim
VerificationResponse response = HumanAttestation.fetchClaim("hap_abc123xyz456", "ballista.jobs");

if (response.isValid() && response.getJws() != null) {
    // Verify the cryptographic signature
    HumanAttestation.SignatureVerificationResult result = HumanAttestation.verifySignature(response.getJws(), "ballista.jobs");

    if (result.isValid()) {
        System.out.println("Signature verified! Claim: " + result.getClaim());
    } else {
        System.out.println("Signature invalid: " + result.getError());
    }
}
```

### Signing Claims (For Verification Authorities)

```java
import io.bluescroll.humanattestation.*;
import com.nimbusds.jose.jwk.OctetKeyPair;
import java.util.Map;

public class SignExample {
    public static void main(String[] args) throws Exception {
        // Generate a key pair (do this once, store securely)
        OctetKeyPair keyPair = Signer.generateKeyPair();

        // Export public key for /.well-known/hap.json
        Map<String, String> jwk = Signer.exportPublicKeyJwk(keyPair, "my_key_001");
        System.out.println("JWK: " + jwk);

        // Create and sign a claim
        Claim claim = Signer.createClaim(
                "physical_mail",                                    // method
                "Priority mail packet with handwritten cover letter", // description
                "Acme Corp",                                        // recipientName
                "my-va.com",                                        // issuer
                "acme.com",                                         // domain
                730,                                                // expires in 2 years
                new Claim.Cost(1500, "USD"),                        // cost
                1800,                                               // time in seconds
                true,                                               // physical
                null                                                // energy
        );

        String jws = Signer.signClaim(claim, keyPair, "my_key_001");
        System.out.println("Signed JWS: " + jws);
    }
}
```

## API Reference

### Verification Functions (HumanAttestation class)

| Method                               | Description                                     |
| ------------------------------------ | ----------------------------------------------- |
| `verifyClaim(hapId, issuer)`         | Fetch and verify a claim, returns claim or null |
| `fetchClaim(hapId, issuer)`          | Fetch raw verification response from VA         |
| `verifySignature(jws, issuer)`       | Verify JWS signature against VA's public keys   |
| `fetchPublicKeys(issuer)`            | Fetch VA's public keys from well-known endpoint |
| `isValidId(id)`                      | Check if string matches HAP ID format           |
| `extractIdFromUrl(url)`              | Extract HAP ID from verification URL            |
| `isClaimExpired(claim)`              | Check if claim has passed expiration            |
| `isClaimForRecipient(claim, domain)` | Check if claim targets specific recipient       |
| `generateId()`                       | Generate cryptographically secure HAP ID        |

### Signing Functions (Signer class)

| Method                             | Description                              |
| ---------------------------------- | ---------------------------------------- |
| `generateKeyPair()`                | Generate Ed25519 key pair (OctetKeyPair) |
| `exportPublicKeyJwk(keyPair, kid)` | Export public key as JWK                 |
| `signClaim(claim, keyPair, kid)`   | Sign a claim, returns JWS                |
| `createClaim(...)`                 | Create claim with defaults               |

### Types

```java
import io.bluescroll.humanattestation.*;

// Main types
Claim claim;
Claim.Target target;
Claim.Cost cost;

// Response types
VerificationResponse response;
WellKnown wellKnown;
WellKnown.Jwk jwk;
```

## Requirements

- Java 17+

## License

Apache-2.0
