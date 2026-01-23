# human-attestation

[![Gem Version](https://img.shields.io/gem/v/human-attestation.svg)](https://rubygems.org/gems/human-attestation)
[![CI](https://github.com/Blue-Scroll/hap/actions/workflows/ci.yml/badge.svg)](https://github.com/Blue-Scroll/hap/actions/workflows/ci.yml)
[![Ruby](https://img.shields.io/badge/ruby-3.0+-blue.svg)](https://www.ruby-lang.org/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](../../LICENSE)

Official HAP (Human Attestation Protocol) SDK for Ruby.

HAP is an open standard for verified human effort. It enables Verification Authorities (VAs) to cryptographically attest that a sender took deliberate, costly action when communicating with a recipient.

## Installation

Add to your Gemfile:

```ruby
gem 'human-attestation'
```

Or install directly:

```bash
gem install human-attestation
```

## Quick Start

### Verifying a Claim (For Recipients)

```ruby
require 'human_attestation'

# Verify a claim from a HAP ID
claim = HumanAttestation.verify_claim("hap_abc123xyz456", "ballista.jobs")

if claim
  # Check if not expired
  if HumanAttestation.claim_expired?(claim)
    puts "Claim has expired"
    return
  end

  # Verify it's for your organization
  unless HumanAttestation.claim_for_recipient?(claim, "yourcompany.com")
    puts "Claim is for a different recipient"
    return
  end

  puts "Verified #{claim[:method]} application to #{claim[:to][:name]}"
end
```

### Verifying from a URL

```ruby
# Extract HAP ID from a verification URL
url = "https://www.ballista.jobs/v/hap_abc123xyz456"
hap_id = HumanAttestation.extract_id_from_url(url)

if hap_id
  claim = HumanAttestation.verify_claim(hap_id, "ballista.jobs")
  # ... handle claim
end
```

### Verifying Signature Manually

```ruby
# Fetch the claim
response = HumanAttestation.fetch_claim("hap_abc123xyz456", "ballista.jobs")

if response[:valid] && response[:jws]
  # Verify the cryptographic signature
  result = HumanAttestation.verify_signature(response[:jws], "ballista.jobs")

  if result[:valid]
    puts "Signature verified! Claim: #{result[:claim]}"
  else
    puts "Signature invalid: #{result[:error]}"
  end
end
```

### Signing Claims (For Verification Authorities)

```ruby
require 'human_attestation'
require 'json'

# Generate a key pair (do this once, store securely)
private_key, public_key = HumanAttestation.generate_key_pair

# Export public key for /.well-known/hap.json
jwk = HumanAttestation.export_public_key_jwk(public_key, "my_key_001")
well_known = { issuer: "my-va.com", keys: [jwk] }
puts JSON.pretty_generate(well_known)

# Create and sign a claim
claim = HumanAttestation.create_claim(
  method: "physical_mail",
  description: "Priority mail packet with handwritten cover letter",
  recipient_name: "Acme Corp",
  domain: "acme.com",
  issuer: "my-va.com",
  expires_in_days: 730, # 2 years
  cost: { amount: 1500, currency: "USD" },
  time: 1800,
  physical: true
)

jws = HumanAttestation.sign_claim(claim, private_key, kid: "my_key_001")
puts "Signed JWS: #{jws}"
```

## API Reference

### Verification Functions

| Method                                            | Description                                     |
| ------------------------------------------------- | ----------------------------------------------- |
| `HumanAttestation.verify_claim(hap_id, issuer)`   | Fetch and verify a claim, returns claim or nil  |
| `HumanAttestation.fetch_claim(hap_id, issuer)`    | Fetch raw verification response from VA         |
| `HumanAttestation.verify_signature(jws, issuer)`  | Verify JWS signature against VA's public keys   |
| `HumanAttestation.fetch_public_keys(issuer)`      | Fetch VA's public keys from well-known endpoint |
| `HumanAttestation.valid_id?(id)`                  | Check if string matches HAP ID format           |
| `HumanAttestation.extract_id_from_url(url)`       | Extract HAP ID from verification URL            |
| `HumanAttestation.claim_expired?(claim)`          | Check if claim has passed expiration            |
| `HumanAttestation.claim_for_recipient?(claim, domain)` | Check if claim targets specific recipient  |

### Signing Functions (For VAs)

| Method                                                | Description                              |
| ----------------------------------------------------- | ---------------------------------------- |
| `HumanAttestation.generate_key_pair`                  | Generate Ed25519 key pair                |
| `HumanAttestation.export_public_key_jwk(key, kid)`    | Export public key as JWK                 |
| `HumanAttestation.sign_claim(claim, private_key, kid:)` | Sign a claim, returns JWS              |
| `HumanAttestation.generate_id`                        | Generate cryptographically secure HAP ID |
| `HumanAttestation.create_claim(...)`                  | Create claim with defaults               |

### Types

The SDK uses Ruby hashes with symbol keys. Key structures:

```ruby
# Claim structure
{
  v: "0.1",
  id: "hap_...",
  method: "physical_mail",
  description: "...",
  to: { name: "Company", domain: "company.com" },
  at: "2026-01-19T06:00:00Z",
  exp: "2028-01-19T06:00:00Z",  # optional
  iss: "ballista.jobs",
  cost: { amount: 1500, currency: "USD" },  # optional
  time: 1800,  # optional
  physical: true  # optional
}

# JWK structure (OKP = Octet Key Pair, the format for Ed25519 keys)
{
  kid: "my_key_001",
  kty: "OKP",
  crv: "Ed25519",
  x: "<base64url-public-key>"
}
```

## Requirements

- Ruby 3.0+

## License

Apache-2.0
