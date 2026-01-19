# frozen_string_literal: true

require_relative "hap/version"
require_relative "hap/types"
require_relative "hap/verify"
require_relative "hap/sign"

# HAP (Human Application Protocol) SDK for Ruby
#
# HAP is an open standard for verified job applications. It enables Verification
# Authorities (VAs) to cryptographically attest that an applicant took deliberate,
# costly action when applying for a job.
#
# @example Verifying a claim (for employers)
#   claim = Hap.verify_hap_claim("hap_abc123xyz456", "ballista.app")
#   if claim && !Hap.claim_expired?(claim)
#     puts "Verified application to #{claim[:to][:company]}"
#   end
#
# @example Signing a claim (for VAs)
#   private_key, public_key = Hap.generate_key_pair
#   claim = Hap.create_human_effort_claim(
#     method: "physical_mail",
#     company: "Acme Corp",
#     domain: "acme.com",
#     issuer: "my-va.com"
#   )
#   jws = Hap.sign_claim(claim, private_key, kid: "key_001")
#
module Hap
  class Error < StandardError; end
  class VerificationError < Error; end
  class SigningError < Error; end

  # Protocol version
  VERSION_PROTOCOL = "0.1"

  # HAP ID format regex
  HAP_ID_REGEX = /\Ahap_[a-zA-Z0-9]{12}\z/

  # Extend self to allow calling methods directly on the module
  extend Verify
  extend Sign
end
