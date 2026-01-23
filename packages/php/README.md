# human-attestation

[![Packagist Version](https://img.shields.io/packagist/v/bluescroll/human-attestation.svg)](https://packagist.org/packages/bluescroll/human-attestation)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Official HAP (Human Attestation Protocol) SDK for PHP.

HAP is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

## Installation

```bash
composer require bluescroll/human-attestation
```

## Requirements

- PHP 8.1+
- sodium extension (included in PHP 7.2+)

## Quick Start

### Verifying a Claim (For Recipients)

```php
<?php

use BlueScroll\HumanAttestation\Verify;

$verifier = new Verify();

// Verify a claim from a HAP ID
$claim = $verifier->verifyClaim('hap_abc123xyz456', 'ballista.jobs');

if ($claim) {
    // Check if not expired
    if (Verify::isClaimExpired($claim)) {
        echo "Claim has expired\n";
        return;
    }

    // Verify it's for your organization
    if (!Verify::isClaimForRecipient($claim, 'yourcompany.com')) {
        echo "Claim is for a different recipient\n";
        return;
    }

    echo "Verified {$claim['method']} application to {$claim['to']['name']}\n";
}
```

### Verifying from a URL

```php
use BlueScroll\HumanAttestation\Verify;

// Extract HAP ID from a verification URL
$url = 'https://www.ballista.jobs/v/hap_abc123xyz456';
$hapId = Verify::extractIdFromUrl($url);

if ($hapId) {
    $verifier = new Verify();
    $claim = $verifier->verifyClaim($hapId, 'ballista.jobs');
    // ... handle claim
}
```

### Verifying Signature Manually

```php
use BlueScroll\HumanAttestation\Verify;

$verifier = new Verify();

// Fetch the claim
$response = $verifier->fetchClaim('hap_abc123xyz456', 'ballista.jobs');

if ($response['valid'] && isset($response['jws'])) {
    // Verify the cryptographic signature
    $result = $verifier->verifySignature($response['jws'], 'ballista.jobs');

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

use BlueScroll\HumanAttestation\HumanAttestation;
use BlueScroll\HumanAttestation\Sign;

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
$claim = Sign::createClaim(
    method: 'physical_mail',
    description: 'Priority mail packet with handwritten cover letter',
    recipientName: 'Acme Corp',
    issuer: 'my-va.com',
    domain: 'acme.com',
    expiresInDays: 730, // 2 years
    cost: ['amount' => 1500, 'currency' => 'USD'],
    time: 1800,
    physical: true
);

$jws = Sign::signClaim($claim, $privateKey, 'my_key_001');
echo "Signed JWS: {$jws}\n";
```

## API Reference

### HumanAttestation Class (Static Utilities)

| Method                             | Description                              |
| ---------------------------------- | ---------------------------------------- |
| `HumanAttestation::isValidId($id)` | Check if string matches HAP ID format    |
| `HumanAttestation::generateId()`   | Generate cryptographically secure HAP ID |

### Verify Class

| Method                                         | Description                                     |
| ---------------------------------------------- | ----------------------------------------------- |
| `verifyClaim($hapId, $issuer)`                 | Fetch and verify a claim, returns claim or null |
| `fetchClaim($hapId, $issuer)`                  | Fetch raw verification response from VA         |
| `verifySignature($jws, $issuer)`               | Verify JWS signature against VA's public keys   |
| `fetchPublicKeys($issuer)`                     | Fetch VA's public keys from well-known endpoint |
| `Verify::extractIdFromUrl($url)`               | Extract HAP ID from verification URL            |
| `Verify::isClaimExpired($claim)`               | Check if claim has passed expiration            |
| `Verify::isClaimForRecipient($claim, $domain)` | Check if claim targets specific recipient       |

### Sign Class

| Method                                       | Description                      |
| -------------------------------------------- | -------------------------------- |
| `Sign::generateKeyPair()`                    | Generate Ed25519 key pair        |
| `Sign::exportPublicKeyJwk($key, $kid)`       | Export public key as JWK         |
| `Sign::signClaim($claim, $privateKey, $kid)` | Sign a claim, returns JWS        |
| `Sign::createClaim(...)`                     | Create claim with defaults       |

## License

Apache-2.0
