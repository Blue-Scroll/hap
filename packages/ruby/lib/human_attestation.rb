# frozen_string_literal: true

require_relative "human_attestation/version"
require_relative "human_attestation/types"
require_relative "human_attestation/verify"
require_relative "human_attestation/sign"
require_relative "human_attestation/compact"

# HAP (Human Attestation Protocol) SDK for Ruby
#
# HAP is an open standard for verified human effort. It enables Verification
# Authorities (VAs) to cryptographically attest that a sender took deliberate,
# costly action when communicating with a recipient.
#
# @example Verifying a claim (for recipients)
#   claim = HumanAttestation.verify_claim("hap_abc123xyz456", "ballista.jobs")
#   if claim && !HumanAttestation.claim_expired?(claim)
#     puts "Verified application to #{claim[:to][:name]}"
#   end
#
# @example Signing a claim (for VAs)
#   private_key, public_key = HumanAttestation.generate_key_pair
#   claim = HumanAttestation.create_claim(
#     method: "ba_priority_mail",
#     description: "Priority mail packet with handwritten cover letter",
#     recipient_name: "Acme Corp",
#     domain: "acme.com",
#     issuer: "my-va.com",
#     cost: { amount: 1500, currency: "USD" },
#     time: 1800,
#     physical: true
#   )
#   jws = HumanAttestation.sign_claim(claim, private_key, kid: "key_001")
#
module HumanAttestation
  class Error < StandardError; end
  class VerificationError < Error; end
  class SigningError < Error; end

  # Protocol version
  VERSION_PROTOCOL = "0.1"

  # HAP ID format regex
  ID_REGEX = /\Ahap_[a-zA-Z0-9]{12}\z/

  # Extend self to allow calling methods directly on the module
  extend Verify
  extend Sign
  extend Compact
end
