# frozen_string_literal: true

module Hap
  # Claim types
  CLAIM_TYPE_HUMAN_EFFORT = "human_effort"
  CLAIM_TYPE_EMPLOYER_COMMITMENT = "employer_commitment"

  # Core verification methods
  METHOD_PHYSICAL_MAIL = "physical_mail"
  METHOD_VIDEO_INTERVIEW = "video_interview"
  METHOD_PAID_ASSESSMENT = "paid_assessment"
  METHOD_REFERRAL = "referral"

  # Commitment levels
  COMMITMENT_REVIEW_VERIFIED = "review_verified"
  COMMITMENT_PRIORITIZE_VERIFIED = "prioritize_verified"
  COMMITMENT_RESPOND_VERIFIED = "respond_verified"

  # Revocation reasons
  REVOCATION_FRAUD = "fraud"
  REVOCATION_ERROR = "error"
  REVOCATION_LEGAL = "legal"
  REVOCATION_USER_REQUEST = "user_request"
end
