# frozen_string_literal: true

module HumanAttestation
  # HAP Compact format version
  COMPACT_VERSION = "1"

  # Test HAP ID format regex
  TEST_ID_REGEX = /\Ahap_test_[a-zA-Z0-9]{8}\z/

  # HAP Compact format regex (9 fields, no type)
  COMPACT_REGEX = /\AHAP1\.hap_[a-zA-Z0-9_]+\.[^.]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+\z/

  # Revocation reasons
  REVOCATION_FRAUD = "fraud"
  REVOCATION_ERROR = "error"
  REVOCATION_LEGAL = "legal"
  REVOCATION_USER_REQUEST = "user_request"
end
