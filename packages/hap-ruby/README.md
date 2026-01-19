# bluescroll-hap

Official HAP (Human Application Protocol) SDK for Ruby.

HAP is an open standard for verified job applications. It enables Verification Authorities (VAs) to cryptographically attest that an applicant took deliberate, costly action when applying for a job.

## Installation

Add to your Gemfile:

```ruby
gem 'bluescroll-hap'
```

Or install directly:

```bash
gem install bluescroll-hap
```

## Quick Start

### Verifying a Claim (For Employers)

```ruby
require 'hap'

# Verify a claim from a HAP ID
claim = Hap.verify_hap_claim("hap_abc123xyz456", "ballista.io")

if claim
  # Check if not expired
  if Hap.claim_expired?(claim)
    puts "Claim has expired"
    return
  end

  # Verify it's for your company
  unless Hap.claim_for_company?(claim, "yourcompany.com")
    puts "Claim is for a different company"
    return
  end

  puts "Verified #{claim[:method]} application to #{claim[:to][:company]}"
end
```

### Verifying from a URL

```ruby
# Extract HAP ID from a verification URL
url = "https://ballista.io/v/hap_abc123xyz456"
hap_id = Hap.extract_hap_id_from_url(url)

if hap_id
  claim = Hap.verify_hap_claim(hap_id, "ballista.io")
  # ... handle claim
end
```

### Verifying Signature Manually

```ruby
# Fetch the claim
response = Hap.fetch_claim("hap_abc123xyz456", "ballista.io")

if response[:valid] && response[:jws]
  # Verify the cryptographic signature
  result = Hap.verify_signature(response[:jws], "ballista.io")

  if result[:valid]
    puts "Signature verified! Claim: #{result[:claim]}"
  else
    puts "Signature invalid: #{result[:error]}"
  end
end
```

### Signing Claims (For Verification Authorities)

```ruby
require 'hap'
require 'json'

# Generate a key pair (do this once, store securely)
private_key, public_key = Hap.generate_key_pair

# Export public key for /.well-known/hap.json
jwk = Hap.export_public_key_jwk(public_key, "my_key_001")
well_known = { issuer: "my-va.com", keys: [jwk] }
puts JSON.pretty_generate(well_known)

# Create and sign a claim
claim = Hap.create_human_effort_claim(
  method: "physical_mail",
  company: "Acme Corp",
  domain: "acme.com",
  tier: "standard",
  issuer: "my-va.com",
  expires_in_days: 730 # 2 years
)

jws = Hap.sign_claim(claim, private_key, kid: "my_key_001")
puts "Signed JWS: #{jws}"
```

### Creating Employer Commitment Claims

```ruby
claim = Hap.create_employer_commitment_claim(
  employer_name: "Acme Corp",
  employer_domain: "acme.com",
  commitment: "review_verified",
  issuer: "my-va.com",
  expires_in_days: 365
)

jws = Hap.sign_claim(claim, private_key, kid: "my_key_001")
```

## API Reference

### Verification Functions

| Method | Description |
|--------|-------------|
| `Hap.verify_hap_claim(hap_id, issuer)` | Fetch and verify a claim, returns claim or nil |
| `Hap.fetch_claim(hap_id, issuer)` | Fetch raw verification response from VA |
| `Hap.verify_signature(jws, issuer)` | Verify JWS signature against VA's public keys |
| `Hap.fetch_public_keys(issuer)` | Fetch VA's public keys from well-known endpoint |
| `Hap.valid_hap_id?(id)` | Check if string matches HAP ID format |
| `Hap.extract_hap_id_from_url(url)` | Extract HAP ID from verification URL |
| `Hap.claim_expired?(claim)` | Check if claim has passed expiration |
| `Hap.claim_for_company?(claim, domain)` | Check if claim targets specific company |

### Signing Functions (For VAs)

| Method | Description |
|--------|-------------|
| `Hap.generate_key_pair` | Generate Ed25519 key pair |
| `Hap.export_public_key_jwk(key, kid)` | Export public key as JWK |
| `Hap.sign_claim(claim, private_key, kid:)` | Sign a claim, returns JWS |
| `Hap.generate_hap_id` | Generate cryptographically secure HAP ID |
| `Hap.create_human_effort_claim(...)` | Create human_effort claim with defaults |
| `Hap.create_employer_commitment_claim(...)` | Create employer_commitment claim |

### Constants

```ruby
# Claim types
Hap::CLAIM_TYPE_HUMAN_EFFORT        # "human_effort"
Hap::CLAIM_TYPE_EMPLOYER_COMMITMENT # "employer_commitment"

# Verification methods
Hap::METHOD_PHYSICAL_MAIL   # "physical_mail"
Hap::METHOD_VIDEO_INTERVIEW # "video_interview"
Hap::METHOD_PAID_ASSESSMENT # "paid_assessment"
Hap::METHOD_REFERRAL        # "referral"

# Commitment levels
Hap::COMMITMENT_REVIEW_VERIFIED     # "review_verified"
Hap::COMMITMENT_PRIORITIZE_VERIFIED # "prioritize_verified"
Hap::COMMITMENT_RESPOND_VERIFIED    # "respond_verified"
```

## Requirements

- Ruby 3.0+

## License

Apache-2.0
