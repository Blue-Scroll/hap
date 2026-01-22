"""
HAP (Human Attestation Protocol) SDK for Python

HAP is an open standard for verified human effort. It enables Verification
Authorities (VAs) to cryptographically attest that a sender took deliberate,
costly action when communicating with a recipient.

Example - Verifying a claim (for recipients):
    >>> import asyncio
    >>> from hap import verify_hap_claim, is_claim_expired
    >>>
    >>> async def main():
    ...     claim = await verify_hap_claim("hap_abc123xyz456", "ballista.jobs")
    ...     if claim and not is_claim_expired(claim):
    ...         print(f"Verified application to {claim['to']['name']}")
    >>>
    >>> asyncio.run(main())

Example - Signing a claim (for VAs):
    >>> from hap import generate_key_pair, sign_claim, create_human_effort_claim
    >>>
    >>> private_key, public_key = generate_key_pair()
    >>> claim = create_human_effort_claim(
    ...     method="physical_mail",
    ...     recipient_name="Acme Corp",
    ...     domain="acme.com",
    ...     issuer="my-va.com",
    ... )
    >>> jws = sign_claim(claim, private_key, kid="key_001")
"""

from hap.types import (
    HAP_COMPACT_REGEX,
    HAP_COMPACT_VERSION,
    HAP_ID_REGEX,
    HAP_TEST_ID_REGEX,
    HAP_VERSION,
    ClaimType,
    CommitmentLevel,
    CompactVerificationResult,
    ContentAttestationClaim,
    DecodedCompact,
    FinancialCommitmentClaim,
    PhysicalDeliveryClaim,
    RecipientCommitmentClaim,
    HapClaim,
    HapJwk,
    HapWellKnown,
    HumanEffortClaim,
    RevocationReason,
    VerificationMethod,
    VerificationResponse,
)
from hap.verify import (
    extract_hap_id_from_url,
    fetch_claim,
    fetch_public_keys,
    is_claim_expired,
    is_claim_for_recipient,
    is_valid_hap_id,
    verify_hap_claim,
    verify_signature,
)
from hap.sign import (
    create_content_attestation_claim,
    create_financial_commitment_claim,
    create_human_effort_claim,
    create_physical_delivery_claim,
    create_recipient_commitment_claim,
    export_public_key_jwk,
    generate_hap_id,
    generate_key_pair,
    generate_test_hap_id,
    hash_content,
    is_test_hap_id,
    sign_claim,
)
from hap.compact import (
    build_compact_payload,
    decode_compact,
    encode_compact,
    extract_compact_from_url,
    generate_verification_url,
    is_valid_compact,
    sign_compact,
    verify_compact,
)

__version__ = "0.3.7"

__all__ = [
    # Version
    "__version__",
    # Constants
    "HAP_COMPACT_REGEX",
    "HAP_COMPACT_VERSION",
    "HAP_ID_REGEX",
    "HAP_TEST_ID_REGEX",
    "HAP_VERSION",
    # Types
    "ClaimType",
    "CommitmentLevel",
    "CompactVerificationResult",
    "ContentAttestationClaim",
    "DecodedCompact",
    "FinancialCommitmentClaim",
    "PhysicalDeliveryClaim",
    "RecipientCommitmentClaim",
    "HapClaim",
    "HapJwk",
    "HapWellKnown",
    "HumanEffortClaim",
    "RevocationReason",
    "VerificationMethod",
    "VerificationResponse",
    # Verification functions
    "extract_hap_id_from_url",
    "fetch_claim",
    "fetch_public_keys",
    "is_claim_expired",
    "is_claim_for_recipient",
    "is_valid_hap_id",
    "verify_hap_claim",
    "verify_signature",
    # Signing functions
    "create_content_attestation_claim",
    "create_financial_commitment_claim",
    "create_human_effort_claim",
    "create_physical_delivery_claim",
    "create_recipient_commitment_claim",
    "export_public_key_jwk",
    "generate_hap_id",
    "generate_key_pair",
    "generate_test_hap_id",
    "hash_content",
    "is_test_hap_id",
    "sign_claim",
    # Compact format functions
    "build_compact_payload",
    "decode_compact",
    "encode_compact",
    "extract_compact_from_url",
    "generate_verification_url",
    "is_valid_compact",
    "sign_compact",
    "verify_compact",
]
