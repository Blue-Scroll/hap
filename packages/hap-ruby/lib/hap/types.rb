# frozen_string_literal: true

module Hap
  # HAP Compact format version
  COMPACT_VERSION = "1"

  # Test HAP ID format regex
  HAP_TEST_ID_REGEX = /\Ahap_test_[a-zA-Z0-9]{8}\z/

  # HAP Compact format regex
  HAP_COMPACT_REGEX = /\AHAP1\.hap_[a-zA-Z0-9_]+\.[a-z_]+\.[a-z_]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+\z/

  # Claim types
  CLAIM_TYPE_HUMAN_EFFORT = "human_effort"
  CLAIM_TYPE_RECIPIENT_COMMITMENT = "recipient_commitment"
  CLAIM_TYPE_PHYSICAL_DELIVERY = "physical_delivery"
  CLAIM_TYPE_FINANCIAL_COMMITMENT = "financial_commitment"
  CLAIM_TYPE_CONTENT_ATTESTATION = "content_attestation"

  # Core verification methods
  METHOD_PHYSICAL_MAIL = "physical_mail"
  METHOD_VIDEO_INTERVIEW = "video_interview"
  METHOD_PAID_ASSESSMENT = "paid_assessment"
  METHOD_REFERRAL = "referral"
  METHOD_PAYMENT = "payment"
  METHOD_TRUTHFULNESS_CONFIRMATION = "truthfulness_confirmation"

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
