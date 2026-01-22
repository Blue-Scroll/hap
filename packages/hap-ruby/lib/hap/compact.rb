# frozen_string_literal: true

require "ed25519"
require "base64"
require "cgi"
require "time"

module Hap
  # HAP Compact Format utilities for space-efficient serialization
  #
  # Format: HAP{version}.{id}.{type}.{method}.{to_name}.{to_domain}.{at}.{exp}.{iss}.{signature}
  #
  # @example
  #   HAP1.hap_abc123xyz456.human_effort.physical_mail.Acme%20Corp.acme%2Ecom.1706169600.1769241600.ballista%2Ejobs.MEUCIQDx...
  module Compact
    module_function

    # Encodes a field for compact format (URL-encode + encode dots)
    #
    # @param value [String] The value to encode
    # @return [String] Encoded value
    def encode_compact_field(value)
      CGI.escape(value.to_s).gsub(".", "%2E")
    end

    # Decodes a compact format field
    #
    # @param value [String] The encoded value
    # @return [String] Decoded value
    def decode_compact_field(value)
      CGI.unescape(value)
    end

    # Base64url encode without padding
    #
    # @param data [String] Binary data to encode
    # @return [String] Base64url encoded string
    def base64url_encode(data)
      Base64.urlsafe_encode64(data, padding: false)
    end

    # Base64url decode
    #
    # @param data [String] Base64url encoded string
    # @return [String] Decoded binary data
    def base64url_decode(data)
      Base64.urlsafe_decode64(data)
    end

    # Convert ISO 8601 timestamp to Unix epoch seconds
    #
    # @param iso [String] ISO 8601 timestamp
    # @return [Integer] Unix timestamp
    def iso_to_unix(iso)
      Time.parse(iso).to_i
    end

    # Convert Unix epoch seconds to ISO 8601 timestamp
    #
    # @param unix [Integer] Unix timestamp
    # @return [String] ISO 8601 timestamp
    def unix_to_iso(unix)
      Time.at(unix).utc.iso8601
    end

    # Get recipient info from a claim
    #
    # @param claim [Hash] The claim
    # @return [Array<String, String>] [name, domain]
    def get_recipient(claim)
      if claim[:type] == "recipient_commitment"
        recipient = claim[:recipient] || {}
        [recipient[:name] || "", recipient[:domain] || ""]
      else
        to = claim[:to] || {}
        [to[:name] || "", to[:domain] || ""]
      end
    end

    # Get method from a claim
    #
    # @param claim [Hash] The claim
    # @return [String] The method or commitment
    def get_method(claim)
      if claim[:type] == "recipient_commitment"
        claim[:commitment] || ""
      else
        claim[:method] || ""
      end
    end

    # Encodes a HAP claim and signature into compact format
    #
    # @param claim [Hash] The claim to encode
    # @param signature [String] The Ed25519 signature bytes (64 bytes)
    # @return [String] Compact format string
    def encode_compact(claim, signature)
      name, domain = get_recipient(claim)
      method = get_method(claim)

      at_unix = iso_to_unix(claim[:at])
      exp_unix = claim[:exp] ? iso_to_unix(claim[:exp]) : 0

      [
        "HAP#{COMPACT_VERSION}",
        claim[:id],
        claim[:type],
        method,
        encode_compact_field(name),
        encode_compact_field(domain),
        at_unix.to_s,
        exp_unix.to_s,
        encode_compact_field(claim[:iss]),
        base64url_encode(signature)
      ].join(".")
    end

    # Decodes a compact format string into claim and signature
    #
    # @param compact [String] The compact format string
    # @return [Hash] { claim: Hash, signature: String }
    # @raise [ArgumentError] If format is invalid
    def decode_compact(compact)
      raise ArgumentError, "Invalid HAP Compact format" unless valid_compact?(compact)

      parts = compact.split(".")
      raise ArgumentError, "Invalid HAP Compact format: expected 10 fields" unless parts.length == 10

      version, hap_id, claim_type, method, encoded_name, encoded_domain, at_unix_str, exp_unix_str, encoded_iss, sig_b64 = parts

      raise ArgumentError, "Unsupported compact version: #{version}" unless version == "HAP#{COMPACT_VERSION}"

      name = decode_compact_field(encoded_name)
      domain = decode_compact_field(encoded_domain)
      iss = decode_compact_field(encoded_iss)
      at_unix = at_unix_str.to_i
      exp_unix = exp_unix_str.to_i
      signature = base64url_decode(sig_b64)

      at = unix_to_iso(at_unix)
      exp = exp_unix != 0 ? unix_to_iso(exp_unix) : nil

      claim = {
        v: VERSION_PROTOCOL,
        id: hap_id,
        at: at,
        iss: iss
      }
      claim[:exp] = exp if exp

      if claim_type == "recipient_commitment"
        claim[:type] = "recipient_commitment"
        claim[:recipient] = { name: name }
        claim[:recipient][:domain] = domain unless domain.empty?
        claim[:commitment] = method
      else
        claim[:type] = claim_type
        claim[:method] = method
        claim[:to] = { name: name }
        claim[:to][:domain] = domain unless domain.empty?
      end

      { claim: claim, signature: signature }
    end

    # Validates if a string is a valid HAP Compact format
    #
    # @param compact [String] The string to validate
    # @return [Boolean] true if valid compact format
    def valid_compact?(compact)
      HAP_COMPACT_REGEX.match?(compact.to_s)
    end

    # Builds the compact payload (everything before the signature)
    # This is what gets signed.
    #
    # @param claim [Hash] The claim
    # @return [String] Compact payload string
    def build_compact_payload(claim)
      name, domain = get_recipient(claim)
      method = get_method(claim)

      at_unix = iso_to_unix(claim[:at])
      exp_unix = claim[:exp] ? iso_to_unix(claim[:exp]) : 0

      [
        "HAP#{COMPACT_VERSION}",
        claim[:id],
        claim[:type],
        method,
        encode_compact_field(name),
        encode_compact_field(domain),
        at_unix.to_s,
        exp_unix.to_s,
        encode_compact_field(claim[:iss])
      ].join(".")
    end

    # Signs a claim and returns it in compact format
    #
    # @param claim [Hash] The claim to sign
    # @param private_key [Ed25519::SigningKey] The Ed25519 private key
    # @return [String] Signed compact format string
    def sign_compact(claim, private_key)
      payload = build_compact_payload(claim)
      signature = private_key.sign(payload)
      "#{payload}.#{base64url_encode(signature)}"
    end

    # Verifies a compact format string using provided public keys
    #
    # @param compact [String] The compact format string
    # @param public_keys [Array<Hash>] Array of JWK public keys to try
    # @return [Hash] { valid: Boolean, claim: Hash or nil, error: String or nil }
    def verify_compact(compact, public_keys)
      return { valid: false, error: "Invalid compact format" } unless valid_compact?(compact)

      # Split to get payload and signature
      last_dot = compact.rindex(".")
      payload = compact[0...last_dot]
      sig_b64 = compact[(last_dot + 1)..]
      signature = base64url_decode(sig_b64)

      # Try each public key
      public_keys.each do |jwk|
        begin
          x_bytes = base64url_decode(jwk[:x] || jwk["x"])
          verify_key = Ed25519::VerifyKey.new(x_bytes)

          # Verify signature
          verify_key.verify(signature, payload)

          # Signature is valid
          decoded = decode_compact(compact)
          return { valid: true, claim: decoded[:claim] }
        rescue Ed25519::VerifyError, StandardError
          # Try next key
          next
        end
      end

      { valid: false, error: "Signature verification failed" }
    end

    # Generates a verification URL with embedded compact claim
    #
    # @param base_url [String] Base verification URL (e.g., "https://ballista.jobs/v")
    # @param compact [String] The compact format string
    # @return [String] URL with compact claim in query parameter
    def generate_verification_url(base_url, compact)
      "#{base_url}?c=#{CGI.escape(compact)}"
    end

    # Extracts compact claim from a verification URL
    #
    # @param url [String] The verification URL
    # @return [String, nil] Compact string or nil if not found
    def extract_compact_from_url(url)
      uri = URI.parse(url)
      params = URI.decode_www_form(uri.query || "").to_h
      compact = params["c"]
      return compact if compact && valid_compact?(compact)

      nil
    rescue StandardError
      nil
    end
  end
end
