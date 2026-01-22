# frozen_string_literal: true

require "ed25519"
require "json"
require "base64"
require "securerandom"
require "time"
require "digest"

module HumanAttestation
  # Signing functions for HAP claims (for Verification Authorities)
  module Sign
    # Characters used for HAP ID generation
    ID_CHARS = ("A".."Z").to_a + ("a".."z").to_a + ("0".."9").to_a

    # Generates a cryptographically secure random HAP ID
    #
    # @return [String] A HAP ID in the format hap_[a-zA-Z0-9]{12}
    def generate_id
      suffix = Array.new(12) { ID_CHARS[SecureRandom.random_number(ID_CHARS.length)] }.join
      "hap_#{suffix}"
    end

    # Generates a test HAP ID (for previews and development)
    #
    # @return [String] A test HAP ID in the format hap_test_[a-zA-Z0-9]{8}
    def generate_test_id
      suffix = Array.new(8) { ID_CHARS[SecureRandom.random_number(ID_CHARS.length)] }.join
      "hap_test_#{suffix}"
    end

    # Checks if a HAP ID is a test ID
    #
    # @param id [String] The HAP ID to check
    # @return [Boolean] true if the ID is a test ID
    def test_id?(id)
      TEST_ID_REGEX.match?(id)
    end

    # Computes SHA-256 hash of content with prefix
    #
    # @param content [String] The content to hash
    # @return [String] Hash string in format "sha256:xxxxx"
    def hash_content(content)
      hash = Digest::SHA256.hexdigest(content)
      "sha256:#{hash}"
    end

    # Generates a new Ed25519 key pair for signing HAP claims
    #
    # @return [Array<Ed25519::SigningKey, Ed25519::VerifyKey>] Private and public keys
    def generate_key_pair
      signing_key = Ed25519::SigningKey.generate
      [signing_key, signing_key.verify_key]
    end

    # Exports a public key to JWK format suitable for /.well-known/hap.json
    #
    # @param public_key [Ed25519::VerifyKey] The public key to export
    # @param kid [String] The key ID to assign
    # @return [Hash] JWK hash
    def export_public_key_jwk(public_key, kid)
      x = Base64.urlsafe_encode64(public_key.to_bytes, padding: false)

      {
        kid: kid,
        kty: "OKP",
        crv: "Ed25519",
        x: x
      }
    end

    # Signs a HAP claim with an Ed25519 private key
    #
    # @param claim [Hash] The claim to sign
    # @param private_key [Ed25519::SigningKey] The Ed25519 private key
    # @param kid [String] Key ID to include in JWS header
    # @return [String] JWS compact serialization string
    def sign_claim(claim, private_key, kid:)
      # Ensure version is set
      claim_with_version = claim.merge(v: claim[:v] || VERSION_PROTOCOL)

      # Create header
      header = { alg: "EdDSA", kid: kid }

      # Encode header and payload
      header_b64 = Base64.urlsafe_encode64(JSON.generate(header), padding: false)
      payload_b64 = Base64.urlsafe_encode64(JSON.generate(claim_with_version), padding: false)

      # Create signing input
      signing_input = "#{header_b64}.#{payload_b64}"

      # Sign
      signature = private_key.sign(signing_input)
      signature_b64 = Base64.urlsafe_encode64(signature, padding: false)

      "#{signing_input}.#{signature_b64}"
    end

    # Creates a complete HAP claim with all required fields
    #
    # @param method [String] VA-specific verification method identifier
    # @param description [String] Human-readable description of the effort
    # @param recipient_name [String] Recipient name
    # @param issuer [String] VA's domain
    # @param domain [String, nil] Recipient domain (optional)
    # @param tier [String, nil] Service tier (optional)
    # @param expires_in_days [Integer, nil] Days until expiration (optional)
    # @param cost [Hash, nil] Monetary cost { amount: Integer, currency: String } (optional)
    # @param time [Integer, nil] Time in seconds (optional)
    # @param physical [Boolean, nil] Whether physical atoms involved (optional)
    # @param energy [Integer, nil] Energy in kilocalories (optional)
    # @return [Hash] A complete HAP claim
    def create_claim(method:, description:, recipient_name:, issuer:, domain: nil, tier: nil, expires_in_days: nil, cost: nil, time: nil, physical: nil, energy: nil)
      now = Time.now.utc

      claim = {
        v: VERSION_PROTOCOL,
        id: generate_id,
        method: method,
        description: description,
        to: { name: recipient_name },
        at: now.iso8601,
        iss: issuer
      }

      claim[:to][:domain] = domain if domain
      claim[:tier] = tier if tier

      if expires_in_days
        exp = now + (expires_in_days * 24 * 60 * 60)
        claim[:exp] = exp.iso8601
      end

      # Add effort dimensions if provided
      claim[:cost] = cost if cost
      claim[:time] = time if time
      claim[:physical] = physical unless physical.nil?
      claim[:energy] = energy if energy

      claim
    end
  end
end
