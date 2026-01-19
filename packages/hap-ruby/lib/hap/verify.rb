# frozen_string_literal: true

require "faraday"
require "json"
require "jwt"
require "ed25519"
require "base64"
require "uri"
require "time"

module Hap
  # Verification functions for HAP claims
  module Verify
    # Default timeout for HTTP requests (seconds)
    DEFAULT_TIMEOUT = 10

    # Validates a HAP ID format
    #
    # @param id [String] The HAP ID to validate
    # @return [Boolean] true if the ID matches the format hap_[a-zA-Z0-9]{12}
    def valid_hap_id?(id)
      HAP_ID_REGEX.match?(id.to_s)
    end

    # Fetches the public keys from a VA's well-known endpoint
    #
    # @param issuer_domain [String] The VA's domain (e.g., "ballista.app")
    # @param timeout [Integer] Request timeout in seconds
    # @return [Hash] The VA's public key configuration
    def fetch_public_keys(issuer_domain, timeout: DEFAULT_TIMEOUT)
      url = "https://#{issuer_domain}/.well-known/hap.json"

      response = Faraday.get(url) do |req|
        req.options.timeout = timeout
        req.headers["Accept"] = "application/json"
      end

      raise VerificationError, "Failed to fetch public keys: HTTP #{response.status}" unless response.success?

      JSON.parse(response.body, symbolize_names: true)
    end

    # Fetches and verifies a HAP claim from a VA
    #
    # @param hap_id [String] The HAP ID to verify
    # @param issuer_domain [String] The VA's domain
    # @param timeout [Integer] Request timeout in seconds
    # @return [Hash] The verification response from the VA
    def fetch_claim(hap_id, issuer_domain, timeout: DEFAULT_TIMEOUT)
      return { valid: false, error: "invalid_format" } unless valid_hap_id?(hap_id)

      url = "https://#{issuer_domain}/api/v1/verify/#{hap_id}"

      response = Faraday.get(url) do |req|
        req.options.timeout = timeout
        req.headers["Accept"] = "application/json"
      end

      JSON.parse(response.body, symbolize_names: true)
    end

    # Verifies a JWS signature against a VA's public keys
    #
    # @param jws [String] The JWS compact serialization string
    # @param issuer_domain [String] The VA's domain to fetch public keys from
    # @param timeout [Integer] Request timeout in seconds
    # @return [Hash] Verification result with :valid, :claim, and :error keys
    def verify_signature(jws, issuer_domain, timeout: DEFAULT_TIMEOUT)
      # Fetch public keys
      well_known = fetch_public_keys(issuer_domain, timeout: timeout)

      # Parse the JWS header
      header_b64 = jws.split(".").first
      header = JSON.parse(Base64.urlsafe_decode64(header_b64 + "=="), symbolize_names: true)
      kid = header[:kid]

      return { valid: false, error: "JWS header missing kid" } unless kid

      # Find the matching key
      jwk = well_known[:keys].find { |k| k[:kid] == kid }
      return { valid: false, error: "Key not found: #{kid}" } unless jwk

      # Decode the public key
      x_bytes = Base64.urlsafe_decode64(jwk[:x] + "==")
      public_key = Ed25519::VerifyKey.new(x_bytes)

      # Parse and verify the JWS
      parts = jws.split(".")
      signing_input = "#{parts[0]}.#{parts[1]}"
      signature = Base64.urlsafe_decode64(parts[2] + "==")

      begin
        public_key.verify(signature, signing_input)
      rescue Ed25519::VerifyError
        return { valid: false, error: "Signature verification failed" }
      end

      # Decode the payload
      payload = JSON.parse(Base64.urlsafe_decode64(parts[1] + "=="), symbolize_names: true)

      # Verify issuer matches
      unless payload[:iss] == issuer_domain
        return { valid: false, error: "Issuer mismatch: expected #{issuer_domain}, got #{payload[:iss]}" }
      end

      { valid: true, claim: payload }
    rescue StandardError => e
      { valid: false, error: e.message }
    end

    # Fully verifies a HAP claim: fetches from VA and optionally verifies signature
    #
    # @param hap_id [String] The HAP ID to verify
    # @param issuer_domain [String] The VA's domain
    # @param verify_sig [Boolean] Whether to verify the cryptographic signature
    # @param timeout [Integer] Request timeout in seconds
    # @return [Hash, nil] The claim if valid, nil if not found or invalid
    def verify_hap_claim(hap_id, issuer_domain, verify_sig: true, timeout: DEFAULT_TIMEOUT)
      response = fetch_claim(hap_id, issuer_domain, timeout: timeout)

      return nil unless response[:valid]

      if verify_sig && response[:jws]
        sig_result = verify_signature(response[:jws], issuer_domain, timeout: timeout)
        return nil unless sig_result[:valid]
      end

      response[:claims]
    end

    # Extracts the HAP ID from a verification URL
    #
    # @param url [String] The verification URL
    # @return [String, nil] The HAP ID or nil if not found
    def extract_hap_id_from_url(url)
      uri = URI.parse(url)
      parts = uri.path.split("/")
      last_part = parts.last

      valid_hap_id?(last_part) ? last_part : nil
    rescue URI::InvalidURIError
      nil
    end

    # Checks if a claim is expired
    #
    # @param claim [Hash] The HAP claim to check
    # @return [Boolean] true if the claim has an exp field and is expired
    def claim_expired?(claim)
      return false unless claim[:exp]

      exp_time = Time.iso8601(claim[:exp])
      exp_time < Time.now
    rescue ArgumentError
      false
    end

    # Checks if the claim target matches the expected company
    #
    # @param claim [Hash] The HAP claim to check
    # @param company_domain [String] The expected company domain
    # @return [Boolean] true if the claim's target domain matches
    def claim_for_company?(claim, company_domain)
      case claim[:type]
      when CLAIM_TYPE_HUMAN_EFFORT
        claim.dig(:to, :domain) == company_domain
      when CLAIM_TYPE_EMPLOYER_COMMITMENT
        claim.dig(:employer, :domain) == company_domain
      else
        false
      end
    end
  end
end
