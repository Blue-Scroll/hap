# frozen_string_literal: true

require "ed25519"
require "json"
require "base64"
require "securerandom"
require "time"

module Hap
  # Signing functions for HAP claims (for Verification Authorities)
  module Sign
    # Characters used for HAP ID generation
    HAP_ID_CHARS = ("A".."Z").to_a + ("a".."z").to_a + ("0".."9").to_a

    # Generates a cryptographically secure random HAP ID
    #
    # @return [String] A HAP ID in the format hap_[a-zA-Z0-9]{12}
    def generate_hap_id
      suffix = Array.new(12) { HAP_ID_CHARS[SecureRandom.random_number(HAP_ID_CHARS.length)] }.join
      "hap_#{suffix}"
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

    # Creates a complete human effort claim with all required fields
    #
    # @param method [String] Verification method (e.g., "physical_mail")
    # @param recipient_name [String] Recipient name
    # @param issuer [String] VA's domain
    # @param domain [String, nil] Recipient domain (optional)
    # @param tier [String, nil] Service tier (optional)
    # @param expires_in_days [Integer, nil] Days until expiration (optional)
    # @return [Hash] A complete human effort claim
    def create_human_effort_claim(method:, recipient_name:, issuer:, domain: nil, tier: nil, expires_in_days: nil)
      now = Time.now.utc

      claim = {
        v: VERSION_PROTOCOL,
        id: generate_hap_id,
        type: CLAIM_TYPE_HUMAN_EFFORT,
        method: method,
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

      claim
    end

    # Creates a complete recipient commitment claim with all required fields
    #
    # @param recipient_name [String] Recipient's name
    # @param commitment [String] Commitment level (e.g., "review_verified")
    # @param issuer [String] VA's domain
    # @param recipient_domain [String, nil] Recipient's domain (optional)
    # @param expires_in_days [Integer, nil] Days until expiration (optional)
    # @return [Hash] A complete recipient commitment claim
    def create_recipient_commitment_claim(recipient_name:, commitment:, issuer:, recipient_domain: nil, expires_in_days: nil)
      now = Time.now.utc

      claim = {
        v: VERSION_PROTOCOL,
        id: generate_hap_id,
        type: CLAIM_TYPE_RECIPIENT_COMMITMENT,
        recipient: { name: recipient_name },
        commitment: commitment,
        at: now.iso8601,
        iss: issuer
      }

      claim[:recipient][:domain] = recipient_domain if recipient_domain

      if expires_in_days
        exp = now + (expires_in_days * 24 * 60 * 60)
        claim[:exp] = exp.iso8601
      end

      claim
    end
  end
end
