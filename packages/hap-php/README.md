# bluescroll/hap

Official HAP (Human Application Protocol) SDK for PHP.

HAP is an open standard for verified job applications. It enables Verification Authorities (VAs) to cryptographically attest that an applicant took deliberate, costly action when applying for a job.

## Installation

```bash
composer require bluescroll/hap
```

## Requirements

- PHP 8.1+
- sodium extension (included in PHP 7.2+)

## Quick Start

### Verifying a Claim (For Employers)

```php
<?php

use BlueScroll\Hap\Verify;

$verifier = new Verify();

// Verify a claim from a HAP ID
$claim = $verifier->verifyHapClaim('hap_abc123xyz456', 'ballista.app');

if ($claim) {
    // Check if not expired
    if (Verify::isClaimExpired($claim)) {
        echo "Claim has expired\n";
        return;
    }

    // Verify it's for your company
    if (!Verify::isClaimForCompany($claim, 'yourcompany.com')) {
        echo "Claim is for a different company\n";
        return;
    }

    echo "Verified {$claim['method']} application to {$claim['to']['company']}\n";
}
```

### Verifying from a URL

```php
use BlueScroll\Hap\Verify;

// Extract HAP ID from a verification URL
$url = 'https://ballista.app/v/hap_abc123xyz456';
$hapId = Verify::extractHapIdFromUrl($url);

if ($hapId) {
    $verifier = new Verify();
    $claim = $verifier->verifyHapClaim($hapId, 'ballista.app');
    // ... handle claim
}
```

### Verifying Signature Manually

```php
use BlueScroll\Hap\Verify;

$verifier = new Verify();

// Fetch the claim
$response = $verifier->fetchClaim('hap_abc123xyz456', 'ballista.app');

if ($response['valid'] && isset($response['jws'])) {
    // Verify the cryptographic signature
    $result = $verifier->verifySignature($response['jws'], 'ballista.app');

    if ($result['valid']) {
        echo "Signature verified! Claim: " . print_r($result['claim'], true);
    } else {
        echo "Signature invalid: " . $result['error'];
    }
}
```

### Signing Claims (For Verification Authorities)

```php
<?php

use BlueScroll\Hap\Hap;
use BlueScroll\Hap\Sign;

// Generate a key pair (do this once, store securely)
$keys = Sign::generateKeyPair();
$privateKey = $keys['privateKey'];
$publicKey = $keys['publicKey'];

// Export public key for /.well-known/hap.json
$jwk = Sign::exportPublicKeyJwk($publicKey, 'my_key_001');
$wellKnown = [
    'issuer' => 'my-va.com',
    'keys' => [$jwk],
];
echo json_encode($wellKnown, JSON_PRETTY_PRINT) . "\n";

// Create and sign a claim
$claim = Sign::createHumanEffortClaim(
    method: 'physical_mail',
    company: 'Acme Corp',
    issuer: 'my-va.com',
    domain: 'acme.com',
    tier: 'standard',
    expiresInDays: 730 // 2 years
);

$jws = Sign::signClaim($claim, $privateKey, 'my_key_001');
echo "Signed JWS: {$jws}\n";
```

### Creating Employer Commitment Claims

```php
use BlueScroll\Hap\Sign;

$claim = Sign::createEmployerCommitmentClaim(
    employerName: 'Acme Corp',
    commitment: 'review_verified',
    issuer: 'my-va.com',
    employerDomain: 'acme.com',
    expiresInDays: 365
);

$jws = Sign::signClaim($claim, $privateKey, 'my_key_001');
```

## API Reference

### Hap Class (Static Utilities)

| Method | Description |
|--------|-------------|
| `Hap::isValidHapId($id)` | Check if string matches HAP ID format |
| `Hap::generateHapId()` | Generate cryptographically secure HAP ID |

### Verify Class

| Method | Description |
|--------|-------------|
| `verifyHapClaim($hapId, $issuer)` | Fetch and verify a claim, returns claim or null |
| `fetchClaim($hapId, $issuer)` | Fetch raw verification response from VA |
| `verifySignature($jws, $issuer)` | Verify JWS signature against VA's public keys |
| `fetchPublicKeys($issuer)` | Fetch VA's public keys from well-known endpoint |
| `Verify::extractHapIdFromUrl($url)` | Extract HAP ID from verification URL |
| `Verify::isClaimExpired($claim)` | Check if claim has passed expiration |
| `Verify::isClaimForCompany($claim, $domain)` | Check if claim targets specific company |

### Sign Class

| Method | Description |
|--------|-------------|
| `Sign::generateKeyPair()` | Generate Ed25519 key pair |
| `Sign::exportPublicKeyJwk($key, $kid)` | Export public key as JWK |
| `Sign::signClaim($claim, $privateKey, $kid)` | Sign a claim, returns JWS |
| `Sign::createHumanEffortClaim(...)` | Create human_effort claim with defaults |
| `Sign::createEmployerCommitmentClaim(...)` | Create employer_commitment claim |

### Constants

```php
use BlueScroll\Hap\Hap;

// Claim types
Hap::CLAIM_TYPE_HUMAN_EFFORT;        // "human_effort"
Hap::CLAIM_TYPE_EMPLOYER_COMMITMENT; // "employer_commitment"

// Verification methods
Hap::METHOD_PHYSICAL_MAIL;   // "physical_mail"
Hap::METHOD_VIDEO_INTERVIEW; // "video_interview"
Hap::METHOD_PAID_ASSESSMENT; // "paid_assessment"
Hap::METHOD_REFERRAL;        // "referral"

// Commitment levels
Hap::COMMITMENT_REVIEW_VERIFIED;     // "review_verified"
Hap::COMMITMENT_PRIORITIZE_VERIFIED; // "prioritize_verified"
Hap::COMMITMENT_RESPOND_VERIFIED;    // "respond_verified"
```

## License

Apache-2.0
